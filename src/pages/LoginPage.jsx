import { Navigate, useLocation } from 'react-router-dom';

export default function LoginPage({ user, loading, authError, onGoogleLogin }) {
  const location = useLocation();
  const from = location.state?.from?.pathname || '/hub';

  if (!loading && user) {
    return <Navigate to={from} replace />;
  }

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className="brand-lockup">
          <span className="brand-icon large">M</span>
          <div>
            <p className="eyebrow">Secure sales portal</p>
            <h1>MonSuite</h1>
          </div>
        </div>

        <h2>Monitor product support, all in one place.</h2>
        <p className="login-copy">
          Sign in with your approved Google account to access product knowledge, manuals, firmware updates,
          support links, and future setup tools.
        </p>

        {authError && <div className="alert">{authError}</div>}

        <button className="button primary full" onClick={onGoogleLogin} disabled={loading}>
          Continue with Google
        </button>

        <p className="login-footnote">
          Access should be limited to approved company accounts before adding sensitive pricing, firmware, or internal documents.
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
          <div className="metric-row muted">
            <div>
              <strong>Setup Builder</strong>
              <small>Layouts · Parts · Costing</small>
            </div>
            <span>Later</span>
          </div>
        </div>
      </section>
    </main>
  );
}
