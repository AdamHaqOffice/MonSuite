import { useEffect, useMemo, useState } from 'react';
import AppShell from '../components/AppShell.jsx';
import { monitorNews } from '../data/monitorNews.js';
import {
  addAdminNewsPost,
  deleteAdminContentItem,
  subscribeAdminContent,
  updateAdminContentItem,
} from '../utils/adminContent.js';

function splitLines(value) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean);
}

function emptyNewsForm() {
  return {
    title: '',
    category: 'Firmware',
    date: new Date().toISOString().slice(0, 10),
    status: 'New',
    published: true,
    summary: '',
    details: '',
  };
}

export default function NewsPage({ user, onLogout, theme, onToggleTheme, adminMode, canUseAdminMode }) {
  const [adminPosts, setAdminPosts] = useState([]);
  const [adminSource, setAdminSource] = useState('Loading');
  const [form, setForm] = useState(emptyNewsForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => subscribeAdminContent('news', (items, meta) => {
    setAdminPosts(items);
    setAdminSource(meta.source);
  }), []);

  const visibleAdminPosts = useMemo(() => (
    adminMode ? adminPosts : adminPosts.filter((post) => post.published !== false)
  ), [adminPosts, adminMode]);

  const allNews = useMemo(() => [...visibleAdminPosts, ...monitorNews].sort((a, b) => b.date.localeCompare(a.date)), [visibleAdminPosts]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.title.trim() || !form.summary.trim()) return;
    setSaving(true);
    try {
      await addAdminNewsPost({
        title: form.title.trim(),
        category: form.category.trim() || 'General',
        date: form.date || new Date().toISOString().slice(0, 10),
        status: form.status.trim() || 'New',
        published: form.published,
        summary: form.summary.trim(),
        details: splitLines(form.details),
      });
      setForm(emptyNewsForm());
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(item) {
    await updateAdminContentItem('news', item.id, { published: item.published === false });
  }

  async function removeItem(item) {
    const ok = window.confirm(`Delete admin news post: ${item.title}?`);
    if (!ok) return;
    await deleteAdminContentItem('news', item.id);
  }

  return (
    <AppShell user={user} onLogout={onLogout} theme={theme} onToggleTheme={onToggleTheme} adminMode={adminMode} canUseAdminMode={canUseAdminMode}>
      <main className="page-wrap news-page">
        <section className="hero-card news-hero compact-human-hero">
          <div>
            <p className="eyebrow">Monitor updates</p>
            <h1>Product updates</h1>
            <p>Firmware reminders, document changes, known issues, and sales/support notes.</p>
          </div>
          <div className="hero-panel subtle-panel">
            <span>Updates</span>
            <strong>{allNews.length}</strong>
            <small>{adminMode ? `Admin on · ${adminSource}` : 'Published feed'}</small>
          </div>
        </section>

        {adminMode && (
          <section className="admin-editor-panel real-admin-panel">
            <div className="section-subhead compact-admin-head">
              <div>
                <p className="eyebrow">Admin</p>
                <h2>Add news update</h2>
              </div>
              <p>{adminSource === 'Firestore' ? 'Publishing to Firestore. Published posts appear for all users.' : 'Using local staging because Firestore is not available/configured.'}</p>
            </div>
            <form className="admin-form" onSubmit={handleSubmit}>
              <label><span>Title</span><input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="PPM4 v2.3 firmware added" /></label>
              <label><span>Category</span><input value={form.category} onChange={(e) => updateField('category', e.target.value)} placeholder="Firmware" /></label>
              <label><span>Date</span><input type="date" value={form.date} onChange={(e) => updateField('date', e.target.value)} /></label>
              <label><span>Status</span><input value={form.status} onChange={(e) => updateField('status', e.target.value)} placeholder="New / Updated / Important" /></label>
              <label className="admin-check-row"><input type="checkbox" checked={form.published} onChange={(e) => updateField('published', e.target.checked)} /><span>Publish to users</span></label>
              <label className="full-span"><span>Summary</span><textarea value={form.summary} onChange={(e) => updateField('summary', e.target.value)} placeholder="Short summary users will see first." /></label>
              <label className="full-span"><span>Details, one per line</span><textarea value={form.details} onChange={(e) => updateField('details', e.target.value)} placeholder="Added latest PPM4 v2.3 package\nUpdated change log with revision history" /></label>
              <button className="button primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Add news post'}</button>
            </form>

            {adminPosts.length ? (
              <div className="admin-manage-list">
                {adminPosts.map((post) => (
                  <div className="admin-manage-row" key={post.id}>
                    <div><strong>{post.title}</strong><small>{post.date} · {post.storageSource || adminSource} · {post.published === false ? 'Hidden' : 'Published'}</small></div>
                    <button className="button secondary small" type="button" onClick={() => togglePublished(post)}>{post.published === false ? 'Publish' : 'Hide'}</button>
                    <button className="button secondary small danger" type="button" onClick={() => removeItem(post)}>Delete</button>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        )}

        <section className="news-list" aria-label="Monitor news posts">
          {allNews.map((item) => (
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
                  {(item.details || []).map((detail) => <li key={detail}>{detail}</li>)}
                </ul>
              </div>
            </article>
          ))}
        </section>
      </main>
    </AppShell>
  );
}
