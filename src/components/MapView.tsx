import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { googleKey, useStore } from '../lib/store';
import { GoogleMap, googleAuthFailed, loadGoogle } from './GoogleMap';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label: string;
  big?: boolean;
}
export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapViewState extends LatLng {
  zoom: number;
}

export interface MapProps {
  points: MapPoint[];
  activeId?: string | null;
  fitKey: string; // refit the view whenever this changes
  onPick?: (id: string) => void;
  onMove?: (bounds: [number, number, number, number]) => void;
  onMapClick?: (at: LatLng) => void;
  pin?: LatLng | null; // marker for a clicked spot that is not one of `points`
  panTo?: (LatLng & { zoom?: number }) | null;
  initialView?: MapViewState | null; // open here instead of fitting to `points`
  onView?: (view: MapViewState) => void;
  outline?: LatLng[][] | null; // parcel boundary to highlight
  quiet?: boolean; // hide the "add a Google key" notice (small embedded maps)
}

export const googleReady = () => typeof google !== 'undefined' && !!google.maps?.Map && !googleAuthFailed();

// True once the Google script has loaded and the key was accepted; loads it on demand.
export function useGoogleReady() {
  const key = googleKey();
  const [ok, setOk] = useState(googleReady);
  useEffect(() => {
    if (!key || ok) return;
    let live = true;
    loadGoogle(key).then(() => live && setOk(googleReady()), () => {});
    return () => {
      live = false;
    };
  }, [key, ok]);
  return ok;
}

// Google Maps when a key is configured and accepted; OpenStreetMap otherwise.
export function MapView(props: MapProps) {
  useStore();
  const key = googleKey();
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>(() => (!key ? 'failed' : googleReady() ? 'ready' : 'loading'));

  useEffect(() => {
    if (!key) return setStatus('failed');
    let live = true;
    const fail = () => setStatus('failed');
    window.addEventListener('gmaps-auth-failed', fail);
    loadGoogle(key).then(() => live && setStatus(googleAuthFailed() ? 'failed' : 'ready'), () => live && fail());
    return () => {
      live = false;
      window.removeEventListener('gmaps-auth-failed', fail);
    };
  }, [key]);

  if (status === 'ready') return <GoogleMap {...props} />;
  if (status === 'loading') return <div className="map map-loading">Loading Google Maps…</div>;
  return (
    <>
      <LeafletMap {...props} />
      {!props.quiet && (
        <div className="map-note">
          {key ? 'Google rejected the Maps API key (check billing, API restrictions and allowed referrers).' : 'Google Maps needs an API key.'}{' '}
          <Link to="/account">{key ? 'Review key' : 'Add key'}</Link> · showing OpenStreetMap meanwhile
        </div>
      )}
    </>
  );
}

function LeafletMap({ points, activeId, fitKey, onPick, onMove, onMapClick, pin, panTo, initialView, onView, outline }: MapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const halo = useRef<L.CircleMarker | null>(null);
  const pinMarker = useRef<L.CircleMarker | null>(null);
  const shape = useRef<L.Polygon | null>(null);
  const cb = useRef({ onPick, onMove, onMapClick, onView });
  cb.current = { onPick, onMove, onMapClick, onView };
  const fitted = useRef(initialView ? fitKey : null);

  useEffect(() => {
    fitted.current = initialView ? fitKey : null;
    const m = L.map(el.current!, { preferCanvas: true }).setView(initialView ? [initialView.lat, initialView.lng] : [37.5, -96], initialView?.zoom ?? 4);
    m.on('moveend', () => cb.current.onView?.({ lat: m.getCenter().lat, lng: m.getCenter().lng, zoom: m.getZoom() }));
    const street = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(m);
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imagery &copy; Esri' });
    L.control.layers({ Map: street, Satellite: satellite }, undefined, { position: 'topright' }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    // Ignore the programmatic moves made by fitBounds; only report user pans/zooms.
    m.on('dragend zoomend', () => {
      const b = m.getBounds();
      cb.current.onMove?.([b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]);
    });
    m.on('click', (e) => cb.current.onMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize());
    ro.observe(el.current!);
    return () => {
      ro.disconnect();
      // Empty the canvas layers while their renderer still exists; removing them after it is
      // destroyed schedules a redraw on a dead canvas.
      layer.current?.clearLayers();
      halo.current?.remove();
      pinMarker.current?.remove();
      shape.current?.remove();
      halo.current = pinMarker.current = shape.current = null;
      m.remove();
    };
  }, []);

  useEffect(() => {
    const g = layer.current!;
    g.clearLayers();
    for (const p of points) {
      L.circleMarker([p.lat, p.lng], { radius: p.big ? 11 : 8, color: '#fff', weight: p.big ? 3 : 1.5, fillColor: p.color, fillOpacity: 0.95, bubblingMouseEvents: false })
        .bindTooltip(p.label, { direction: 'top', offset: [0, -6] })
        .on('click', () => cb.current.onPick?.(p.id))
        .addTo(g);
    }
  }, [points]);

  useEffect(() => {
    if (!points.length || fitted.current === fitKey) return;
    fitted.current = fitKey;
    map.current!.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])).pad(0.05), { maxZoom: 17, animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  useEffect(() => {
    halo.current?.remove();
    halo.current = null;
    const p = activeId ? points.find((x) => x.id === activeId) : null;
    if (p) halo.current = L.circleMarker([p.lat, p.lng], { radius: 14, color: '#1b2536', weight: 3, fill: false, interactive: false }).addTo(map.current!);
  }, [activeId, points]);

  useEffect(() => {
    pinMarker.current?.remove();
    pinMarker.current = pin ? L.circleMarker([pin.lat, pin.lng], { radius: 9, color: '#fff', weight: 3, fillColor: '#d93025', fillOpacity: 1, interactive: false }).addTo(map.current!) : null;
  }, [pin]);

  useEffect(() => {
    shape.current?.remove();
    shape.current = outline?.length ? L.polygon(outline.map((ring) => ring.map((p) => [p.lat, p.lng] as [number, number])), { color: '#f26b21', weight: 3, fillOpacity: 0.15, interactive: false }).addTo(map.current!) : null;
  }, [outline]);

  useEffect(() => {
    if (panTo) map.current!.setView([panTo.lat, panTo.lng], panTo.zoom ?? map.current!.getZoom(), { animate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panTo?.lat, panTo?.lng]);

  return <div ref={el} className="map" />;
}
