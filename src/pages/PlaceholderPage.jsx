import AppShell from '../components/AppShell.jsx';

export default function PlaceholderPage({ user, onLogout, title }) {
  return (
    <AppShell user={user} onLogout={onLogout}>
      <main className="page-wrap narrow">
        <section className="support-card muted-card">
          <p className="eyebrow">Future phase</p>
          <h1>{title}</h1>
          <p>
            This page is intentionally included in V1 as a roadmap placeholder. Build this after the secure hub,
            document library, firmware center, and product knowledge database are working.
          </p>
        </section>
      </main>
    </AppShell>
  );
}
