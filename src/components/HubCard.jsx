import { Link } from 'react-router-dom';

export default function HubCard({ section }) {
  return (
    <Link
      to={section.path}
      className={`hub-card hub-card-themed theme-${section.theme || 'default'} ${section.mobileOnly ? 'mobile-only-card' : ''} ${section.desktopOnly ? 'desktop-only-card' : ''}`}
    >
      <div className="hub-card-bg" aria-hidden="true" />
      <div className="hub-card-icon" aria-hidden="true">{section.icon || '•'}</div>
      <div className="card-topline">
        <span>{section.eyebrow}</span>
        <strong>{section.status}</strong>
      </div>
      <h3>{section.title}</h3>
      <p>{section.description}</p>
      <span className="card-action">Open section →</span>
    </Link>
  );
}
