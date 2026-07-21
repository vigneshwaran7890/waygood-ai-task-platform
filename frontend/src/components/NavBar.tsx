import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const chars = parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[1][0];
  return chars.toUpperCase();
}

export default function NavBar() {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar__brand">
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
