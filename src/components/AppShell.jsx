import { Link, NavLink } from 'react-router-dom';

export default function AppShell({ user, onLogout, children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link to="/hub" className="brand-mark" aria-label="MonSuite home">
          <span className="brand-icon">M</span>
          <span>
            <strong>MonSuite</strong>
            <small>Monitor support hub</small>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/hub">Hub</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/downloads">Downloads</NavLink>
          <NavLink to="/firmware">Firmware</NavLink>
          <NavLink to="/support">Support</NavLink>
          <NavLink to="/setup-builder">Setup</NavLink>
        </nav>

        <div className="user-menu">
          <span title={user?.email}>{user?.displayName || user?.email}</span>
          <button className="button secondary small" onClick={onLogout}>Sign out</button>
        </div>
      </header>
      {children}
    </div>
  );
}
