// The access token is persisted in localStorage so it survives page reloads
// and tab closes — a returning user with a still-valid access token skips
// the /auth/refresh round-trip entirely on their next visit.
//
// Trade-off, explicit: unlike an in-memory-only token, this is readable by
// any JavaScript running on the page (e.g. an XSS payload from a compromised
// dependency), for as long as it stays in storage. The refresh token is not
// affected either way — it lives only in an httpOnly cookie the backend set,
// which this (or any) JS can never read, write, or delete directly.
const ACCESS_TOKEN_STORAGE_KEY = 'auth.accessToken';

function readStoredAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  } catch {
    // localStorage can throw in rare environments (private browsing quirks,
    // storage disabled by policy) — fail safe to "no token" rather than crash.
    return null;
  }
}

let accessToken: string | null = readStoredAccessToken();

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  try {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    }
  } catch {
    // Storage write failed; the in-memory value is still authoritative for
    // the current tab, so requests keep working for this session regardless.
  }
  listeners.forEach((listener) => listener(token));
}

export function onAccessTokenChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
