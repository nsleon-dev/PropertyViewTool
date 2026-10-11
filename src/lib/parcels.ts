// Free public parcel records, read straight from county / state assessor GIS services
// (ArcGIS REST). No key needed. Coverage is whatever is listed in SOURCES: to add an
// area, find its public parcel layer (a URL ending in /MapServer/<n> or /FeatureServer/<n>
// that supports Query) and add it here with a bounding box.

interface Source {
  name: string;
  url: string;
  bbox: [west: number, south: number, east: number, north: number];
}

// Ordered most-specific first: the first source that returns a parcel wins.
export const SOURCES: Source[] = [
  { name: 'City of West Fargo Assessor', url: 'https://gis.westfargond.gov/arcgis/rest/services/LINK_WestFargo/MapServer/170', bbox: [-97.02, 46.74, -96.86, 46.95] },
  { name: 'Cass County, ND', url: 'https://gis.westfargond.gov/arcgis/rest/services/LINK_CassCounty/MapServer/4', bbox: [-97.71, 46.63, -96.74, 47.25] },
  { name: 'Maricopa County Assessor, AZ', url: 'https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0', bbox: [-113.34, 32.5, -111.03, 34.05] },
  { name: 'Franklin County Auditor, OH', url: 'https://gis.franklincountyohio.gov/hosting/rest/services/ParcelFeatures/Parcel_Features/MapServer/0', bbox: [-83.27, 39.8, -82.76, 40.17] },
  { name: 'NC OneMap (North Carolina statewide)', url: 'https://services.nconemap.gov/secure/rest/services/NC1Map_Parcels/FeatureServer/1', bbox: [-84.33, 33.84, -75.46, 36.59] },
];

export interface ParcelRecord {
  source: string;
  nearest: boolean; // matched by proximity rather than the exact point
  owner: string | null;
  address: string | null;
  rows: [string, string][];
  links: { label: string; href: string }[];
  outline: { lat: number; lng: number }[][];
}
export type ParcelResult = { status: 'found'; record: ParcelRecord } | { status: 'empty'; source: string } | { status: 'uncovered' };

interface ArcField {
  name: string;
  alias?: string;
  type?: string;
}
interface ArcResponse {
  error?: { message?: string };
  fields?: ArcField[];
  features?: { attributes: Record<string, unknown>; geometry?: { rings?: number[][][] } }[];
}

const SKIP = /^(objectid|oid|fid|globalid|uniqueid|lat|long|latitude|longitude|txt_angle|label_class)$|^shape|^st_?(area|length)|created_|last_edited_/i;
const MONEY = /value|price|val$|^land(res|com|farm)$|^fcv|^lpv|market|apprais|assess(?!or)/i;
const OWNER = /^(owner_?name|ownname|ownernme1|owner1?|name)$/i;
const SITE = /^(propertyaddress|physical_address|siteaddress|siteadd|site_addr|situs.*)$/i;

