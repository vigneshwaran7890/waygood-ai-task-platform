import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createTaskRequest, listTasksRequest } from '../api/taskApi';
import { extractErrorMessage } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import type { OperationType, Task } from '../types';

const OPERATIONS: { value: OperationType; label: string; hint: string }[] = [
  { value: 'UPPERCASE', label: 'Uppercase', hint: 'HELLO WORLD' },
  { value: 'LOWERCASE', label: 'Lowercase', hint: 'hello world' },
  { value: 'REVERSE_STRING', label: 'Reverse string', hint: 'dlrow olleH' },
  { value: 'WORD_COUNT', label: 'Word count', hint: '2' },
];

const POLL_INTERVAL_MS = 4000;

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [inputText, setInputText] = useState('');
  const [operationType, setOperationType] = useState<OperationType>('UPPERCASE');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadTasks = async () => {
    try {
      const { items } = await listTasksRequest({ page: 1, limit: 50 });
      setTasks(items);
      setLoadError(null);
    } catch (err) {
      setLoadError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    const interval = setInterval(loadTasks, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setIsSubmitting(true);
    try {
      await createTaskRequest({ title, inputText, operationType });
      setTitle('');
      setInputText('');
      setOperationType('UPPERCASE');
      await loadTasks();
    } catch (err) {
      setFormError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Tasks</h1>
          <p>Submit a new task and track it through to completion.</p>
        </div>
      </div>

      <div className="dashboard">
        <section className="panel">
          <div className="panel__header">
            <h2>New task</h2>
          </div>
          <form onSubmit={handleSubmit} className="task-form" noValidate>
            {formError && <p className="form-error">{formError}</p>}

            <label className="field">
              <span>Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Normalize product names"
                maxLength={200}
                required
              />
            </label>

            <label className="field">
              <span>Input text</span>
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste or type the text to process…"
                rows={5}
                maxLength={20000}
                required
              />
            </label>

            <label className="field">
              <span>Operation</span>
              <select
                value={operationType}
                onChange={(e) => setOperationType(e.target.value as OperationType)}
              >
                {OPERATIONS.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              <span className="field-hint">
                Example: {OPERATIONS.find((op) => op.value === operationType)?.hint}
              </span>
            </label>

            <button
              type="submit"
              className="btn btn--primary task-form__submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Running task…' : 'Run task'}
            </button>
          </form>
        </section>

        <section className="panel panel--flush">
          <div className="panel__header">
            <h2>Your tasks</h2>
            {tasks.length > 0 && <span className="panel__count">{tasks.length}</span>}
          </div>

          {loadError && (
            <div style={{ padding: '0 1.25rem 1.25rem' }}>
              <p className="form-error">{loadError}</p>
            </div>
          )}

          {isLoading && !loadError && (
            <div className="empty-state">
              <p>Loading tasks…</p>
            </div>
          )}

          {!isLoading && !loadError && tasks.length === 0 && (
            <div className="empty-state">
              <span className="empty-state__icon">○</span>
              <p>No tasks yet. Create one to get started.</p>
            </div>
          )}

          {!isLoading && tasks.length > 0 && (
            <div className="task-table-wrap">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Operation</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th aria-hidden="true"></th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((task) => (
                    <tr key={task._id}>
                      <td className="task-table__title">{task.title}</td>
                      <td>
                        <span className="task-table__op">{task.operationType}</span>
                      </td>
                      <td>
                        <StatusBadge status={task.status} />
                      </td>
                      <td className="task-table__time">{formatTimestamp(task.createdAt)}</td>
                      <td>
                        <Link to={`/tasks/${task._id}`} className="btn btn--ghost btn--small">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
