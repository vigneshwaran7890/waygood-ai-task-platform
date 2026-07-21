import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { createTaskRequest, listTasksRequest } from '../api/taskApi';
import { extractErrorMessage } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import type { OperationType, Task } from '../types';

const OPERATIONS: { value: OperationType; label: string }[] = [
  { value: 'UPPERCASE', label: 'Uppercase' },
  { value: 'LOWERCASE', label: 'Lowercase' },
  { value: 'REVERSE_STRING', label: 'Reverse String' },
  { value: 'WORD_COUNT', label: 'Word Count' },
];

const POLL_INTERVAL_MS = 4000;

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
    <div className="dashboard">
      <section className="panel">
        <h2>Create a new task</h2>
        <form onSubmit={handleSubmit} className="task-form">
          {formError && <p className="form-error">{formError}</p>}
          <label className="field">
            <span>Task title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />
          </label>
          <label className="field">
            <span>Input text</span>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={4}
              maxLength={20000}
              required
            />
          </label>
          <label className="field">
            <span>Operation type</span>
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
          </label>
          <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Running task...' : 'Run Task'}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>Your tasks</h2>
        {isLoading && <p>Loading tasks...</p>}
        {loadError && <p className="form-error">{loadError}</p>}
        {!isLoading && tasks.length === 0 && <p>No tasks yet. Create one above.</p>}
        {tasks.length > 0 && (
          <table className="task-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Operation</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task._id}>
                  <td>{task.title}</td>
                  <td>{task.operationType}</td>
                  <td>
                    <StatusBadge status={task.status} />
                  </td>
                  <td>{new Date(task.createdAt).toLocaleString()}</td>
                  <td>
                    <Link to={`/tasks/${task._id}`} className="btn btn--ghost btn--small">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
