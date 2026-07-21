// The access token lives only in memory (a module-level variable), never in
// localStorage/sessionStorage, so it cannot be exfiltrated by reading browser
// storage (e.g. via an injected script). It is naturally cleared on tab close
// or full page reload — the refresh token cookie is what re-establishes a
// session afterwards via silent refresh (see AuthContext).
let accessToken: string | null = null;

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
  listeners.forEach((listener) => listener(token));
}

export function onAccessTokenChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
