import { Link } from 'react-router-dom';

export default function BrandLockup({ to = '/hub', compact = false, subtitle = 'Monitor support hub', showSubtitle = true, login = false }) {
  const className = `brand-lockup brand-system ${compact ? 'compact' : ''} ${login ? 'login' : ''}`;
  const content = (
    <>
      <img className="abatement-logo" src="/abatement-mark.svg" alt="Abatement Technologies" />
      <div className="brand-copy">
        <strong>MonSuite</strong>
        <small>Abatement Technologies</small>
        {showSubtitle && <em>{subtitle}</em>}
      </div>
    </>
  );

  if (!to) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Link to={to} className={className} aria-label="MonSuite home">
      {content}
    </Link>
  );
}
