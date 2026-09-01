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
import NewsPage from './pages/NewsPage.jsx';
import ScrubberSelectorPage from './pages/ScrubberSelectorPage.jsx';
import ATConnectPage from './pages/ATConnectPage.jsx';
import PressureMonitoringPage from './pages/PressureMonitoringPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import { getAdminModeEnabled, setAdminModeEnabled, userCanUseAdminMode } from './utils/adminContent.js';
import { APP_VERSION } from './data/appInfo.js';

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

function getStoredTheme() {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem('monsuite-theme');
  if (stored === 'dark' || stored === 'light') return stored;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
  const [theme, setTheme] = useState(getStoredTheme);
  const [adminMode, setAdminMode] = useState(getAdminModeEnabled);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('monsuite-theme', theme);
  }, [theme]);

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




  useEffect(() => {
    const handleUpdateReady = () => setUpdateAvailable(true);
    window.addEventListener('monsuite-update-ready', handleUpdateReady);

    fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.version && data.version !== APP_VERSION) setUpdateAvailable(true);
      })
      .catch(() => {});

    return () => window.removeEventListener('monsuite-update-ready', handleUpdateReady);
  }, []);

  async function handleRefreshApp() {
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith('monsuite-')).map((key) => caches.delete(key)));
      }
    } catch {
      // Reload even if cache cleanup is blocked by the browser.
    }
    window.location.reload();
  }

  useEffect(() => {
    if (!user || !userCanUseAdminMode(user)) {
      setAdminMode(false);
      return;
    }
    setAdminMode(getAdminModeEnabled());
  }, [user]);

  function handleSetAdminMode(enabled) {
    if (!userCanUseAdminMode(user)) {
      setAdminMode(false);
      setAdminModeEnabled(false);
      return;
    }
    setAdminMode(enabled);
    setAdminModeEnabled(enabled);
  }

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

  const themeControls = useMemo(() => ({
    theme,
    onToggleTheme() {
      setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
    },
  }), [theme]);

  const protectedPageProps = {
    onLogout: authActions.logout,
    theme,
    onToggleTheme: themeControls.onToggleTheme,
    adminMode,
    canUseAdminMode: userCanUseAdminMode(user),
    onSetAdminMode: handleSetAdminMode,
    updateAvailable,
    onRefreshApp: handleRefreshApp,
  };

  return (
    <Routes>
      <Route
        path="/login"
        element={(
          <LoginPage
            user={user}
            loading={loading}
            authError={authError}
            onGoogleLogin={authActions.loginWithGoogle}
            theme={theme}
            onToggleTheme={themeControls.onToggleTheme}
          />
        )}
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
            <HubPage user={user} {...protectedPageProps} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/products"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <ProductsPage user={user} {...protectedPageProps} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/downloads"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <DownloadsPage user={user} {...protectedPageProps} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/firmware"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <FirmwarePage user={user} {...protectedPageProps} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/news"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <NewsPage user={user} {...protectedPageProps} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/scrubber-selector"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <ScrubberSelectorPage user={user} {...protectedPageProps} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/at-connect"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <ATConnectPage user={user} {...protectedPageProps} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/pressure-monitoring"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <PressureMonitoringPage user={user} {...protectedPageProps} />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/settings"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <SettingsPage user={user} {...protectedPageProps} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/support"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <SupportPage user={user} {...protectedPageProps} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/system-builder"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <SystemBuilderPage user={user} {...protectedPageProps} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/setup-builder"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <ScrubberSelectorPage user={user} {...protectedPageProps} />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/parts-costing"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <PlaceholderPage user={user} {...protectedPageProps} title="Parts & Costing" />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/ai-assistant"
        element={(
          <ProtectedRoute user={user} loading={loading}>
            <ChatbotPage user={user} {...protectedPageProps} />
          </ProtectedRoute>
        )}
      />
    </Routes>
  );
}
