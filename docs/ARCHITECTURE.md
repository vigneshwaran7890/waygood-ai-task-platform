# Architecture Document — AI Task Processing Platform

## 1. Overall system architecture

The platform is composed of four independently deployable units:

- **Frontend** — a React + TypeScript single-page app, built with Vite and served as static
  assets via nginx. It talks to the backend exclusively over a versioned REST API secured with
  JWT bearer tokens.
- **Backend API** — a Node.js/Express service that owns all business logic: authentication,
  task CRUD, input validation, and enqueuing work. It is the only component that writes
  `PENDING` tasks and the only component clients talk to directly.
- **Worker** — a Python process that consumes task ids from a Redis list, performs the
  requested text operation, and writes status/result/logs back to MongoDB. Workers are
  stateless and horizontally scalable — any number of replicas can consume from the same
  queue safely.
- **Data plane** — MongoDB for durable state (users, tasks, logs, results) and Redis purely
  as a work queue (not as a source of truth).

Request flow:

```
Client → Frontend (nginx) → Backend API → MongoDB (write PENDING task)
                                        → Redis LPUSH (task id)
Worker replica → Redis BRPOP (task id) → MongoDB (read task, write RUNNING/SUCCESS/FAILED + logs)
Client → Frontend → Backend API → MongoDB (poll task by id)
```

The backend and worker never talk to each other directly — they are decoupled entirely
through Redis and MongoDB. This means the backend can accept task submissions even if every
worker is temporarily down (tasks simply queue up as `PENDING`), and workers can be scaled,
restarted, or redeployed independently of the API without any client-visible downtime.

Each component is packaged as its own Docker image with a dedicated Dockerfile, and is designed
to run as a separate Kubernetes Deployment behind its own Service, so that scaling, resource
limits, and rollout strategy can be tuned per-component.

## 2. Worker scaling strategy

Workers are stateless consumers, which makes horizontal scaling straightforward:

- **Queue semantics.** The backend pushes task ids with `LPUSH`; workers consume with
  `BRPOP` (blocking right-pop). Redis guarantees that each list element is delivered to
  exactly one caller among all clients blocked on that key — so N worker replicas can pop
  from the same list concurrently with no double-processing and no coordination logic needed
  in application code.
- **Horizontal scaling.** In Kubernetes, the worker is deployed as a `Deployment` with a
  `HorizontalPodAutoscaler` targeting CPU utilization (and optionally a custom metric such as
  Redis queue length via KEDA, e.g. `redis-list` scaler on `LLEN ai:tasks:queue`). Under normal
  load a small fixed replica count (e.g. 2–3) is sufficient; under bursty load, KEDA-based
  queue-length scaling lets the replica count track backlog directly rather than reacting only
  after CPU saturates.
- **Graceful shutdown.** Each worker traps `SIGTERM`, finishes the task currently in flight
  (a `BRPOP` call already returned), and only then exits — avoiding a task being silently
  dropped mid-processing during a rolling deploy or scale-down. Kubernetes `terminationGracePeriodSeconds`
  is set generously (e.g. 30s) to accommodate this.
- **Idempotent recovery.** If a worker crashes after `BRPOP` but before finishing (rare, but
  possible on OOM-kill), the task remains stuck in `RUNNING`. A lightweight reconciliation job
  (a scheduled Kubernetes `CronJob`) periodically re-queues tasks that have been `RUNNING` for
  longer than a timeout threshold, self-healing the pipeline without manual intervention.

## 3. Handling high task volume (~100,000 tasks/day)

100,000 tasks/day averages ~1.16 tasks/sec, but real traffic is bursty (e.g. concentrated in
business hours), so the design targets bursts of 50–100 tasks/sec comfortably:

- **Backend is stateless and horizontally scaled.** Multiple backend replicas behind a
  Kubernetes Service/Ingress handle write throughput; the only shared state is MongoDB and
  Redis, both external to the pod.
- **Redis as a thin, fast buffer.** Pushing a small JSON payload (`{ "taskId": ... }`) is O(1)
  and sub-millisecond, so the API's write path is never the bottleneck — the queue absorbs
  bursts far faster than workers can drain them, and worker replica count is scaled to match
  sustained throughput rather than instantaneous peaks.
- **Worker throughput scaling.** Since each operation (uppercase/lowercase/reverse/word-count)
  is CPU-light and sub-millisecond, a single worker replica can process thousands of tasks per
  second; at 100k/day the bottleneck is realistically MongoDB write throughput and network
  latency, not CPU. Replica count is tuned primarily to provide redundancy and parallel MongoDB
  round-trips rather than raw CPU parallelism.
- **MongoDB write path.** Task creation and each status transition is a single targeted
  `update_one` by `_id` — no full-document rewrites, no table scans. This keeps write
  amplification low even at high task volume.
- **Backpressure, not overload.** Because tasks queue in Redis rather than being processed
  synchronously in the request path, a temporary worker slowdown degrades to "tasks take longer
  to start" rather than API request failures or timeouts — a critical property at 100k/day scale.
- **Pagination everywhere.** The task list endpoint is paginated (`page`/`limit`, capped at 100
  per page) so that a user with thousands of historical tasks never triggers an unbounded query.

## 4. MongoDB indexing strategy

Two indexes are defined on the `tasks` collection (see `backend/src/models/taskModel.js`):

