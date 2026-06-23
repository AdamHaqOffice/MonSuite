import AppShell from '../components/AppShell.jsx';
import { monitorNews } from '../data/monitorNews.js';

export default function NewsPage({ user, onLogout }) {
  return (
    <AppShell user={user} onLogout={onLogout}>
      <main className="page-wrap news-page">
        <section className="hero-card news-hero">
          <div>
            <p className="eyebrow">Monitor updates</p>
            <h1>News for monitor products, firmware, docs, and MonSuite.</h1>
            <p>
              Use this page for product announcements, firmware reminders, documentation changes,
              known issues, and sales/support updates related to PPM4, RPM, sensors, and MonSuite.
            </p>
          </div>
          <div className="hero-panel">
            <span>Update feed</span>
            <strong>{monitorNews.length} posts</strong>
            <small>Static for now · admin editing later</small>
          </div>
        </section>

        <section className="news-list" aria-label="Monitor news posts">
          {monitorNews.map((item) => (
            <article className={`news-card status-${item.status.toLowerCase().replaceAll(' ', '-')}`} key={item.id}>
              <div className="news-date-badge">
                <span>{new Date(item.date).toLocaleDateString(undefined, { month: 'short' })}</span>
                <strong>{new Date(item.date).getDate()}</strong>
              </div>
              <div className="news-content">
                <div className="news-topline">
                  <span>{item.category}</span>
                  <strong>{item.status}</strong>
                </div>
                <h2>{item.title}</h2>
                <p>{item.summary}</p>
                {item.image && (
                  <figure className="news-image-wrap">
                    <img src={item.image} alt={item.imageAlt || item.title} />
                    {item.imageAlt && <figcaption>{item.imageAlt}</figcaption>}
                  </figure>
                )}
                <ul>
                  {item.details.map((detail) => <li key={detail}>{detail}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
