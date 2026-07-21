import { Link } from 'react-router-dom';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/authSelectors';
import { ROUTES } from '../routes/paths';

function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ProfilePage() {
  const user = useAppSelector(selectUser);

  if (!user) {
    return null;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Profile</h1>
          <p>Your account details.</p>
        </div>
      </div>

      <section className="panel profile-card">
        <div className="profile-card__avatar">
          {user.name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join('')
            .toUpperCase()}
        </div>

        <dl className="profile-card__details">
          <div className="meta-item">
            <dt className="meta-item__label">Name</dt>
            <dd className="meta-item__value">{user.name}</dd>
          </div>
          <div className="meta-item">
            <dt className="meta-item__label">Email</dt>
            <dd className="meta-item__value">{user.email}</dd>
          </div>
          <div className="meta-item">
            <dt className="meta-item__label">Member since</dt>
            <dd className="meta-item__value">{formatJoinDate(user.createdAt)}</dd>
          </div>
        </dl>

        <Link to={ROUTES.dashboard} className="btn btn--ghost btn--small">
          ← Back to dashboard
        </Link>
      </section>
    </>
  );
}
