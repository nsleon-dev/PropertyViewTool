import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ParcelList } from '../components/ParcelList';
import { SubjectPanel, type Target } from '../components/SubjectPanel';
import { LookupView } from './Lookup';
import { FilterPanel } from '../components/FilterPanel';
import { InfoPanel, type Focus } from '../components/InfoPanel';
import type { ParcelRecord } from '../lib/parcels';
import { MapView, googleReady, type MapPoint, type MapViewState } from '../components/MapView';
import { AddToListModal, Empty, Icon, Modal, Tag, Thumb, toast } from '../components/ui';
import { runSkipTrace } from '../lib/actions';
import { allProperties, distanceMiles, getProperty, type Property } from '../lib/data';
import { LEAD_LISTS, describeCriteria, matchesLocation, parseQuery, runSearch, suggest, type Location } from '../lib/filters';
import { downloadCsv, money, num, propertyCsv, shortMoney, tags } from '../lib/format';
import { setState, today, uid, useStore, type SearchState } from '../lib/store';

const PAGE = 25;
const MAX_PINS = 2500;
const SELECTED = '#1a73c7';

const SORTS: Record<string, { label: string; fn: (a: Property, b: Property) => number }> = {
  valueDesc: { label: 'Est. Value: High to Low', fn: (a, b) => b.estValue - a.estValue },
  valueAsc: { label: 'Est. Value: Low to High', fn: (a, b) => a.estValue - b.estValue },
  equityDesc: { label: 'Equity %: High to Low', fn: (a, b) => b.equityPct - a.equityPct },
  saleDesc: { label: 'Last Sale: Most Recent', fn: (a, b) => b.lastSaleDate.localeCompare(a.lastSaleDate) },
  ownedDesc: { label: 'Years Owned: Longest', fn: (a, b) => b.yearsOwned - a.yearsOwned },
  sqftDesc: { label: 'Sq Ft: Largest', fn: (a, b) => b.sqft - a.sqft },
};

// Survives leaving the page (e.g. to a property's full details) and coming back.
const memory = { key: '', view: null as MapViewState | null, selected: new Set<string>(), page: 0, sort: 'valueDesc', showResults: true };
// The last map position also survives a page reload.
const VIEW_KEY = 'propertyview.mapview';
try {
  const saved = JSON.parse(localStorage.getItem(VIEW_KEY) ?? 'null');
  if (saved) Object.assign(memory, { key: saved.key, view: saved.view });
} catch {
  // no saved view
}
const rememberView = (view: MapViewState) => {
  memory.view = view;
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify({ key: memory.key, view }));
  } catch {
    // storage unavailable
  }
};

