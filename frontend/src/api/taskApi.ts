import client from './client';
import type { ApiSuccess, OperationType, Pagination, Task } from '../types';

export async function createTaskRequest(input: {
  title: string;
  inputText: string;
  operationType: OperationType;
}): Promise<Task> {
  const { data } = await client.post<ApiSuccess<{ task: Task }>>('/tasks', input);
  return data.data.task;
}

export async function listTasksRequest(params: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<{ items: Task[]; pagination: Pagination }> {
  const { data } = await client.get<ApiSuccess<{ items: Task[]; pagination: Pagination }>>(
    '/tasks',
    { params }
  );
  return data.data;
}

export async function getTaskRequest(id: string): Promise<Task> {
  const { data } = await client.get<ApiSuccess<{ task: Task }>>(`/tasks/${id}`);
  return data.data.task;
}
