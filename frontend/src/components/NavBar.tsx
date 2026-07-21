import { Link, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectIsAuthenticated, selectUser } from '../store/authSelectors';
import { logout } from '../store/authSlice';
import { ROUTES } from '../routes/paths';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const chars = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0];
  return chars.toUpperCase();
}

export default function NavBar() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await dispatch(logout());
    navigate(ROUTES.login);
  };

  return (
    <header className="navbar">
      <Link to={ROUTES.dashboard} className="navbar__brand">
        <span className="navbar__brand-mark">AI</span>
        Task Platform
      </Link>
      {isAuthenticated && user && (
        <div className="navbar__actions">
          <span className="navbar__user">
            <span className="navbar__avatar">{initials(user.name)}</span>
            {user.name}
          </span>
          <button type="button" onClick={handleLogout} className="btn btn--ghost btn--small">
            Log out
          </button>
        </div>
      )}
    </header>
  );
}