// Geocodes a street address that is not in the dataset: Google when a key is active, OpenStreetMap otherwise.
async function geocode(q: string): Promise<{ lat: number; lng: number; address: string } | null> {
  if (googleReady()) {
    try {
      const { results } = await new google.maps.Geocoder().geocode({ address: q, componentRestrictions: { country: 'US' } });
      const r = results[0];
      if (r) return { lat: r.geometry.location.lat(), lng: r.geometry.location.lng(), address: r.formatted_address.replace(/, USA$/, '') };
    } catch {
      // Geocoding API not enabled or no match: try OpenStreetMap
    }
  }
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(q)}`);
  const hit = res.ok ? (await res.json())[0] : null;
  return hit ? { lat: +hit.lat, lng: +hit.lon, address: q } : null;
}
const looksLikeAddress = (t: string) => /^\d+\s+[a-z]/i.test(t.trim()) && !/\b(bed|bath|br|bd)\b/i.test(t);

export const pinColor = (p: Property) => (p.fcStatus !== 'None' ? '#d93025' : p.mlsStatus === 'Active' || p.mlsStatus === 'Pending' ? '#1e8e3e' : '#f26b21');

export function Search() {
  const nav = useNavigate();
  const { search, saved, skip } = useStore();
  const { loc, criteria, leadLists } = search;
  const update = (patch: Partial<SearchState>) => setState((s) => ({ search: { ...s.search, ...patch } }));

  const [text, setText] = useState('');
  const [focus, setFocus] = useState(false);
  const [menu, setMenu] = useState<'' | 'lead' | 'saved'>('');
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState(memory.sort);
  const [page, setPage] = useState(memory.page);
  const [selected, setSelected] = useState<Set<string>>(memory.selected);
  const [inspect, setInspect] = useState<Focus | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [modal, setModal] = useState<'' | 'add' | 'save'>('');
  const [saveName, setSaveName] = useState('');
  const [moved, setMoved] = useState<[number, number, number, number] | null>(null);
  const [center, setCenter] = useState<MapViewState | null>(memory.view);
  const [understood, setUnderstood] = useState<string[]>([]);
  const [outline, setOutline] = useState<ParcelRecord['outline'] | null>(null);
  const [showResults, setShowResults] = useState(memory.showResults);
  const [sheet, setSheet] = useState<Target | null>(null);
  const spot = inspect?.kind === 'spot' ? inspect : null;
  // A searched or clicked property always opens its panel.
  useEffect(() => {
    if (spot) setShowResults(true);
  }, [spot]);

  const results = useMemo(() => runSearch(loc, criteria, leadLists).sort(SORTS[sort].fn), [loc, criteria, leadLists, sort]);
  const fitKey = JSON.stringify([loc, criteria, leadLists]);
  // Same search as last time: reopen the map where it was left instead of refitting.
  // The list is the sample dataset for the searched location; the map can be anywhere.
  const elsewhere = useMemo(() => !!center && results.length > 0 && !results.some((p) => distanceMiles(center, p) < 40), [center, results]);
  const [initialView] = useState(() => (memory.key === fitKey ? memory.view : null));
  useEffect(() => {
    setMoved(null);
    if (memory.key === fitKey) return;
    memory.key = fitKey;
    setPage(0);
    setSelected(new Set());
  }, [fitKey]);
  useEffect(() => {
    Object.assign(memory, { selected, page, sort, showResults });
  }, [selected, page, sort, showResults]);

  const focusId = inspect?.kind === 'record' ? inspect.id : null;
  const focusProp = focusId ? getProperty(focusId) : undefined;
  // Bring the focused property's card into view, switching result pages if needed.
  useEffect(() => {
    if (!focusId) return;
    const i = results.findIndex((p) => p.id === focusId);
    if (i < 0) return;
    if (Math.floor(i / PAGE) !== page) setPage(Math.floor(i / PAGE));
    else document.getElementById(`card-${focusId}`)?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, page]);

  const points: MapPoint[] = useMemo(
    () => results.slice(0, MAX_PINS).map((p) => ({ id: p.id, lat: p.lat, lng: p.lng, color: selected.has(p.id) ? SELECTED : pinColor(p), label: `${p.address} · ${shortMoney(p.estValue)}` })),
    [results, selected],
  );
  const inLocation = useMemo(() => allProperties().filter((p) => matchesLocation(p, loc)), [loc]);
  const leadCounts = useMemo(() => Object.fromEntries(LEAD_LISTS.map((l) => [l.key, inLocation.filter(l.test).length])), [inLocation]);

  const suggestions = useMemo(() => suggest(text), [text]);
  const chips = describeCriteria(criteria);
  const pageRows = results.slice(page * PAGE, page * PAGE + PAGE);
  const pages = Math.ceil(results.length / PAGE);
  const actionIds = selected.size ? [...selected] : results.map((p) => p.id);

  const pickLocation = (l: Location) => {
    update({ loc: l });
    setText('');
    setFocus(false);
    setUnderstood([]);
  };
  const describeSearch = () => {
    const parsed = parseQuery(text);
    if (!parsed.understood.length) return toast('Could not match that to a location or filter. Try "vacant 3 bed homes in Mesa under 400k".');
    update({ loc: parsed.loc ?? loc, criteria: parsed.criteria, leadLists: parsed.leadLists });
    setUnderstood(parsed.understood);
    setText('');
    setFocus(false);
  };
  const findAddress = async () => {
    const q = text.trim();
    setFocus(false);
    const hit = await geocode(q).catch(() => null);
    if (!hit) return toast('That address could not be located. Check the spelling, or include city and state.');
    setInspect({ kind: 'spot', ...hit });
    setText('');
  };
  const submit = () => {
    const first = suggestions[0];
    const prop = suggestions.find((s) => s.propertyId);
    if (looksLikeAddress(text)) return prop ? nav(`/property/${prop.propertyId}`) : findAddress();
    if (text.trim().split(/\s+/).length > 2 || !first) return describeSearch();
    if (first.loc) pickLocation(first.loc);
    else nav(`/property/${first.propertyId}`);
  };
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <div className="search-page">
      <header className="searchbar">
        <div className="loc-box">
          <Icon name="search" />
          <input
            value={text}
            placeholder={`${loc.label} — county, city, ZIP, APN, any US street address, or describe what you want`}
            aria-label="Search location or describe a search"
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setTimeout(() => setFocus(false), 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
          {focus && (
            <div className="suggest">
              {looksLikeAddress(text) && (
                <button className="suggest-row ai" onMouseDown={findAddress}>
                  <Icon name="search" size={16} />
                  <span>Find “{text.trim()}” on the map</span>
                </button>
              )}
              {text.trim().length > 3 && !looksLikeAddress(text) && (
                <button className="suggest-row ai" onMouseDown={describeSearch}>
                  <Icon name="spark" size={16} />
                  <span>Search by description: “{text.trim()}”</span>
                </button>
              )}
              {suggestions.map((s) => (
                <button key={s.label} className="suggest-row" onMouseDown={() => (s.loc ? pickLocation(s.loc) : nav(`/property/${s.propertyId}`))}>
                  <span>{s.label}</span>
                  <span className="muted">{s.hint}</span>
                </button>
              ))}
              {!suggestions.length && text.trim().length <= 3 && <div className="suggest-row muted">Keep typing…</div>}
            </div>
          )}
        </div>

        <div className="menu-wrap">
          <button className={`btn${leadLists.length ? ' on' : ''}`} onClick={() => setMenu(menu === 'lead' ? '' : 'lead')}>
            Lead Lists{leadLists.length ? ` (${leadLists.length})` : ''} ▾
          </button>
          {menu === 'lead' && (
            <div className="menu lead-menu">
              {LEAD_LISTS.map((l) => (
                <label key={l.key} className="lead-row" title={l.desc}>
                  <input
                    type="checkbox"
                    checked={leadLists.includes(l.key)}
                    onChange={(e) => update({ leadLists: e.target.checked ? [...leadLists, l.key] : leadLists.filter((k) => k !== l.key) })}
                  />
                  <span>{l.name}</span>
                  <span className="muted">{leadCounts[l.key].toLocaleString()}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <button className={`btn${chips.length ? ' on' : ''}`} onClick={() => setShowFilters(!showFilters)}>
          <Icon name="filter" size={16} /> Filter{chips.length ? ` (${chips.length})` : ''}
        </button>
        <button className="btn" onClick={() => { setSaveName(''); setModal('save'); }}>Save Search</button>
        <div className="menu-wrap">
          <button className="btn" onClick={() => setMenu(menu === 'saved' ? '' : 'saved')}>Saved ({saved.length}) ▾</button>
          {menu === 'saved' && (
            <div className="menu">
              {!saved.length && <div className="menu-empty">No saved searches yet.</div>}
              {saved.map((sv) => (
                <div key={sv.id} className="menu-row">
                  <button className="link grow" onClick={() => { update({ loc: sv.loc, criteria: sv.criteria, leadLists: sv.leadLists }); setMenu(''); }}>{sv.name}</button>
                  <button className="icon-btn" aria-label={`Delete ${sv.name}`} onClick={() => setState((s) => ({ saved: s.saved.filter((x) => x.id !== sv.id) }))}><Icon name="close" size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </header>

      {(chips.length > 0 || leadLists.length > 0 || understood.length > 0) && (
        <div className="chips">
          <span className="chip loc">{loc.label}</span>
          {leadLists.map((k) => (
            <button key={k} className="chip lead" onClick={() => update({ leadLists: leadLists.filter((x) => x !== k) })}>
              {LEAD_LISTS.find((l) => l.key === k)!.name} ✕
            </button>
          ))}
          {chips.map((c) => (
            <button key={c.key} className="chip" onClick={() => { const n = { ...criteria }; delete n[c.key]; update({ criteria: n }); }}>
              {c.text} ✕
            </button>
          ))}
          <button className="link" onClick={() => { update({ criteria: {}, leadLists: [] }); setUnderstood([]); }}>Clear all</button>
        </div>
      )}

      <div className="search-body">
        {showFilters && <FilterPanel criteria={criteria} onChange={(c) => update({ criteria: c })} onClose={() => setShowFilters(false)} resultCount={results.length} />}
        <div className="map-wrap">
          <MapView
            points={points}
            activeId={hover ?? focusId}
            fitKey={fitKey}
            onPick={(id) => setInspect({ kind: 'record', id })}
            onMove={setMoved}
            onMapClick={(at) => setInspect({ kind: 'spot', ...at })}
            pin={inspect?.kind === 'spot' ? inspect : null}
            outline={outline}
            panTo={inspect?.kind === 'spot' && inspect.address ? { lat: inspect.lat, lng: inspect.lng, zoom: 18 } : focusProp ?? null}
            initialView={initialView}
            onView={(v) => { rememberView(v); setCenter(v); }}
          />
          {inspect?.kind === 'record' && <InfoPanel focus={inspect} onClose={() => setInspect(null)} isSelected={(id) => selected.has(id)} onToggle={toggle} onOpenRecord={(id) => setInspect({ kind: 'record', id })} onParcel={setOutline} />}
          <button className="results-toggle" onClick={() => setShowResults(!showResults)} aria-expanded={showResults} title={showResults ? 'Hide results list' : 'Show results list'}>
            {showResults ? '›' : '‹ Parcels'}
          </button>
          {moved && (
            <button className="btn primary map-redo" onClick={() => update({ loc: { kind: 'bounds', value: moved.join(','), label: 'Map area', bounds: moved } })}>
              Search this area
            </button>
          )}
          <div className="map-legend">
            <span><i style={{ background: '#f26b21' }} />Off market</span>
            <span><i style={{ background: '#1e8e3e' }} />On market</span>
            <span><i style={{ background: '#d93025' }} />Foreclosure</span>
            <span><i style={{ background: SELECTED }} />Selected</span>
            {results.length > MAX_PINS && <span className="muted">Showing first {MAX_PINS.toLocaleString()} pins</span>}
          </div>
        </div>

        <section className={`results${spot ? ' with-subject' : ''}`} hidden={!showResults}>
          {spot ? (
            <SubjectPanel key={`${spot.lat},${spot.lng}`} lat={spot.lat} lng={spot.lng} known={spot.address} onClose={() => setInspect(null)} onOpen={setSheet} onParcel={setOutline} />
          ) : (
            <ParcelList view={center} onOpen={(p) => setInspect({ kind: 'spot', lat: p.lat, lng: p.lng })} />
          )}
          <div className="results-actions sample-bar">
            <span className="muted" title="The orange pins are the built-in sample dataset, used by lead lists, filters and marketing lists">
              Sample pins: <b>{results.length.toLocaleString()}</b>{selected.size > 0 && ` · ${selected.size.toLocaleString()} selected`}
            </span>
            <span className="grow" />
            <button className="btn sm" disabled={!results.length} onClick={() => setModal('add')}>Save to List</button>
            <button className="btn sm" disabled={!results.length} onClick={() => downloadCsv('properties.csv', propertyCsv(results.filter((p) => !selected.size || selected.has(p.id)), skip))}>Export</button>
          </div>
        </section>
      </div>

      {sheet && (
        <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setSheet(null)}>
          <div className="sheet" role="dialog" aria-label={`Details for ${sheet.address}`}>
            <LookupView lat={sheet.lat} lng={sheet.lng} address={sheet.address} onClose={() => setSheet(null)} />
          </div>
        </div>
      )}
      {modal === 'add' && <AddToListModal ids={actionIds} onClose={() => setModal('')} source={selected.size ? undefined : { loc, criteria, leadLists }} />}
      {modal === 'save' && (
        <Modal title="Save this search" onClose={() => setModal('')}>
          <label className="field">
            <span>Name</span>
            <input value={saveName} onChange={(e) => setSaveName(e.target.value)} autoFocus placeholder={`${loc.label} search`} />
          </label>
          <div className="modal-actions">
            <button
              className="btn primary"
              onClick={() => {
                const name = saveName.trim() || `${loc.label} search`;
                setState((s) => ({ saved: [...s.saved, { id: uid(), name, loc, criteria, leadLists, created: today() }] }));
                toast(`Saved "${name}"`);
                setModal('');
              }}
            >
              Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
