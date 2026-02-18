import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { OnlineIndicator } from './OnlineIndicator';

export function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        RxDB Reddit
      </Link>
      <div className="nav-right">
        <OnlineIndicator />
        {user && (
          <>
            <span className="nav-user">{user.username}</span>
            <button onClick={logout} className="btn-link">
              Log out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
