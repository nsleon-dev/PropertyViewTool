import { useState } from 'react';
import { Modal, Stat, toast } from '../components/ui';
import { allProperties } from '../lib/data';
import { FILTERS, LEAD_LISTS } from '../lib/filters';
import { PERMISSIONS, POSTCARD_COST, SKIP_COST, BUILT_IN_GOOGLE, RENTCAST_PROXY, aiKey, dataKey, googleKey, resetAll, setState, uid, useStore, type Member } from '../lib/store';

export function Account() {
  const { team, wallet, activity, settings } = useStore();
  const [keys, setKeys] = useState(settings);
  const [edit, setEdit] = useState<Member | null>(null);
  const [amount, setAmount] = useState(25);

  const save = () => {
    if (!edit) return;
    setState((s) => ({ team: edit.id ? s.team.map((m) => (m.id === edit.id ? edit : m)) : [...s.team, { ...edit, id: uid() }] }));
    setEdit(null);
  };

  return (
    <div className="page">
      <div className="content-head"><h1>Account</h1></div>

      <div className="panel">
        <h3>Wallet</h3>
        <div className="stats">
          <Stat label="Balance" value={`$${wallet.toFixed(2)}`} sub="Simulated credits — no payment is taken" />
          <Stat label="Skip Trace" value={`$${SKIP_COST.toFixed(2)}`} sub="per record" />
          <Stat label="Postcard" value={`$${POSTCARD_COST.toFixed(2)}`} sub="per piece" />
        </div>
        <div className="row">
          <input type="number" min={1} value={amount} aria-label="Amount to add" onChange={(e) => setAmount(+e.target.value)} />
          <button className="btn primary" disabled={!(amount > 0)} onClick={() => { setState((s) => ({ wallet: Math.round((s.wallet + amount) * 100) / 100 })); toast(`Added $${amount.toFixed(2)} in credits`); }}>Add Credits</button>
        </div>
      </div>

      <div className="panel">
        <h3>Map &amp; Data Keys</h3>
        {BUILT_IN_GOOGLE ? (
          <p className="muted"><b>Google Maps</b> · built into this site. The key is restricted to this web address.</p>
        ) : (
          <>
            <label className="field">
              <span>Google Maps API key {googleKey() ? '· active' : '· not set (OpenStreetMap is shown instead)'}</span>
              <input type="password" value={keys.googleKey} onChange={(e) => setKeys({ ...keys, googleKey: e.target.value.trim() })} placeholder="AIza…" autoComplete="off" spellCheck={false} />
            </label>
            <p className="muted">
              Create one in the <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noreferrer">Google Cloud console</a> with billing enabled, and turn on the
              <b> Maps JavaScript API</b> and <b>Geocoding API</b> (used to read the address where you click).
            </p>
          </>
        )}
        {RENTCAST_PROXY ? (
          <>
            <label className="field">
              <span>Property data access code</span>
              <input type="password" value={keys.dataKey} onChange={(e) => setKeys({ ...keys, dataKey: e.target.value.trim() })} placeholder="Only needed if the site owner set one" autoComplete="off" spellCheck={false} />
            </label>
            <p className="muted"><b>Property data (RentCast)</b> · built into this site. The key is held on the server and never sent to this browser.</p>
          </>
        ) : (
          <>
            <label className="field">
              <span>Property data key (RentCast) {dataKey() ? '· active' : '· not set'}</span>
              <input type="password" value={keys.dataKey} onChange={(e) => setKeys({ ...keys, dataKey: e.target.value.trim() })} placeholder="RentCast API key" autoComplete="off" spellCheck={false} />
            </label>
            <p className="muted">
              Optional. With a key from <a href="https://www.rentcast.io/api" target="_blank" rel="noreferrer">rentcast.io/api</a>, clicking any spot on the map can pull the real public record for that
              address. Each lookup uses one request from your RentCast plan; value and rent estimates use two.
            </p>
          </>
        )}
        <label className="field">
          <span>Anthropic API key (AI deal rating) {aiKey() ? '· active' : '· not set'}</span>
          <input type="password" value={keys.aiKey ?? ''} onChange={(e) => setKeys({ ...keys, aiKey: e.target.value.trim() })} placeholder="sk-ant-…" autoComplete="off" spellCheck={false} />
        </label>
        <p className="muted">
          Optional. With a key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">console.anthropic.com</a>, the Intelligence tab can ask Claude to rate a
          property from every fact on its record. Each rating is one API request billed to your Anthropic account, typically a few cents.
        </p>
        <div className="row">
          <button className="btn primary" onClick={() => { setState(() => ({ settings: keys })); location.reload(); }}>Save Keys &amp; Reload</button>
          <span className="muted">Keys are stored only in this browser.</span>
        </div>
      </div>

      <div className="panel">
        <div className="content-head">
          <h3>Team Members</h3>
          <span className="grow" />
          <button className="btn sm primary" onClick={() => setEdit({ id: '', name: '', email: '', role: 'Member', perms: { Search: true } })}>+ Add Member</button>
        </div>
        <table className="table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Permissions</th><th /></tr></thead>
          <tbody>
            {team.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td><td>{m.email}</td><td>{m.role}</td>
                <td>{PERMISSIONS.filter((p) => m.perms[p]).join(', ') || '—'}</td>
                <td className="r nowrap">
                  <button className="link" onClick={() => setEdit(m)}>Edit</button>{' '}
                  {m.id !== 'owner' && <button className="link danger" onClick={() => confirm(`Remove ${m.name}?`) && setState((s) => ({ team: s.team.filter((x) => x.id !== m.id) }))}>Remove</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">Team records and permissions are stored in this browser. There is no sign-in, so permissions are not enforced.</p>
      </div>

      <div className="panel">
        <h3>Data</h3>
        <p>
          {allProperties().length.toLocaleString()} sample property records across 7 counties · {FILTERS.length} filters · {LEAD_LISTS.length} lead lists.
          Records are generated locally for demonstration; owners, values, liens and contact details are fictional. Connect a licensed data provider in <code>src/lib/data.ts</code> for real records.
        </p>
        <button className="btn danger" onClick={() => confirm('Erase all lists, contacts, campaigns, notes and settings stored in this browser?') && resetAll()}>Reset All Saved Data</button>
      </div>

      <div className="panel">
        <h3>Recent Activity</h3>
        {activity.length ? <ul className="activity">{activity.slice(0, 20).map((a) => <li key={a.t}><span className="muted">{new Date(a.t).toLocaleString()}</span> {a.msg}</li>)}</ul> : <p className="muted">Nothing yet.</p>}
      </div>

      {edit && (
        <Modal title={edit.id ? 'Edit team member' : 'Add team member'} onClose={() => setEdit(null)}>
          <label className="field"><span>Name</span><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></label>
          <label className="field"><span>Email</span><input type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></label>
          <label className="field"><span>Role</span><select value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value })}><option>Admin</option><option>Member</option><option>Read Only</option></select></label>
          <div className="field"><span>Permissions</span>
            <div className="checks">{PERMISSIONS.map((p) => <label key={p} className="check"><input type="checkbox" checked={!!edit.perms[p]} onChange={(e) => setEdit({ ...edit, perms: { ...edit.perms, [p]: e.target.checked } })} />{p}</label>)}</div>
          </div>
          <div className="modal-actions"><button className="btn primary" disabled={!edit.name.trim()} onClick={save}>Save</button></div>
        </Modal>
      )}
    </div>
  );
}
