import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import BrandLockup from './BrandLockup.jsx';
import { APP_VERSION } from '../data/appInfo.js';

async function clearAndReload() {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
      registration?.active?.postMessage({ type: 'CLEAR_MONSUITE_CACHES' });
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('monsuite-')).map((key) => caches.delete(key)));
    }
  } catch {
    // Reload even if the browser blocks a cache operation.
  }
  window.location.reload();
}

export default function AppShell({ user, onLogout, theme = 'light', onToggleTheme, adminMode = false, canUseAdminMode = false, updateAvailable = false, onRefreshApp, children }) {
  const isDark = theme === 'dark';
  const [localUpdateAvailable, setLocalUpdateAvailable] = useState(false);
  const showUpdate = updateAvailable || localUpdateAvailable;
  const refreshApp = onRefreshApp || clearAndReload;

  useEffect(() => {
    const handleUpdateReady = () => setLocalUpdateAvailable(true);
    window.addEventListener('monsuite-update-ready', handleUpdateReady);

    fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (data?.version && data.version !== APP_VERSION) setLocalUpdateAvailable(true);
      })
      .catch(() => {});

    return () => window.removeEventListener('monsuite-update-ready', handleUpdateReady);
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <BrandLockup to="/hub" compact subtitle="Monitor support hub" />

        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/hub">Hub</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/downloads">Downloads</NavLink>
          <NavLink to="/firmware">Firmware</NavLink>
          <NavLink to="/news">News</NavLink>
          <NavLink to="/scrubber-selector">Airflow Planner</NavLink>
          <NavLink to="/at-connect">AT Connect</NavLink>
          <NavLink to="/pressure-monitoring">Pressure Guide</NavLink>
          <NavLink to="/ai-assistant">AbateBot</NavLink>
          <NavLink to="/support">Support</NavLink>
          <NavLink className="desktop-only-link" to="/setup-builder">Setup</NavLink>
          <NavLink className="mobile-only-link" to="/system-builder">System Builder</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>

        <div className="user-menu">
          <button
            className="theme-toggle"
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            <span className="theme-toggle-track"><i /></span>
            <strong>{isDark ? 'Dark' : 'Light'}</strong>
          </button>
          {showUpdate ? <button className="button primary small update-pill" type="button" onClick={refreshApp}>Update</button> : null}
          {canUseAdminMode && adminMode ? <span className="admin-mode-badge">Admin</span> : null}
          <span className="app-version-pill" title="MonSuite version">v{APP_VERSION}</span>
          <span title={user?.email}>{user?.displayName || user?.email}</span>
          <button className="button secondary small" onClick={onLogout}>Sign out</button>
        </div>
      </header>
      {showUpdate ? (
        <div className="app-update-banner">
          <strong>New MonSuite update available.</strong>
          <span>Refresh to load the newest version.</span>
          <button className="button primary small" type="button" onClick={refreshApp}>Refresh app</button>
        </div>
      ) : null}
      {children}
    </div>
  );
}
