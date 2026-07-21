import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '../types';
import { refreshRequest, logoutRequest } from '../api/authApi';
import { setAccessToken } from '../api/tokenStore';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  /** True while the initial silent-refresh (cookie -> session) is in flight. */
  isInitializing: boolean;
  login: (user: User, accessToken: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
  // The cached user is only a display hint (avoids a login-page flash before
  // the silent refresh resolves) — isAuthenticated is never trusted from this
  // alone; it flips true only once a real access token is in memory.
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [hasSession, setHasSession] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function trySilentRefresh() {
      try {
        const { user: refreshedUser, accessToken } = await refreshRequest();
        if (cancelled) return;
        setAccessToken(accessToken);
        setUser(refreshedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(refreshedUser));
        setHasSession(true);
      } catch {
        if (cancelled) return;
        setAccessToken(null);
        setUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);
        setHasSession(false);
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }

    trySilentRefresh();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = (nextUser: User, accessToken: string) => {
    setAccessToken(accessToken);
    setUser(nextUser);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
    setHasSession(true);
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } finally {
      setAccessToken(null);
      setUser(null);
      localStorage.removeItem(USER_STORAGE_KEY);
      setHasSession(false);
    }
  };

  const value = useMemo(
    () => ({ user, isAuthenticated: hasSession, isInitializing, login, logout }),
    [user, hasSession, isInitializing]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
