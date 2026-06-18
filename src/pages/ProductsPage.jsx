import AppShell from '../components/AppShell.jsx';

const starterProducts = [
  {
    name: 'PPM4',
    category: 'Portable Pressure Monitor',
    notes: 'Add product overview, common sales questions, accessories, and compatible setup notes.',
  },
  {
    name: 'RPM',
    category: 'Room Pressure Monitor',
    notes: 'Add monitor features, sensor compatibility, installation notes, and customer-facing guidance.',
  },
  {
    name: 'External Sensors',
    category: 'Accessories',
    notes: 'Add supported sensor types, wiring rules, daisy-chain notes, and related manuals.',
  },
];

export default function ProductsPage({ user, onLogout }) {
  return (
    <AppShell user={user} onLogout={onLogout}>
      <main className="page-wrap narrow">
        <section className="section-heading page-title">
          <p className="eyebrow">Product knowledge</p>
          <h1>Monitor products</h1>
          <p>Add product pages, FAQs, sales notes, SKUs, accessories, and compatibility rules here.</p>
        </section>

        <div className="table-card">
          {starterProducts.map((product) => (
            <article className="list-row" key={product.name}>
              <div>
                <strong>{product.name}</strong>
                <span>{product.category}</span>
              </div>
              <p>{product.notes}</p>
            </article>
          ))}
        </div>
      </main>
    </AppShell>
  );
}
