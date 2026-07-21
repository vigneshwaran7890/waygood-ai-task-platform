import type { TaskStatus } from '../types';

const STATUS_CLASS: Record<TaskStatus, string> = {
  PENDING: 'badge badge--pending',
  RUNNING: 'badge badge--running',
  SUCCESS: 'badge badge--success',
  FAILED: 'badge badge--failed',
};

export default function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={STATUS_CLASS[status]}>{status}</span>;
}
