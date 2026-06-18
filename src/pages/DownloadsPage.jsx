import AppShell from '../components/AppShell.jsx';
import { starterDownloads } from '../data/hubSections.js';

export default function DownloadsPage({ user, onLogout }) {
  return (
    <AppShell user={user} onLogout={onLogout}>
      <main className="page-wrap narrow">
        <section className="section-heading page-title">
          <p className="eyebrow">Document library</p>
          <h1>Manuals & downloads</h1>
          <p>Replace the starter records with real manuals, pamphlets, quick guides, spec sheets, and product documents.</p>
        </section>

        <div className="data-table" role="table" aria-label="Starter downloads">
          <div className="data-table-header" role="row">
            <span>Product</span>
            <span>Document</span>
            <span>Type</span>
            <span>Version</span>
            <span>Action</span>
          </div>
          {starterDownloads.map((doc) => (
            <div className="data-table-row" role="row" key={`${doc.product}-${doc.title}`}>
              <span>{doc.product}</span>
              <strong>{doc.title}</strong>
              <span>{doc.type}</span>
              <span>{doc.version}</span>
              <a className="button secondary small" href={doc.url} aria-disabled="true">Add file</a>
            </div>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
