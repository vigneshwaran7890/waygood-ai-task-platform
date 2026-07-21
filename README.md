# AI Task Processing Platform

A production-ready, full-stack platform that lets authenticated users submit text-processing
"AI tasks", have them executed asynchronously by a Python worker fleet via a Redis queue, and
monitor status, execution logs, and results in real time.

## Stack

| Component        | Technology                          |
| ----------------- | ------------------------------------ |
| Frontend          | React 18 + TypeScript + Vite         |
| Backend API       | Node.js + Express.js                 |
| Background Worker | Python 3.12                          |
| Database          | MongoDB                              |
| Queue             | Redis                                |
| Auth              | JWT + bcrypt                         |
| Containerization  | Docker (multi-stage, non-root)       |

## Architecture

```
frontend (React/Vite, served by nginx)
        │  REST (JWT bearer)
        ▼
backend (Node/Express)  ──── MongoDB   (users, tasks, logs, results)
        │
        │  LPUSH task id
        ▼
Redis list "ai:tasks:queue"
        │
        │  BRPOP (blocking pop, safe for N concurrent workers)
        ▼
worker (Python, horizontally scalable) ──── MongoDB (status/result/log updates)
```

1. User registers/logs in → receives a JWT.
2. User creates a task (title, input text, operation type) → backend saves it with
   status `PENDING` and pushes the task id onto the Redis list `ai:tasks:queue`.
3. One of the running worker replicas `BRPOP`s the queue (Redis guarantees each list
   element is delivered to exactly one caller, so replicas never double-process a task).
4. Worker sets status `RUNNING`, executes the operation, appends log entries, then sets
   status `SUCCESS` (with `result`) or `FAILED` (with `errorMessage`).
5. Frontend polls `GET /api/tasks/:id` to reflect live status, logs, and results.

## Supported operations

| Operation        | Description                        |
| ----------------- | ----------------------------------- |
| `UPPERCASE`       | Convert all characters to uppercase |
| `LOWERCASE`       | Convert all characters to lowercase |
| `REVERSE_STRING`  | Reverse the input string            |
| `WORD_COUNT`      | Return the total number of words    |

## Repository layout

```
waygood-ai-task-platform/
├── backend/     # Node.js + Express REST API
├── worker/      # Python background worker (Redis consumer)
├── frontend/    # React + Vite + TypeScript SPA
├── docs/        # Architecture documentation
└── docker-compose.yml
```

## Local development

### Prerequisites

- Docker & Docker Compose
- (Optional, for running services outside Docker) Node.js 20+, Python 3.12+, MongoDB, Redis

### Quick start (Docker Compose)

