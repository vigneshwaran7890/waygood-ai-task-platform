import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

export default function ProtectedRoute() {
  const { isAuthenticated, isRestoringSession, ensureSession } = useAuth();
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    // Triggers the lazy /auth/refresh bootstrap the first time a protected
    // route is actually opened. If a session was already established (e.g.
    // via login() earlier in this tab), ensureSession resolves immediately
    // with no network call — see AuthContext.ensureSession.
    let cancelled = false;
    ensureSession().finally(() => {
      if (!cancelled) setHasChecked(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasChecked || isRestoringSession) {
    return <div className="app-loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
