import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { firmwareHistory, firmwareRevisionFiles, firmwareWarnings, latestFirmware } from '../data/firmwareCatalog.js';
import {
  addAdminFirmwareHistory,
  deleteAdminContentItem,
  subscribeAdminContent,
  updateAdminContentItem,
} from '../utils/adminContent.js';

function hasLink(value) {
  return Boolean(value && value.trim());
}

function ActionLink({ href, children, primary = false }) {
  if (!hasLink(href)) return null;

  return (
    <a className={`button ${primary ? 'primary' : 'secondary'} small`} href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function splitLines(value) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean);
}

function emptyFirmwareForm() {
  return {
    product: 'PPM4',
    version: '',
    status: 'Admin added',
    published: true,
    releaseDate: new Date().toISOString().slice(0, 10),
    packageUrl: '',
    files: '',
    changes: '',
  };
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
        <ActionLink href={item.driveUrl}>Open Drive folder</ActionLink>
        {item.migrationUrl !== undefined && <ActionLink href={item.migrationUrl}>Download v1.8 first</ActionLink>}
        {item.instructionsUrl !== undefined && <ActionLink href={item.instructionsUrl}>Instructions</ActionLink>}
        <ActionLink href={item.revisionUrl}>Revision history</ActionLink>
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
            {hasLink(file.url) ? <a href={file.url} target="_blank" rel="noreferrer">file</a> : null}
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
        <ActionLink href={release.driveUrl}>Open Drive folder</ActionLink>
        {release.instructionsUrl !== undefined && <ActionLink href={release.instructionsUrl}>Instructions</ActionLink>}
        <ActionLink href={release.revisionUrl}>Revision history</ActionLink>
      </div>
      <div className="history-columns">
        <div>
          <h4>Files</h4>
          <ul>
            {(release.files || []).map((file) => <li key={file}>{file}</li>)}
          </ul>
        </div>
        <div>
          <h4>Changes / notes</h4>
          <ul>
            {(release.changes || []).map((change) => <li key={change}>{change}</li>)}
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

export default function FirmwarePage({ user, onLogout, theme, onToggleTheme, adminMode, canUseAdminMode }) {
  const [adminHistory, setAdminHistory] = useState([]);
  const [adminSource, setAdminSource] = useState('Loading');
  const [form, setForm] = useState(emptyFirmwareForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeAdminContent('firmwareHistory', (items, meta) => {
    setAdminHistory(items);
    setAdminSource(meta.source);
  }), []);

  const visibleAdminHistory = useMemo(() => (
    adminMode ? adminHistory : adminHistory.filter((release) => release.published !== false)
  ), [adminHistory, adminMode]);

  const allHistory = useMemo(() => [...visibleAdminHistory, ...firmwareHistory], [visibleAdminHistory]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.product.trim() || !form.version.trim()) return;
    setSaving(true);
    try {
      await addAdminFirmwareHistory({
        product: form.product.trim(),
        version: form.version.trim(),
        status: form.status.trim() || 'Admin added',
        published: form.published,
        releaseDate: form.releaseDate || new Date().toISOString().slice(0, 10),
        packageUrl: form.packageUrl.trim(),
        instructionsUrl: '',
        files: splitLines(form.files),
        changes: splitLines(form.changes),
      });
      setForm(emptyFirmwareForm());
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(release) {
    await updateAdminContentItem('firmwareHistory', release.id, { published: release.published === false });
  }

  async function removeItem(release) {
    const ok = window.confirm(`Delete firmware entry: ${release.product} ${release.version}?`);
    if (!ok) return;
    await deleteAdminContentItem('firmwareHistory', release.id);
  }

  return (
    <AppShell user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} adminMode={adminMode} canUseAdminMode={canUseAdminMode}>
      <main className="page-wrap firmware-page-wrap">
        <section className="section-heading page-title firmware-title-block compact-human-hero">
          <p className="eyebrow">Firmware center</p>
          <h1>Firmware</h1>
          <p>Latest packages, update warnings, and practical change notes.</p>
        </section>

        {firmwareWarnings.map((warning) => <WarningBanner warning={warning} key={warning.id} />)}

        {adminMode && (
          <section className="admin-editor-panel">
            <div className="section-subhead compact-admin-head">
              <div>
                <p className="eyebrow">Admin mode</p>
                <h2>Add firmware change-log entry</h2>
              </div>
              <p>{adminSource === 'Firestore' ? 'Publishing to Firestore. Published entries appear for all users.' : 'Using local staging because Firestore is not available/configured.'}</p>
            </div>
            <form className="admin-form" onSubmit={handleSubmit}>
              <label><span>Product</span><input value={form.product} onChange={(e) => updateField('product', e.target.value)} placeholder="PPM4 / RPM" /></label>
              <label><span>Version</span><input value={form.version} onChange={(e) => updateField('version', e.target.value)} placeholder="2.4" /></label>
              <label><span>Status</span><input value={form.status} onChange={(e) => updateField('status', e.target.value)} placeholder="Latest / Previous / Draft" /></label>
              <label><span>Release date</span><input type="date" value={form.releaseDate} onChange={(e) => updateField('releaseDate', e.target.value)} /></label>
              <label className="admin-check-row"><input type="checkbox" checked={form.published} onChange={(e) => updateField('published', e.target.checked)} /><span>Publish to users</span></label>
              <label className="full-span"><span>Package URL</span><input value={form.packageUrl} onChange={(e) => updateField('packageUrl', e.target.value)} placeholder="Google Drive folder/file link" /></label>
              <label className="full-span"><span>Files, one per line</span><textarea value={form.files} onChange={(e) => updateField('files', e.target.value)} placeholder="MFW1027A.hex — REV.2.4\nMFW1027L.hex — REV.2.4" /></label>
              <label className="full-span"><span>Changes, one per line</span><textarea value={form.changes} onChange={(e) => updateField('changes', e.target.value)} placeholder="Fixed...\nAdded..." /></label>
              <button className="button primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add firmware entry'}</button>
            </form>

            {adminHistory.length ? (
              <div className="admin-manage-list">
                {adminHistory.map((release) => (
                  <div className="admin-manage-row" key={release.id}>
                    <div><strong>{release.product} {release.version}</strong><small>{release.releaseDate} · {release.storageSource || adminSource} · {release.published === false ? 'Hidden' : 'Published'}</small></div>
                    <button className="button secondary small" type="button" onClick={() => togglePublished(release)}>{release.published === false ? 'Publish' : 'Hide'}</button>
                    <button className="button secondary small danger" type="button" onClick={() => removeItem(release)}>Delete</button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        )}

        <section className="firmware-section-block">
          <div className="section-subhead">
            <div>
              <p className="eyebrow">Current downloads</p>
              <h2>Latest firmware packages</h2>
            </div>
            <p>Use the package download first. Individual HEX files are listed for verification or manual USB preparation.</p>
          </div>

          <div className="firmware-latest-grid">
            {latestFirmware.map((item) => <LatestFirmwareCard item={item} key={item.id} />)}
          </div>
        </section>

        <section className="firmware-section-block revision-file-block">
          <div className="section-subhead">
            <div>
              <p className="eyebrow">Source notes</p>
              <h2>Revision history files</h2>
            </div>
            <p>Original engineering change-log text files are included in the app package for reference.</p>
          </div>
          <div className="revision-file-grid">
            {firmwareRevisionFiles.map((file) => (
              <a className="revision-file-card" href={file.href} target="_blank" rel="noreferrer" key={file.id}>
                <strong>{file.title}</strong>
                <span>{file.product}</span>
                <p>{file.summary}</p>
              </a>
            ))}
          </div>
        </section>

        <section className="firmware-section-block">
          <div className="section-subhead">
            <div>
              <p className="eyebrow">Release history</p>
              <h2>Version history & change log</h2>
            </div>
            <p>
              Change notes below are pulled from supplied revision history where available and summarized for sales/support use.
            </p>
          </div>

          <div className="firmware-history-list">
            {allHistory.map((release) => <HistoryCard release={release} key={release.id} />)}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
