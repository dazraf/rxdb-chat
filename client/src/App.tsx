import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider as RxDBProvider } from 'rxdb-hooks';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ThemeProvider } from './theme/ThemeContext';
import { NavBar } from './components/NavBar';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { HomePage } from './pages/HomePage';
import { CreatePostPage } from './pages/CreatePostPage';
import { PostDetailPage } from './pages/PostDetailPage';
import { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, db, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!db) return <div className="loading">Loading...</div>;
  return <>{children}</>;
}

function AppRoutes() {
  const { db } = useAuth();

  const routes = (
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
    </Routes>
  );

  if (db) {
    return <RxDBProvider db={db}>{routes}</RxDBProvider>;
  }

  return routes;
}

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <NavBar />
          <main className="container">
            <AppRoutes />
          </main>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
