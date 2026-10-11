import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AddToListModal, Empty, Tag, toast } from '../components/ui';
import { runSkipTrace } from '../lib/actions';
import { getProperty, type Property } from '../lib/data';
import { downloadCsv, money, propertyCsv, tags } from '../lib/format';
import { LEAD_STATUSES, createList, setState, toggleStar, useStore } from '../lib/store';

const PAGE = 50;

export function MyProperties() {
  const { lists, skip, status, starred } = useStore();
  const [params, setParams] = useSearchParams();
  const listId = params.get('list') ?? (starred.length && !lists.some((l) => l.propertyIds.length) ? 'starred' : 'all');
  const [find, setFind] = useState('');
  const [stacked, setStacked] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [copying, setCopying] = useState(false);

  // How many lists each property sits in: the basis for list stacking.
  const stackCount = useMemo(() => {
    const m = new Map<string, number>();
    lists.forEach((l) => l.propertyIds.forEach((id) => m.set(id, (m.get(id) ?? 0) + 1)));
    return m;
  }, [lists]);

  const current = lists.find((l) => l.id === listId);
  const rows = useMemo(() => {
    const ids = current ? current.propertyIds : [...stackCount.keys()];
    const q = find.trim().toLowerCase();
    return ids
      .map(getProperty)
      .filter((p): p is Property => !!p)
      .filter((p) => (!stacked || (stackCount.get(p.id) ?? 0) > 1) && (!q || `${p.address} ${p.city} ${p.zip} ${p.ownerName}`.toLowerCase().includes(q)))
      .sort((a, b) => (stackCount.get(b.id) ?? 0) - (stackCount.get(a.id) ?? 0));
  }, [current, stackCount, find, stacked]);

  useEffect(() => {
    setSelected(new Set());
    setPage(0);
  }, [listId, find, stacked]);

  const ids = selected.size ? [...selected] : rows.map((p) => p.id);
  const scope = selected.size ? `${selected.size.toLocaleString()} selected` : `all ${rows.length.toLocaleString()}`;

  const removeFromList = () => {
    if (!current) return;
    const drop = new Set(ids);
    if (!confirm(`Remove ${drop.size.toLocaleString()} properties from "${current.name}"?`)) return;
    setState((s) => ({ lists: s.lists.map((l) => (l.id === current.id ? { ...l, propertyIds: l.propertyIds.filter((id) => !drop.has(id)) } : l)) }));
    setSelected(new Set());
  };
  const rename = () => {
    const name = prompt('Rename list', current!.name)?.trim();
    if (name) setState((s) => ({ lists: s.lists.map((l) => (l.id === current!.id ? { ...l, name } : l)) }));
  };
  const remove = () => {
    if (!confirm(`Delete the list "${current!.name}"? Properties in other lists are not affected.`)) return;
    setState((s) => ({ lists: s.lists.filter((l) => l.id !== current!.id) }));
    setParams({});
  };

  return (
    <div className="page split">
      <aside className="side">
        <h2>My Properties</h2>
        <button className={`side-row${listId === 'starred' ? ' on' : ''}`} onClick={() => setParams({ list: 'starred' })}>
          <span>★ Starred</span><span className="muted">{starred.length.toLocaleString()}</span>
        </button>
        <button className={`side-row${listId === 'all' ? ' on' : ''}`} onClick={() => setParams({ list: 'all' })}>
          <span>All Saved Properties</span><span className="muted">{stackCount.size.toLocaleString()}</span>
        </button>
        <div className="side-label">Marketing Lists</div>
        {lists.map((l) => (
          <button key={l.id} className={`side-row${listId === l.id ? ' on' : ''}`} onClick={() => setParams({ list: l.id })}>
            <span>{l.name}</span><span className="muted">{l.propertyIds.length.toLocaleString()}</span>
          </button>
        ))}
        <button className="btn block" onClick={() => { const n = prompt('New list name')?.trim(); if (n) setParams({ list: createList(n, []) }); }}>+ New List</button>
      </aside>

      {listId === 'starred' ? (
      <section className="content">
        <div className="content-head"><h1>Starred</h1></div>
        {!starred.length ? (
          <Empty title="No starred properties yet">Click the star in the top corner of a property's panel on the <Link to="/">map</Link> to save it here.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Address</th><th>Source</th><th>Saved</th><th>Status</th><th /></tr></thead>
              <tbody>
                {starred.map((x) => (
                  <tr key={x.id}>
                    <td><Link to={x.real ? `/lookup?lat=${x.lat}&lng=${x.lng}&address=${encodeURIComponent(x.address)}` : `/property/${x.id}`}>{x.address}</Link></td>
                    <td>{x.real ? 'Real address' : 'Sample record'}</td>
                    <td>{x.added}</td>
                    <td>
                      <select value={status[x.id] ?? ''} aria-label="Lead status" onChange={(e) => setState((s) => ({ status: { ...s.status, [x.id]: e.target.value } }))}>
                        <option value="">—</option>
                        {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="r"><button className="btn sm" onClick={() => toggleStar(x)}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      ) : (
      <section className="content">
        <div className="content-head">
          <h1>{current?.name ?? 'All Saved Properties'}</h1>
          {current && <><button className="btn sm" onClick={rename}>Rename</button><button className="btn sm danger" onClick={remove}>Delete List</button></>}
        </div>
        <div className="toolbar">
          <input placeholder="Filter by address, city, ZIP, or owner" value={find} onChange={(e) => setFind(e.target.value)} />
          <label className="check" title="Properties that appear in more than one list are usually the most motivated leads"><input type="checkbox" checked={stacked} onChange={(e) => setStacked(e.target.checked)} />In 2+ lists (stacked)</label>
          <span className="grow" />
          <span className="muted">Apply to {scope}:</span>
          <button className="btn sm" disabled={!rows.length} onClick={() => toast(runSkipTrace(ids).msg)}>Skip Trace</button>
          <button className="btn sm" disabled={!rows.length} onClick={() => setCopying(true)}>Copy to List</button>
          <button className="btn sm" disabled={!rows.length} onClick={() => downloadCsv(`${current?.name ?? 'my-properties'}.csv`, propertyCsv(rows.filter((p) => !selected.size || selected.has(p.id)), skip))}>Export CSV</button>
          {current && <button className="btn sm danger" disabled={!rows.length} onClick={removeFromList}>Remove</button>}
        </div>

        {!rows.length ? (
          <Empty title={stackCount.size ? 'Nothing here' : 'No saved properties yet'}>
            Run a <Link to="/">search</Link>, then use “Save to List” to start a marketing list.
          </Empty>
        ) : (
          <>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th><input type="checkbox" aria-label="Select all" checked={selected.size === rows.length} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((p) => p.id)) : new Set())} /></th>
                    <th>Address</th><th>Owner</th><th>Type</th><th className="r">Est. Value</th><th className="r">Equity</th><th className="r">Lists</th><th>Phone</th><th>Status</th><th>Flags</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(page * PAGE, page * PAGE + PAGE).map((p) => (
                    <tr key={p.id}>
                      <td><input type="checkbox" aria-label={`Select ${p.address}`} checked={selected.has(p.id)} onChange={() => setSelected((s) => { const n = new Set(s); n.has(p.id) ? n.delete(p.id) : n.add(p.id); return n; })} /></td>
                      <td><Link to={`/property/${p.id}`}>{p.address}</Link><div className="muted">{p.city}, {p.state} {p.zip}</div></td>
                      <td>{p.ownerName}<div className="muted">{p.occupancy}</div></td>
                      <td>{p.type}</td>
                      <td className="r">{money(p.estValue)}</td>
                      <td className="r">{p.equityPct}%</td>
                      <td className="r">{(stackCount.get(p.id) ?? 0) > 1 ? <Tag text={`${stackCount.get(p.id)} lists`} tone="orange" /> : 1}</td>
                      <td>{skip[p.id]?.phones[0]?.number ?? <span className="muted">Not traced</span>}</td>
                      <td>
                        <select value={status[p.id] ?? ''} aria-label="Lead status" onChange={(e) => setState((s) => ({ status: { ...s.status, [p.id]: e.target.value } }))}>
                          <option value="">—</option>
                          {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td><div className="tags">{tags(p).slice(0, 3).map((t) => <Tag key={t.text} {...t} />)}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > PAGE && (
              <div className="pager">
                <button className="btn sm" disabled={page === 0} onClick={() => setPage(page - 1)}>‹ Prev</button>
                <span>Page {page + 1} of {Math.ceil(rows.length / PAGE)}</span>
                <button className="btn sm" disabled={(page + 1) * PAGE >= rows.length} onClick={() => setPage(page + 1)}>Next ›</button>
              </div>
            )}
          </>
        )}
      </section>
      )}
      {copying && <AddToListModal ids={ids} onClose={() => setCopying(false)} />}
    </div>
  );
}
