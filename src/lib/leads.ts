// Distress lists for a drawn area, found live rather than hand-listed: no single free
// nationwide file exists, so this searches the two catalogs most local governments
// publish open data through (ArcGIS Online and Socrata) for datasets about foreclosures,
// tax sales, delinquent taxes, code violations and vacant or blighted property, and keeps
// only the ones that actually hold records inside the boundary. Both are free and keyless.
import { bounding, inside, type LatLng } from './area';
import { lookupPlace } from './place';

export type LeadKind = 'pre' | 'auction' | 'liens' | 'code' | 'blight';

// `terms` are searched in ArcGIS item titles, `open` on Socrata; `title` decides what is kept.
export const LEAD_KINDS: Record<LeadKind, { terms: string[]; open: string; title: RegExp }> = {
  pre: { terms: ['foreclosure', 'foreclosures', 'lis pendens'], open: 'foreclosures', title: /foreclos|lis pendens|notice of default/i },
  auction: { terms: ['sheriff sale', 'sheriff sales', 'tax sale', 'tax deed', 'auction', 'trustee sale'], open: 'tax sale', title: /sheriff.?s? sales?|tax (sale|deed|forfeit)|auction|trustee.?s? sale|surplus propert/i },
  liens: { terms: ['delinquent', 'tax delinquent', 'delinquent taxes', 'tax lien', 'liens'], open: 'delinquent taxes', title: /delinquen|\bliens?\b/i },
  code: { terms: ['code enforcement', 'code violation', 'code violations', 'code compliance', 'building violations', 'nuisance'], open: 'code violations', title: /code (enforcement|violation|compliance|case|complaint)|(building|housing|property|ordinance|zoning) violation|nuisance/i },
  blight: { terms: ['vacant', 'blight', 'blighted', 'abandoned', 'condemned', 'demolition', 'unsafe', 'land bank'], open: 'vacant buildings', title: /vacant|blight|abandon|condemn|demoli|unsafe|dangerous (building|structure)|land ?bank/i },
};
export const isLead = (k: string): k is LeadKind => k in LEAD_KINDS;

// Titles that match a keyword but are not property-level lists.
const NOISE = /camera|food|restaurant|traffic|parking|crime|police|\brail|landfill|\bmines?\b|\bwells?\b|pipeline|census|zip ?code|\bby [a-z ]*(zip|tract|ward|district|county|neighbou?rhood|block|csa)|count of|number of|percent|\brates?\b|summary|aggregat|density|heat ?map|hot ?spot|\bhex|geograph|boundar(y|ies) of|deprecated|archiv|draft|test\b|copy\b/i;

