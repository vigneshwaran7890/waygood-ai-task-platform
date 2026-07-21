import client from './client';
import type { ApiSuccess, User } from '../types';

export interface AuthPayload {
  user: User;
  accessToken: string;
}

export async function registerRequest(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthPayload> {
  const { data } = await client.post<ApiSuccess<AuthPayload>>('/auth/register', input);
  return data.data;
}

export async function loginRequest(input: {
  email: string;
  password: string;
}): Promise<AuthPayload> {
  const { data } = await client.post<ApiSuccess<AuthPayload>>('/auth/login', input);
  return data.data;
}

/**
 * Exchanges the httpOnly refresh cookie for a new access token. Used on app
 * load to silently re-establish a session without asking the user to log in
 * again, as long as their refresh cookie is still valid.
 */
export async function refreshRequest(): Promise<AuthPayload> {
  const { data } = await client.post<ApiSuccess<AuthPayload>>('/auth/refresh');
  return data.data;
}

export async function logoutRequest(): Promise<void> {
  await client.post('/auth/logout');
}

export async function logoutAllRequest(): Promise<void> {
  await client.post('/auth/logout-all');
}

export async function fetchCurrentUser(): Promise<User> {
  const { data } = await client.get<ApiSuccess<{ user: User }>>('/auth/me');
  return data.data.user;
}
