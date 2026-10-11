import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stat } from '../components/ui';
import { allProperties } from '../lib/data';
import { LEAD_LISTS, matchesLocation } from '../lib/filters';
import { LEAD_STATUSES, setState, useStore } from '../lib/store';

export function Dashboard() {
  const nav = useNavigate();
  const { lists, contacts, campaigns, skip, status, search, activity } = useStore();
  const savedCount = new Set(lists.flatMap((l) => l.propertyIds)).size;
  const pipeline = LEAD_STATUSES.map((s) => ({ s, n: Object.values(status).filter((v) => v === s).length }));
  const max = Math.max(1, ...pipeline.map((x) => x.n));
  const counts = useMemo(() => {
    const inLoc = allProperties().filter((p) => matchesLocation(p, search.loc));
    return LEAD_LISTS.map((l) => ({ ...l, n: inLoc.filter(l.test).length }));
  }, [search.loc]);

  return (
    <div className="page">
      <div className="content-head"><h1>Dashboard</h1></div>
      <div className="stats">
        <Stat label="Saved Properties" value={savedCount.toLocaleString()} sub={<Link to="/my-properties">{lists.length} lists</Link>} />
        <Stat label="Skip Traced" value={Object.keys(skip).length.toLocaleString()} sub={<Link to="/skip-tracing">Skip tracing</Link>} />
        <Stat label="Contacts" value={contacts.length.toLocaleString()} sub={<Link to="/contacts">View contacts</Link>} />
        <Stat label="Campaigns" value={campaigns.length.toLocaleString()} sub={<Link to="/campaigns">Marketing</Link>} />
      </div>

      <div className="two-col">
        <div className="panel">
          <h3>Lead Pipeline</h3>
          {pipeline.map(({ s, n }) => (
            <div key={s} className="bar-row">
              <span>{s}</span>
              <div className="bar"><div style={{ width: `${(n / max) * 100}%` }} /></div>
              <b>{n}</b>
            </div>
          ))}
          <p className="muted">Set a lead status on any property or from My Properties.</p>
        </div>
        <div className="panel">
          <h3>Recent Activity</h3>
          {activity.length ? <ul className="activity">{activity.slice(0, 8).map((a) => <li key={a.t}><span className="muted">{new Date(a.t).toLocaleDateString()}</span> {a.msg}</li>)}</ul> : <p className="muted">Save a list or run a skip trace and it will show up here.</p>}
        </div>
      </div>

      <div className="panel">
        <h3>Lead Lists in {search.loc.label}</h3>
        <div className="lead-grid">
          {counts.map((l) => (
            <button key={l.key} className="lead-tile" onClick={() => { setState((s) => ({ search: { ...s.search, criteria: {}, leadLists: [l.key] } })); nav('/'); }}>
              <b>{l.n.toLocaleString()}</b>
              <span>{l.name}</span>
              <small>{l.desc}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
