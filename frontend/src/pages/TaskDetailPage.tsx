import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTaskRequest } from '../api/taskApi';
import { extractErrorMessage } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import type { Task } from '../types';

const POLL_INTERVAL_MS = 3000;
const TERMINAL_STATUSES = new Set(['SUCCESS', 'FAILED']);

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return undefined;

    let interval: ReturnType<typeof setInterval> | undefined;

    const load = async () => {
      try {
        const fetched = await getTaskRequest(id);
        setTask(fetched);
        setError(null);
        if (TERMINAL_STATUSES.has(fetched.status) && interval) {
          clearInterval(interval);
        }
      } catch (err) {
        setError(extractErrorMessage(err));
      }
    };

    load();
    interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id]);

  if (error) {
    return (
      <div className="panel">
        <p className="form-error">{error}</p>
        <Link to="/" className="btn btn--ghost">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!task) {
    return <div className="panel">Loading task...</div>;
  }

  return (
    <div className="dashboard">
      <section className="panel">
        <div className="task-detail__header">
          <h2>{task.title}</h2>
          <StatusBadge status={task.status} />
        </div>
        <dl className="task-detail__meta">
          <dt>Operation</dt>
          <dd>{task.operationType}</dd>
          <dt>Created</dt>
          <dd>{new Date(task.createdAt).toLocaleString()}</dd>
          <dt>Started</dt>
          <dd>{task.startedAt ? new Date(task.startedAt).toLocaleString() : '—'}</dd>
          <dt>Completed</dt>
          <dd>{task.completedAt ? new Date(task.completedAt).toLocaleString() : '—'}</dd>
        </dl>

        <h3>Input</h3>
        <pre className="code-block">{task.inputText}</pre>

        <h3>Result</h3>
        {task.status === 'FAILED' && (
          <p className="form-error">{task.errorMessage ?? 'Task failed'}</p>
        )}
        {task.result !== null ? (
          <pre className="code-block">{task.result}</pre>
        ) : (
          <p>Task has not produced a result yet.</p>
        )}

        <h3>Execution logs</h3>
        <ul className="log-list">
          {task.logs.map((log, idx) => (
            <li key={idx} className={`log-list__item log-list__item--${log.level.toLowerCase()}`}>
              <span className="log-list__time">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span>{log.message}</span>
            </li>
          ))}
        </ul>

        <Link to="/" className="btn btn--ghost">
          Back to dashboard
        </Link>
      </section>
    </div>
  );
}
