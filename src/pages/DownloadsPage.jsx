import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { downloads, downloadProducts, downloadTypes } from '../data/downloadsCatalog.js';
import {
  addAdminDownload,
  deleteAdminContentItem,
  subscribeAdminContent,
  updateAdminContentItem,
} from '../utils/adminContent.js';

function hasLink(value) {
  return Boolean(value && value.trim());
}

function getGoogleId(url) {
  const docMatch = url?.match(/\/document\/d\/([^/]+)/);
  if (docMatch) return { type: 'doc', id: docMatch[1] };
  const fileMatch = url?.match(/\/file\/d\/([^/]+)/);
  if (fileMatch) return { type: 'file', id: fileMatch[1] };
  return null;
}

function getDownloadUrl(url) {
  const match = getGoogleId(url);
  if (!match) return url;
  if (match.type === 'doc') return `https://docs.google.com/document/d/${match.id}/export?format=docx`;
  if (match.type === 'file') return `https://drive.google.com/uc?export=download&id=${match.id}`;
  return url;
}

function getOpenUrl(url) {
  const match = getGoogleId(url);
  if (!match) return url;
  if (match.type === 'doc') return `https://docs.google.com/document/d/${match.id}/edit`;
  if (match.type === 'file') return `https://drive.google.com/file/d/${match.id}/view`;
  return url;
}

const statusOrder = {
  Current: 0,
  Reference: 1,
  Archive: 2,
  Draft: 3,
};

function normalize(value) {
  return String(value || '').toLowerCase().trim();
}

function emptyDownloadForm() {
  return {
    title: '',
    product: 'PPM4',
    type: 'Manual',
    status: 'Current',
    published: true,
    updated: new Date().toISOString().slice(0, 10),
    size: 'Link',
    href: '',
    description: '',
    sourcePath: 'Admin added',
  };
}

