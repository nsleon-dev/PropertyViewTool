import { useEffect, useState, type ReactNode } from 'react';
import { RADII, loadDemographics, type Demographics as Demo, type Share } from '../lib/census';
import { money, shortMoney } from '../lib/format';
import { setState, today, uid, useStore } from '../lib/store';
import { Empty, Icon } from './ui';

export const NA = <span className="na">N/A</span>;

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="d-section">
      <div className="d-section-head">
        <h3>{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

// Label-above-value grid used throughout the property tabs.
export function Fields({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="d-fields">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v == null || v === '' ? NA : v}</dd>
        </div>
      ))}
    </dl>
  );
}

export interface TopCardsProps {
  photo: ReactNode;
  beds: ReactNode;
  baths: ReactNode;
  left: [string, ReactNode][];
  right: [string, ReactNode][];
  value: { label: string; amount: number | null; note?: string; points: { label: string; value: number }[] };
  debt: [string, ReactNode][];
  debtNote?: string;
  sale: [string, ReactNode][];
  equity: { amount: number | null; pct: number | null };
  opportunity: [string, ReactNode][];
  onComps?: () => void;
}

function KV({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div className="tc-kv">
      {rows.map(([k, v]) => (
        <div key={k}>
          <span>{k}</span>
          <b>{v ?? NA}</b>
        </div>
      ))}
    </div>
  );
}

function ValueLine({ points }: { points: { label: string; value: number }[] }) {
  if (points.length < 2) return <div className="tc-chart-empty">No value history available</div>;
  const W = 260, H = 120, pad = { l: 8, r: 8, t: 18, b: 22 };
  const max = Math.max(...points.map((p) => p.value));
  const min = Math.min(...points.map((p) => p.value));
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => (max === min ? H / 2 : pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b));
  return (
    <svg className="tc-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Value history: ${points.map((p) => `${p.label} ${money(p.value)}`).join(', ')}`}>
      <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} className="axis" />
      <polyline points={points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ')} className="line" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(p.value)} r={4.5} className="dot">
            <title>{`${p.label}: ${money(p.value)}`}</title>
          </circle>
          <text x={x(i)} y={y(p.value) - 8} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} className="val">{shortMoney(p.value)}</text>
          <text x={x(i)} y={H - 7} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} className="lbl">{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

function Ring({ pct }: { pct: number | null }) {
  const c = 2 * Math.PI * 16;
  const share = Math.max(0, Math.min(100, pct ?? 0)) / 100;
  return (
    <svg width="44" height="44" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="16" fill="none" stroke="#e3e7ee" strokeWidth="6" />
      {pct != null && <circle cx="20" cy="20" r="16" fill="none" stroke="#2a78d6" strokeWidth="6" strokeDasharray={`${c * share} ${c}`} transform="rotate(-90 20 20)" />}
    </svg>
  );
}

export function TopCards(p: TopCardsProps) {
  const band = p.equity.pct == null ? null : p.equity.pct < 0 ? 'Negative' : p.equity.pct < 25 ? 'Low' : p.equity.pct < 50 ? 'Medium' : 'High';
  return (
    <div className="top-cards">
      <div className="tc tc-facts">
        <div className="tc-photo">
          {p.photo}
          <div className="tc-bb">
            <div><span>Beds</span><b>{p.beds ?? NA}</b></div>
            <div><span>Baths</span><b>{p.baths ?? NA}</b></div>
          </div>
          <div className="tc-list">{p.left.map(([k, v]) => <div key={k}><span>{k}</span><b>{v ?? NA}</b></div>)}</div>
        </div>
        <div className="tc-list">{p.right.map(([k, v]) => <div key={k}><span>{k}</span><b>{v ?? NA}</b></div>)}</div>
      </div>
      <div className="tc">
        <h2>Value</h2>
        <KV rows={[[p.value.label, p.value.amount == null ? NA : money(p.value.amount)]]} />
        {p.value.note && <p className="muted">{p.value.note}</p>}
        <ValueLine points={p.value.points} />
      </div>
      <div className="tc">
        <h2>Mortgage &amp; Debt</h2>
        <KV rows={p.debt} />
        {p.debtNote && <p className="muted">{p.debtNote}</p>}
        <h2 className="sub">Last Sale</h2>
        <KV rows={p.sale} />
      </div>
      <div className="tc">
        <h2>Opportunity</h2>
        <div className="tc-equity">
          <Ring pct={p.equity.pct} />
          <div>
            <span>Equity (est.)</span>
            <b>{p.equity.amount == null ? NA : <>{money(p.equity.amount)} <small>{p.equity.pct}% · {band}</small></>}</b>
          </div>
        </div>
        <KV rows={p.opportunity} />
        {p.onComps && <button className="tc-link" onClick={p.onComps}>Open Comps</button>}
      </div>
    </div>
  );
}

// Five-step meter. Status meaning is carried by the label, not the fill colour.
export function Meter({ level, label, title }: { level: number; label: string; title: string }) {
  return (
    <div className="meter" role="img" aria-label={`${title}: ${label}`}>
      <span>{title}</span>
      <b>{label}</b>
      <div className="meter-bar">{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= level ? 'on' : ''} />)}</div>
    </div>
  );
}

