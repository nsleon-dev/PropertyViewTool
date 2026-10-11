import { useEffect, useState } from 'react';
import { listParcels, type ParcelItem, type ParcelList as List } from '../lib/parcels';
import type { MapViewState } from './MapView';

const MIN_ZOOM = 16;

// Real parcels around the centre of the map, from the free public sources.
export function ParcelList({ view, onOpen }: { view: MapViewState | null; onOpen: (p: ParcelItem) => void }) {
  const [list, setList] = useState<List | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const near = !!view && view.zoom >= MIN_ZOOM;
  const lat = view?.lat;
  const lng = view?.lng;
  const zoom = view?.zoom;

  useEffect(() => {
    if (!near || lat == null || lng == null || zoom == null) return;
    let live = true;
    setBusy(true);
    // Wait for the map to settle before asking the parcel service.
    const timer = setTimeout(() => {
      listParcels(lat, lng, Math.round(zoom))
        .then((r) => live && (setList(r), setError('')), (e) => live && setError(e instanceof Error ? e.message : 'The parcel service could not be reached.'))
        .finally(() => live && setBusy(false));
    }, 600);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [near, lat, lng, zoom]);

  return (
    <>
      <div className="results-head">
        <div><strong>Parcels in view</strong>{near && list?.source && <span className="muted"> · {list.items.length.toLocaleString()}{list.capped ? '+' : ''}</span>}</div>
        {busy && near && <span className="muted">Loading…</span>}
      </div>
      <div className="results-list">
        {!near && <p className="muted pad">Zoom in to street level to list the real parcels in view. You can also click any lot on the map, or search an address.</p>}
        {near && error && <p className="error pad" role="alert">{error}</p>}
        {near && !error && list && !list.source && <p className="muted pad">No free public parcel source covers this area yet. Clicking a spot still shows its flood zone, school district and other location facts.</p>}
        {near && !error && list?.source && !list.items.length && <p className="muted pad">{list.source} has no parcels here.</p>}
        {near && !error && list?.items.map((p) => (
          <button key={p.key} className="parcel-row" onClick={() => onOpen(p)}>
            <span className="parcel-main">
              <b>{p.address ?? p.id ?? 'Parcel'}</b>
              <span className="muted">{p.owner ?? (p.address && p.id ? p.id : 'Owner not published')}</span>
            </span>
            {p.value && <span className="parcel-value">{p.value}</span>}
          </button>
        ))}
        {near && !error && list?.capped && <p className="muted pad">Showing the first {list.items.length}. Zoom in further to narrow the list.</p>}
      </div>
      {near && list?.source && <div className="results-foot muted">Source: {list.source}</div>}
    </>
  );
}
