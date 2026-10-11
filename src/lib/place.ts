// Facts about a location that are free for the whole US: FEMA flood zone, school
// district, city and county (Census TIGERweb) and ground elevation (USGS). Keyless.

import { useEffect, useState } from 'react';

const TIGER = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb';
type Attrs = Record<string, string | number | null>;

async function at(url: string, lat: number, lng: number, outFields: string): Promise<Attrs | null> {
  const q = new URLSearchParams({ geometry: `${lng},${lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields, returnGeometry: 'false', f: 'json' });
  const data = await (await fetch(`${url}/query?${q}`, { signal: AbortSignal.timeout(20000) })).json();
  return data.features?.[0]?.attributes ?? null;
}

const cache = new Map<string, Promise<[string, string][]>>();

export function lookupPlace(lat: number, lng: number): Promise<[string, string][]> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (!cache.has(key)) cache.set(key, load(lat, lng));
  return cache.get(key)!;
}

async function load(lat: number, lng: number): Promise<[string, string][]> {
  const name = (a: Attrs | null) => (a?.NAME ? String(a.NAME) : null);
  const [flood, city, county, unified, elementary, elevation] = await Promise.allSettled([
    at('https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28', lat, lng, 'FLD_ZONE,ZONE_SUBTY,SFHA_TF'),
    at(`${TIGER}/Places_CouSub_ConCity_SubMCD/MapServer/4`, lat, lng, 'NAME').then(name),
    at(`${TIGER}/State_County/MapServer/1`, lat, lng, 'NAME').then(name),
    at(`${TIGER}/School/MapServer/0`, lat, lng, 'NAME').then(name),
    at(`${TIGER}/School/MapServer/2`, lat, lng, 'NAME').then(name),
    fetch(`https://epqs.nationalmap.gov/v1/json?x=${lng}&y=${lat}&units=Feet&wkid=4326`, { signal: AbortSignal.timeout(20000) }).then((r) => r.json()),
  ]);
  const ok = <T,>(r: PromiseSettledResult<T>) => (r.status === 'fulfilled' ? r.value : null);
  const rows: [string, string][] = [];
  const f = ok(flood);
  if (flood.status === 'fulfilled') {
    const sub = f?.ZONE_SUBTY ? ` · ${String(f.ZONE_SUBTY).toLowerCase()}` : '';
    rows.push(['FEMA Flood Zone', f ? `${f.FLD_ZONE}${sub}${f.SFHA_TF === 'T' ? ' · in a Special Flood Hazard Area' : ''}` : 'Not mapped by FEMA here']);
  }
  if (ok(city)) rows.push(['City / Place', ok(city)!]);
  if (ok(county)) rows.push(['County', ok(county)!]);
  const school = ok(unified) ?? ok(elementary);
  if (school) rows.push(['School District', school]);
  const feet = Number(ok(elevation)?.value);
  if (Number.isFinite(feet) && feet > -1000) rows.push(['Elevation', `${Math.round(feet).toLocaleString()} ft`]);
  return rows;
}

export function usePlace(lat: number, lng: number) {
  const [rows, setRows] = useState<[string, string][] | null>(null);
  useEffect(() => {
    let live = true;
    setRows(null);
    lookupPlace(lat, lng).then((r) => live && setRows(r), () => live && setRows([]));
    return () => {
      live = false;
    };
  }, [lat, lng]);
  return rows;
}