function BarList({ rows }: { rows: Share[] }) {
  const total = rows.reduce((s, r) => s + r[1], 0);
  const max = Math.max(...rows.map((r) => r[1]), 1);
  if (!total) return <p className="muted">No data reported for this area.</p>;
  return (
    <div className="barlist">
      {rows.map(([label, n]) => (
        <div key={label} className="barlist-row" title={`${label}: ${n.toLocaleString()} (${((n / total) * 100).toFixed(1)}%)`}>
          <span>{label}</span>
          <div className="barlist-track"><div style={{ width: `${(n / max) * 100}%` }} /></div>
          <b>{((n / total) * 100).toFixed(1)}%</b>
        </div>
      ))}
    </div>
  );
}

// Two-part share as one stacked bar, both parts directly labelled.
function SplitBar({ rows }: { rows: Share[] }) {
  const total = rows[0][1] + rows[1][1];
  if (!total) return <p className="muted">No data reported for this area.</p>;
  const a = (rows[0][1] / total) * 100;
  return (
    <div className="split">
      <div className="split-bar" role="img" aria-label={rows.map(([l, n]) => `${l} ${((n / total) * 100).toFixed(1)}%`).join(', ')}>
        <div className="a" style={{ width: `${a}%` }} title={`${rows[0][0]}: ${rows[0][1].toLocaleString()}`} />
        <div className="b" style={{ width: `${100 - a}%` }} title={`${rows[1][0]}: ${rows[1][1].toLocaleString()}`} />
      </div>
      <div className="split-legend">
        <span><i className="a" />{rows[0][0]} <b>{a.toFixed(1)}%</b></span>
        <span><i className="b" />{rows[1][0]} <b>{(100 - a).toFixed(1)}%</b></span>
      </div>
    </div>
  );
}

// Remembered between properties for the session.
let demoRadius = 1;