export default function DownloadsPage({ user, onLogout, theme, onToggleTheme, adminMode, canUseAdminMode }) {
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('All');
  const [activeProduct, setActiveProduct] = useState('All');
  const [adminDownloads, setAdminDownloads] = useState([]);
  const [adminSource, setAdminSource] = useState('Loading');
  const [form, setForm] = useState(emptyDownloadForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeAdminContent('downloads', (items, meta) => {
    setAdminDownloads(items);
    setAdminSource(meta.source);
  }), []);

  const visibleAdminDownloads = useMemo(() => (
    adminMode ? adminDownloads : adminDownloads.filter((doc) => doc.published !== false)
  ), [adminDownloads, adminMode]);

  const allDownloads = useMemo(() => [...visibleAdminDownloads, ...downloads], [visibleAdminDownloads]);
  const dynamicTypes = useMemo(() => ['All', ...Array.from(new Set([...downloadTypes.filter((t) => t !== 'All'), ...allDownloads.map((doc) => doc.type)])).filter(Boolean)], [allDownloads]);
  const dynamicProducts = useMemo(() => ['All', ...Array.from(new Set([...downloadProducts.filter((p) => p !== 'All'), ...allDownloads.map((doc) => doc.product)])).filter(Boolean)], [allDownloads]);

  function getTypeCount(type) {
    if (type === 'All') return allDownloads.length;
    return allDownloads.filter((doc) => doc.type === type).length;
  }

  const filteredDownloads = useMemo(() => {
    const q = normalize(query);
    return allDownloads
      .filter((doc) => activeType === 'All' || doc.type === activeType)
      .filter((doc) => activeProduct === 'All' || doc.product === activeProduct)
      .filter((doc) => {
        if (!q) return true;
        return [doc.title, doc.product, doc.type, doc.status, doc.description, doc.sourcePath]
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const statusCompare = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
        if (statusCompare !== 0) return statusCompare;
        return a.product.localeCompare(b.product) || a.title.localeCompare(b.title);
      });
  }, [query, activeType, activeProduct, allDownloads]);

  const currentCount = allDownloads.filter((doc) => doc.status === 'Current').length;
  const referenceCount = allDownloads.filter((doc) => doc.status !== 'Current').length;

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.href.trim()) return;
    setSaving(true);
    try {
      await addAdminDownload({
        ...form,
        title: form.title.trim(),
        product: form.product.trim() || 'General',
        type: form.type.trim() || 'Manual',
        status: form.status.trim() || 'Current',
        published: form.published,
        href: form.href.trim(),
        description: form.description.trim() || 'Admin-added document link.',
        sourcePath: form.sourcePath.trim() || 'Admin added',
      });
      setForm(emptyDownloadForm());
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(item) {
    await updateAdminContentItem('downloads', item.id, { published: item.published === false });
  }

  async function removeItem(item) {
    const ok = window.confirm(`Delete admin download: ${item.title}?`);
    if (!ok) return;
    await deleteAdminContentItem('downloads', item.id);
  }

  return (
    <AppShell user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} adminMode={adminMode} canUseAdminMode={canUseAdminMode}>
      <main className="page-wrap downloads-page">
        <section className="hero-card downloads-hero compact-human-hero">
          <div>
            <p className="eyebrow">Document library</p>
            <h1>Manuals & downloads</h1>
            <p>Current manuals, quick guides, firmware notes, and setup references.</p>
          </div>
          <div className="download-stats-card subtle-panel">
            <strong>{allDownloads.length}</strong>
            <span>Total docs</span>
            <small>{currentCount} current · {referenceCount} reference/archive</small>
          </div>
        </section>

        {adminMode && (
          <section className="admin-editor-panel real-admin-panel">
            <div className="section-subhead compact-admin-head">
              <div>
                <p className="eyebrow">Admin</p>
                <h2>Add manual or download link</h2>
              </div>
              <p>{adminSource === 'Firestore' ? 'Publishing to Firestore. Published links appear for all users.' : 'Using local staging because Firestore is not available/configured.'}</p>
            </div>
            <form className="admin-form" onSubmit={handleSubmit}>
              <label><span>Title</span><input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="New sensor quick guide" /></label>
              <label><span>Product</span><input value={form.product} onChange={(e) => updateField('product', e.target.value)} placeholder="PPM4 / RPM / Scrubbers" /></label>
              <label><span>Type</span><input value={form.type} onChange={(e) => updateField('type', e.target.value)} placeholder="Manual / Quick Guide / Firmware" /></label>
              <label><span>Status</span><input value={form.status} onChange={(e) => updateField('status', e.target.value)} placeholder="Current / Reference / Archive" /></label>
              <label><span>Updated</span><input type="date" value={form.updated} onChange={(e) => updateField('updated', e.target.value)} /></label>
              <label><span>Size</span><input value={form.size} onChange={(e) => updateField('size', e.target.value)} placeholder="2.3 MB / Link" /></label>
              <label className="admin-check-row"><input type="checkbox" checked={form.published} onChange={(e) => updateField('published', e.target.checked)} /><span>Publish to users</span></label>
              <label className="full-span"><span>Link</span><input value={form.href} onChange={(e) => updateField('href', e.target.value)} placeholder="Google Drive / Docs link" /></label>
              <label className="full-span"><span>Description</span><textarea value={form.description} onChange={(e) => updateField('description', e.target.value)} placeholder="What this document is used for." /></label>
              <label className="full-span"><span>Source note</span><input value={form.sourcePath} onChange={(e) => updateField('sourcePath', e.target.value)} placeholder="Admin added / folder name" /></label>
              <button className="button primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add document'}</button>
            </form>

            {adminDownloads.length ? (
              <div className="admin-manage-list">
                {adminDownloads.map((doc) => (
                  <div className="admin-manage-row" key={doc.id}>
                    <div><strong>{doc.title}</strong><small>{doc.product} · {doc.status} · {doc.storageSource || adminSource} · {doc.published === false ? 'Hidden' : 'Published'}</small></div>
                    <button className="button secondary small" type="button" onClick={() => togglePublished(doc)}>{doc.published === false ? 'Publish' : 'Hide'}</button>
                    <button className="button secondary small danger" type="button" onClick={() => removeItem(doc)}>Delete</button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        )}

        <section className="download-controls" aria-label="Download filters">
          <label className="download-search">
            <span>Search documents</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search PPM4, RPM, cellular, firmware, Wi-Fi..." />
          </label>

          <div className="download-filter-row">
            <div>
              <span className="filter-label">Type</span>
              <div className="download-chip-row">
                {dynamicTypes.map((type) => (
                  <button className={`download-chip ${activeType === type ? 'active' : ''}`} key={type} onClick={() => setActiveType(type)}>
                    {type} <small>{getTypeCount(type)}</small>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="filter-label">Product</span>
              <div className="download-chip-row product-chips">
                {dynamicProducts.map((product) => (
                  <button className={`download-chip ${activeProduct === product ? 'active' : ''}`} key={product} onClick={() => setActiveProduct(product)}>
                    {product}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="download-results-head">
          <div><strong>{filteredDownloads.length}</strong><span>matching documents</span></div>
          <p>Old temp files and archive folders stay out of the live library.</p>
        </section>

        <section className="download-card-grid" aria-label="Downloads">
          {filteredDownloads.map((doc) => (
            <article className={`download-card status-${doc.status.toLowerCase()}`} key={doc.id}>
              <div className="download-card-top">
                <span className={`download-type type-${doc.type.toLowerCase().replaceAll(' ', '-')}`}>{doc.type}</span>
                <span className={`download-status ${doc.status.toLowerCase()}`}>{doc.status}</span>
              </div>
              <h2>{doc.title}</h2>
              <p>{doc.description}</p>
              <dl className="download-meta">
                <div><dt>Product</dt><dd>{doc.product}</dd></div>
                <div><dt>Updated</dt><dd>{doc.updated}</dd></div>
                <div><dt>Size</dt><dd>{doc.size}</dd></div>
                <div><dt>Source</dt><dd>{doc.sourcePath}</dd></div>
              </dl>
              <div className="download-actions">
                {hasLink(doc.href) ? (
                  <>
                    <a className="button primary small" href={getDownloadUrl(doc.href)} target="_blank" rel="noreferrer">Download</a>
                    <a className="button secondary small" href={getOpenUrl(doc.href)} target="_blank" rel="noreferrer">Open</a>
                  </>
                ) : <button className="button secondary small disabled" type="button" disabled>Drive link needed</button>}
              </div>
            </article>
          ))}
        </section>

        {!filteredDownloads.length && (
          <section className="empty-downloads"><h2>No documents found</h2><p>Try clearing the search box or selecting a different product/type filter.</p></section>
        )}
      </main>
    </AppShell>
  );
}
