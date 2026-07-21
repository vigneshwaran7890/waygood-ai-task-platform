import { useEffect, useRef } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectIsAuthenticated, selectIsSessionUnknown } from '../store/authSelectors';
import { ensureSession } from '../store/authSlice';

/**
 * Guards every route nested under it: requires a confirmed session, restoring
 * one on first visit if needed — either from a persisted access token
 * (localStorage) or, failing that, from the httpOnly refresh cookie. See
 * authSlice.ensureSession for exactly which network calls that does and does
 * not make. Unauthenticated users are redirected to /login — no protected
 * page is ever rendered without a confirmed session first.
 */
export default function ProtectedRoute() {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isSessionUnknown = useAppSelector(selectIsSessionUnknown);

  // StrictMode-safe: dispatch itself is idempotent per page load (authSlice's
  // ensureSession thunk guards the actual network call at module scope), so
  // this effect running twice in dev is harmless — it dispatches twice but
  // only the first dispatch ever reaches the network.
  const hasDispatched = useRef(false);
  useEffect(() => {
    if (hasDispatched.current) return;
    hasDispatched.current = true;
    dispatch(ensureSession());
  }, [dispatch]);

  if (isSessionUnknown) {
    return <div className="app-loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
