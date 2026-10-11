// Free public parcel records, read straight from county / state assessor GIS services
// (ArcGIS REST). No key needed. Coverage is whatever is listed in SOURCES: to add an
// area, find its public parcel layer (a URL ending in /MapServer/<n> or /FeatureServer/<n>
// that supports Query) and add it here with a bounding box.

interface Source {
  name: string;
  state?: string; // set on statewide layers
  url: string;
  bbox: [west: number, south: number, east: number, north: number];
}

// Ordered most-specific first: the first source that returns a parcel wins.
export const SOURCES: Source[] = [
  { name: 'City of West Fargo Assessor', url: 'https://gis.westfargond.gov/arcgis/rest/services/LINK_WestFargo/MapServer/170', bbox: [-97.02, 46.74, -96.86, 46.95] },
  { name: 'Cass County, ND', url: 'https://gis.westfargond.gov/arcgis/rest/services/LINK_CassCounty/MapServer/4', bbox: [-97.71, 46.63, -96.74, 47.25] },
  { name: 'Maricopa County Assessor, AZ', url: 'https://gis.mcassessor.maricopa.gov/arcgis/rest/services/Parcels/MapServer/0', bbox: [-113.34, 32.5, -111.03, 34.05] },
  { name: 'Franklin County Auditor, OH', url: 'https://gis.franklincountyohio.gov/hosting/rest/services/ParcelFeatures/Parcel_Features/MapServer/0', bbox: [-83.27, 39.8, -82.76, 40.17] },
  { name: 'NC OneMap (North Carolina statewide)', state: 'NC', url: 'https://services.nconemap.gov/secure/rest/services/NC1Map_Parcels/FeatureServer/1', bbox: [-84.33, 33.84, -75.46, 36.59] },
  // Statewide layers published by state GIS offices. What each one carries varies: some have
  // owner and value, some only the parcel number and boundary.
  { name: 'Alaska statewide parcels', state: 'AK', url: 'https://services8.arcgis.com/jzbhhVHDe3lCCWFT/arcgis/rest/services/AK_Statewide_Parcels/FeatureServer/0', bbox: [-179.9, 51.0, -129.9, 71.5] },
  { name: 'Arkansas statewide parcels', state: 'AR', url: 'https://gis.arkansas.gov/arcgis/rest/services/FEATURESERVICES/Planning_Cadastre/FeatureServer/6', bbox: [-94.62, 33.0, -89.64, 36.5] },
  { name: 'California statewide parcels', state: 'CA', url: 'https://services2.arcgis.com/zr3KAIbsRSUyARHG/arcgis/rest/services/CA_State_Parcels/FeatureServer/0', bbox: [-124.48, 32.53, -114.13, 42.0] },
  { name: 'Colorado statewide parcels', state: 'CO', url: 'https://gis.colorado.gov/public/rest/services/Address_and_Parcel/Colorado_Public_Parcels/FeatureServer/0', bbox: [-109.05, 36.99, -102.04, 41.0] },
  { name: 'Connecticut statewide parcels', state: 'CT', url: 'https://services3.arcgis.com/3FL1kr7L4LvwA2Kb/arcgis/rest/services/Connecticut_CAMA_and_Parcel_Layer/FeatureServer/0', bbox: [-73.73, 40.98, -71.8, 42.05] },
  { name: 'Delaware statewide parcels', state: 'DE', url: 'https://enterprise.firstmap.delaware.gov/arcgis/rest/services/PlanningCadastre/DE_StateParcels/FeatureServer/0', bbox: [-75.79, 38.45, -74.99, 39.83] },
  { name: 'Florida statewide parcels', state: 'FL', url: 'https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0', bbox: [-87.63, 24.4, -79.98, 31.0] },
  { name: 'Iowa statewide parcels (2017 snapshot)', state: 'IA', url: 'https://services3.arcgis.com/kd9gaiUExYqUbnoq/arcgis/rest/services/Iowa_Parcels_2017/FeatureServer/0', bbox: [-96.64, 40.38, -90.17, 43.5] },
  { name: 'Idaho statewide parcels (participating counties)', state: 'ID', url: 'https://services1.arcgis.com/CNPdEkvnGl65jCX8/arcgis/rest/services/Public_Idaho_Parcels_/FeatureServer/7', bbox: [-117.24, 42.0, -111.05, 49.0] },
  { name: 'Indiana statewide parcels', state: 'IN', url: 'https://gisdata.in.gov/server/rest/services/Hosted/Parcel_Boundaries_of_Indiana_Current/FeatureServer/0', bbox: [-88.1, 37.77, -84.79, 41.76] },
  { name: 'Massachusetts statewide parcels', state: 'MA', url: 'https://services1.arcgis.com/hGdibHYSPO59RG1h/arcgis/rest/services/Massachusetts_Property_Tax_Parcels/FeatureServer/0', bbox: [-73.51, 41.19, -69.86, 42.89] },
  { name: 'Maryland statewide parcels', state: 'MD', url: 'https://mdgeodata.md.gov/imap/rest/services/PlanningCadastre/MD_ParcelBoundaries/MapServer/0', bbox: [-79.48, 37.89, -74.99, 39.72] },
  { name: 'Maine statewide parcels (organized towns)', state: 'ME', url: 'https://services1.arcgis.com/RbMX0mRVOFNTdLzd/arcgis/rest/services/Maine_Parcels_Organized_Towns/FeatureServer/10', bbox: [-71.08, 42.92, -66.9, 47.46] },
  { name: 'Minnesota statewide parcels (participating counties)', state: 'MN', url: 'https://enterprise.gisdata.mn.gov/aghost/rest/services/us_mn_state_mngeo/plan_parcels_open/FeatureServer/1', bbox: [-97.24, 43.5, -89.48, 49.38] },
  { name: 'Montana statewide parcels', state: 'MT', url: 'https://services.arcgis.com/qnjIrwR8z5Izc0ij/arcgis/rest/services/Montana_Cadastral_Framework/FeatureServer/1', bbox: [-116.05, 44.36, -104.04, 49.0] },
  { name: 'North Dakota statewide parcels', state: 'ND', url: 'https://services1.arcgis.com/GOcSXpzwBHyk2nog/arcgis/rest/services/NDGISHUB_Parcels/FeatureServer/0', bbox: [-104.05, 45.94, -96.56, 49.0] },
  { name: 'Nebraska statewide parcels', state: 'NE', url: 'https://gis.ne.gov/Enterprise/rest/services/StatewideParcelsExternal/FeatureServer/0', bbox: [-104.05, 40.0, -95.31, 43.0] },
  { name: 'New Hampshire statewide parcels', state: 'NH', url: 'https://services9.arcgis.com/wnvDDrXX8EouLkZP/arcgis/rest/services/NH_Parcels_BEA_Public_View/FeatureServer/0', bbox: [-72.56, 42.7, -70.58, 45.31] },
  { name: 'New Jersey statewide parcels', state: 'NJ', url: 'https://services2.arcgis.com/XVOqAjTOJ5P6ngMu/arcgis/rest/services/Parcels_Composite_NJ_WM/FeatureServer/0', bbox: [-75.56, 38.79, -73.89, 41.36] },
  { name: 'Nevada statewide parcels', state: 'NV', url: 'https://arcgis.water.nv.gov/arcgis/rest/services/BaseLayers/County_Parcels_in_Nevada/MapServer/0', bbox: [-120.0, 35.0, -114.04, 41.99] },
  { name: 'New York statewide parcels (participating counties)', state: 'NY', url: 'https://services6.arcgis.com/EbVsqZ18sv1kVJ3k/arcgis/rest/services/NYS_Tax_Parcels_Public/FeatureServer/1', bbox: [-79.76, 40.48, -71.79, 45.01] },
  { name: 'Ohio statewide parcels', state: 'OH', url: 'https://gis.ohiodnr.gov/arcgis/rest/services/OIT_Services/odnr_landbase/MapServer/4', bbox: [-84.82, 38.41, -80.52, 42.33] },
  { name: 'Rhode Island statewide parcels', state: 'RI', url: 'https://risegis.ri.gov/hosting/rest/services/RIDEM/Tax_Parcels/MapServer/0', bbox: [-71.91, 41.1, -71.09, 42.02] },
  { name: 'Utah statewide parcels', state: 'UT', url: 'https://services1.arcgis.com/99lidPhWCzftIe9K/arcgis/rest/services/UtahStatewideParcels/FeatureServer/0', bbox: [-114.05, 37.0, -109.05, 42.0] },
  { name: 'Virginia statewide parcels', state: 'VA', url: 'https://vginmaps.vdem.virginia.gov/arcgis/rest/services/VA_Base_Layers/VA_Parcels/FeatureServer/0', bbox: [-83.68, 36.55, -75.17, 39.47] },
  { name: 'Vermont statewide parcels', state: 'VT', url: 'https://services1.arcgis.com/BkFxaEFNwHqX3tAw/arcgis/rest/services/FS_VCGI_OPENDATA_Cadastral_VTPARCELS_poly_standardized_parcels_SP_v1/FeatureServer/0', bbox: [-73.44, 42.73, -71.47, 45.01] },
  { name: 'Washington statewide parcels', state: 'WA', url: 'https://services.arcgis.com/jsIt88o09Q0r1j8h/arcgis/rest/services/Current_Parcels/FeatureServer/0', bbox: [-124.81, 45.54, -116.92, 49.0] },
  { name: 'Wisconsin statewide parcels', state: 'WI', url: 'https://services3.arcgis.com/n6uYoouQZW75n5WI/arcgis/rest/services/Wisconsin_Statewide_Parcels_DB/FeatureServer/0', bbox: [-92.88, 42.49, -86.25, 47.31] },
  { name: 'West Virginia statewide parcels', state: 'WV', url: 'https://services.wvgis.wvu.edu/arcgis/rest/services/Planning_Cadastre/WV_Parcels/MapServer/0', bbox: [-82.64, 37.2, -77.75, 40.64] },
  { name: 'Wyoming statewide parcels', state: 'WY', url: 'https://services3.arcgis.com/r0iJ85SKZ4zAzz3P/arcgis/rest/services/Wyoming_Parcels_for_2026/FeatureServer/0', bbox: [-111.05, 41.0, -104.05, 45.0] },
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
  exceededTransferLimit?: boolean;
  features?: { attributes: Record<string, unknown>; geometry?: { rings?: number[][][] } }[];
}

