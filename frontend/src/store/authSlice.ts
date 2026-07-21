import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { fetchCurrentUser, loginRequest, logoutRequest, refreshRequest, registerRequest } from '../api/authApi';
import { getAccessToken, setAccessToken } from '../api/tokenStore';
import type { User } from '../types';

type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

interface AuthState {
  user: User | null;
  status: SessionStatus;
}

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

function persistUser(user: User | null) {
  if (user) {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

const initialState: AuthState = {
  // Cached purely as a display hint (avoids a name flash once the real
  // session check resolves) — status still starts 'unknown' regardless, so
  // isAuthenticated is never derived from this cache alone.
  user: readStoredUser(),
  status: 'unknown',
};

/**
 * Module-level (not component-level) singleton guard for the session
 * bootstrap call. This lives outside React entirely, so it is immune to
 * React.StrictMode's dev-only mount -> discard -> remount cycle, to multiple
 * ProtectedRoute instances mounting in the same tick, and to component
 * remounts in general: at most one bootstrap attempt runs per page load, no
 * matter how many times React (re)renders anything.
 */
let bootstrapPromise: Promise<User | null> | null = null;

/**
 * Establishes whether there's a usable session, at most once per page load.
 * Dispatched by the ProtectedRoute guard the first time a protected route is
 * actually opened — never unconditionally on app start, and never from a
 * public page like /login or /register.
 *
 * Two paths, in order:
 *  1. A persisted access token already exists (localStorage survived a
 *     reload/tab reopen) -> trust it and confirm who it belongs to via
 *     GET /auth/me. No /auth/refresh call here. If that token turns out to
 *     be expired, /auth/me itself 401s, the axios interceptor in client.ts
 *     transparently calls /auth/refresh and retries — refresh is still only
 *     ever triggered by an actual access-token failure, exactly once.
 *  2. No access token at all -> the only case that calls /auth/refresh
 *     directly, to find out if the httpOnly refresh cookie still grants a
 *     session (e.g. a returning user whose access token already expired
 *     before they came back, or a first visit after logging in elsewhere).
 */
export const ensureSession = createAsyncThunk<
  User | null,
  void,
  { state: { auth: AuthState } }
>('auth/ensureSession', async (_arg, { getState }) => {
  const { status, user } = getState().auth;
  if (status === 'authenticated') return user;
  if (status === 'anonymous') return null;

  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      if (getAccessToken()) {
        try {
          return await fetchCurrentUser();
        } catch {
          setAccessToken(null);
          return null;
        }
      }

      try {
        const payload = await refreshRequest();
        setAccessToken(payload.accessToken);
        return payload.user;
      } catch {
        setAccessToken(null);
        return null;
      }
    })().finally(() => {
      bootstrapPromise = null;
    });
  }

  return bootstrapPromise;
});

export const login = createAsyncThunk(
  'auth/login',
  async (input: { name: string; email: string; password: string } | { email: string; password: string }) => {
    const payload = 'name' in input ? await registerRequest(input) : await loginRequest(input);
    setAccessToken(payload.accessToken);
    return payload;
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await logoutRequest();
  } finally {
    setAccessToken(null);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(login.fulfilled, (state, action: PayloadAction<{ user: User; accessToken: string }>) => {
        state.user = action.payload.user;
        state.status = 'authenticated';
        persistUser(action.payload.user);
      })
      .addCase(ensureSession.fulfilled, (state, action: PayloadAction<User | null>) => {
        if (action.payload) {
          state.user = action.payload;
          state.status = 'authenticated';
          persistUser(action.payload);
        } else {
          state.user = null;
          state.status = 'anonymous';
          persistUser(null);
        }
      })
      .addCase(ensureSession.rejected, (state) => {
        state.user = null;
        state.status = 'anonymous';
        persistUser(null);
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = 'anonymous';
        persistUser(null);
      })
      .addCase(logout.rejected, (state) => {
        // Even if the logout request itself failed (e.g. network error), the
        // access token has already been cleared locally by the thunk — treat
        // the client-side session as ended either way.
        state.user = null;
        state.status = 'anonymous';
        persistUser(null);
      });
  },
});

export default authSlice.reducer;

export type { AuthState };
