export type OperationType = 'UPPERCASE' | 'LOWERCASE' | 'REVERSE_STRING' | 'WORD_COUNT';

export type TaskStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'ERROR';
  message: string;
}

export interface Task {
  _id: string;
  user: string;
  title: string;
  inputText: string;
  operationType: OperationType;
  status: TaskStatus;
  result: string | null;
  logs: LogEntry[];
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  message: string;
  details?: unknown;
}
