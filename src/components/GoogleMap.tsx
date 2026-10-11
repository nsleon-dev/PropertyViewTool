import { useEffect, useRef } from 'react';
import type { MapProps } from './MapView';

let loader: Promise<void> | null = null;
let authFailed = false;

export const googleAuthFailed = () => authFailed;

export function loadGoogle(key: string): Promise<void> {
  if (loader) return loader;
  loader = new Promise((resolve, reject) => {
    const w = window as unknown as Record<string, unknown>;
    w.__gmapsReady = async () => {
      try {
        await Promise.all(['maps', 'marker', 'geocoding', 'streetView', 'geometry'].map((lib) => google.maps.importLibrary(lib)));
      } catch {
        // classes are also attached to google.maps directly; carry on
      }
      resolve();
    };
    // Google calls this when the key is invalid, restricted, or lacks billing.
    w.gm_authFailure = () => {
      authFailed = true;
      window.dispatchEvent(new Event('gmaps-auth-failed'));
    };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=__gmapsReady`;
    s.async = true;
    s.onerror = () => reject(new Error('Could not load Google Maps'));
    document.head.appendChild(s);
  });
  return loader;
}

const dot = (color: string, big?: boolean): google.maps.Symbol => ({
  path: google.maps.SymbolPath.CIRCLE,
  scale: big ? 11 : 7.5,
  fillColor: color,
  fillOpacity: 1,
  strokeColor: '#fff',
  strokeWeight: big ? 3 : 1.5,
});

export function GoogleMap({ points, activeId, fitKey, onPick, onMove, onMapClick, pin, panTo, initialView, onView, outline }: MapProps) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markers = useRef(new Map<string, { m: google.maps.Marker; color: string }>());
  const halo = useRef<google.maps.Marker | null>(null);
  const pinMarker = useRef<google.maps.Marker | null>(null);
  const shape = useRef<google.maps.Polygon | null>(null);
  const cb = useRef({ onPick, onMove, onMapClick, onView });
  cb.current = { onPick, onMove, onMapClick, onView };
  const fitted = useRef(initialView ? fitKey : null);
  // Distinguishes the user's own pans/zooms from fitBounds/panTo calls made here.
  const moving = useRef({ programmatic: false, user: false });

  const programmatic = (fn: () => void) => {
    moving.current.programmatic = true;
    fn();
    setTimeout(() => (moving.current.programmatic = false), 1200);
  };

  useEffect(() => {
    fitted.current = initialView ? fitKey : null;
    const m = new google.maps.Map(el.current!, {
      center: initialView ? { lat: initialView.lat, lng: initialView.lng } : { lat: 37.5, lng: -96 },
      zoom: initialView?.zoom ?? 4,
      clickableIcons: false,
      gestureHandling: 'greedy',
      fullscreenControl: false,
      mapTypeControlOptions: { position: google.maps.ControlPosition.TOP_RIGHT },
    });
    m.addListener('click', (e: google.maps.MapMouseEvent) => e.latLng && cb.current.onMapClick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() }));
    m.addListener('dragend', () => (moving.current.user = true));
    m.addListener('zoom_changed', () => {
      if (!moving.current.programmatic) moving.current.user = true;
    });
    m.addListener('idle', () => {
      const b = m.getBounds();
      const c = m.getCenter();
      if (c) cb.current.onView?.({ lat: c.lat(), lng: c.lng(), zoom: m.getZoom() ?? 12 });
      if (!moving.current.user || !b) return;
      moving.current.user = false;
      cb.current.onMove?.([b.getSouthWest().lat(), b.getSouthWest().lng(), b.getNorthEast().lat(), b.getNorthEast().lng()]);
    });
    map.current = m;
    const store = markers.current;
    return () => {
      store.forEach((x) => x.m.setMap(null));
      store.clear();
    };
  }, []);

  // Keyed update: only markers whose colour changed are touched, so toggling a
  // selection does not rebuild thousands of pins.
  useEffect(() => {
    const store = markers.current;
    const seen = new Set<string>();
    for (const p of points) {
      seen.add(p.id);
      const cur = store.get(p.id);
      if (cur) {
        if (cur.color !== p.color) {
          cur.m.setIcon(dot(p.color, p.big));
          cur.color = p.color;
        }
        continue;
      }
      const m = new google.maps.Marker({ position: { lat: p.lat, lng: p.lng }, map: map.current, icon: dot(p.color, p.big), title: p.label, zIndex: p.big ? 5 : 1 });
      m.addListener('click', () => cb.current.onPick?.(p.id));
      store.set(p.id, { m, color: p.color });
    }
    for (const [id, x] of store) {
      if (!seen.has(id)) {
        x.m.setMap(null);
        store.delete(id);
      }
    }
  }, [points]);

  useEffect(() => {
    if (!points.length || fitted.current === fitKey) return;
    fitted.current = fitKey;
    programmatic(() => {
      if (points.length === 1) {
        map.current!.setCenter({ lat: points[0].lat, lng: points[0].lng });
        map.current!.setZoom(17);
        return;
      }
      const b = new google.maps.LatLngBounds();
      points.forEach((p) => b.extend({ lat: p.lat, lng: p.lng }));
      map.current!.fitBounds(b, 40);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  useEffect(() => {
    halo.current?.setMap(null);
    halo.current = null;
    const p = activeId ? points.find((x) => x.id === activeId) : null;
    if (!p) return;
    halo.current = new google.maps.Marker({
      position: { lat: p.lat, lng: p.lng },
      map: map.current,
      clickable: false,
      zIndex: 10,
      icon: { path: google.maps.SymbolPath.CIRCLE, scale: 14, fillOpacity: 0, strokeColor: '#1b2536', strokeWeight: 3 },
    });
  }, [activeId, points]);

  useEffect(() => {
    pinMarker.current?.setMap(null);
    pinMarker.current = pin ? new google.maps.Marker({ position: pin, map: map.current, clickable: false, zIndex: 20 }) : null;
  }, [pin]);

  useEffect(() => {
    shape.current?.setMap(null);
    shape.current = outline?.length ? new google.maps.Polygon({ paths: outline, map: map.current, strokeColor: '#f26b21', strokeWeight: 3, fillColor: '#f26b21', fillOpacity: 0.15, clickable: false }) : null;
  }, [outline]);

  useEffect(() => {
    if (panTo)
      programmatic(() => {
        map.current!.panTo({ lat: panTo.lat, lng: panTo.lng });
        if (panTo.zoom) map.current!.setZoom(panTo.zoom);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panTo?.lat, panTo?.lng]);

  return <div ref={el} className="map" />;
}

// Street-level imagery for a clicked location; renders nothing when Google has no coverage there.
export function StreetView({ lat, lng }: { lat: number; lng: number }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = el.current!;
    let live = true;
    node.style.display = 'none';
    new google.maps.StreetViewService()
      .getPanorama({ location: { lat, lng }, radius: 60, source: google.maps.StreetViewSource.OUTDOOR })
      .then(({ data }) => {
        if (!live || !data.location?.latLng) return;
        node.style.display = '';
        const from = data.location.latLng;
        const heading = google.maps.geometry?.spherical ? google.maps.geometry.spherical.computeHeading(from, new google.maps.LatLng(lat, lng)) : 0;
        new google.maps.StreetViewPanorama(node, { pano: data.location.pano, pov: { heading, pitch: 0 }, addressControl: false, fullscreenControl: false, motionTracking: false, zoomControl: false });
      })
      .catch(() => {});
    return () => {
      live = false;
      node.replaceChildren();
    };
  }, [lat, lng]);
  return <div ref={el} className="street-view" />;
}
