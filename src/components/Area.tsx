import { useEffect, useMemo, useState } from 'react';
import { TILES, bounding, inside, searchArea, type AreaResult, type LatLng, type TileKey } from '../lib/area';
import { downloadCsv, money } from '../lib/format';
import { lookupListings, type Listing } from '../lib/provider';
import { dataKey } from '../lib/store';

export interface AreaItem {
  key: string;
  lat: number;
  lng: number;
  title: string;
  sub: string;
  right: string | null;
  csv: (string | number | null)[];
}

// State for a drawn perimeter: the parcels inside it, the chosen category and its rows.
export function useArea(ring: LatLng[] | null) {
  const [result, setResult] = useState<AreaResult | null>(null);
  const [error, setError] = useState('');
  const [mls, setMls] = useState<Listing[] | null>(null);
  const [mlsBusy, setMlsBusy] = useState(false);
  const [tab, setTab] = useState<TileKey>('all');

  useEffect(() => {
    setResult(null);
    setError('');
    setMls(null);
    setTab('all');
    if (!ring) return;
    let live = true;
    searchArea(ring).then((r) => live && setResult(r), (e) => live && setError(e instanceof Error ? e.message : 'The parcel service could not be reached.'));
    return () => {
      live = false;
    };
  }, [ring]);

  const loadMls = async () => {
    if (!ring || mlsBusy) return;
    setMlsBusy(true);
    try {
      const { center, miles } = bounding(ring);
      setMls((await lookupListings(center.lat, center.lng, miles, dataKey())).filter((l) => inside(ring, l)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Listings could not be loaded.');
    }
    setMlsBusy(false);
  };

  const counts = useMemo(() => {
    const out: Partial<Record<TileKey, number>> = {};
    for (const t of TILES) if (t.test && result && (!t.needs || result.has[t.needs])) out[t.key] = result.rows.filter(t.test).length;
    if (mls) out.mls = mls.length;
    return out;
  }, [result, mls]);

  const items: AreaItem[] = useMemo(() => {
    if (tab === 'mls')
      return (mls ?? []).map((l, i) => ({
        key: `m${i}`, lat: l.lat, lng: l.lng, title: l.street,
        sub: [l.beds != null && `${l.beds} bd`, l.baths != null && `${l.baths} ba`, l.sqft && `${l.sqft.toLocaleString()} sqft`, l.daysOnMarket != null && `${l.daysOnMarket} days on market`].filter(Boolean).join(' · ') || (l.type ?? ''),
        right: l.price ? money(l.price) : null,
        csv: [l.address, l.price, l.beds, l.baths, l.sqft, l.type, l.daysOnMarket, l.listed],
      }));
    const test = TILES.find((t) => t.key === tab)?.test;
    return (result && test ? result.rows.filter(test) : []).map((r) => ({
      key: r.key, lat: r.lat, lng: r.lng, title: r.address,
      sub: r.owner ? (tab === 'absentee' && r.mailing ? `${r.owner} · mails to ${r.mailing}` : r.owner) : 'Owner not published',
      right: r.value ? money(r.value) : null,
      csv: [r.address, r.owner, r.mailing, r.value, r.saleDate, r.absentee ? 'Yes' : '', r.company ? 'Yes' : '', r.bank ? 'Yes' : '', r.vacant ? 'Yes' : ''],
    }));
  }, [tab, result, mls]);

  const exportCsv = () =>
    downloadCsv(`area-${tab}.csv`, [tab === 'mls' ? ['Address', 'List Price', 'Beds', 'Baths', 'SqFt', 'Type', 'Days on Market', 'Listed'] : ['Address', 'Owner', 'Mailing Address', 'Assessed Value', 'Sale Date', 'Absentee', 'Company Owned', 'Bank Owned', 'Vacant Land'], ...items.map((i) => i.csv)]);

  const pick = (key: TileKey) => {
    setTab(key);
    if (key === 'mls' && !mls) loadMls();
  };
  return { result, error, tab, pick, counts, items, mlsBusy, exportCsv, loading: !!ring && !result && !error };
}
type Area = ReturnType<typeof useArea>;

// One line icon per category, drawn on a 24px grid in the current text colour.
const ICONS: Record<TileKey, JSX.Element> = {
  // stacked parcels
  all: <path d="M3 8l9-4 9 4-9 4-9-4zM3 12.5l9 4 9-4M3 17l9 4 9-4" />,
  // for-sale sign
  mls: <path d="M6 21V3M6 6h13v8H6M10 10h5" />,
  // house with a warning mark
  pre: <path d="M3 11l9-7 9 7M5 9.5V20h14V9.5M12 11.5v4M12 17.6v.1" />,
  // gavel
  auction: <path d="M13.5 3.5l6 6-3 3-6-6 3-3zM12 10.5L4 18.5M3 21h9" />,
  // bank building
  bank: <path d="M3 9l9-5 9 5H3zM6 9v8M10 9v8M14 9v8M18 9v8M4 17h16M3 20.5h18" />,
  // banknote
  cash: <><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.8" /><path d="M6 9.5v.1M18 14.5v.1" /></>,
  // recorded document with a seal
  liens: <><path d="M6 3h8l4 4v14H6V3zM14 3v4h4M9 11h6M9 14.5h3" /><circle cx="14.5" cy="17" r="1.6" /></>,
  // empty staked-out lot
  vacant: <><rect x="4" y="5" width="16" height="14" rx="1" strokeDasharray="3 2.6" /><path d="M9 15l2.2-3 1.8 2 1.3-1.5L17 15" /></>,
  // rising value
  equity: <path d="M4 18l5-5 4 3 7-8M15 8h5v5M4 21h16" />,
  // owner's mail goes elsewhere
  absentee: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3.5 8l8.5 6 8.5-6" /></>,
  // office building
  company: <path d="M5 21V4h9v17M14 9h5v12M3 21h18M8 8h3M8 12h3M8 16h3M16.5 13v.1M16.5 17v.1" />,
};

// Category tiles for the drawn area. Greyed tiles say why they cannot be filled.
export function AreaTiles({ area }: { area: Area }) {
  const hasKey = !!dataKey();
  return (
    <div className="area-tiles" role="tablist" aria-label="Categories in the drawn area">
      {TILES.map((t) => {
        const count = area.counts[t.key];
        const missing = t.needs && area.result && !area.result.has[t.needs];
        const off = !!t.why || !!missing || (t.key === 'mls' && !hasKey);
        const reason = t.why ?? (missing ? `${area.result?.source ?? 'This area\'s public source'} does not publish what this needs.` : t.key === 'mls' ? (hasKey ? 'Active for-sale listings. Loading them uses one property-data request.' : 'Needs the property data service, which is not set up in this browser.') : '');
        return (
          <button key={t.key} role="tab" aria-selected={area.tab === t.key} disabled={off} title={reason} className={`area-tile${area.tab === t.key ? ' on' : ''}`} onClick={() => area.pick(t.key)}>
            <svg className="area-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICONS[t.key]}</svg>
            <span className="area-text">
              <b>{off ? '—' : count != null ? count.toLocaleString() : t.key === 'mls' ? (area.mlsBusy ? '…' : 'Load') : '…'}</b>
              <span>{t.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

const PAGE = 250;

export function AreaPanel({ area, onOpen }: { area: Area; onOpen: (i: AreaItem) => void }) {
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [area.tab, area.result]);
  const label = TILES.find((t) => t.key === area.tab)?.label ?? '';
  return (
    <>
      <div className="results-head">
        <div><strong>{label}</strong><span className="muted"> · {area.items.length.toLocaleString()}{area.tab !== 'mls' && area.result?.capped ? '+' : ''} in the drawn area</span></div>
        <button className="btn sm" disabled={!area.items.length} onClick={area.exportCsv}>Export</button>
      </div>
      <div className="results-list">
        {area.loading && <p className="muted pad">Loading the parcels inside the boundary…</p>}
        {area.error && <p className="error pad" role="alert">{area.error}</p>}
        {area.result && !area.result.source && <p className="muted pad">No free public parcel source covers this area.</p>}
        {area.tab === 'mls' && area.mlsBusy && <p className="muted pad">Loading listings…</p>}
        {!area.loading && !area.error && !area.items.length && !(area.tab === 'mls' && area.mlsBusy) && area.result?.source && <p className="muted pad">Nothing in this category inside the boundary.</p>}
        {area.items.slice(0, shown).map((p) => (
          <button key={p.key} className="parcel-row" onClick={() => onOpen(p)}>
            <span className="parcel-main"><b>{p.title}</b><span className="muted">{p.sub}</span></span>
            {p.right && <span className="parcel-value">{p.right}</span>}
          </button>
        ))}
        {area.items.length > shown && <button className="btn block" onClick={() => setShown(shown + PAGE)}>Show more ({(area.items.length - shown).toLocaleString()} left)</button>}
        {area.result?.capped && <p className="muted pad">The boundary holds more parcels than the {area.result.rows.length.toLocaleString()} loaded. Draw a smaller area for a complete list.</p>}
      </div>
      {area.result?.source && <div className="results-foot muted">Source: {area.tab === 'mls' ? 'RentCast for-sale listings' : area.result.source}</div>}
    </>
  );
}
