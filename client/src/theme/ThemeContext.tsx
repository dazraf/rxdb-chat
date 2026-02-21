import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

type OnThemeChange = (mode: ThemeMode) => void;

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  cycleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  /** Register a callback that fires on every user-initiated theme change. */
  registerOnChange: (cb: OnThemeChange) => () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'theme';
const CYCLE: ThemeMode[] = ['light', 'dark', 'system'];

function isValidTheme(v: string | null): v is ThemeMode {
  return v !== null && CYCLE.includes(v as ThemeMode);
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isValidTheme(saved) ? saved : 'system';
  });
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(mode));
  const listenersRef = useRef<Set<OnThemeChange>>(new Set());

  useEffect(() => {
    const r = resolveTheme(mode);
    setResolved(r);
    document.documentElement.dataset.theme = r;
    localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const r = getSystemTheme();
      setResolved(r);
      document.documentElement.dataset.theme = r;
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setTheme = useCallback((m: ThemeMode) => {
    setMode(m);
    for (const cb of listenersRef.current) cb(m);
  }, []);

  const cycleTheme = useCallback(() => {
    setMode((prev) => {
      const next = CYCLE[(CYCLE.indexOf(prev) + 1) % CYCLE.length];
      for (const cb of listenersRef.current) cb(next);
      return next;
    });
  }, []);

  const registerOnChange = useCallback((cb: OnThemeChange) => {
    listenersRef.current.add(cb);
    return () => { listenersRef.current.delete(cb); };
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, resolved, cycleTheme, setTheme, registerOnChange }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

/**
 * Syncs theme between the user's server-side profile and ThemeContext.
 *
 * - On initial profile load: applies the profile's themeMode (unless the
 *   user already changed the theme locally before the profile loaded).
 * - On user-initiated changes (cycle button, settings page): persists
 *   the new theme back to the profile via the saveToProfile callback.
 */
export function useProfileThemeSync(
  profileThemeMode: ThemeMode | undefined,
  saveToProfile: (mode: ThemeMode) => void,
) {
  const { mode, setTheme, registerOnChange } = useTheme();
  const initialized = useRef(false);
  const userChanged = useRef(false);

  // Context → Profile: register listener for user-initiated changes.
  // This must come first so userChanged is set before the profile loads.
  useEffect(() => {
    return registerOnChange(() => {
      userChanged.current = true;
    });
  }, [registerOnChange]);

  // Profile → Context: apply profile theme once on initial load,
  // but only if the user hasn't already changed the theme locally.
  useEffect(() => {
    if (!profileThemeMode || initialized.current) return;
    initialized.current = true;
    if (!userChanged.current && profileThemeMode !== mode) {
      setTheme(profileThemeMode);
    }
  }, [profileThemeMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Context → Profile: persist changes back
  useEffect(() => {
    return registerOnChange((newMode) => {
      saveToProfile(newMode);
    });
  }, [registerOnChange, saveToProfile]);
}
