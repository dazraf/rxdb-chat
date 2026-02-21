import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useRxData } from 'rxdb-hooks';
import { useAuth } from '../auth/AuthContext';
import { AvatarIcon } from './AvatarIcon';
import type { ProfileDoc } from 'shared/schemas';

export function UserDropdown() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { result: profiles } = useRxData<ProfileDoc>('profiles', (collection) =>
    collection.findOne(user?.id),
  );
  const profile = profiles[0] as unknown as ProfileDoc | undefined;
  const avatarId = profile?.avatarId ?? 'default';

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  if (!user) return null;

  return (
    <div className="user-dropdown" ref={containerRef}>
      <button
        className="avatar-btn"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="User menu"
        aria-expanded={open}
      >
        <AvatarIcon avatarId={avatarId} size={24} />
      </button>
      {open && (
        <div className="dropdown-menu">
          <div className="dropdown-header">{user.username}</div>
          <Link to="/profile" className="dropdown-item" onClick={() => setOpen(false)}>
            Profile
          </Link>
          <Link to="/settings" className="dropdown-item" onClick={() => setOpen(false)}>
            Settings
          </Link>
          <button className="dropdown-item dropdown-logout" onClick={logout}>
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
