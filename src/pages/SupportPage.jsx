import AppShell from '../components/AppShell.jsx';

export default function SupportPage({ user, onLogout, theme, onToggleTheme }) {
  const ticketingUrl = import.meta.env.VITE_SUPPORT_TICKETING_URL || 'https://abatementpartnersupport.freshdesk.com/support/home';

  return (
    <AppShell user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme}>
      <main className="page-wrap narrow">
        <section className="support-card">
          <p className="eyebrow">Support escalation</p>
          <h1>Support</h1>
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