function label(f: ArcField) {
  const raw = f.alias && f.alias !== f.name ? f.alias : f.name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
  return raw.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

function format(f: ArcField, v: unknown): string {
  if (typeof v === 'number') {
    if (f.type === 'esriFieldTypeDate') return new Date(v).toLocaleDateString();
    if (MONEY.test(f.name)) return `$${Math.round(v).toLocaleString()}`;
    return /year|yr|zip|pin|apn|num|book|map|item/i.test(f.name) ? String(v) : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(v).trim();
}

async function send(src: Source, extra: Record<string, string>): Promise<ArcResponse> {
  const params = new URLSearchParams({ f: 'json', outSR: '4326', outFields: '*', returnGeometry: 'true', ...extra });
  const res = await fetch(`${src.url}/query?${params}`);
  if (!res.ok) throw new Error(`${src.name} did not respond (${res.status}).`);
  const data: ArcResponse = await res.json();
  if (data.error) throw new Error(`${src.name}: ${data.error.message ?? 'query failed'}`);
  return data;
}

function query(src: Source, lat: number, lng: number, meters: number) {
  return send(src, {
    geometry: `${lng},${lat}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    ...(meters ? { distance: String(meters), units: 'esriSRUnit_Meter' } : {}),
  });
}

// Matches a typed street address ("1140 Jill Dr W, ...") against the layer's own site-address
// field. More reliable than the geocoded point, which often sits on the street.
const siteFields = new Map<string, string | null>();
async function queryAddress(src: Source, address: string): Promise<ArcResponse | null> {
  const m = address.toUpperCase().match(/^\s*(\d+)\s+(?:[NSEW]\s+)?([A-Z0-9]+)/);
  if (!m) return null;
  if (!siteFields.has(src.url)) {
    const meta: ArcResponse = await (await fetch(`${src.url}?f=json`)).json();
    siteFields.set(src.url, meta.fields?.find((f) => SITE.test(f.name))?.name ?? null);
  }
  const field = siteFields.get(src.url);
  if (!field) return null;
  const data = await send(src, { where: `UPPER(${field}) LIKE '${m[1]} %${m[2]}%'`, resultRecordCount: '5' });
  return data.features?.length ? data : null;
}

function toRecord(src: Source, data: ArcResponse, nearest: boolean): ParcelRecord {
  const feature = data.features![0];
  const rows: [string, string][] = [];
  const links: ParcelRecord['links'] = [];
  let owner: string | null = null;
  let address: string | null = null;
  for (const f of data.fields ?? Object.keys(feature.attributes).map((name) => ({ name }))) {
    const v = feature.attributes[f.name];
    if (v == null || String(v).trim() === '' || SKIP.test(f.name)) continue;
    const text = format(f, v);
    // Assessor layers often carry ready-made links to the county tax / property pages.
    const href = text.match(/href\s*=\s*["']([^"']+)["']/i)?.[1] ?? (/^https?:\/\//i.test(text) ? text : null);
    if (href) {
      links.push({ label: text.replace(/<[^>]+>/g, '').trim() || label(f), href });
      continue;
    }
    if (!owner && OWNER.test(f.name)) owner = text;
    if (!address && SITE.test(f.name)) address = text;
    rows.push([label(f), text]);
  }
  const outline = (feature.geometry?.rings ?? []).map((ring) => ring.map(([x, y]) => ({ lat: y, lng: x })));
  return { source: src.name, nearest, owner, address, rows, links, outline };
}

// Finds a value in a record's rows by its label, e.g. pick(rows, /total value/i).
export const pick = (rows: [string, string][], re: RegExp) => rows.find(([k]) => re.test(k))?.[1] ?? null;

const cache = new Map<string, ParcelResult>();

export const coveredAreas = () => SOURCES.map((s) => s.name).join('; ');

export async function lookupParcel(lat: number, lng: number, address?: string): Promise<ParcelResult> {
  const key = `${lat.toFixed(6)},${lng.toFixed(6)},${address ?? ''}`;
  if (!cache.has(key)) cache.set(key, await fetchParcel(lat, lng, address));
  return cache.get(key)!;
}

async function fetchParcel(lat: number, lng: number, address?: string): Promise<ParcelResult> {
  const candidates = SOURCES.filter((s) => lng >= s.bbox[0] && lng <= s.bbox[2] && lat >= s.bbox[1] && lat <= s.bbox[3]);
  if (!candidates.length) return { status: 'uncovered' };
  let failure: unknown = null;
  for (const src of candidates) {
    try {
      const byAddress = address ? await queryAddress(src, address).catch(() => null) : null;
      if (byAddress) return { status: 'found', record: toRecord(src, byAddress, false) };
      let data = await query(src, lat, lng, 0);
      let nearest = false;
      // A point on the street (typical for a geocoded address) misses the lot: take the closest one.
      if (!data.features?.length) {
        data = await query(src, lat, lng, 35);
        nearest = true;
      }
      if (data.features?.length) return { status: 'found', record: toRecord(src, data, nearest) };
    } catch (e) {
      failure = e;
    }
  }
  if (failure) throw failure;
  return { status: 'empty', source: candidates[candidates.length - 1].name };
}
