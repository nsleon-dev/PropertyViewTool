import { useState } from 'react';
import { FILTERS, SECTIONS, isActive, type Criteria, type DateRange, type FilterDef, type Range } from '../lib/filters';
import { Icon } from './ui';

interface Props {
  criteria: Criteria;
  onChange: (c: Criteria) => void;
  onClose: () => void;
  resultCount: number;
}

export function FilterPanel({ criteria, onChange, onClose, resultCount }: Props) {
  const [open, setOpen] = useState<string>(SECTIONS[0]);
  const [find, setFind] = useState('');

  const set = (key: string, v: Criteria[string] | undefined) => {
    const next = { ...criteria };
    if (v === undefined) delete next[key];
    else next[key] = v;
    onChange(next);
  };
  const q = find.trim().toLowerCase();

  return (
    <aside className="filter-panel">
      <div className="filter-head">
        <h3>Filters</h3>
        <button className="link" onClick={() => onChange({})}>Clear all</button>
        <button className="icon-btn" onClick={onClose} aria-label="Close filters"><Icon name="close" /></button>
      </div>
      <input className="filter-find" placeholder="Find a filter…" value={find} onChange={(e) => setFind(e.target.value)} />
      <div className="filter-scroll">
        {SECTIONS.map((section) => {
          const defs = FILTERS.filter((f) => f.section === section && (!q || f.label.toLowerCase().includes(q)));
          if (!defs.length) return null;
          const active = defs.filter((d) => isActive(d, criteria[d.key])).length;
          const expanded = !!q || open === section;
          return (
            <section key={section} className="filter-section">
              <button className="filter-section-head" onClick={() => setOpen(expanded && !q ? '' : section)} aria-expanded={expanded}>
                <span>{section}</span>
                {active > 0 && <span className="badge">{active}</span>}
                <span className="chev">{expanded ? '−' : '+'}</span>
              </button>
              {expanded && defs.map((d) => <FilterControl key={d.key} def={d} value={criteria[d.key]} onChange={(v) => set(d.key, v)} />)}
            </section>
          );
        })}
      </div>
      <div className="filter-foot">
        <button className="btn primary block" onClick={onClose}>Show {resultCount.toLocaleString()} properties</button>
      </div>
    </aside>
  );
}

function FilterControl({ def, value, onChange }: { def: FilterDef; value: Criteria[string] | undefined; onChange: (v: Criteria[string] | undefined) => void }) {
  if (def.kind === 'bool') {
    return (
      <div className="filter-row">
        <label>{def.label}</label>
        <div className="seg">
          {(['any', 'yes', 'no'] as const).map((o) => (
            <button key={o} className={(value ?? 'any') === o ? 'on' : ''} onClick={() => onChange(o === 'any' ? undefined : o)}>
              {o === 'any' ? 'Any' : o === 'yes' ? 'Yes' : 'No'}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (def.kind === 'multi') {
    const sel = (value as string[] | undefined) ?? [];
    return (
      <div className="filter-row col">
        <label>{def.label}</label>
        <div className="checks">
          {def.options!.map((o) => (
            <label key={o} className="check">
              <input
                type="checkbox"
                checked={sel.includes(o)}
                onChange={(e) => {
                  const next = e.target.checked ? [...sel, o] : sel.filter((x) => x !== o);
                  onChange(next.length ? next : undefined);
                }}
              />
              {o}
            </label>
          ))}
        </div>
      </div>
    );
  }
  if (def.kind === 'range') {
    const r = (value as Range | undefined) ?? {};
    const upd = (k: 'min' | 'max', raw: string) => {
      const next: Range = { ...r, [k]: raw === '' ? undefined : Number(raw) };
      onChange(next.min == null && next.max == null ? undefined : next);
    };
    return (
      <div className="filter-row col">
        <label>{def.label}{def.unit ? ` (${def.unit})` : ''}</label>
        <div className="range">
          <input type="number" placeholder="Min" aria-label={`${def.label} minimum`} value={r.min ?? ''} onChange={(e) => upd('min', e.target.value)} />
          <span>to</span>
          <input type="number" placeholder="Max" aria-label={`${def.label} maximum`} value={r.max ?? ''} onChange={(e) => upd('max', e.target.value)} />
        </div>
      </div>
    );
  }
  const d = (value as DateRange | undefined) ?? {};
  const upd = (k: 'from' | 'to', raw: string) => {
    const next: DateRange = { ...d, [k]: raw || undefined };
    onChange(!next.from && !next.to ? undefined : next);
  };
  return (
    <div className="filter-row col">
      <label>{def.label}</label>
      <div className="range">
        <input type="date" aria-label={`${def.label} from`} value={d.from ?? ''} onChange={(e) => upd('from', e.target.value)} />
        <span>to</span>
        <input type="date" aria-label={`${def.label} to`} value={d.to ?? ''} onChange={(e) => upd('to', e.target.value)} />
      </div>
    </div>
  );
}
