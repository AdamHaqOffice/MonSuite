import { Navigate, useLocation } from 'react-router-dom';
import BrandLockup from '../components/BrandLockup.jsx';

export default function LoginPage({ user, loading, authError, onGoogleLogin, theme = 'light', onToggleTheme }) {
  const location = useLocation();
  const from = location.state?.from?.pathname || '/hub';

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  const isDark = theme === 'dark';

  return (
    <main className="login-page">
      <button className="theme-toggle login-theme-toggle" type="button" onClick={onToggleTheme} aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}>
        <span className="theme-toggle-track"><i /></span>
        <strong>{isDark ? 'Dark' : 'Light'}</strong>
      </button>
      <section className="login-panel">
        <BrandLockup to={null} login subtitle="Secure sales portal" />

        <h2>Monitor product support, all in one place.</h2>
        <p className="login-copy">
          Sign in with your approved Google account to access product knowledge, manuals, firmware updates,
          support links, and both the desktop setup builder and mobile system builder.
        </p>

        {authError && <div className="alert">{authError}</div>}

        <button className="button primary full" onClick={onGoogleLogin} disabled={loading}>
          Continue with Google
        </button>

        <div className="login-footnote work-account-note">
          <strong>Using a work Google account on mobile?</strong>
          <p>
            Install MonSuite from your work browser or work profile. If the app opens the wrong Google account,
            delete the personal install, open MonSuite in Work Chrome, then use the browser menu to install again.
          </p>
        </div>
      </section>

      <section className="login-visual" aria-label="MonSuite overview">
        <div className="brand-showcase-card">
          <span className="brand-showcase-eyebrow">Abatement Technologies</span>
          <img className="brand-showcase-logo" src="/abatement-brand-slogan.png" alt="Abatement Technologies — Leaders in Clean Air" />
          <p>Equipment, supplies, training, and support — now connected through MonSuite for monitor products.</p>
        </div>
        <div className="screen-card main-screen">
          <div className="screen-header">
            <span />
            <span />
            <span />
          </div>
          <div className="metric-row">
            <div>
              <strong>Documents</strong>
              <small>Manuals · Guides · Specs</small>
            </div>
            <span>Ready</span>
          </div>
          <div className="metric-row">
            <div>
              <strong>Firmware</strong>
              <small>Versions · Notes · Updates</small>
            </div>
            <span>Tracked</span>
          </div>
          <div className="metric-row">
            <div>
              <strong>System Builder</strong>
              <small>Mobile · Power · Parts</small>
            </div>
            <span>PWA</span>
          </div>
          <div className="metric-row muted">
            <div>
              <strong>Setup Builder</strong>
              <small>Desktop CAD-lite</small>
            </div>
            <span>Desktop</span>
          </div>
        </div>
      </section>
    </main>
  );
}
