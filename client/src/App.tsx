import { useCallback, useEffect, useState, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider as RxDBProvider, useRxData, useRxCollection } from 'rxdb-hooks';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ThemeProvider, useProfileThemeSync, useTheme, type ThemeMode } from './theme/ThemeContext';
import { NavBar } from './components/NavBar';
import { SubSidebar } from './components/SubSidebar';
import type { ProfileDoc } from 'shared/schemas';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { HomePage } from './pages/HomePage';
import { CreatePostPage } from './pages/CreatePostPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { SubListPage } from './pages/SubListPage';
import { SubDetailPage } from './pages/SubDetailPage';
import { CreateSubPage } from './pages/CreateSubPage';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, db, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!db) return <div className="loading">Loading...</div>;
  return <>{children}</>;
}

function ProfileThemeSync() {
  const { user } = useAuth();
  const collection = useRxCollection<ProfileDoc>('profiles');
  const { result: profiles } = useRxData<ProfileDoc>('profiles', (c) =>
    c.findOne(user?.id),
  );
  const profile = profiles[0] as unknown as ProfileDoc | undefined;

  const saveToProfile = useCallback(
    (mode: ThemeMode) => {
      if (!user || !collection || !profile) return;
      collection.upsert({
        id: user.id,
        username: profile.username,
        avatarId: profile.avatarId,
        about: profile.about,
        themeMode: mode,
        updatedAt: Date.now(),
        _deleted: false,
      });
    },
    [user, collection, profile],
  );

  useProfileThemeSync(profile?.themeMode, saveToProfile);
  return null;
}

function AppRoutes() {
  const { db, user, loading } = useAuth();
  const { setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Reset theme to system default when logged out.
  // By the time this effect runs, ProfileThemeSync has already unmounted
  // and its listeners are cleaned up, so setTheme won't trigger saveToProfile.
  useEffect(() => {
    if (!loading && !user) {
      setTheme('system');
    }
  }, [user, loading, setTheme]);

  const content = (
    <>
      <NavBar onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      <div className="app-layout">
        {user && db && (
          <SubSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}
        <main className="container">
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <HomePage />
                </RequireAuth>
              }
            />
            <Route
              path="/create"
              element={
                <RequireAuth>
                  <CreatePostPage />
                </RequireAuth>
              }
            />
            <Route
              path="/post/:id"
              element={
                <RequireAuth>
                  <PostDetailPage />
                </RequireAuth>
              }
            />
            <Route
              path="/subs"
              element={
                <RequireAuth>
                  <SubListPage />
                </RequireAuth>
              }
            />
            <Route
              path="/s/:subName"
              element={
                <RequireAuth>
                  <SubDetailPage />
                </RequireAuth>
              }
            />
            <Route
              path="/create-sub"
              element={
                <RequireAuth>
                  <CreateSubPage />
                </RequireAuth>
              }
            />
            <Route
              path="/profile"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            <Route
              path="/profile/:userId"
              element={
                <RequireAuth>
                  <ProfilePage />
                </RequireAuth>
              }
            />
            <Route
              path="/settings"
              element={
                <RequireAuth>
                  <SettingsPage />
                </RequireAuth>
              }
            />
          </Routes>
        </main>
      </div>
    </>
  );

  if (db) {
    return (
      <RxDBProvider db={db}>
        {user && <ProfileThemeSync />}
        {content}
      </RxDBProvider>
    );
  }

  return content;
}

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
