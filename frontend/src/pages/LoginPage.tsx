import { useState, type FocusEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '../api/client';
import { useAppDispatch } from '../store/hooks';
import { login } from '../store/authSlice';
import { ROUTES } from '../routes/paths';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

function validate(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};

  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = 'Enter a valid email address';
  }

  if (!password) {
    errors.password = 'Password is required';
  }

  return errors;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const fieldErrors = validate(email, password);

  const handleBlur = (field: 'email' | 'password') => (_event: FocusEvent) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched({ email: true, password: true });

    if (Object.keys(fieldErrors).length > 0) {
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await dispatch(login({ email, password })).unwrap();
      navigate(ROUTES.dashboard);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const showEmailError = touched.email && fieldErrors.email;
  const showPasswordError = touched.password && fieldErrors.password;

  
  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit} noValidate>
        <div className="auth-card__intro">
          <h1>Welcome back</h1>
          <p>Log in to view and run your tasks.</p>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="auth-card__fields">
          <label className={`field${showEmailError ? ' field--invalid' : ''}`}>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={handleBlur('email')}
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              aria-invalid={Boolean(showEmailError)}
            />
            {showEmailError && <span className="field-error">{fieldErrors.email}</span>}
          </label>
          <label className={`field${showPasswordError ? ' field--invalid' : ''}`}>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={handleBlur('password')}
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={Boolean(showPasswordError)}
            />
            {showPasswordError && <span className="field-error">{fieldErrors.password}</span>}
          </label>
        </div>

        <button type="submit" className="btn btn--primary btn--full" disabled={isSubmitting}>
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>

        <p className="auth-card__footer">
          Don&apos;t have an account? <Link to={ROUTES.register}>Create one</Link>
        </p>
      </form>
    </div>
  );
}
