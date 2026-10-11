// Searching inside a perimeter drawn on the map. Everything here comes from real
// sources: the public parcel layer for the area (free) and, for the MLS tile, the
// property data service's for-sale listings. Categories that need recorded mortgage
// or foreclosure documents have no free source and are reported as unavailable.
import { houseKey, parcelsInArea, pick, type AreaParcel } from './parcels';

export interface LatLng {
  lat: number;
  lng: number;
}
export interface AreaRow {
  key: string;
  lat: number;
  lng: number;
  address: string;
  owner: string | null;
  mailing: string | null;
  value: number | null;
  saleDate: string | null;
  absentee: boolean;
  company: boolean;
  bank: boolean;
  vacant: boolean;
}
export interface AreaResult {
  source: string | null;
  rows: AreaRow[];
  capped: boolean;
  // Whether the source publishes what each category is worked out from.
  has: { owner: boolean; mailing: boolean; improvement: boolean };
}

const amount = (t: string | null) => (t ? Number(t.replace(/[^0-9.]/g, '')) || 0 : null);
const COMPANY = /\b(LLC|L\.L\.C|INC|CORP(ORATION)?|COMPANY|COMPANIES|L\.?P|LLP|LTD|HOLDINGS|PROPERTIES|INVESTMENTS?|BUILDERS|HOMES|DEVELOPMENT|ENTERPRISES|REALTY|PARTNERS(HIP)?)\b/i;
const BANK = /\b(BANK|BANCORP|FANNIE MAE|FEDERAL NATIONAL MORTGAGE|FREDDIE MAC|FEDERAL HOME LOAN|MORTGAGE|CREDIT UNION|LOAN SERVIC\w*|SECRETARY OF (HOUSING|VETERANS)|HUD)\b/i;
const VALUE = /total.*val|market.*val|just.*val|apprais.*val|assess.*(val|tot)|full cash|^parval|^tot.*val/i;
const IMPROVEMENT = /dwelling.*val|improvement.*val|impr.*val|bldg.*val|building.*val|structure.*val/i;

function classify(p: AreaParcel, i: number): AreaRow & { hasImp: boolean } {
  const { rows, owner, address } = p.record;
  const mailing = pick(rows, /mail.*addr|own.*addr|^mailing$|taxpayer.*addr/i);
  const imp = rows.filter(([k]) => IMPROVEMENT.test(k)).map(([, v]) => amount(v) ?? 0);
  // Some assessors split land into several lines (residential, commercial, agricultural).
  const land = rows.filter(([k]) => /land.*val/i.test(k)).reduce((t, [, v]) => t + (amount(v) ?? 0), 0);
  const site = address ? houseKey(address) : '';
  const mail = mailing ? houseKey(mailing) : '';
  return {
    key: `p${i}`,
    lat: p.lat,
    lng: p.lng,
    address: (address && !/^n\/?a$/i.test(address) ? address : null) ?? `Parcel ${pick(rows, /parcel ?(id|n)|^apn|^pin$/i) ?? ''}`.trim(),
    owner,
    mailing,
    value: amount(pick(rows, VALUE)),
    saleDate: pick(rows, /sale.?date|deed.?date/i),
    // Only when both addresses are street addresses that can be compared (not a PO box).
    absentee: !!site && !!mail && site !== mail,
    company: !!owner && COMPANY.test(owner) && !BANK.test(owner),
    bank: !!owner && BANK.test(owner),
    vacant: imp.length > 0 && imp.every((v) => v === 0) && land > 0,
    hasImp: imp.length > 0,
  };
}

export async function searchArea(ring: LatLng[]): Promise<AreaResult> {
  const found = await parcelsInArea(ring);
  const rows = found.parcels.map(classify);
  return { source: found.source, rows, capped: found.capped, has: { owner: rows.some((r) => r.owner), mailing: rows.some((r) => r.mailing), improvement: rows.some((r) => r.hasImp) } };
}

export function inside(ring: LatLng[], p: LatLng) {
  let hit = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.lat > p.lat !== b.lat > p.lat && p.lng < ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng) hit = !hit;
  }
  return hit;
}

const perLng = (lat: number) => 69.17 * Math.cos((lat * Math.PI) / 180);
export const milesBetween = (a: LatLng, b: LatLng) => Math.hypot((a.lng - b.lng) * perLng(a.lat), (a.lat - b.lat) * 69.05);

export function circle(center: LatLng, miles: number): LatLng[] {
  return Array.from({ length: 48 }, (_, i) => {
    const t = (i / 48) * 2 * Math.PI;
    return { lat: center.lat + (Math.sin(t) * miles) / 69.05, lng: center.lng + (Math.cos(t) * miles) / perLng(center.lat) };
  });
}

// Centre and radius of the smallest circle around the ring's centroid that contains it.
export function bounding(ring: LatLng[]) {
  const center = { lat: ring.reduce((t, p) => t + p.lat, 0) / ring.length, lng: ring.reduce((t, p) => t + p.lng, 0) / ring.length };
  return { center, miles: Math.max(...ring.map((p) => milesBetween(center, p))) };
}

export type TileKey = 'all' | 'mls' | 'pre' | 'auction' | 'bank' | 'cash' | 'liens' | 'vacant' | 'equity' | 'absentee' | 'company';
export const TILES: { key: TileKey; label: string; needs?: 'owner' | 'mailing' | 'improvement'; why?: string; test?: (r: AreaRow) => boolean }[] = [
  { key: 'all', label: 'All Parcels', test: () => true },
  { key: 'mls', label: 'MLS' },
  { key: 'pre', label: 'Pre-Foreclosures', why: 'Needs recorded foreclosure filings, which have no free source.' },
  { key: 'auction', label: 'Auctions', why: 'Needs foreclosure auction schedules, which have no free source.' },
  { key: 'bank', label: 'Bank Owned', needs: 'owner', test: (r) => r.bank },
  { key: 'cash', label: 'Cash Buyers', why: 'Needs recorded mortgage documents to tell a cash purchase from a financed one.' },
  { key: 'liens', label: 'Liens', why: 'Needs recorded lien documents, which have no free source.' },
  { key: 'vacant', label: 'Vacant Land', needs: 'improvement', test: (r) => r.vacant },
  { key: 'equity', label: 'High Equity', why: 'Needs each property\'s loan balance, which has no free source.' },
  { key: 'absentee', label: 'Absentee Owners', needs: 'mailing', test: (r) => r.absentee },
  { key: 'company', label: 'Company Owned', needs: 'owner', test: (r) => r.company },
];
