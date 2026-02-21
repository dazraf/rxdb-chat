import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../auth/api';
import { useAuth } from '../auth/AuthContext';

export function SignupPage() {
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
      const { token, user } = await signup(username, password);
      auth.login(token, user);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <img src="/logo.png" alt="Kith" className="auth-logo" />
      <h1>Sign Up</h1>
      <form onSubmit={handleSubmit}>
        {error && <div className="error">{error}</div>}
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating account...' : 'Sign Up'}
        </button>
      </form>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </div>
  );
}
