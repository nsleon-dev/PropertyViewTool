// Live property-record lookups for addresses outside the bundled dataset.
// Backed by the RentCast API (https://developers.rentcast.io), which allows direct
// browser calls, so no proxy or server is needed.

import { idToken } from './auth';
import { RENTCAST_PROXY } from './store';

export interface ExternalRecord {
  address: string;
  sections: { title: string; rows: [string, string][] }[];
  ownerName: string | null;
  facts: {
    beds: number | null;
    baths: number | null;
    sqft: number | null;
    lotSize: number | null;
    yearBuilt: number | null;
    type: string | null;
    lastSalePrice: number | null;
    lastSaleDate: string | null;
    taxes: { year: number; tax: number | null; assessed: number | null }[];
    sales: { date: string; event: string; price: number | null }[];
  };
}

const cache = new Map<string, ExternalRecord | null>();
const usd = (n: unknown) => (typeof n === 'number' ? `$${Math.round(n).toLocaleString()}` : '—');
const txt = (v: unknown) => (v == null || v === '' ? '—' : typeof v === 'number' ? v.toLocaleString() : typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v));
const day = (v: unknown) => (typeof v === 'string' ? new Date(v).toLocaleDateString() : '—');

async function get(path: string, key: string): Promise<any> {
  const token = RENTCAST_PROXY ? await idToken() : null;
  // Through the proxy the key is added server-side and `key` is only the access code.
  const res = RENTCAST_PROXY
    ? await fetch(`${RENTCAST_PROXY}${path}`, { headers: { 'X-Access-Code': key, ...(token ? { Authorization: `Bearer ${token}` } : {}) } })
    : await fetch(`https://api.rentcast.io/v1${path}`, { headers: { 'X-Api-Key': key, Accept: 'application/json' } });
  if (res.status === 404) return null;
  if (res.status === 403 && RENTCAST_PROXY) throw new Error('Your account has not been approved for property data lookups yet.');
  if (res.status === 401 || res.status === 403) throw new Error(RENTCAST_PROXY ? 'Property data lookups need you to be signed in (or the access code under Account).' : 'The property data key was rejected. Check it under Account.');
  if (res.status === 429) throw new Error('The property data plan’s request limit has been reached.');
  if (!res.ok) throw new Error(`Property data request failed (${res.status}).`);
  return res.json();
}

function latest<T>(byKey: Record<string, T> | undefined): T | undefined {
  const keys = Object.keys(byKey ?? {}).sort();
  return keys.length ? byKey![keys[keys.length - 1]] : undefined;
}

export async function lookupRecord(address: string, key: string): Promise<ExternalRecord | null> {
  if (cache.has(address)) return cache.get(address)!;
  const data = await get(`/properties?address=${encodeURIComponent(address)}&limit=1`, key);
  const r = Array.isArray(data) ? data[0] : data;
  if (!r) {
    cache.set(address, null);
    return null;
  }
  const f = r.features ?? {};
  const assess: any = latest(r.taxAssessments);
  const tax: any = latest(r.propertyTaxes);
  const history: any[] = Object.values(r.history ?? {}).sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
  const rec: ExternalRecord = {
    address: r.formattedAddress ?? address,
    ownerName: r.owner?.names?.[0] ?? null,
    facts: {
      beds: r.bedrooms ?? null,
      baths: r.bathrooms ?? null,
      sqft: r.squareFootage ?? null,
      lotSize: r.lotSize ?? null,
      yearBuilt: r.yearBuilt ?? null,
      type: r.propertyType ?? null,
      lastSalePrice: r.lastSalePrice ?? null,
      lastSaleDate: r.lastSaleDate ?? null,
      taxes: [...new Set([...Object.keys(r.taxAssessments ?? {}), ...Object.keys(r.propertyTaxes ?? {})])]
        .sort()
        .reverse()
        .map((y) => ({ year: +y, tax: r.propertyTaxes?.[y]?.total ?? null, assessed: r.taxAssessments?.[y]?.value ?? null })),
      sales: history.map((h) => ({ date: String(h.date ?? ''), event: String(h.event ?? 'Event'), price: h.price ?? null })),
    },
    sections: [
      {
        title: 'Property',
        rows: [['Type', txt(r.propertyType)], ['Bedrooms', txt(r.bedrooms)], ['Bathrooms', txt(r.bathrooms)], ['Building Size', r.squareFootage ? `${txt(r.squareFootage)} sq ft` : '—'], ['Lot Size', r.lotSize ? `${txt(r.lotSize)} sq ft` : '—'], ['Year Built', r.yearBuilt ? String(r.yearBuilt) : '—'], ['Stories', txt(f.floorCount)], ['Garage Spaces', txt(f.garageSpaces)], ['Pool', txt(f.pool)], ['HOA Fee', r.hoa?.fee ? `${usd(r.hoa.fee)}/mo` : '—'], ['Subdivision', txt(r.subdivision)], ['Zoning', txt(r.zoning)], ['County', txt(r.county)], ['APN', txt(r.assessorID)]],
      },
      {
        title: 'Owner',
        rows: [['Owner', (r.owner?.names ?? []).join(', ') || '—'], ['Owner Type', txt(r.owner?.type)], ['Owner Occupied', txt(r.ownerOccupied)], ['Mailing Address', txt(r.owner?.mailingAddress?.formattedAddress)]],
      },
      {
        title: 'Sale & Tax',
        rows: [['Last Sale Price', usd(r.lastSalePrice)], ['Last Sale Date', day(r.lastSaleDate)], ['Assessed Value', assess ? `${usd(assess.value)} (${assess.year})` : '—'], ['Annual Tax', tax ? `${usd(tax.total)} (${tax.year})` : '—'], ...history.slice(0, 5).map((h): [string, string] => [`${h.event ?? 'Event'} ${day(h.date)}`, usd(h.price)])],
      },
    ],
  };
  cache.set(address, rec);
  return rec;
}

export async function lookupEstimates(address: string, key: string): Promise<[string, string][]> {
  const q = `?address=${encodeURIComponent(address)}`;
  const [value, rent] = await Promise.all([get(`/avm/value${q}`, key), get(`/avm/rent/long-term${q}`, key)]);
  return [
    ['Estimated Value', value ? usd(value.price) : '—'],
    ['Value Range', value ? `${usd(value.priceRangeLow)} – ${usd(value.priceRangeHigh)}` : '—'],
    ['Estimated Rent', rent ? `${usd(rent.rent)}/mo` : '—'],
    ['Rent Range', rent ? `${usd(rent.rentRangeLow)} – ${usd(rent.rentRangeHigh)}` : '—'],
  ];
}
