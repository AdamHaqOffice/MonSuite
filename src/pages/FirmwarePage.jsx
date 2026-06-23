import AppShell from '../components/AppShell.jsx';
import { firmwareHistory, firmwareWarnings, latestFirmware } from '../data/firmwareCatalog.js';

function hasLink(value) {
  return Boolean(value && value.trim());
}

function ActionLink({ href, children, primary = false }) {
  if (!hasLink(href)) {
    return <button className="button secondary small disabled" type="button" disabled>Link needed</button>;
  }

  return (
    <a className={`button ${primary ? 'primary' : 'secondary'} small`} href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function WarningBanner({ warning }) {
  return (
    <section className="firmware-warning-banner" key={warning.id}>
      <div className="warning-icon">!</div>
      <div>
        <p className="eyebrow">Critical update path</p>
        <h2>{warning.title}</h2>
        <p>{warning.message}</p>
        <ol>
          {warning.steps.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </div>
    </section>
  );
}

function LatestFirmwareCard({ item }) {
  return (
    <article className="firmware-release-card latest-release-card">
      <div className="release-topline">
        <span>{item.shortProduct}</span>
        <strong>{item.status}</strong>
      </div>
      <h2>{item.product}</h2>
      <div className="firmware-version-pill">Version {item.version}</div>
      <p className="firmware-meta">{item.packageType} · Release date: {item.releaseDate}</p>

      <div className="firmware-actions-row">
        <ActionLink href={item.downloadUrl} primary>Download latest</ActionLink>
        {item.migrationUrl !== undefined && <ActionLink href={item.migrationUrl}>Download v1.8 first</ActionLink>}
        {item.instructionsUrl !== undefined && <ActionLink href={item.instructionsUrl}>Instructions</ActionLink>}
      </div>

      <div className="firmware-file-list">
        {item.files.map((file) => (
          <div className="firmware-file-row" key={file.name}>
            <div>
              <strong>{file.name}</strong>
              <small>{file.role}</small>
              <em>{file.version}</em>
            </div>
            <span>{file.size}</span>
            {hasLink(file.url) ? <a href={file.url} target="_blank" rel="noreferrer">file</a> : <span>link needed</span>}
          </div>
        ))}
      </div>

      <div className="release-notes-grid">
        <div>
          <h3>Important notes</h3>
          <ul>
            {item.highlights.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
        <div>
          <h3>Change list</h3>
          <ul>
            {item.changes.map((change) => <li key={change}>{change}</li>)}
          </ul>
        </div>
      </div>

      {item.instructionText?.length ? (
        <div className="inline-instructions-card">
          <h3>RPM update instructions</h3>
          <ol>
            {item.instructionText.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </div>
      ) : null}
    </article>
  );
}

function HistoryCard({ release }) {
  return (
    <article className="firmware-history-card" key={release.id}>
      <div className="history-header">
        <div>
          <span>{release.product}</span>
          <h3>{release.version}</h3>
        </div>
        <strong>{release.status}</strong>
      </div>
      <p className="firmware-meta">Release date: {release.releaseDate}</p>
      <div className="firmware-actions-row compact-actions">
        <ActionLink href={release.packageUrl}>Download package</ActionLink>
        {release.instructionsUrl !== undefined && <ActionLink href={release.instructionsUrl}>Instructions</ActionLink>}
      </div>
      <div className="history-columns">
        <div>
          <h4>Files</h4>
          <ul>
            {release.files.map((file) => <li key={file}>{file}</li>)}
          </ul>
        </div>
        <div>
          <h4>Changes / notes</h4>
          <ul>
            {release.changes.map((change) => <li key={change}>{change}</li>)}
          </ul>
        </div>
      </div>

      {release.instructionText?.length ? (
        <div className="inline-instructions-card compact">
          <h4>Update instructions</h4>
          <ol>
            {release.instructionText.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </div>
      ) : null}
    </article>
  );
}

export default function FirmwarePage({ user, onLogout }) {
  return (
    <AppShell user={user} onLogout={onLogout}>
      <main className="page-wrap firmware-page-wrap">
        <section className="section-heading page-title firmware-title-block">
          <p className="eyebrow">Firmware center</p>
          <h1>Firmware & feature updates</h1>
          <p>
            Download the latest PPM4 and RPM firmware packages, review update-path warnings,
            and track version history/change notes for each firmware file.
          </p>
        </section>

        {firmwareWarnings.map((warning) => <WarningBanner warning={warning} key={warning.id} />)}

        <section className="firmware-section-block">
          <div className="section-subhead">
            <div>
              <p className="eyebrow">Current downloads</p>
              <h2>Latest firmware packages</h2>
            </div>
            <p>Use the package download first. Individual HEX files are also listed for verification or manual USB preparation.</p>
          </div>

          <div className="firmware-latest-grid">
            {latestFirmware.map((item) => <LatestFirmwareCard item={item} key={item.id} />)}
          </div>
        </section>

        <section className="firmware-section-block">
          <div className="section-subhead">
            <div>
              <p className="eyebrow">Release history</p>
              <h2>Version history & change log</h2>
            </div>
            <p>
              Formal engineering release notes were not included with the uploaded HEX files, so the change lists below
              include detected version/package changes and placeholders for detailed feature or bug-fix notes.
            </p>
          </div>

          <div className="firmware-history-list">
            {firmwareHistory.map((release) => <HistoryCard release={release} key={release.id} />)}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
