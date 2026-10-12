import { useEffect, useState } from 'react';
import { NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Icon, Toasts } from './components/ui';
import { AUTH_ENABLED, useAuth } from './lib/auth';
import { useStore } from './lib/store';
import { setTheme, useTheme } from './lib/theme';
import { Login, VerifyEmail } from './pages/Login';
import { Search } from './pages/Search';
import { PropertyDetail } from './pages/PropertyDetail';
import { Lookup } from './pages/Lookup';
import { MyProperties } from './pages/MyProperties';
import { Contacts } from './pages/Contacts';
import { SkipTracing } from './pages/SkipTracing';
import { Campaigns } from './pages/Campaigns';
import { Automator } from './pages/Automator';
import { Calculators } from './pages/Calculators';
import { Account } from './pages/Account';
import { Dashboard } from './pages/Dashboard';

const NAV = [
  { to: '/', icon: 'search', label: 'Search' },
  { to: '/my-properties', icon: 'home', label: 'My Properties' },
  { to: '/contacts', icon: 'people', label: 'Contacts' },
  { to: '/skip-tracing', icon: 'phone', label: 'Skip Tracing' },
  { to: '/campaigns', icon: 'mail', label: 'Marketing' },
  { to: '/automator', icon: 'sync', label: 'List Automator' },
  { to: '/calculators', icon: 'calc', label: 'Analysis' },
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
];
// Phones get a bottom tab bar instead of the side rail: these four, plus everything else under More.
const TABS = ['/', '/my-properties', '/contacts', '/calculators'];

export function App() {
  const { wallet } = useStore();
  const { ready, user } = useAuth();
  const { shown } = useTheme();
  const { pathname } = useLocation();
  const [more, setMore] = useState(false);
  useEffect(() => setMore(false), [pathname]);
  if (AUTH_ENABLED) {
    if (!ready) return <div className="login"><p className="muted">Loading…</p></div>;
    if (!user) return <><Login /><Toasts /></>;
    if (!user.emailVerified) return <VerifyEmail email={user.email ?? ''} />;
  }
  return (
    <div className="app">
      <nav className="rail" aria-label="Main">
        <div className="brand" title="PropertyView">
          <span className="brand-mark">PV</span>
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `rail-item${isActive ? ' active' : ''}`}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </NavLink>
        ))}
        <div className="rail-spacer" />
        <button className="rail-item rail-theme" onClick={() => setTheme(shown === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${shown === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${shown === 'dark' ? 'light' : 'dark'} mode`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {shown === 'dark' ? <><circle cx="12" cy="12" r="4" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" /></> : <path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" />}
          </svg>
          <span>{shown === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        <NavLink to="/account" className={({ isActive }) => `rail-item${isActive ? ' active' : ''}`}>
          {user?.photoURL ? <img className="rail-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : <Icon name="person" size={22} />}
          <span>Account</span>
          <span className="wallet">${wallet.toFixed(2)}</span>
        </NavLink>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/" element={<Search />} />
          <Route path="/property/:id" element={<PropertyDetail />} />
          <Route path="/lookup" element={<Lookup />} />
          <Route path="/my-properties" element={<MyProperties />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/skip-tracing" element={<SkipTracing />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/automator" element={<Automator />} />
          <Route path="/calculators" element={<Calculators />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/account" element={<Account />} />
        </Routes>
      </main>
      <nav className="tabbar" aria-label="Main">
        {NAV.filter((n) => TABS.includes(n.to)).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `tab${isActive && !more ? ' active' : ''}`}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </NavLink>
        ))}
        <button className={`tab${more || !TABS.includes(pathname) && !pathname.startsWith('/property') && pathname !== '/lookup' ? ' active' : ''}`} aria-expanded={more} onClick={() => setMore(!more)}>
          {user?.photoURL ? <img className="rail-avatar" src={user.photoURL} alt="" referrerPolicy="no-referrer" /> : <Icon name="more" size={22} />}
          <span>More</span>
        </button>
      </nav>
      {more && (
        <div className="more-backdrop" onClick={() => setMore(false)}>
          <div className="more-sheet" role="dialog" aria-label="More pages" onClick={(e) => e.stopPropagation()}>
            {NAV.filter((n) => !TABS.includes(n.to)).map((n) => (
              <NavLink key={n.to} to={n.to} className={({ isActive }) => `more-item${isActive ? ' active' : ''}`}>
                <Icon name={n.icon} size={24} />
                <span>{n.label}</span>
              </NavLink>
            ))}
            <NavLink to="/account" className={({ isActive }) => `more-item${isActive ? ' active' : ''}`}>
              <Icon name="person" size={24} />
              <span>Account</span>
            </NavLink>
            <button className="more-item" onClick={() => setTheme(shown === 'dark' ? 'light' : 'dark')}>
              <Icon name={shown === 'dark' ? 'sun' : 'moon'} size={24} />
              <span>{shown === 'dark' ? 'Light mode' : 'Dark mode'}</span>
            </button>
          </div>
        </div>
      )}
      <Toasts />
    </div>
  );
}
