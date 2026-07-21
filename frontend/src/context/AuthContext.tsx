import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import type { User } from '../types';
import { refreshRequest, logoutRequest } from '../api/authApi';
import { setAccessToken } from '../api/tokenStore';
import { AuthContext } from './authContextDefinition';

type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

const USER_STORAGE_KEY = 'auth.user';

function readStoredUser(): User | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // The cached user is only a display hint (avoids a name flash once a
  // session is confirmed) — isAuthenticated never comes from this alone, only
  // from a real access token having been set via login() or ensureSession().
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [status, setStatus] = useState<SessionStatus>('unknown');

  // Guards against duplicate /auth/refresh calls: once a bootstrap attempt has
  // started, every caller of ensureSession() awaits this same promise instead
  // of firing a new request. Refs (not state) because this must be readable
  // synchronously inside ensureSession's own body, before any re-render.
  const bootstrapRef = useRef<Promise<boolean> | null>(null);

  const applySession = useCallback((nextUser: User, accessToken: string) => {
    setAccessToken(accessToken);
    setUser(nextUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    setStatus('anonymous');
  }, []);

  const ensureSession = useCallback((): Promise<boolean> => {
    if (status === 'authenticated') return Promise.resolve(true);
    if (status === 'anonymous') return Promise.resolve(false);

    // status === 'unknown': this is the only branch that may call the network,
    // and only the first caller actually does — everyone else shares its promise.
    if (!bootstrapRef.current) {
      bootstrapRef.current = refreshRequest()
        .then(({ user: restoredUser, accessToken }) => {
          applySession(restoredUser, accessToken);
          return true;
        })
        .catch(() => {
          clearSession();
          return false;
        })
        .finally(() => {
          bootstrapRef.current = null;
        });
    }

    return bootstrapRef.current;
  }, [status, applySession, clearSession]);

  const login = useCallback(
    (nextUser: User, accessToken: string) => {
      applySession(nextUser, accessToken);
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: status === 'authenticated',
      isRestoringSession: status === 'unknown',
      login,
      logout,
      ensureSession,
    }),
    [user, status, login, logout, ensureSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
