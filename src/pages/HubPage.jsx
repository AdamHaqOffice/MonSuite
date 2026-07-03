import AppShell from '../components/AppShell.jsx';
import HubCard from '../components/HubCard.jsx';
import { hubSections } from '../data/hubSections.js';

export default function HubPage({ user, onLogout, theme, onToggleTheme }) {
  return (
    <AppShell user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme}>
      <main className="page-wrap">
        <section className="hero-card hero-brand-card">
          <div>
            <p className="eyebrow">MonSuite PWA</p>
            <h1>Abatement’s hub for all monitor product answers.</h1>
            <p>
              Centralize manuals, firmware updates, sales notes, support links, a mobile system builder,
              and the desktop setup builder in one clean, secure Abatement portal.
            </p>
          </div>
          <div className="hero-panel brand-forward-panel">
            <span>Abatement Technologies</span>
            <strong>Leaders in clean air</strong>
            <small>Monitor systems · Documentation · Support · Mobile access</small>
            <img className="hero-brand-image" src="/abatement-brand-slogan.png" alt="Abatement Technologies — Leaders in Clean Air" />
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
