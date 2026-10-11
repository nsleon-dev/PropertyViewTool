import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, Stat, Tag, toast } from '../components/ui';
import { runSkipTrace } from '../lib/actions';
import { getProperty, type Property } from '../lib/data';
import { date, downloadCsv, propertyCsv } from '../lib/format';
import { SKIP_COST, useStore } from '../lib/store';

export function SkipTracing() {
  const { lists, skip, wallet } = useStore();
  const [listId, setListId] = useState(lists[0]?.id ?? '');
  const list = lists.find((l) => l.id === listId);
  const pending = list ? list.propertyIds.filter((id) => !skip[id]) : [];
  const cost = pending.length * SKIP_COST;

  const traced = Object.keys(skip).map(getProperty).filter((p): p is Property => !!p);
  const phones = traced.reduce((n, p) => n + skip[p.id].phones.length, 0);

  return (
    <div className="page">
      <div className="content-head"><h1>Skip Tracing</h1></div>
      <div className="stats">
        <Stat label="Records Traced" value={traced.length.toLocaleString()} />
        <Stat label="Phone Numbers Found" value={phones.toLocaleString()} />
        <Stat label="Emails Found" value={traced.filter((p) => skip[p.id].emails.length).length.toLocaleString()} />
        <Stat label="Wallet Balance" value={`$${wallet.toFixed(2)}`} sub={<Link to="/account">Add funds</Link>} />
      </div>

      <div className="panel">
        <h3>New Order</h3>
        {!lists.length ? (
          <Empty title="Create a list first">Skip tracing runs on a marketing list. Save properties from <Link to="/">Search</Link> to get started.</Empty>
        ) : (
          <div className="order">
            <label className="field">
              <span>Marketing list</span>
              <select value={listId} onChange={(e) => setListId(e.target.value)}>
                {!list && <option value="">Choose a list…</option>}
                {lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.propertyIds.length.toLocaleString()})</option>)}
              </select>
            </label>
            {list && (
              <>
                <p>
                  <b>{pending.length.toLocaleString()}</b> of {list.propertyIds.length.toLocaleString()} records need tracing ·{' '}
                  {pending.length.toLocaleString()} × ${SKIP_COST.toFixed(2)} = <b>${cost.toFixed(2)}</b>
                  {cost > wallet && <span className="neg"> · exceeds wallet balance</span>}
                </p>
                <button className="btn primary" disabled={!pending.length || cost > wallet} onClick={() => toast(runSkipTrace(list.propertyIds).msg)}>Place Order</button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="content-head">
        <h3>Results</h3>
        <span className="grow" />
        <button className="btn sm" disabled={!traced.length} onClick={() => downloadCsv('skip-trace-results.csv', propertyCsv(traced, skip))}>Export CSV</button>
      </div>
      {!traced.length ? <Empty title="No results yet" /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Owner</th><th>Property</th><th>Mailing Address</th><th>Phones</th><th>Email</th><th>Traced</th></tr></thead>
            <tbody>
              {traced.slice(0, 300).map((p) => (
                <tr key={p.id}>
                  <td>{p.ownerName}</td>
                  <td><Link to={`/property/${p.id}`}>{p.address}</Link></td>
                  <td>{p.mailAddress}, {p.mailCity}, {p.mailState}</td>
                  <td>{skip[p.id].phones.map((ph) => <div key={ph.number}><a href={`tel:${ph.number.replace(/\D/g, '')}`}>{ph.number}</a> <span className="muted">{ph.type}</span> {ph.dnc && <Tag text="DNC" tone="red" />}</div>)}</td>
                  <td>{skip[p.id].emails[0] ?? '—'}</td>
                  <td>{date(skip[p.id].date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {traced.length > 300 && <p className="muted">Showing the first 300. Export for the full set.</p>}
        </div>
      )}
    </div>
  );
}
