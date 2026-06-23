import { useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { powerReference, productCategories, products } from '../data/productCatalog.js';

function hasLink(value) {
  return Boolean(value && value.trim());
}

function ProductImage({ product, className = '' }) {
  return (
    <div className={`product-image-wrap ${className}`}>
      <img src={product.image} alt={product.name} />
      <span>{product.shortName}</span>
    </div>
  );
}

function ProductCard({ product, selected, onSelect }) {
  return (
    <button className={`product-card ${selected ? 'active' : ''}`} onClick={() => onSelect(product.id)}>
      <ProductImage product={product} />
      <div className="product-card-body">
        <p className="eyebrow">{product.category}</p>
        <h3>{product.name}</h3>
        <p>{product.tagline}</p>
        <div className="product-chip-row">
          <span>{product.sku}</span>
          {product.specs.slice(0, 2).map(([label, value]) => (
            <span key={label}>{value}</span>
          ))}
        </div>
      </div>
    </button>
  );
}

function DetailSection({ title, children }) {
  return (
    <section className="product-detail-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export default function ProductsPage({ user, onLogout }) {
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      const categoryMatch = activeCategory === 'All' || product.category === activeCategory;
      const searchText = [
        product.name,
        product.shortName,
        product.sku,
        product.category,
        product.tagline,
        product.summary,
        ...product.highlights,
        ...product.setupNotes,
      ].join(' ').toLowerCase();
      return categoryMatch && (!normalizedQuery || searchText.includes(normalizedQuery));
    });
  }, [activeCategory, query]);

  const selectedProduct = products.find((product) => product.id === selectedProductId)
    || filteredProducts[0]
    || products[0];

  return (
    <AppShell user={user} onLogout={onLogout}>
      <main className="page-wrap products-page">
        <section className="products-hero">
          <div>
            <p className="eyebrow">Product knowledge</p>
            <h1>RPM, PPM4, and sensor product hub.</h1>
            <p>
              A cleaner sales/support product section built from the uploaded manuals, quick guides, module pamphlets,
              product photos, power notes, and setup rules.
            </p>
            <div className="product-hero-actions">
              <a className="button primary small" href="/setup-builder">Open setup builder</a>
              <a className="button secondary small" href="/downloads">View downloads</a>
            </div>
          </div>
          <div className="product-power-card">
            <span>⚡</span>
            <div>
              <strong>Power reference</strong>
              <p>Use this while checking daisy chains and local-power needs.</p>
            </div>
            <dl>
              {powerReference.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="product-controls">
          <div className="product-search">
            <span>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search product, SKU, power, tubing, cellular..."
            />
          </div>
          <div className="product-tabs" aria-label="Product categories">
            {productCategories.map((category) => (
              <button
                className={activeCategory === category ? 'active' : ''}
                key={category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        <section className="products-layout">
          <div className="products-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                selected={selectedProduct?.id === product.id}
                onSelect={setSelectedProductId}
              />
            ))}

            {!filteredProducts.length && (
              <div className="empty-product-results">
                <h2>No products found</h2>
                <p>Try a different category or search term.</p>
              </div>
            )}
          </div>

          {selectedProduct && (
            <aside className="product-detail-panel">
              <div className="product-detail-hero">
                <ProductImage product={selectedProduct} className="large" />
                <div>
                  <p className="eyebrow">{selectedProduct.eyebrow}</p>
                  <h2>{selectedProduct.name}</h2>
                  <p>{selectedProduct.summary}</p>
                  <div className="product-chip-row large">
                    <span>{selectedProduct.sku}</span>
                    <span>{selectedProduct.category}</span>
                  </div>
                </div>
              </div>

              {selectedProduct.gallery?.length > 1 && (
                <div className="product-gallery">
                  {selectedProduct.gallery.map((image) => (
                    <img key={image} src={image} alt={`${selectedProduct.name} reference`} />
                  ))}
                </div>
              )}

              <DetailSection title="Key points">
                <ul className="product-check-list">
                  {selectedProduct.highlights.map((highlight) => (
                    <li key={highlight}>{highlight}</li>
                  ))}
                </ul>
              </DetailSection>

              <DetailSection title="Specs">
                <dl className="product-spec-list">
                  {selectedProduct.specs.map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
              </DetailSection>

              <DetailSection title="Setup notes">
                <ul className="product-note-list">
                  {selectedProduct.setupNotes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </DetailSection>

              <DetailSection title="Related documents">
                <div className="product-doc-grid">
                  {selectedProduct.relatedDocs.map((doc) => (
                    hasLink(doc.href) ? (
                      <a className="product-doc-card" href={doc.href} key={`${doc.title}-${doc.type}`} target="_blank" rel="noreferrer">
                        <span>{doc.type}</span>
                        <strong>{doc.title}</strong>
                        <small>Open document</small>
                      </a>
                    ) : (
                      <div className="product-doc-card link-needed" key={`${doc.title}-${doc.type}`}>
                        <span>{doc.type}</span>
                        <strong>{doc.title}</strong>
                        <small>Drive link needed</small>
                      </div>
                    )
                  ))}
                </div>
              </DetailSection>
            </aside>
          )}
        </section>
      </main>
    </AppShell>
  );
}
