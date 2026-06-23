import { Link } from 'react-router-dom';

export default function HubCard({ section }) {
  return (
    <Link to={section.path} className={`hub-card ${section.mobileOnly ? 'mobile-priority' : ''} ${section.desktopOnly ? 'desktop-priority' : ''}`}>
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
