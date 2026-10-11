import { NavLink, Route, Routes } from 'react-router-dom';
import { Icon, Toasts } from './components/ui';
import { useStore } from './lib/store';
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

export function App() {
  const { wallet } = useStore();
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
        <NavLink to="/account" className={({ isActive }) => `rail-item${isActive ? ' active' : ''}`}>
          <Icon name="person" size={22} />
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
      <Toasts />
    </div>
  );
}
