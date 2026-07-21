import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated } from '../store/authSelectors';

/**
 * Guards /login and /register: an already-authenticated user is sent to the
 * dashboard instead of seeing the auth forms again. Does not itself trigger
 * ensureSession — a public page must never cause a /auth/refresh call.
 */
export default function PublicOnlyRoute() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
