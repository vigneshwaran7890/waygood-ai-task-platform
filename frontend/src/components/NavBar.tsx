import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
        AI Task Platform
      </Link>
      {isAuthenticated && (
        <div className="navbar__actions">
          <span className="navbar__user">{user?.name}</span>
          <button type="button" onClick={handleLogout} className="btn btn--ghost">
            Log out
          </button>
        </div>
      )}
    </header>
  );
}