const SKIP = /^(objectid|oid|fid|globalid|uniqueid|lat|long|latitude|longitude|txt_angle|label_class)$|^shape|^st_?(area|length)|created_|last_edited_/i;
const MONEY = /value|price|val$|^land(res|com|farm)$|^fcv|^lpv|market|apprais|assess(?!or)/i;
const OWNER = /^(owner_?name\d?|own_?name|ownernme1|owner1?|name|primary_owner|deedholder|fullownername)$/i;
const SITE = /^(propertyaddress|physical_address|site_?add(r(ess)?)?|siteadress|situs.*|parcel_addr?|st_address|streetaddress|location(ad)?|addressline1|address|fullphysicaladdress|dlgf_prop_address|ph_full_address|e911addr|phy_addr1)$/i;

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
  // A drawn perimeter makes the query too long for a URL.
  const long = params.toString().length > 1500;
  const res = await fetch(long ? `${src.url}/query` : `${src.url}/query?${params}`, { signal: AbortSignal.timeout(30000), ...(long ? { method: 'POST', body: params } : {}) });
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
async function queryAddress(src: Source, address: string, lat: number, lng: number): Promise<ArcResponse | null> {
  const m = address.toUpperCase().match(/^\s*(\d+)\s+(?:[NSEW]\s+)?([A-Z0-9]+)/);
  if (!m) return null;
  if (!siteFields.has(src.url)) {
    const meta: ArcResponse = await (await fetch(`${src.url}?f=json`, { signal: AbortSignal.timeout(20000) })).json();
    siteFields.set(src.url, meta.fields?.find((f) => SITE.test(f.name))?.name ?? null);
  }
  const field = siteFields.get(src.url);
  if (!field) return null;
  // Kept to about a mile around the geocoded point: the same house number and street exist in many towns.
  const box = `${lng - 0.02},${lat - 0.015},${lng + 0.02},${lat + 0.015}`;
  const data = await send(src, { where: `UPPER(${field}) LIKE '${m[1]} %${m[2]}%'`, geometry: box, geometryType: 'esriGeometryEnvelope', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', resultRecordCount: '5' });
  return data.features?.length ? data : null;
}

function toRecord(src: Source, data: ArcResponse, nearest: boolean, feature = data.features![0]): ParcelRecord {
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

export const coveredAreas = () =>
  `statewide layers for ${SOURCES.filter((s) => s.state).map((s) => s.state).sort().join(', ')}; plus ${SOURCES.filter((s) => !s.state).map((s) => s.name).join('; ')}`;

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
      const byAddress = address ? await queryAddress(src, address, lat, lng).catch(() => null) : null;
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

export interface ParcelItem {
  key: string;
  lat: number;
  lng: number;
  address: string | null;
  owner: string | null;
  value: string | null;
  id: string | null;
}
export interface ParcelList {
  source: string | null; // null when no source covers the area
  items: ParcelItem[];
  capped: boolean;
}
const LIST_MAX = 200;
const lists = new Map<string, Promise<ParcelList>>();

// Parcels around the centre of the map view, from the first source that has any there.
export function listParcels(lat: number, lng: number, zoom: number): Promise<ParcelList> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)},${zoom}`;
  if (!lists.has(key)) lists.set(key, fetchList(lat, lng, zoom).catch((e) => (lists.delete(key), Promise.reject(e))));
  return lists.get(key)!;
}

async function fetchList(lat: number, lng: number, zoom: number): Promise<ParcelList> {
  const candidates = SOURCES.filter((s) => lng >= s.bbox[0] && lng <= s.bbox[2] && lat >= s.bbox[1] && lat <= s.bbox[3]);
  if (!candidates.length) return { source: null, items: [], capped: false };
  // Roughly the visible map: about 460px either side of the centre at this zoom.
  const dx = (360 / 2 ** zoom) * 1.8;
  const dy = dx * Math.cos((lat * Math.PI) / 180) * 0.8;
  let failure: unknown = null;
  for (const src of candidates) {
    try {
      const data = await send(src, { geometry: `${lng - dx},${lat - dy},${lng + dx},${lat + dy}`, geometryType: 'esriGeometryEnvelope', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', maxAllowableOffset: '0.00002', resultRecordCount: String(LIST_MAX) });
      const features = data.features ?? [];
      if (!features.length) continue;
      const items = features.flatMap((feature, i): ParcelItem[] => {
        const ring = feature.geometry?.rings?.[0];
        if (!ring?.length) return [];
        const r = toRecord(src, data, false, feature);
        return [{
          key: `${src.url}#${i}`,
          lat: ring.reduce((t, p) => t + p[1], 0) / ring.length,
          lng: ring.reduce((t, p) => t + p[0], 0) / ring.length,
          address: r.address,
          owner: r.owner,
          value: pick(r.rows, VALUE),
          id: pick(r.rows, /parcel ?(id|n)|^apn|^pin$|pams|parcelno|^parno/i),
        }];
      });
      items.sort((a, b) => (a.address ?? a.id ?? '~').localeCompare(b.address ?? b.id ?? '~', undefined, { numeric: true }));
      return { source: src.name, items, capped: features.length >= LIST_MAX };
    } catch (e) {
      failure = e;
    }
  }
  if (failure) throw failure;
  return { source: candidates[candidates.length - 1].name, items: [], capped: false };
}

