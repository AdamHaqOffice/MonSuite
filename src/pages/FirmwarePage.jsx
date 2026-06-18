import AppShell from '../components/AppShell.jsx';
import { starterFirmware } from '../data/hubSections.js';

export default function FirmwarePage({ user, onLogout }) {
  return (
    <AppShell user={user} onLogout={onLogout}>
      <main className="page-wrap narrow">
        <section className="section-heading page-title">
          <p className="eyebrow">Firmware center</p>
          <h1>Firmware & feature updates</h1>
          <p>Track current firmware, release notes, version history, update instructions, and compatibility warnings.</p>
        </section>

        <div className="data-table firmware-table" role="table" aria-label="Starter firmware records">
          <div className="data-table-header" role="row">
            <span>Product</span>
            <span>Version</span>
            <span>Release date</span>
            <span>Notes</span>
            <span>Action</span>
          </div>
          {starterFirmware.map((item) => (
            <div className="data-table-row" role="row" key={`${item.product}-${item.version}`}>
              <span>{item.product}</span>
              <strong>{item.version}</strong>
              <span>{item.releaseDate}</span>
              <span>{item.notes}</span>
              <a className="button secondary small" href={item.url} aria-disabled="true">Add file</a>
            </div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
