import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { downloads, downloadProducts, downloadTypes } from '../data/downloadsCatalog.js';

function hasLink(value) {
  return Boolean(value && value.trim());
}

const statusOrder = {
  Current: 0,
  Reference: 1,
  Archive: 2,
};

function getTypeCount(type) {
  if (type === 'All') return downloads.length;
  return downloads.filter((doc) => doc.type === type).length;
}

function normalize(value) {
  return value.toLowerCase().trim();
}

export default function DownloadsPage({ user, onLogout }) {
  const [query, setQuery] = useState('');
  const [activeType, setActiveType] = useState('All');
  const [activeProduct, setActiveProduct] = useState('All');

  const filteredDownloads = useMemo(() => {
    const q = normalize(query);
    return downloads
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
  }, [query, activeType, activeProduct]);

  const currentCount = downloads.filter((doc) => doc.status === 'Current').length;
  const referenceCount = downloads.filter((doc) => doc.status !== 'Current').length;

  return (
    <AppShell user={user} onLogout={onLogout}>
      <main className="page-wrap downloads-page">
        <section className="section-heading page-title downloads-hero">
          <div>
            <p className="eyebrow">Document library</p>
            <h1>Manuals & downloads</h1>
            <p>
              Current PPM4, RPM, module, setup, Wi-Fi, cellular, firmware, and architecture documents are collected here for quick sales and support access.
            </p>
          </div>
          <div className="download-stats-card">
            <strong>{downloads.length}</strong>
            <span>Total docs</span>
            <small>{currentCount} current · {referenceCount} reference/archive</small>
          </div>
        </section>

        <section className="download-controls" aria-label="Download filters">
          <label className="download-search">
            <span>Search documents</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search PPM4, RPM, cellular, firmware, Wi-Fi..."
            />
          </label>

          <div className="download-filter-row">
            <div>
              <span className="filter-label">Type</span>
              <div className="download-chip-row">
                {downloadTypes.map((type) => (
                  <button
                    className={`download-chip ${activeType === type ? 'active' : ''}`}
                    key={type}
                    onClick={() => setActiveType(type)}
                  >
                    {type} <small>{getTypeCount(type)}</small>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="filter-label">Product</span>
              <div className="download-chip-row product-chips">
                {downloadProducts.map((product) => (
                  <button
                    className={`download-chip ${activeProduct === product ? 'active' : ''}`}
                    key={product}
                    onClick={() => setActiveProduct(product)}
                  >
                    {product}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="download-results-head">
          <div>
            <strong>{filteredDownloads.length}</strong>
            <span>matching documents</span>
          </div>
          <p>Temp files, desktop.ini, nested zip archives, and the old-dontuse folder are intentionally left out of the live library.</p>
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
                    <a className="button primary small" href={doc.href} target="_blank" rel="noreferrer">Download</a>
                    <a className="button secondary small" href={doc.href} target="_blank" rel="noreferrer">Open</a>
                  </>
                ) : (
                  <button className="button secondary small disabled" type="button" disabled>Drive link needed</button>
                )}
              </div>
            </article>
          ))}
        </section>

        {!filteredDownloads.length && (
          <section className="empty-downloads">
            <h2>No documents found</h2>
            <p>Try clearing the search box or selecting a different product/type filter.</p>
          </section>
        )}
      </main>
    </AppShell>
  );
}
