import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { OnlineIndicator } from './OnlineIndicator';
import { UserDropdown } from './UserDropdown';
import { useTheme } from '../theme/ThemeContext';
import { SunIcon } from './SunIcon';
import { MoonIcon } from './MoonIcon';
import { LaptopIcon } from './LaptopIcon';

const THEME_ICONS: Record<string, ReactNode> = {
  light: <SunIcon size={18} />,
  dark: <MoonIcon size={18} />,
  system: <LaptopIcon size={18} />,
};

export function NavBar() {
  const { user, db } = useAuth();
  const { mode, resolved, cycleTheme } = useTheme();

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        <img
          src={resolved === 'dark' ? '/logo-nav-dark.png' : '/logo-nav.png'}
          alt="kith"
          className="nav-logo"
        />
      </Link>
      <div className="nav-right">
        <OnlineIndicator />
        {user && (
          <button
            onClick={cycleTheme}
            className="theme-toggle"
            title={`Theme: ${mode}`}
          >
            {THEME_ICONS[mode]}
          </button>
        )}
        {user && db && <UserDropdown />}
      </div>
    </nav>
  );
}
