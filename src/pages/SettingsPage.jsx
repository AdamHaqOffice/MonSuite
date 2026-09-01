import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { APP_BUILD_DATE, APP_BUILD_NAME, APP_VERSION, appReleaseNotes } from '../data/appInfo.js';
import {
  adminBackendReady,
  clearAdminContent,
  getAdminContentSnapshot,
  getConfiguredAdminEmails,
  userCanUseAdminMode,
} from '../utils/adminContent.js';

async function clearMonSuiteCache() {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.update()));
      registrations.forEach((registration) => registration.active?.postMessage({ type: 'CLEAR_MONSUITE_CACHES' }));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith('monsuite-')).map((key) => caches.delete(key)));
    }
    window.alert('MonSuite cache was cleared for this site. The page will reload now.');
  } catch {
    window.alert('Browser cache cleanup was blocked, but the page will still reload.');
  }
  window.location.reload();
}

export default function SettingsPage({
  user,
  onLogout,
  theme,
  onToggleTheme,
  adminMode,
  onSetAdminMode,
  updateAvailable,
  onRefreshApp,
}) {
  const canAdmin = userCanUseAdminMode(user);
  const [snapshot, setSnapshot] = useState(() => getAdminContentSnapshot());
  const adminEmails = useMemo(() => getConfiguredAdminEmails(), []);

  function refreshSnapshot() {
    setSnapshot(getAdminContentSnapshot());
  }

  function handleClearAdminContent() {
    const ok = window.confirm('Clear locally staged admin-added news, downloads, and firmware changes on this browser? Firestore-published content will not be deleted.');
    if (!ok) return;
    clearAdminContent();
    refreshSnapshot();
  }

  return (
    <AppShell
      user={user}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      adminMode={adminMode}
      canUseAdminMode={canAdmin}
      updateAvailable={updateAvailable}
      onRefreshApp={onRefreshApp}
    >
      <main className="page-wrap settings-page">
        <section className="section-heading page-title settings-hero compact-human-hero">
          <div>
            <p className="eyebrow">Settings</p>
            <h1>Settings</h1>
            <p>Appearance, app version, update tools, and admin controls.</p>
          </div>
        </section>

        <section className="settings-grid">
          <article className="settings-card">
            <p className="eyebrow">Appearance</p>
            <h2>Theme</h2>
            <p>Switch between light and dark mode. The setting is saved on this browser.</p>
            <button className="button secondary" type="button" onClick={onToggleTheme}>
              Switch to {theme === 'dark' ? 'light' : 'dark'} mode
            </button>
          </article>

          <article className="settings-card">
            <p className="eyebrow">Version</p>
            <h2>MonSuite v{APP_VERSION}</h2>
            <p>{APP_BUILD_NAME} · {APP_BUILD_DATE}</p>
            <ul className="settings-release-list">
              {appReleaseNotes.map((note) => <li key={note}>{note}</li>)}
            </ul>
            <div className="settings-action-row">
              <button className="button primary" type="button" onClick={onRefreshApp || clearMonSuiteCache}>Refresh app</button>
              <button className="button secondary" type="button" onClick={clearMonSuiteCache}>Clear MonSuite cache</button>
            </div>
            <small>{updateAvailable ? 'An update is available.' : 'No newer version detected by this browser.'}</small>
          </article>

          <article className="settings-card admin-settings-card">
            <p className="eyebrow">Admin tools</p>
            <h2>Admin mode</h2>
            {canAdmin ? (
              <>
                <p>
                  Turn this on to publish or stage news, firmware entries, and manual/download links from inside MonSuite.
                </p>
                <label className="admin-toggle-row">
                  <input type="checkbox" checked={adminMode} onChange={(event) => onSetAdminMode(event.target.checked)} />
                  <span>{adminMode ? 'Admin mode is on' : 'Admin mode is off'}</span>
                </label>
                <div className="admin-content-counts">
                  <span>{adminBackendReady ? 'Firestore ready' : 'Local staging fallback'}</span>
                  <span>{snapshot.news.length} local news</span>
                  <span>{snapshot.downloads.length} local downloads</span>
                  <span>{snapshot.firmwareHistory.length} local firmware entries</span>
                </div>
                <button className="button secondary danger" type="button" onClick={handleClearAdminContent}>
                  Clear local staged content
                </button>
              </>
            ) : (
              <>
                <p>This account is not in the admin allowlist, so admin editing tools are hidden.</p>
                <small>Approved admin accounts: {adminEmails.join(', ')}</small>
              </>
            )}
          </article>

          <article className="settings-card wide-settings-card">
            <p className="eyebrow">Publishing setup</p>
            <h2>How Admin Mode saves content</h2>
            <p>
              If Firebase/Firestore is configured and the security rules allow it, Admin Mode writes to Firestore collections for news, downloads, and firmware history. Published items are shown to all users. If Firestore is not ready, MonSuite falls back to local staging on this browser so the forms still work for drafts and testing.
            </p>
          </article>
        </section>
      </main>
    </AppShell>
  );
}
