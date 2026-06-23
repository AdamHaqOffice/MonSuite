import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider, missingFirebaseConfig } from './firebase.js';
import LoginPage from './pages/LoginPage.jsx';
import HubPage from './pages/HubPage.jsx';
import DownloadsPage from './pages/DownloadsPage.jsx';
import FirmwarePage from './pages/FirmwarePage.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import SupportPage from './pages/SupportPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import SetupBuilderPage from './pages/SetupBuilderPage.jsx';
import ChatbotPage from './pages/ChatbotPage.jsx';
import SystemBuilderPage from './pages/SystemBuilderPage.jsx';

const allowedEmailDomains = import.meta.env.VITE_ALLOWED_EMAIL_DOMAINS
  ?.split(',')
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

const legacyAllowedEmailDomain = import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();
const effectiveAllowedEmailDomains = allowedEmailDomains?.length
  ? allowedEmailDomains
  : legacyAllowedEmailDomain
    ? [legacyAllowedEmailDomain]
    : [];

function userIsAllowed(user) {
  if (!effectiveAllowedEmailDomains.length) return true;
  const email = user?.email?.toLowerCase() || '';
  return effectiveAllowedEmailDomains.some((domain) => email.endsWith(`@${domain}`));
}

function ProtectedRoute({ user, loading, children }) {
  const location = useLocation();

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="loader" />
        <p>Loading MonSuite...</p>
      </main>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    if (missingFirebaseConfig || !auth) {
      setLoading(false);
      return undefined;
    }

    getRedirectResult(auth).catch((error) => {
      setAuthError(error.message || 'Google login failed.');
    });

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && !userIsAllowed(currentUser)) {
        await signOut(auth);
        setUser(null);
        setAuthError('Access is limited to approved company email accounts.');
      } else {
        setUser(currentUser);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const authActions = useMemo(() => ({
    async loginWithGoogle() {
      setAuthError('');

      if (missingFirebaseConfig || !auth || !googleProvider) {
        setAuthError('Firebase is not configured yet. Add your Firebase values to .env first.');
        return;
      }

      try {
        await signInWithPopup(auth, googleProvider);
      } catch (error) {
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        setAuthError(error.message || 'Google login failed.');
      }
    },
    async logout() {
      if (auth) await signOut(auth);
    },
  }), []);

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage user={user} loading={loading} authError={authError} onGoogleLogin={authActions.loginWithGoogle} />}
      />
      <Route
        path="/"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <Navigate to="/hub" replace />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/hub"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <HubPage user={user} onLogout={authActions.logout} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/products"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <ProductsPage user={user} onLogout={authActions.logout} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/downloads"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <DownloadsPage user={user} onLogout={authActions.logout} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/firmware"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <FirmwarePage user={user} onLogout={authActions.logout} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/support"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <SupportPage user={user} onLogout={authActions.logout} />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/system-builder"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <SystemBuilderPage user={user} onLogout={authActions.logout} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/setup-builder"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <SetupBuilderPage user={user} onLogout={authActions.logout} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/parts-costing"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <PlaceholderPage user={user} onLogout={authActions.logout} title="Parts & Costing" />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/ai-assistant"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <ChatbotPage user={user} onLogout={authActions.logout} />
          </ProtectedRoute>
        )}
      />
    </Routes>
  );
}
