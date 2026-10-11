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
            <b>{off ? '—' : count != null ? count.toLocaleString() : t.key === 'mls' ? (area.mlsBusy ? '…' : 'Load') : '…'}</b>
            <span>{t.label}</span>
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
