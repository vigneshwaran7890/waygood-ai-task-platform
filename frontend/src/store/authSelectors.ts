import type { RootState } from './index';

export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => state.auth.status === 'authenticated';
export const selectIsSessionUnknown = (state: RootState) => state.auth.status === 'unknown';
