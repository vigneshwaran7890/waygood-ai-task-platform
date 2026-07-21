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
 * Exchanges the httpOnly refresh cookie for a new access token. Called only
 * from two places: the axios 401 interceptor (client.ts) when an access
 * token has just failed, and authSlice's ensureSession thunk when a protected
 * route is opened with no access token stored at all.
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
