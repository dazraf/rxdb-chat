import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { getDatabase, AppDatabase } from '../database';
import { startReplication, cancelReplication, setOnAuthError } from '../database/replication';
import { startUploadSync } from '../database/uploadSync';

/** Return true if a JWT's exp claim is in the past (or unparseable). */
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // 60-second buffer so we don't use a token right on the edge
    return typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() - 60_000;
  } catch {
    return true;
  }
}

interface User {
  id: string;
  username: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  db: AppDatabase | null;
  loading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize database
  useEffect(() => {
    getDatabase().then((database) => {
      setDb(database);
    });
  }, []);

  // Restore session from localStorage (skip expired tokens)
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      if (isTokenExpired(savedToken)) {
        console.log('[auth] stored token expired, clearing session');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    }
    setLoading(false);
  }, []);

  // Manage replication lifecycle based on auth state + db readiness
  useEffect(() => {
    if (db && token) {
      startReplication(db, token);
      startUploadSync(token);
    }
    return () => {
      cancelReplication();
    };
  }, [db, token]);

  const loginFn = useCallback((newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logoutRef = useRef<() => void>();
  const logout = useCallback(() => {
    cancelReplication();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);
  logoutRef.current = logout;

  // Auto-logout when replication receives a 401
  useEffect(() => {
    setOnAuthError(() => {
      console.log('[auth] 401 from replication, logging out');
      logoutRef.current?.();
    });
    return () => setOnAuthError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, db, loading, login: loginFn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
