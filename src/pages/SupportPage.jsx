import AppShell from '../components/AppShell.jsx';

export default function SupportPage({ user, onLogout }) {
  const ticketingUrl = import.meta.env.VITE_SUPPORT_TICKETING_URL || 'https://example.com/support';

  return (
    <AppShell user={user} onLogout={onLogout}>
      <main className="page-wrap narrow">
        <section className="support-card">
          <p className="eyebrow">Support escalation</p>
          <h1>Need technical help?</h1>
          <p>
            Use the existing ticketing system for product support, setup questions, firmware issues, or engineering review.
          </p>
          <a className="button primary" href={ticketingUrl} target="_blank" rel="noreferrer">
            Open ticketing system
          </a>
        </section>
      </main>
    </AppShell>
  );
}
