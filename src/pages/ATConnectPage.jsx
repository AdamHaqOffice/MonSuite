import AppShell from '../components/AppShell.jsx';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.app.atconnect&hl=en_CA';
const WEB_PORTAL_URL = 'https://connect.abatement.com';
const SUPPORT_URL = 'https://abatementpartnersupport.freshdesk.com/support/home';

const setupSteps = [
  {
    title: 'Install AT Connect on the phone',
    body: 'Download AT Connect from the Google Play Store on the phone that should receive push notifications. Mobile app setup is preferred when alarm notifications matter.',
  },
  {
    title: 'Sign in or create the customer account',
    body: 'Use the account the customer wants tied to their PPM4 or RPM devices. Keep this account consistent between the mobile app and web portal.',
  },
  {
    title: 'Add the PPM4 or RPM device',
    body: 'In AT Connect, add the monitor so pressure readings, records, alarms, and alarm history can sync online.',
  },
  {
    title: 'Allow push notifications',
    body: 'When the phone asks for notification permission, allow it. Push notifications are the recommended alert method because they go directly through the app.',
  },
  {
    title: 'Verify live data and alarm history',
    body: 'Confirm the device appears online, recent pressure data is updating, and alarm history is visible. Use the web portal when you need to review or download saved data online.',
  },
];

const featureCards = [
  {
    title: 'Push alarm notifications',
    eyebrow: 'Recommended',
    icon: '🔔',
    body: 'The mobile app is the preferred path for alarm notifications. Push notifications are cleaner than relying on SMS or email setup.',
  },
  {
    title: 'Online pressure records',
    eyebrow: 'Cloud data',
    icon: '☁',
    body: 'Once connected, PPM4 and RPM readings can be saved online so users can review job history and pressure data later.',
  },
  {
    title: 'Alarm history',
    eyebrow: 'Review events',
    icon: '⚠',
    body: 'Use AT Connect to see alarm history and confirm when alarms occurred. This helps support pressure investigations and job documentation.',
  },
  {
    title: 'Web downloads',
    eyebrow: 'Portal',
    icon: '⬇',
    body: 'Use connect.abatement.com when users need browser access, reporting, or downloaded online records.',
  },
];

const troubleshooting = [
  'If the device is not appearing online, verify Wi-Fi/cellular connectivity on the monitor first.',
  'If alarms are visible online but the phone is not alerting, check phone notification permissions for AT Connect.',
  'If a user needs downloadable records, use the web portal at connect.abatement.com.',
  'If this is a live hospital or job-site pressure issue, make a support ticket and include device serial number, job number, screenshots, and what the monitor shows locally.',
];

export default function ATConnectPage({ user, onLogout, theme, onToggleTheme }) {
  return (
    <AppShell user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme}>
      <main className="page-wrap at-connect-page">
        <section className="hero-card at-connect-hero">
          <div>
            <p className="eyebrow">AT Connect</p>
            <h1>AT Connect</h1>
            <p>
              Connect PPM4 and RPM units to online data, alarm history, reports, and mobile push notifications. Use the app for alerts and the web portal for records.
            </p>
            <div className="at-connect-actions">
              <a className="button primary" href={PLAY_STORE_URL} target="_blank" rel="noreferrer">Get AT Connect on Google Play</a>
              <a className="button secondary" href={WEB_PORTAL_URL} target="_blank" rel="noreferrer">Open web portal</a>
            </div>
          </div>

          <div className="hero-panel at-phone-panel">
            <div className="phone-mockup" aria-hidden="true">
              <div className="phone-speaker" />
              <div className="phone-screen">
                <span>AT Connect</span>
                <strong>Pressure Alarm</strong>
                <small>Push notification enabled</small>
                <div className="phone-reading">-0.03 inWC</div>
              </div>
            </div>
            <span>Best alert path</span>
            <strong>Mobile push notifications</strong>
            <small>Use web portal for downloads and review.</small>
          </div>
        </section>

        <section className="at-connect-grid">
          {featureCards.map((card) => (
            <article className="at-feature-card" key={card.title}>
              <span className="at-feature-icon">{card.icon}</span>
              <p className="eyebrow">{card.eyebrow}</p>
              <h2>{card.title}</h2>
              <p>{card.body}</p>
            </article>
          ))}
        </section>

        <section className="at-connect-layout">
          <article className="at-connect-card setup-card">
            <p className="eyebrow">Setup instructions</p>
            <h2>How users should connect their monitor</h2>
            <ol className="at-step-list">
              {setupSteps.map((step) => (
                <li key={step.title}>
                  <strong>{step.title}</strong>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
          </article>

          <aside className="at-connect-card guidance-card">
            <p className="eyebrow">Messaging guidance</p>
            <h2>Say app first, web second.</h2>
            <p>
              When customers care about alarms, direct them to the AT Connect mobile app so they can enable push notifications.
              The web portal is still useful for reviewing and downloading online data, but it should not be the main notification path.
            </p>
            <div className="at-do-dont">
              <div>
                <strong>Recommend</strong>
                <span>Mobile app + push notifications</span>
                <span>Web portal for downloads</span>
                <span>Ticket for live job-site issues</span>
              </div>
              <div>
                <strong>Avoid leading with</strong>
                <span>SMS as the main alarm path</span>
                <span>Email as the main alarm path</span>
                <span>Web-only setup for alarms</span>
              </div>
            </div>
            <div className="at-connect-actions stacked">
              <a className="button primary small full" href={PLAY_STORE_URL} target="_blank" rel="noreferrer">Install app</a>
              <a className="button secondary small full" href={SUPPORT_URL} target="_blank" rel="noreferrer">Make a ticket</a>
            </div>
          </aside>
        </section>

        <section className="at-connect-card troubleshooting-card">
          <p className="eyebrow">Support notes</p>
          <h2>Common support prompts</h2>
          <div className="at-troubleshooting-grid">
            {troubleshooting.map((item) => (
              <div key={item}>{item}</div>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