export function Demographics({ lat, lng }: { lat: number; lng: number }) {
  const [d, setD] = useState<Demo | null>(null);
  const [error, setError] = useState('');
  const [radius, setRadius] = useState(demoRadius);
  useEffect(() => {
    let live = true;
    setD(null);
    setError('');
    loadDemographics(lat, lng, radius).then((r) => live && setD(r), (e) => live && setError(e instanceof Error ? e.message : 'Census data could not be loaded.'));
    return () => {
      live = false;
    };
  }, [lat, lng, radius]);

  const picker = (
    <div className="seg no-print" role="group" aria-label="Demographics area">
      {[0, ...RADII].map((r) => (
        <button key={r} className={radius === r ? 'on' : ''} aria-pressed={radius === r} onClick={() => { demoRadius = r; setRadius(r); }}>{r ? `${r} mile${r > 1 ? 's' : ''}` : 'Census tract'}</button>
      ))}
    </div>
  );
  if (error) return <>{picker}<Empty title="Demographics unavailable">{error}</Empty></>;
  if (!d) return <>{picker}<p className="muted pad">Loading census data…</p></>;
  return (
    <>
      {picker}
      <p className="muted pad">
        US Census Bureau American Community Survey (5-year estimates) for <b>{d.area}</b>
        {radius ? ` around this property, blended from ${d.tracts} census ${d.tracts === 1 ? 'tract' : 'tracts'} by the share of each inside the circle` : ', the census tract containing this property'} · population {d.population.toLocaleString()}
        {d.medianIncome ? ` · median household income ${d.medianIncome}` : ''}
      </p>
      <div className="demo-grid">
        <Section title="Owners vs Renters"><SplitBar rows={d.tenure} /></Section>
        <Section title="Employment (civilian labour force)"><SplitBar rows={d.employment} /></Section>
        <Section title="Type of Housing"><BarList rows={d.housing} /></Section>
        <Section title="Household Income"><BarList rows={d.income} /></Section>
        <Section title="Household Size"><BarList rows={d.household} /></Section>
        <Section title="Population by Age"><BarList rows={d.age} /></Section>
        <Section title="Highest Education (age 25+)"><BarList rows={d.education} /></Section>
        <Section title="Commute to Work"><BarList rows={d.commute} /></Section>
      </div>
    </>
  );
}

// Lead status is set elsewhere; this edits free-form tags for any record key.
export function TagEditor({ id }: { id: string }) {
  const { tags } = useStore();
  const mine = tags[id] ?? [];
  const [text, setText] = useState('');
  const save = (next: string[]) => setState((s) => ({ tags: { ...s.tags, [id]: next } }));
  const add = () => {
    const t = text.trim();
    if (t && !mine.includes(t)) save([...mine, t]);
    setText('');
  };
  return (
    <div className="tag-editor">
      {mine.map((t) => (
        <button key={t} className="chip lead" onClick={() => save(mine.filter((x) => x !== t))} title="Remove tag">{t} ✕</button>
      ))}
      <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder="Add a tag and press Enter" aria-label="New tag" />
    </div>
  );
}

export function DocList({ id, fixed = [] }: { id: string; fixed?: { label: string; href: string }[] }) {
  const { docs } = useStore();
  const mine = docs[id] ?? [];
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const add = () => {
    if (!name.trim() || !/^https?:\/\//i.test(url.trim())) return;
    setState((s) => ({ docs: { ...s.docs, [id]: [...mine, { id: uid(), name: name.trim(), url: url.trim(), added: today() }] } }));
    setName('');
    setUrl('');
  };
  return (
    <>
      <table className="table">
        <thead><tr><th>Name</th><th>Link</th><th>Added</th><th /></tr></thead>
        <tbody>
          {fixed.map((l) => <tr key={l.href}><td>{l.label}</td><td><a href={l.href} target="_blank" rel="noreferrer">Open ↗</a></td><td>County record</td><td /></tr>)}
          {mine.map((d) => (
            <tr key={d.id}>
              <td>{d.name}</td>
              <td><a href={d.url} target="_blank" rel="noreferrer">Open ↗</a></td>
              <td>{d.added}</td>
              <td className="r"><button className="icon-btn" aria-label={`Remove ${d.name}`} onClick={() => setState((s) => ({ docs: { ...s.docs, [id]: mine.filter((x) => x.id !== d.id) } }))}><Icon name="close" size={14} /></button></td>
            </tr>
          ))}
          {!fixed.length && !mine.length && <tr><td colSpan={4} className="muted">No documents linked yet.</td></tr>}
        </tbody>
      </table>
      <div className="row doc-add">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Document name" aria-label="Document name" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://link-to-document" aria-label="Document link" />
        <button className="btn" onClick={add} disabled={!name.trim() || !/^https?:\/\//i.test(url.trim())}>Add Document</button>
      </div>
    </>
  );
}

export function Notes({ id }: { id: string }) {
  const { notes } = useStore();
  return <textarea className="notes" rows={6} placeholder="Notes about this property, conversations with the owner, next steps…" value={notes[id] ?? ''} onChange={(e) => setState((s) => ({ notes: { ...s.notes, [id]: e.target.value } }))} />;
}
