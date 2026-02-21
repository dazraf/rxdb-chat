import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useRxData, useRxCollection } from 'rxdb-hooks';
import { useAuth } from '../auth/AuthContext';
import { useTheme, type ThemeMode } from '../theme/ThemeContext';
import type { ProfileDoc } from 'shared/schemas';

const THEME_OPTIONS: { mode: ThemeMode; label: string; description: string }[] = [
  { mode: 'light', label: 'Light', description: 'Always use light theme' },
  { mode: 'dark', label: 'Dark', description: 'Always use dark theme' },
  { mode: 'system', label: 'System', description: 'Follow your device settings' },
];

export function SettingsPage() {
  const { user } = useAuth();
  const { mode, setTheme } = useTheme();
  const collection = useRxCollection<ProfileDoc>('profiles');

  const { result: profiles } = useRxData<ProfileDoc>('profiles', (c) =>
    c.findOne(user?.id),
  );
  const profile = profiles[0] as unknown as ProfileDoc | undefined;

  const handleThemeChange = useCallback(
    async (newMode: ThemeMode) => {
      // Apply immediately to the UI
      setTheme(newMode);

      // Persist to profile (replicates to server)
      if (user && collection && profile) {
        await collection.upsert({
          id: user.id,
          username: profile.username,
          avatarId: profile.avatarId,
          about: profile.about,
          themeMode: newMode,
          updatedAt: Date.now(),
          _deleted: false,
        });
      }
    },
    [setTheme, user, collection, profile],
  );

  return (
    <div className="settings-page">
      <Link to="/" className="back-link">&larr; Back to posts</Link>
      <h1>Settings</h1>

      <section>
        <h2>Theme</h2>
        <div className="theme-options">
          {THEME_OPTIONS.map((opt) => (
            <label key={opt.mode} className={`theme-option${mode === opt.mode ? ' selected' : ''}`}>
              <input
                type="radio"
                name="theme"
                value={opt.mode}
                checked={mode === opt.mode}
                onChange={() => handleThemeChange(opt.mode)}
              />
              <div>
                <strong>{opt.label}</strong>
                <span>{opt.description}</span>
              </div>
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}
