import { NavLink } from 'react-router-dom';
import BrandLockup from './BrandLockup.jsx';

export default function AppShell({ user, onLogout, theme = 'light', onToggleTheme, children }) {
  const isDark = theme === 'dark';

  return (
    <div className="app-shell">
      <header className="topbar">
        <BrandLockup to="/hub" compact subtitle="Monitor support hub" />

        <nav className="nav-links" aria-label="Main navigation">
          <NavLink to="/hub">Hub</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/downloads">Downloads</NavLink>
          <NavLink to="/firmware">Firmware</NavLink>
          <NavLink to="/news">News</NavLink>
          <NavLink to="/scrubber-selector">Scrubber Selector</NavLink>
          <NavLink to="/at-connect">AT Connect</NavLink>
          <NavLink to="/pressure-monitoring">Pressure Guide</NavLink>
          <NavLink to="/ai-assistant">AbateBot</NavLink>
          <NavLink to="/support">Support</NavLink>
          <NavLink className="desktop-only-link" to="/setup-builder">Setup</NavLink>
          <NavLink className="mobile-only-link" to="/system-builder">System Builder</NavLink>
        </nav>

        <div className="user-menu">
          <button
            className="theme-toggle"
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            <span className="theme-toggle-track"><i /></span>
            <strong>{isDark ? 'Dark' : 'Light'}</strong>
          </button>
          <span title={user?.email}>{user?.displayName || user?.email}</span>
          <button className="button secondary small" onClick={onLogout}>Sign out</button>
        </div>
      </header>
      {children}
    </div>
  );
}
