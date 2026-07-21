import type { TaskStatus } from '../types';

const STATUS_CLASS: Record<TaskStatus, string> = {
  PENDING: 'badge badge--pending',
  RUNNING: 'badge badge--running',
  SUCCESS: 'badge badge--success',
  FAILED: 'badge badge--failed',
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  SUCCESS: 'Success',
  FAILED: 'Failed',
};

export default function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</span>;
}