- `{ user: 1, createdAt: -1 }` — supports the dashboard's primary query pattern: "list this
  user's tasks, most recent first." Without this compound index, listing would require a
  collection scan plus an in-memory sort.
- `{ status: 1 }` (via `index: true` on the field) — supports operational queries such as
  "count/find all tasks currently `PENDING` or `RUNNING`" (used by monitoring/alerting and by
  the stuck-task reconciliation job described in §2).

Additional considerations for scale:

- `{ _id: ... }` is already indexed by default and is the only index the worker needs (it reads
  and updates a single task by id).
- The `users.email` field is indexed via `unique: true`, both enforcing the uniqueness
  constraint at the database level and making login lookups O(log n).
- As volume grows, a **TTL index** on `completedAt` (e.g. expire `SUCCESS`/`FAILED` tasks after
  90 days) or a periodic archival job to cold storage keeps the working set — and therefore
  index size and query latency — bounded, since raw task history has no indefinite business
  value once results have been retrieved by the user.
- Compound indexes are ordered with the equality field (`user`) first and the sort field
  (`createdAt`) second, matching MongoDB's guidance for index prefix usage.

## 5. Redis failure handling and recovery strategy

Redis here is used purely as a **transient work queue**, not as a system of record — this
constrains failure impact by design:

- **Producer-side (backend) failure handling.** If `LPUSH` fails (connection error, Redis
  down), the task has already been persisted in MongoDB as `PENDING`. The API returns a 5xx
  to the client for that request (visible, actionable failure) rather than silently losing the
  task. A retry-with-backoff wrapper around the enqueue call absorbs brief blips; ioredis is
  configured with a `retryStrategy` for automatic reconnection.
- **Consumer-side (worker) failure handling.** Workers wrap `BRPOP` in a try/except around
  `redis.exceptions.ConnectionError`; on failure they log, sleep briefly, and retry the blocking
  pop rather than crashing the process. This means a Redis restart or brief network partition
  causes workers to pause and resume automatically with no manual restart needed.
- **No data loss on Redis restart (with AOF).** In production, Redis is configured with AOF
  persistence (`appendonly yes`, `appendfsync everysec`) so that queued-but-not-yet-popped task
  ids survive a Redis process restart. Because messages are just ids, even the worst case
  (losing a few seconds of unflushed AOF writes) is recoverable: the reconciliation job in §2
  can also detect tasks stuck in `PENDING` beyond a threshold and re-enqueue them.
- **Redis unavailability does not corrupt task state.** Because every task's authoritative
  status lives in MongoDB, a Redis outage simply pauses processing — new tasks accumulate as
  `PENDING` in MongoDB and are enqueued (or re-enqueued by the reconciliation job) once Redis
  recovers. No task can be "lost" purely because Redis was briefly down.
- **High availability path.** For production, Redis is deployed via a managed Redis service or
  a Redis Sentinel/Cluster topology (e.g. Bitnami Redis Helm chart with Sentinel) rather than a
  single pod, so a node failure triggers automatic failover to a replica without operator
  intervention.

## 6. Deployment strategy

### Staging

- Namespace: `ai-task-platform-staging`, deployed from the `main`/`develop` branch on every
  merge (continuous deployment).
- Single replica per component (backend, worker, frontend) — sufficient for functional and
  integration testing, not tuned for load.
- Uses a shared, lower-tier MongoDB and Redis instance (or in-cluster StatefulSets) since data
  durability requirements are lower.
- Argo CD Application targets the staging overlay (Kustomize) with **auto-sync and
  self-heal enabled**, so staging always mirrors the latest manifests in the infrastructure
  repository within seconds of a merge — this is the environment used to verify a release
  candidate before promoting to production.
- Secrets are still managed via Kubernetes Secrets (sealed/encrypted at rest), never
  hardcoded, even in staging.

### Production

- Namespace: `ai-task-platform-prod`, deployed only from tagged releases (e.g. `v1.2.0`), not
  every commit — promotion is a deliberate, auditable Git action (updating the image tag in the
  infrastructure repository), consistent with GitOps principles.
- Multiple replicas for backend and worker (see §2 for worker autoscaling), each with resource
  requests/limits and liveness/readiness probes so Kubernetes can safely reschedule unhealthy
  pods without operator intervention.
- Rolling updates (`maxUnavailable: 0` or `1`, `maxSurge: 1`) ensure zero-downtime deploys for
  the backend and frontend; workers additionally rely on the graceful-shutdown behavior in §2
  so in-flight tasks are not interrupted mid-rollout.
- MongoDB and Redis run as managed services (e.g. MongoDB Atlas, managed Redis) or a properly
  replicated in-cluster topology with persistent volumes and backups — production data is never
  hosted on ephemeral, single-replica storage.
- Argo CD auto-sync is enabled here too, but promotion is gated by CI passing on the tagged
  commit and (optionally) a manual approval step before the infrastructure repository's
  production overlay is updated — auto-sync applies the change quickly, but *what* gets synced
  is still a deliberate, reviewed Git change rather than continuous deployment straight from
  `main`.
- Centralized logging (e.g. the worker's structured log lines and the backend's `morgan`
  access logs shipped to a log aggregator) and basic alerting on `/api/health/ready` and Redis
  queue depth provide operational visibility in production that staging does not need.