// "1140 JILL" from "1140 Jill Dr W, West Fargo": enough to match one house across sources.
export const houseKey = (a: string) => a.toUpperCase().match(/^\s*(\d+)\s+(?:[NSEW]\s+)?([A-Z0-9]+)/)?.slice(1).join(' ') ?? '';

const VALUE = /total.*val|market.*val|just.*val|apprais.*val|assess.*(val|tot)|full cash|^parval|^tot.*val/i;
const around = new Map<string, Promise<Map<string, { value: number | null; owner: string | null }>>>();

// Assessed value and owner for every parcel within `miles` of a point, keyed by houseKey,
// in one request to the public source. Used to fill in what other data sources lack.
export function parcelValues(lat: number, lng: number, miles: number) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)},${miles}`;
  if (!around.has(key)) around.set(key, fetchValues(lat, lng, miles).catch((e) => (around.delete(key), Promise.reject(e))));
  return around.get(key)!;
}

async function fetchValues(lat: number, lng: number, miles: number) {
  const out = new Map<string, { value: number | null; owner: string | null }>();
  const dy = miles / 69.05;
  const dx = miles / (69.17 * Math.cos((lat * Math.PI) / 180));
  for (const src of SOURCES.filter((s) => lng >= s.bbox[0] && lng <= s.bbox[2] && lat >= s.bbox[1] && lat <= s.bbox[3])) {
    const data = await send(src, { geometry: `${lng - dx},${lat - dy},${lng + dx},${lat + dy}`, geometryType: 'esriGeometryEnvelope', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', returnGeometry: 'false', resultRecordCount: '1000' }).catch(() => null);
    if (!data?.features?.length) continue;
    for (const feature of data.features) {
      const r = toRecord(src, data, false, feature);
      const k = r.address ? houseKey(r.address) : '';
      const text = pick(r.rows, VALUE);
      if (k && !out.has(k)) out.set(k, { value: text ? Number(text.replace(/[^0-9.]/g, '')) || null : null, owner: r.owner });
    }
    break;
  }
  return out;
}

export interface AreaParcel {
  lat: number;
  lng: number;
  record: ParcelRecord;
}
const AREA_MAX = 3000;

// Every parcel inside a drawn perimeter, from the first source that has any there.
export async function parcelsInArea(ring: { lat: number; lng: number }[]): Promise<{ source: string | null; parcels: AreaParcel[]; capped: boolean }> {
  const lat = ring.reduce((t, p) => t + p.lat, 0) / ring.length;
  const lng = ring.reduce((t, p) => t + p.lng, 0) / ring.length;
  const candidates = SOURCES.filter((s) => lng >= s.bbox[0] && lng <= s.bbox[2] && lat >= s.bbox[1] && lat <= s.bbox[3]);
  if (!candidates.length) return { source: null, parcels: [], capped: false };
  const geometry = JSON.stringify({ rings: [[...ring, ring[0]].map((p) => [p.lng, p.lat])], spatialReference: { wkid: 4326 } });
  let failure: unknown = null;
  for (const src of candidates) {
    try {
      const parcels: AreaParcel[] = [];
      let more = true;
      while (more && parcels.length < AREA_MAX) {
        const data = await send(src, { geometry, geometryType: 'esriGeometryPolygon', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', maxAllowableOffset: '0.0001', resultOffset: String(parcels.length), resultRecordCount: '1000' });
        const features = data.features ?? [];
        for (const feature of features) {
          const first = feature.geometry?.rings?.[0];
          if (!first?.length) continue;
          const record = toRecord(src, data, false, feature);
          parcels.push({ lat: first.reduce((t, p) => t + p[1], 0) / first.length, lng: first.reduce((t, p) => t + p[0], 0) / first.length, record: { ...record, outline: [] } });
        }
        more = !!data.exceededTransferLimit && features.length > 0;
      }
      if (parcels.length) return { source: src.name, parcels, capped: more };
    } catch (e) {
      failure = e;
    }
  }
  if (failure) throw failure;
  return { source: candidates[candidates.length - 1].name, parcels: [], capped: false };
}
