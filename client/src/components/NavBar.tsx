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

export function NavBar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const { user, db } = useAuth();
  const { mode, resolved, cycleTheme } = useTheme();

  return (
    <nav className="navbar">
      <div className="nav-left">
        {user && onToggleSidebar && (
          <button onClick={onToggleSidebar} className="sidebar-toggle" title="Toggle subs">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="5" x2="17" y2="5" />
              <line x1="3" y1="10" x2="17" y2="10" />
              <line x1="3" y1="15" x2="17" y2="15" />
            </svg>
          </button>
        )}
        <Link to="/" className="nav-brand">
          <img
            src={resolved === 'dark' ? '/logo-nav-dark.png' : '/logo-nav.png'}
            alt="kith"
            className="nav-logo"
          />
        </Link>
      </div>
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
