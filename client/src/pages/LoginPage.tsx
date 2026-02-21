import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../auth/api';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { token, user } = await login(username, password);
      auth.login(token, user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <img src="/logo.png" alt="Kith" className="auth-logo" />
      <h1>Log In</h1>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      <p>
        Don't have an account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
}
