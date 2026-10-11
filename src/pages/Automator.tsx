import { Link } from 'react-router-dom';
import { Empty, Tag, toast } from '../components/ui';
import { runAutomator } from '../lib/actions';
import { LEAD_LISTS, describeCriteria } from '../lib/filters';
import { date } from '../lib/format';
import { setState, useStore } from '../lib/store';

export function Automator() {
  const { lists } = useStore();
  const eligible = lists.filter((l) => l.source);

  const run = (id: string) => {
    const r = runAutomator(id);
    toast(`${r.added.toLocaleString()} new ${r.added === 1 ? 'property' : 'properties'} added${r.stale ? ` · ${r.stale.toLocaleString()} no longer match the criteria` : ''}`);
  };

  return (
    <div className="page">
      <div className="content-head">
        <h1>List Automator</h1>
        <span className="grow" />
        <button className="btn primary" disabled={!eligible.some((l) => l.automator)} onClick={() => eligible.filter((l) => l.automator).forEach((l) => run(l.id))}>Run All Enabled</button>
      </div>
      <p className="muted">
        Lists saved from a full search remember their location, lead lists, and filters. Turn the automator on to re-run that search and pull in
        new matches. Runs happen when you press Run — there is no background server.
      </p>
      {!eligible.length ? (
        <Empty title="No automatable lists yet">
          From <Link to="/">Search</Link>, press “Save to List” without selecting individual rows. The whole search is saved with the list.
        </Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>List</th><th>Search Criteria</th><th className="r">Properties</th><th>Last Run</th><th>Automator</th><th /></tr></thead>
            <tbody>
              {eligible.map((l) => (
                <tr key={l.id}>
                  <td><Link to={`/my-properties?list=${l.id}`}>{l.name}</Link></td>
                  <td>
                    <div className="tags">
                      <Tag text={l.source!.loc.label} tone="blue" />
                      {l.source!.leadLists.map((k) => <Tag key={k} text={LEAD_LISTS.find((x) => x.key === k)?.name ?? k} tone="orange" />)}
                      {describeCriteria(l.source!.criteria).map((c) => <Tag key={c.key} text={c.text} />)}
                    </div>
                  </td>
                  <td className="r">{l.propertyIds.length.toLocaleString()}</td>
                  <td>{date(l.lastRun)}</td>
                  <td>
                    <label className="switch">
                      <input type="checkbox" checked={l.automator} onChange={(e) => setState((s) => ({ lists: s.lists.map((x) => (x.id === l.id ? { ...x, automator: e.target.checked } : x)) }))} />
                      <span>{l.automator ? 'On' : 'Off'}</span>
                    </label>
                  </td>
                  <td className="r"><button className="btn sm" onClick={() => run(l.id)}>Run Now</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
