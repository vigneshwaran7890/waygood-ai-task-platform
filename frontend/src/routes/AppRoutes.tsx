import { Navigate, Route, Routes } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated } from '../store/authSelectors';
import ProtectedRoute from './ProtectedRoute';
import PublicOnlyRoute from './PublicOnlyRoute';
import { ROUTES, TASK_DETAIL_PATTERN } from './paths';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import DashboardPage from '../pages/DashboardPage';
import TaskDetailPage from '../pages/TaskDetailPage';
import ProfilePage from '../pages/ProfilePage';

export default function AppRoutes() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path={ROUTES.login} element={<LoginPage />} />
        <Route path={ROUTES.register} element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path={ROUTES.dashboard} element={<DashboardPage />} />
        <Route path={TASK_DETAIL_PATTERN} element={<TaskDetailPage />} />
        <Route path={ROUTES.profile} element={<ProfilePage />} />
      </Route>

      {/*
        Unknown URL: send straight to whichever entry point is actually
        reachable right now, instead of always redirecting to "/" and letting
        ProtectedRoute bounce it again to /login for a logged-out visitor.
      */}
      <Route
        path="*"
        element={<Navigate to={isAuthenticated ? ROUTES.dashboard : ROUTES.login} replace />}
      />
    </Routes>
  );
}
