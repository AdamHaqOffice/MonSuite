import AppShell from '../components/AppShell.jsx';
import HubCard from '../components/HubCard.jsx';
import { hubSections } from '../data/hubSections.js';

export default function HubPage({ user, onLogout }) {
  return (
    <AppShell user={user} onLogout={onLogout}>
      <main className="page-wrap">
        <section className="hero-card">
          <div>
            <p className="eyebrow">MonSuite V1</p>
            <h1>One hub for monitor product answers.</h1>
            <p>
              Centralize manuals, firmware updates, sales notes, support links, and future setup tools in a clean,
              secure portal built for fast answers.
            </p>
          </div>
          <div className="hero-panel">
            <span>Current focus</span>
            <strong>Secure hub MVP</strong>
            <small>Login · Navigation · Starter libraries</small>
          </div>
        </section>

        <section className="search-strip">
          <label htmlFor="global-search">Quick search</label>
          <input id="global-search" placeholder="Search placeholder — products, manuals, firmware, setup notes..." disabled />
          <span>Search will connect to the product/document database in the next phase.</span>
        </section>

        <section className="section-heading">
          <p className="eyebrow">Roadmap sections</p>
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
