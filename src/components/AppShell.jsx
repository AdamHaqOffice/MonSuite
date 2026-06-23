import { NavLink } from 'react-router-dom';
import BrandLockup from './BrandLockup.jsx';

export default function AppShell({ user, onLogout, children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <BrandLockup to="/hub" compact subtitle="Monitor support hub" />

        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/hub">Hub</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/downloads">Downloads</NavLink>
          <NavLink to="/firmware">Firmware</NavLink>
          <NavLink to="/ai-assistant">Assistant</NavLink>
          <NavLink to="/support">Support</NavLink>
          <NavLink className="desktop-only-link" to="/setup-builder">Setup</NavLink>
          <NavLink to="/system-builder">System Builder</NavLink>
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
