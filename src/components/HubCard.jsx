import { Link } from 'react-router-dom';

export default function HubCard({ section }) {
  const className = `hub-card hub-card-themed theme-${section.theme || 'default'} ${section.mobileOnly ? 'mobile-only-card' : ''} ${section.desktopOnly ? 'desktop-only-card' : ''}`;
  const content = (
    <>
      <div className="hub-card-bg" aria-hidden="true" />
      <div className="hub-card-icon" aria-hidden="true">{section.icon || '•'}</div>
      <div className="card-topline">
        <span>{section.eyebrow}</span>
        <strong>{section.status}</strong>
      </div>
      <h3>{section.title}</h3>
      <p>{section.description}</p>
      <span className="card-action">{section.externalUrl ? 'Open portal ↗' : 'Open section →'}</span>
    </>
  );

  if (section.externalUrl) {
    return (
      <a href={section.externalUrl} target="_blank" rel="noreferrer" className={className}>
        {content}
      </a>
    );
  }

  return (
    <Link to={section.path} className={className}>
      {content}
    </Link>
  );
}
