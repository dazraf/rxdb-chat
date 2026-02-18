import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { OnlineIndicator } from './OnlineIndicator';
import { useTheme } from '../theme/ThemeContext';

const THEME_ICONS: Record<string, string> = {
  light: '\u2600',   // sun
  dark: '\uD83C\uDF19',    // moon
  system: '\uD83D\uDCBB',  // computer
};

export function NavBar() {
  const { user, logout } = useAuth();
  const { mode, cycleTheme } = useTheme();

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        RxDB Reddit
      </Link>
      <div className="nav-right">
        <OnlineIndicator />
        <button
          onClick={cycleTheme}
          className="theme-toggle"
          title={`Theme: ${mode}`}
        >
          {THEME_ICONS[mode]}
        </button>
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