export interface LeadRow {
  lat: number;
  lng: number;
  title: string;
  sub: string;
  right: string | null;
  values: Record<string, string>;
}
export interface LeadSource {
  id: string;
  kind: LeadKind;
  host: 'ArcGIS Online' | 'Socrata';
  title: string;
  by: string;
  updated: string | null;
  count: number;
  link: string;
  // Socrata rows arrive with the search; ArcGIS rows load when the source is opened.
  rows?: LeadRow[];
}
export interface LeadSearch {
  sources: LeadSource[];
  place: { city: string | null; county: string | null; state: string | null };
}

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
async function json(url: string, body?: URLSearchParams): Promise<Json> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000), ...(body ? { method: 'POST', body } : {}) });
  if (!res.ok) throw new Error(`${res.status}`);
  const data = await res.json();
  if (data?.error) throw new Error(data.error.message ?? 'query failed');
  return data;
}
const settled = async <T,>(jobs: Promise<T>[]) => (await Promise.allSettled(jobs)).flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));
const day = (v: unknown) => {
  const d = new Date(v as string | number);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

// Picks the address, a describing line and the most recent date out of whatever columns a dataset has.
function describe(cells: [label: string, value: string, isDate: boolean][], lat: number, lng: number): LeadRow {
  const find = (re: RegExp, ok: (v: string) => boolean = () => true) => cells.find(([k, v, d]) => !d && re.test(k) && v && ok(v))?.[1];
  const text = (v: string) => /[a-z]/i.test(v) && v.length < 90;
  // Some lists split the address into house number and street name columns.
  const split = [find(/(str|street|st|house|addr).?(num|no|nbr|number)\b|^(house|number)$/i), find(/(str|street|st).?(nam|name)\b|^street$/i, text)];
  const title = find(/addr|situs|site.?loc|location/i, text) ?? (split[1] ? split.filter(Boolean).join(' ') : null) ?? find(/street/i, text) ?? find(/parcel|\bpin\b|apn/i) ?? cells.find(([, v, d]) => !d && text(v))?.[1] ?? 'Record';
  const sub = [...new Set(cells.filter(([k, v, d]) => !d && v && v !== title && v.length < 70 && /status|type|descr|violation|categor|owner|case.?(no|num|id)/i.test(k)).map(([, v]) => v))].slice(0, 2).join(' · ');
  const dates = cells.filter(([, v, d]) => d && v).map(([, v]) => v).sort();
  return { lat, lng, title, sub, right: dates[dates.length - 1] ?? null, values: Object.fromEntries(cells.map(([k, v]) => [k, v])) };
}
const newestFirst = (rows: LeadRow[]) => rows.sort((a, b) => (b.right ?? '').localeCompare(a.right ?? ''));

/* ArcGIS Online: public feature services whose extent is local to the drawn area. */

const areaOf = (ring: LatLng[]) => new URLSearchParams({ where: '1=1', geometry: JSON.stringify({ rings: [[...ring, ring[0]].map((p) => [p.lng, p.lat])], spatialReference: { wkid: 4326 } }), geometryType: 'esriGeometryPolygon', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', f: 'json' });

async function arcgis(kind: LeadKind, ring: LatLng[]): Promise<LeadSource[]> {
  const { center } = bounding(ring);
  const lats = ring.map((p) => p.lat);
  const lngs = ring.map((p) => p.lng);
  const q = `(${LEAD_KINDS[kind].terms.map((t) => `title:"${t}"`).join(' OR ')}) AND type:"Feature Service" AND access:public`;
  const found = await json(`https://www.arcgis.com/sharing/rest/search?${new URLSearchParams({ f: 'json', q, bbox: [Math.min(...lngs), Math.min(...lats), Math.max(...lngs), Math.max(...lats)].join(','), num: '100', sortField: 'modified', sortOrder: 'desc' })}`);
  const size = (e: number[][]) => (e[1][0] - e[0][0]) * (e[1][1] - e[0][1]);
  // Many items carry a default whole-world extent; a real local list is at most a few degrees across.
  const local = (e?: number[][]) => !!e && e.length === 2 && e[1][0] - e[0][0] <= 4 && e[1][1] - e[0][1] <= 4 && center.lng >= e[0][0] && center.lng <= e[1][0] && center.lat >= e[0][1] && center.lat <= e[1][1];
  const items: Json[] = (found.results ?? []).filter((r: Json) => /^https:/.test(r.url ?? '') && LEAD_KINDS[kind].title.test(r.title) && !NOISE.test(r.title) && local(r.extent)).sort((a: Json, b: Json) => size(a.extent) - size(b.extent)).slice(0, 6);
  const perItem = await settled(items.map(async (item) => {
    const base = String(item.url).replace(/\/+$/, '');
    const layers: { url: string; name: string }[] = /\/\d+$/.test(base) ? [{ url: base, name: '' }] : ((await json(`${base}?f=json`)).layers ?? []).slice(0, 3).map((l: Json) => ({ url: `${base}/${l.id}`, name: String(l.name ?? '') }));
    return settled(layers.map(async (layer): Promise<LeadSource> => {
      const body = areaOf(ring);
      body.set('returnCountOnly', 'true');
      const count = Number((await json(`${layer.url}/query`, body)).count) || 0;
      if (!count) throw new Error('empty');
      const title = layers.length > 1 && layer.name && layer.name.toLowerCase() !== String(item.title).toLowerCase() ? `${item.title} – ${layer.name}` : String(item.title);
      return { id: layer.url, kind, host: 'ArcGIS Online', title: title.replace(/_/g, ' '), by: String(item.owner ?? ''), updated: day(item.modified), count, link: `https://www.arcgis.com/home/item.html?id=${item.id}` };
    }));
  }));
  return perItem.flat();
}

async function arcgisRows(src: LeadSource, ring: LatLng[]): Promise<LeadRow[]> {
  const body = areaOf(ring);
  for (const [k, v] of Object.entries({ outFields: '*', outSR: '4326', returnGeometry: 'true', resultRecordCount: '1000', maxAllowableOffset: '0.0001' })) body.set(k, v);
  const data = await json(`${src.id}/query`, body);
  const fields: Json[] = (data.fields ?? []).filter((f: Json) => !/^(objectid|fid|globalid|shape.*)$/i.test(f.name));
  const rows: LeadRow[] = [];
  for (const f of data.features ?? []) {
    const g = f.geometry ?? {};
    const pts: number[][] = g.x != null ? [[g.x, g.y]] : g.rings?.[0] ?? g.paths?.[0] ?? g.points ?? [];
    if (!pts.length) continue;
    const cells = fields.map((fd): [string, string, boolean] => {
      const v = f.attributes?.[fd.name];
      const isDate = fd.type === 'esriFieldTypeDate';
      return [String(fd.alias || fd.name), v == null ? '' : isDate ? day(v) ?? '' : String(v).trim(), isDate];
    });
    rows.push(describe(cells, pts.reduce((t, p) => t + p[1], 0) / pts.length, pts.reduce((t, p) => t + p[0], 0) / pts.length));
  }
  return newestFirst(rows);
}

/* Socrata: city and county open-data portals, found by place name and checked by location. */

async function socrata(kind: LeadKind, ring: LatLng[], names: string[]): Promise<LeadSource[]> {
  const { center, miles } = bounding(ring);
  const lists = await settled(names.map((n) => json(`https://api.us.socrata.com/api/catalog/v1?${new URLSearchParams({ q: `${n} ${LEAD_KINDS[kind].open}`, only: 'datasets', limit: '25' })}`)));
  const seen = new Set<string>();
  const picks = lists.flatMap((l) => l.results ?? []).filter((r: Json) => {
    const name = String(r.resource?.name ?? '');
    const types: string[] = r.resource?.columns_datatype ?? [];
    const ok = !seen.has(r.resource?.id) && LEAD_KINDS[kind].title.test(name) && !NOISE.test(name) && types.some((t) => t === 'Point' || t === 'Location');
    seen.add(r.resource?.id);
    return ok;
  }).slice(0, 4);
  return settled(picks.map(async (r: Json): Promise<LeadSource> => {
    const res = r.resource;
    const cols: string[] = res.columns_field_name ?? [];
    const types: string[] = res.columns_datatype ?? [];
    const geo = cols[types.findIndex((t) => t === 'Point' || t === 'Location')];
    const date = cols[types.findIndex((t) => t === 'Calendar date')];
    const domain = String(r.metadata?.domain);
    const data = await json(`https://${domain}/resource/${res.id}.json?${new URLSearchParams({ $where: `within_circle(${geo}, ${center.lat}, ${center.lng}, ${Math.ceil(miles * 1609.34)})`, $limit: '1000', ...(date ? { $order: `${date} DESC` } : {}) })}`);
    const rows: LeadRow[] = [];
    for (const row of data as unknown as Json[]) {
      const g = row[geo];
      const lat = Number(g?.coordinates?.[1] ?? g?.latitude);
      const lng = Number(g?.coordinates?.[0] ?? g?.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inside(ring, { lat, lng })) continue;
      const cells = Object.entries(row).filter(([k, v]) => typeof v !== 'object' && !k.startsWith(':')).map(([k, v]): [string, string, boolean] => {
        const isDate = /^\d{4}-\d\d-\d\dT/.test(String(v));
        return [k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), isDate ? String(v).slice(0, 10) : String(v).trim(), isDate];
      });
      rows.push(describe(cells, lat, lng));
    }
    if (!rows.length) throw new Error('empty');
    return { id: `${domain}/${res.id}`, kind, host: 'Socrata', title: String(res.name), by: domain, updated: day(res.data_updated_at), count: rows.length, link: `https://${domain}/d/${res.id}`, rows: newestFirst(rows) };
  }));
}

async function placeOf(at: LatLng): Promise<LeadSearch['place']> {
  const q = new URLSearchParams({ geometry: `${at.lng},${at.lat}`, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: 'STUSAB', returnGeometry: 'false', f: 'json' });
  const [rows, state] = await Promise.allSettled([lookupPlace(at.lat, at.lng), json(`https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/State_County/MapServer/0/query?${q}`)]);
  const get = (k: string) => (rows.status === 'fulfilled' ? rows.value.find(([n]) => n === k)?.[1] ?? null : null);
  return { city: get('City / Place')?.replace(/ (city|town|village|borough|municipality|CDP)$/i, '') ?? null, county: get('County'), state: state.status === 'fulfilled' ? state.value.features?.[0]?.attributes?.STUSAB ?? null : null };
}

export async function findLeads(ring: LatLng[]): Promise<LeadSearch> {
  const place = await placeOf(bounding(ring).center);
  const names = [place.city, place.county].filter((n): n is string => !!n);
  const kinds = Object.keys(LEAD_KINDS) as LeadKind[];
  const found = await settled(kinds.flatMap((k) => [arcgis(k, ring), socrata(k, ring, names)]));
  const ago = (years: number) => new Date(Date.now() - years * 31557600000).toISOString().slice(0, 10);
  const seen = new Set<string>();
  const sources = found.flat()
    // Lists untouched for five years are no use for calling.
    .filter((s) => !s.updated || s.updated >= ago(5))
    // Recently maintained lists first, then the fullest, so a stale copy does not outrank the live feed.
    .sort((a, b) => Number((b.updated ?? '') >= ago(1.5)) - Number((a.updated ?? '') >= ago(1.5)) || b.count - a.count)
    // The same list is often published twice.
    .filter((s) => {
      const key = `${s.kind}|${s.title.trim().toLowerCase()}|${s.count}`;
      return !seen.has(key) && !!seen.add(key);
    });
  return { sources, place };
}

export const stale = (s: LeadSource) => !!s.updated && s.updated < new Date(Date.now() - 1.5 * 31557600000).toISOString().slice(0, 10);

export const leadRows = (src: LeadSource, ring: LatLng[]) => (src.rows ? Promise.resolve(src.rows) : arcgisRows(src, ring));

// Web searches for the county offices that keep these lists where nothing is published as data.
export function officeLinks(place: LeadSearch['place']): { label: string; url: string }[] {
  const where = [place.county ?? place.city, place.state].filter(Boolean).join(' ');
  if (!where) return [];
  const search = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(`${where} ${q}`)}`;
  return [
    { label: 'Delinquent tax list', url: search('treasurer delinquent property tax list') },
    { label: 'Tax & sheriff sales', url: search('sheriff sale OR "tax sale" property list') },
    { label: 'Foreclosure notices', url: search('foreclosure notices public notice') },
    { label: 'Probate court records', url: search('probate court case search') },
    { label: 'Code enforcement cases', url: search('code enforcement cases lookup') },
    { label: 'Recorder / deed search', url: search('recorder of deeds document search') },
  ];
}
