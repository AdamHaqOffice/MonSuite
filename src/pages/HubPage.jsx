import AppShell from '../components/AppShell.jsx';
import HubCard from '../components/HubCard.jsx';
import { hubSections } from '../data/hubSections.js';

export default function HubPage({ user, onLogout }) {
  return (
    <AppShell user={user} onLogout={onLogout}>
      <main className="page-wrap">
        <section className="hero-card hero-brand-card">
          <div>
            <p className="eyebrow">MonSuite PWA</p>
            <h1>One branded hub for monitor product answers.</h1>
            <p>
              Centralize manuals, firmware updates, sales notes, support links, a mobile system builder,
              and the desktop setup builder in one clean, secure Abatement portal.
            </p>
          </div>
          <div className="hero-panel">
            <span>Current focus</span>
            <strong>PWA + mobile builder</strong>
            <small>Login · Docs · Firmware · Mobile system builder</small>
          </div>
        </section>

        <section className="search-strip install-strip">
          <label htmlFor="global-search">Quick note</label>
          <input id="global-search" value="Install MonSuite from your browser to use it like an app on mobile." readOnly />
          <span>On smaller screens, use System Builder. The full Setup Builder is desktop/tablet only.</span>
        </section>

        <section className="section-heading">
          <p className="eyebrow">Workspaces</p>
          <h2>Choose a workspace</h2>
        </section>

        <section className="hub-grid">
          {hubSections.map((section) => (
            <HubCard key={section.title} section={section} />
          ))}
        </section>
      </main>
    </AppShell>
  );
}