```bash
cp backend/.env.example backend/.env
cp worker/.env.example worker/.env
cp frontend/.env.example frontend/.env

docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000/api
- Health check: http://localhost:5000/api/health/ready

Worker runs 2 replicas by default (`deploy.replicas: 2` in `docker-compose.yml`) to
demonstrate horizontal scaling of task processing.

### Running services individually (without Docker)

**Backend**
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

**Worker**
```bash
cd worker
cp .env.example .env
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python -m app.main
```

**Frontend**
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## API overview

| Method | Endpoint               | Auth | Description                                          |
| ------ | ----------------------- | ---- | ----------------------------------------------------- |
| POST   | `/api/auth/register`    | No   | Create a new user account, returns access token + sets refresh cookie |
| POST   | `/api/auth/login`       | No   | Authenticate, returns access token + sets refresh cookie |
| POST   | `/api/auth/refresh`     | Cookie | Exchanges the refresh cookie for a new access token (rotates it) |
| POST   | `/api/auth/logout`      | Cookie | Revokes the current session's refresh token, clears cookie |
| POST   | `/api/auth/logout-all`  | Yes  | Revokes every active session for the user ("log out everywhere") |
| GET    | `/api/auth/me`          | Yes  | Get the current authenticated user                    |
| POST   | `/api/tasks`             | Yes  | Create and enqueue a new task                         |
| GET    | `/api/tasks`             | Yes  | List the current user's tasks                         |
| GET    | `/api/tasks/:id`         | Yes  | Get task status, logs, and result                     |
| GET    | `/api/health/live`       | No   | Liveness probe                                        |
| GET    | `/api/health/ready`      | No   | Readiness probe (Mongo + Redis)                       |

## Authentication: access/refresh token design

- **Access token** — short-lived (default 15 minutes), a signed JWT returned in the JSON
  response body. The frontend keeps it only in memory (a module variable, see
  `frontend/src/api/tokenStore.ts`) — never in `localStorage`/`sessionStorage` — so it cannot be
  read by an injected script and is naturally cleared on tab close.
- **Refresh token** — long-lived (default 30 days), set as an `httpOnly`, `Secure` (in
  production), `SameSite=Strict` cookie scoped to `/api/auth`. JavaScript never has access to
  its value; the browser attaches it automatically on refresh/logout calls.
- **Rotation with reuse detection** — every successful `/api/auth/refresh` call revokes the
  presented refresh token and issues a brand-new one in the same "family" (`backend/src/services/tokenService.js`).
  If a refresh token that was already rotated/revoked is presented again — a strong signal that
  a token was stolen and is being replayed — the entire family is revoked immediately,
  invalidating every token descended from that session, not just the one that got reused.
- **Server-side tracking** — only a SHA-256 hash of each refresh token is stored
  (`backend/src/models/refreshTokenModel.js`); the raw token itself is never persisted, so a
  database read alone can never yield a usable credential. A MongoDB TTL index automatically
  prunes expired/revoked tokens.
- **Silent refresh on load** — on app start, the frontend calls `/api/auth/refresh` once
  (`frontend/src/context/AuthContext.tsx`); if the refresh cookie is still valid, the user is
  transparently re-authenticated without re-entering credentials. `ProtectedRoute` waits for
  this check before deciding whether to redirect to `/login`.
- **Automatic retry on 401** — the axios client (`frontend/src/api/client.ts`) intercepts any
  401 response, triggers a refresh, and retries the original request once with the new access
  token. Concurrent 401s from multiple in-flight requests share a single refresh call
  (single-flight) rather than each racing to refresh independently.
- **Logout** — `/api/auth/logout` revokes just the current session's refresh token;
  `/api/auth/logout-all` revokes every active session for the user, for a "sign out of all
  devices" control.

## Security notes

- Passwords are hashed with bcrypt (12 salt rounds); plaintext passwords are never stored or logged.
- All API access (other than register/login/refresh/health) requires a valid short-lived JWT
  access token; see "Authentication: access/refresh token design" above for the full model,
  including refresh token rotation, reuse detection, and hashed server-side storage.
- `helmet` sets secure HTTP headers; `express-rate-limit` throttles both general API traffic
  and auth endpoints specifically.
- No secrets are committed to the repository — `.env` files are gitignored and only
  `.env.example` templates are tracked.
- All containers run as a non-root user (see each `Dockerfile`).

## Assumptions

- "Operation Type" values are represented as fixed enum strings (`UPPERCASE`, `LOWERCASE`,
  `REVERSE_STRING`, `WORD_COUNT`) rather than free text, to keep both the API contract and the
  worker's dispatch table strict.
- Task ownership is scoped per-user; a user can only view/list their own tasks.
- The queue payload only carries the task id (not the full input text) — the worker reads
  full task data from MongoDB by id. This keeps queue messages small and MongoDB as the
  single source of truth for task state.
- Kubernetes manifests, Argo CD/GitOps configuration, and CI/CD pipelines are intentionally
  out of scope for this iteration and will be added in a follow-up (tracked separately in the
  infrastructure repository).

## Architecture document

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full write-up covering worker
scaling strategy, high-volume task handling, MongoDB indexing, Redis failure recovery, and
staging/production deployment strategy.
