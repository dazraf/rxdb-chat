import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: 'light' | 'dark';
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'theme';
const CYCLE: ThemeMode[] = ['light', 'dark', 'system'];

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system' ? getSystemTheme() : mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    return saved && CYCLE.includes(saved) ? saved : 'system';
  });
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => resolveTheme(mode));

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

  const cycleTheme = useCallback(() => {
    setMode((prev) => CYCLE[(CYCLE.indexOf(prev) + 1) % CYCLE.length]);
  }, []);

  return (
    <ThemeContext.Provider value={{ mode, resolved, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
