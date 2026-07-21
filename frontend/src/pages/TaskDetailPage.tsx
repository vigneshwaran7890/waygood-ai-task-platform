import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTaskRequest } from '../api/taskApi';
import { extractErrorMessage } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import type { Task } from '../types';

const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATUSES = new Set(['SUCCESS', 'FAILED']);

function formatTimestamp(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!id) return undefined;

    const load = async () => {
      try {
        const fetched = await getTaskRequest(id);
        setTask(fetched);
        setError(null);
        if (TERMINAL_STATUSES.has(fetched.status)) {
          clearInterval(intervalRef.current);
        }
      } catch (err) {
        setError(extractErrorMessage(err));
      }
    };

    load();
    intervalRef.current = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [id]);

  if (error) {
    return (
      <div className="panel task-detail__error">
        <p className="form-error">{error}</p>
        <Link to="/" className="btn btn--ghost btn--small">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="panel">
        <div className="empty-state">
          <p>Loading task…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-detail">
      <Link to="/" className="btn btn--ghost btn--small task-detail__back">
        ← Back to dashboard
      </Link>

      <section className="panel">
        <div className="task-detail__header">
          <div className="task-detail__heading">
            <h1>{task.title}</h1>
            <span className="task-detail__op">{task.operationType}</span>
          </div>
          <StatusBadge status={task.status} />
        </div>

        <dl className="task-detail__meta">
          <div className="meta-item">
            <dt className="meta-item__label">Created</dt>
            <dd className="meta-item__value">{formatTimestamp(task.createdAt)}</dd>
          </div>
          <div className="meta-item">
            <dt className="meta-item__label">Started</dt>
            <dd className="meta-item__value">{formatTimestamp(task.startedAt)}</dd>
          </div>
          <div className="meta-item">
            <dt className="meta-item__label">Completed</dt>
            <dd className="meta-item__value">{formatTimestamp(task.completedAt)}</dd>
          </div>
        </dl>

        <div className="task-detail__section" style={{ marginTop: '1.5rem' }}>
          <h3>Input</h3>
          <pre className="code-block">{task.inputText}</pre>
        </div>

        <div className="task-detail__section" style={{ marginTop: '1.5rem' }}>
          <h3>Result</h3>
          {task.status === 'FAILED' && (
            <p className="form-error">{task.errorMessage ?? 'Task failed'}</p>
          )}
          {task.result !== null ? (
            <pre className="code-block code-block--result">{task.result}</pre>
          ) : (
            <p className="empty-note">
              {task.status === 'FAILED' ? 'No result was produced.' : 'Waiting for the worker to finish…'}
            </p>
          )}
        </div>

        <div className="task-detail__section" style={{ marginTop: '1.5rem' }}>
          <h3>Execution logs</h3>
          <ul className="log-list">
            {task.logs.map((log, idx) => (
              <li
                key={idx}
                className={`log-list__item log-list__item--${log.level.toLowerCase()}`}
              >
                <span className="log-list__time">{formatTime(log.timestamp)}</span>
                <span className="log-list__level">{log.level}</span>
                <span className="log-list__message">{log.message}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
