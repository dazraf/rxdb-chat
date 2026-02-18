import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getDatabase, AppDatabase } from '../database';
import { startReplication, cancelReplication } from '../database/replication';
import { startUploadSync } from '../database/uploadSync';

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

  // Restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
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

  const logout = useCallback(() => {
    cancelReplication();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
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
