import { Link } from 'react-router-dom';

export default function BrandLockup({ to = '/hub', compact = false, subtitle = 'Monitor support hub', showSubtitle = true, login = false }) {
  const className = `brand-lockup brand-system ${compact ? 'compact' : ''} ${login ? 'login' : ''}`;
  const content = (
    <>
      <span className="brand-logo-suite" aria-hidden="true">
        <span className="brand-plate main-brand-plate">
          <img className="abatement-logo sleek-brand-logo" src="/abatement-brand-full.png" alt="" />
        </span>
        {login ? (
          <span className="brand-plate slogan-brand-plate">
            <img className="abatement-slogan-logo" src="/abatement-brand-slogan.png" alt="" />
          </span>
        ) : null}
      </span>
      <span className="sr-only">Abatement Technologies</span>
      <div className="brand-copy">
        <span className="monsuite-chip">MonSuite</span>
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
