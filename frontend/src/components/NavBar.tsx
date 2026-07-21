import { Link } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectIsAuthenticated } from '../store/authSelectors';
import { ROUTES } from '../routes/paths';
import UserMenu from './UserMenu';

export default function NavBar() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  return (
    <header className="navbar">
      <Link to={ROUTES.dashboard} className="navbar__brand">
        <span className="navbar__brand-mark">AI</span>
        Task Platform
      </Link>
      {isAuthenticated && (
        <div className="navbar__actions">
          <UserMenu />
        </div>
      )}
    </header>
  );
}
