import { createContext } from 'react';
import type { User } from '../types';

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** True while a session bootstrap (cookie -> access token) is in flight. */
  isRestoringSession: boolean;
  login: (user: User, accessToken: string) => void;
  logout: () => Promise<void>;
  /**
   * Lazily restores a session from the refresh cookie, at most once. Safe to
   * call from multiple components (e.g. several protected routes mounting in
   * quick succession) — they all await the same in-flight/resolved attempt
   * instead of each triggering their own /auth/refresh call.
   */
  ensureSession: () => Promise<boolean>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
