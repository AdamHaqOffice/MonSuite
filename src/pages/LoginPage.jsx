import { Navigate, useLocation } from 'react-router-dom';
import BrandLockup from '../components/BrandLockup.jsx';

export default function LoginPage({ user, loading, authError, onGoogleLogin }) {
  const location = useLocation();
  const from = location.state?.from?.pathname || '/hub';

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  return (
    <main className="login-page">
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

        <p className="login-footnote">
          Install MonSuite as a PWA on mobile for quick access to products, downloads, firmware, support, and the system builder.
        </p>
      </section>

      <section className="login-visual" aria-label="MonSuite overview">
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
