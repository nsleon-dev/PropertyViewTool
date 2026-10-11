import { MARKETS, REF, allProperties, type Property } from './data';

export type FilterKind = 'range' | 'multi' | 'bool' | 'date';
export interface FilterDef {
  key: string;
  label: string;
  section: string;
  kind: FilterKind;
  get: (p: Property) => number | string | boolean | null;
  options?: string[];
  unit?: '$' | '%';
}
export type Range = { min?: number; max?: number };
export type DateRange = { from?: string; to?: string };
export type Criteria = Record<string, Range | DateRange | string[] | 'yes' | 'no'>;

export interface Location {
  kind: 'all' | 'county' | 'city' | 'zip' | 'bounds';
  value: string;
  label: string;
  bounds?: [number, number, number, number]; // south, west, north, east
}

const PROPERTY_TYPES = ['Single Family', 'Condominium', 'Townhouse', 'Multi-Family (2-4)', 'Apartment (5+)', 'Vacant Land', 'Mobile Home', 'Commercial'];

const S = {
  prop: 'Property Characteristics',
  mls: 'MLS Status',
  fc: 'Pre-Foreclosure & Bank Owned',
  own: 'Ownership Info & Occupancy',
  lien: 'Liens, Bankruptcy & Divorce',
  val: 'Value & Equity',
  mtg: 'Mortgage Info',
  tax: 'Tax Info',
};

const firstLoan = (p: Property) => p.loans[0] ?? null;

export const FILTERS: FilterDef[] = [
  { key: 'type', label: 'Property Type', section: S.prop, kind: 'multi', options: PROPERTY_TYPES, get: (p) => p.type },
  { key: 'beds', label: 'Bedrooms', section: S.prop, kind: 'range', get: (p) => p.beds },
  { key: 'baths', label: 'Bathrooms', section: S.prop, kind: 'range', get: (p) => p.baths },
  { key: 'sqft', label: 'Building Size (sq ft)', section: S.prop, kind: 'range', get: (p) => p.sqft },
  { key: 'lotSqft', label: 'Lot Size (sq ft)', section: S.prop, kind: 'range', get: (p) => p.lotSqft },
  { key: 'yearBuilt', label: 'Year Built', section: S.prop, kind: 'range', get: (p) => p.yearBuilt || null },
  { key: 'stories', label: 'Stories', section: S.prop, kind: 'range', get: (p) => p.stories },
  { key: 'units', label: 'Number of Units', section: S.prop, kind: 'range', get: (p) => p.units },
  { key: 'garage', label: 'Garage Spaces', section: S.prop, kind: 'range', get: (p) => p.garage },
  { key: 'pool', label: 'Pool', section: S.prop, kind: 'bool', get: (p) => p.pool },
  { key: 'hoa', label: 'HOA Present', section: S.prop, kind: 'bool', get: (p) => p.hoa },
  { key: 'vacant', label: 'Vacant', section: S.prop, kind: 'bool', get: (p) => p.vacant },

  { key: 'mlsStatus', label: 'Listing Status', section: S.mls, kind: 'multi', options: ['Active', 'Pending', 'Sold', 'Expired', 'Withdrawn', 'Cancelled', 'Off Market'], get: (p) => p.mlsStatus },
  { key: 'listPrice', label: 'Listing Price', section: S.mls, kind: 'range', unit: '$', get: (p) => p.listPrice },
  { key: 'dom', label: 'Days on Market', section: S.mls, kind: 'range', get: (p) => p.dom },
  { key: 'listDate', label: 'Listing Date', section: S.mls, kind: 'date', get: (p) => p.listDate },

  { key: 'fcStatus', label: 'Foreclosure Status', section: S.fc, kind: 'multi', options: ['Notice of Default', 'Lis Pendens', 'Auction', 'Bank Owned (REO)', 'None'], get: (p) => p.fcStatus },
  { key: 'fcDate', label: 'Recording Date', section: S.fc, kind: 'date', get: (p) => p.fcDate },
  { key: 'auctionDate', label: 'Auction Date', section: S.fc, kind: 'date', get: (p) => p.auctionDate },
  { key: 'defaultAmt', label: 'Default Amount', section: S.fc, kind: 'range', unit: '$', get: (p) => p.defaultAmt },
  { key: 'openingBid', label: 'Opening Bid', section: S.fc, kind: 'range', unit: '$', get: (p) => p.openingBid },

  { key: 'occupancy', label: 'Owner Occupancy', section: S.own, kind: 'multi', options: ['Owner Occupied', 'Absentee In-State', 'Absentee Out-of-State'], get: (p) => p.occupancy },
  { key: 'ownerType', label: 'Owner Type', section: S.own, kind: 'multi', options: ['Individual', 'Corporate / LLC', 'Trust', 'Bank / Lender'], get: (p) => p.ownerType },
  { key: 'yearsOwned', label: 'Years of Ownership', section: S.own, kind: 'range', get: (p) => p.yearsOwned },
  { key: 'propsOwned', label: 'Properties Owned', section: S.own, kind: 'range', get: (p) => p.propsOwned },
  { key: 'ownerAge', label: 'Owner Age', section: S.own, kind: 'range', get: (p) => p.ownerAge },
  { key: 'lastSaleDate', label: 'Last Sale Date', section: S.own, kind: 'date', get: (p) => p.lastSaleDate },
  { key: 'lastSalePrice', label: 'Last Sale Price', section: S.own, kind: 'range', unit: '$', get: (p) => p.lastSalePrice },
  { key: 'cashBuyer', label: 'Cash Buyer', section: S.own, kind: 'bool', get: (p) => p.cashBuyer },
  { key: 'flipped', label: 'Flipped (resold within 12 months)', section: S.own, kind: 'bool', get: (p) => p.flipped },
  { key: 'deceased', label: 'Deceased Owner (Pre-Probate)', section: S.own, kind: 'bool', get: (p) => p.deceased },
  { key: 'poBox', label: 'Mailing Address is PO Box', section: S.own, kind: 'bool', get: (p) => p.mailAddress.startsWith('PO Box') },

  { key: 'hasLien', label: 'Has Involuntary Lien', section: S.lien, kind: 'bool', get: (p) => p.liens.length > 0 },
  { key: 'lienType', label: 'Lien Type', section: S.lien, kind: 'multi', options: ['HOA Lien', "Mechanic's Lien", 'Federal Tax Lien', 'State Tax Lien', 'Judgment Lien', 'Municipal / Utility Lien'], get: (p) => p.liens.map((l) => l.type).join('|') },
  { key: 'lienAmount', label: 'Total Lien Amount', section: S.lien, kind: 'range', unit: '$', get: (p) => (p.liens.length ? p.lienAmount : null) },
  { key: 'bankruptcy', label: 'Bankruptcy', section: S.lien, kind: 'bool', get: (p) => !!p.bankruptcy },
  { key: 'bankruptcyDate', label: 'Bankruptcy Filing Date', section: S.lien, kind: 'date', get: (p) => p.bankruptcyDate },
  { key: 'divorce', label: 'Divorce', section: S.lien, kind: 'bool', get: (p) => !!p.divorceDate },
  { key: 'divorceDate', label: 'Divorce Filing Date', section: S.lien, kind: 'date', get: (p) => p.divorceDate },

  { key: 'estValue', label: 'Estimated Value', section: S.val, kind: 'range', unit: '$', get: (p) => p.estValue },
  { key: 'equity', label: 'Estimated Equity', section: S.val, kind: 'range', unit: '$', get: (p) => p.equity },
  { key: 'equityPct', label: 'Estimated Equity %', section: S.val, kind: 'range', unit: '%', get: (p) => p.equityPct },
  { key: 'rentEst', label: 'Estimated Rent', section: S.val, kind: 'range', unit: '$', get: (p) => p.rentEst || null },
  { key: 'ppsf', label: 'Value per Sq Ft', section: S.val, kind: 'range', unit: '$', get: (p) => (p.sqft ? Math.round(p.estValue / p.sqft) : null) },
  { key: 'grossYield', label: 'Gross Rental Yield %', section: S.val, kind: 'range', unit: '%', get: (p) => (p.rentEst ? Math.round((p.rentEst * 1200) / p.estValue * 10) / 10 : null) },

  { key: 'openLoans', label: 'Open Mortgages', section: S.mtg, kind: 'range', get: (p) => p.loans.length },
  { key: 'mortgageBalance', label: 'Total Open Loan Balance', section: S.mtg, kind: 'range', unit: '$', get: (p) => p.mortgageBalance },
  { key: 'ltv', label: 'Loan-to-Value %', section: S.mtg, kind: 'range', unit: '%', get: (p) => p.ltv },
  { key: 'loanType', label: 'Loan Type', section: S.mtg, kind: 'multi', options: ['Conventional', 'FHA', 'VA', 'ARM', 'Refinance', 'HELOC'], get: (p) => p.loans.map((l) => l.type).join('|') },
  { key: 'rate', label: 'Interest Rate %', section: S.mtg, kind: 'range', unit: '%', get: (p) => firstLoan(p)?.rate ?? null },
  { key: 'loanAmount', label: 'Original Loan Amount', section: S.mtg, kind: 'range', unit: '$', get: (p) => firstLoan(p)?.amount ?? null },
  { key: 'loanDate', label: 'Loan Recording Date', section: S.mtg, kind: 'date', get: (p) => firstLoan(p)?.date ?? null },
  { key: 'freeClear', label: 'Free & Clear', section: S.mtg, kind: 'bool', get: (p) => p.mortgageBalance === 0 },

  { key: 'assessed', label: 'Assessed Value', section: S.tax, kind: 'range', unit: '$', get: (p) => p.assessed },
  { key: 'taxAmount', label: 'Annual Tax Amount', section: S.tax, kind: 'range', unit: '$', get: (p) => p.taxAmount },
  { key: 'taxDelinquent', label: 'Tax Delinquent', section: S.tax, kind: 'bool', get: (p) => p.taxDelinquent },
  { key: 'taxDelinquentYear', label: 'Tax Delinquent Year', section: S.tax, kind: 'range', get: (p) => p.taxDelinquentYear },
];

export const SECTIONS = Object.values(S);
const BY_KEY = new Map(FILTERS.map((f) => [f.key, f]));

export interface LeadList {
  key: string;
  name: string;
  desc: string;
  test: (p: Property) => boolean;
}

const monthsAgo = (iso: string | null) => (iso ? (REF - Date.parse(iso)) / (86400000 * 30.44) : Infinity);
const preFc = (p: Property) => p.fcStatus === 'Notice of Default' || p.fcStatus === 'Lis Pendens';

export const LEAD_LISTS: LeadList[] = [
  { key: 'onMarket', name: 'On Market', desc: 'Active or pending MLS listings', test: (p) => p.mlsStatus === 'Active' || p.mlsStatus === 'Pending' },
  { key: 'preForeclosure', name: 'Pre-Foreclosures', desc: 'Notice of default or lis pendens filed', test: preFc },
  { key: 'auction', name: 'Auctions', desc: 'Scheduled for trustee or sheriff sale', test: (p) => p.fcStatus === 'Auction' },
  { key: 'bankOwned', name: 'Bank Owned', desc: 'REO properties held by a lender', test: (p) => p.fcStatus === 'Bank Owned (REO)' },
  { key: 'cashBuyers', name: 'Cash Buyers', desc: 'Purchased without financing in the last 2 years', test: (p) => p.cashBuyer && monthsAgo(p.lastSaleDate) <= 24 },
  { key: 'liens', name: 'Liens', desc: 'One or more involuntary liens recorded', test: (p) => p.liens.length > 0 },
  { key: 'vacant', name: 'Vacant', desc: 'Flagged vacant, excluding land', test: (p) => p.vacant && p.type !== 'Vacant Land' },
  { key: 'highEquity', name: 'High Equity', desc: '50% or more estimated equity', test: (p) => p.equityPct >= 50 && p.type !== 'Vacant Land' },
  { key: 'freeClear', name: 'Free & Clear', desc: 'No open mortgages', test: (p) => p.mortgageBalance === 0 && p.type !== 'Vacant Land' },
  { key: 'bankruptcy', name: 'Bankruptcy', desc: 'Owner has an open bankruptcy filing', test: (p) => !!p.bankruptcy },
  { key: 'divorce', name: 'Divorce', desc: 'Divorce filing tied to an owner', test: (p) => !!p.divorceDate },
  { key: 'taxDelinquent', name: 'Tax Delinquencies', desc: 'Property taxes past due', test: (p) => p.taxDelinquent },
  { key: 'flippers', name: 'Flippers', desc: 'Bought and resold within 12 months', test: (p) => p.flipped },
  { key: 'failedListings', name: 'Failed Listings', desc: 'Expired, withdrawn or cancelled listings', test: (p) => ['Expired', 'Withdrawn', 'Cancelled'].includes(p.mlsStatus) },
  { key: 'seniorOwners', name: 'Senior Owners', desc: 'Owner aged 65 or older', test: (p) => (p.ownerAge ?? 0) >= 65 },
  { key: 'vacantLand', name: 'Vacant Land', desc: 'Unimproved parcels', test: (p) => p.type === 'Vacant Land' },
  { key: 'tiredLandlords', name: 'Tired Landlords', desc: 'Absentee owners holding 15+ years', test: (p) => p.occupancy !== 'Owner Occupied' && p.yearsOwned >= 15 && p.type !== 'Vacant Land' },
  { key: 'preProbate', name: 'Pre-Probate', desc: 'Owner of record is deceased', test: (p) => p.deceased },
  { key: 'upsideDown', name: 'Upside Down', desc: 'Loan balance exceeds estimated value', test: (p) => p.equity < 0 },
  { key: 'zombie', name: 'Zombie Properties', desc: 'Vacant and in foreclosure', test: (p) => p.vacant && (preFc(p) || p.fcStatus === 'Auction') },
];

export function matchesLocation(p: Property, loc: Location) {
  switch (loc.kind) {
    case 'county': return `${p.county}, ${p.state}` === loc.value;
    case 'city': return `${p.city}, ${p.state}` === loc.value;
    case 'zip': return p.zip === loc.value;
    case 'bounds': {
      const b = loc.bounds!;
      return p.lat >= b[0] && p.lat <= b[2] && p.lng >= b[1] && p.lng <= b[3];
    }
    default: return true;
  }
}

function matchOne(def: FilterDef, v: Criteria[string], p: Property) {
  const val = def.get(p);
  if (def.kind === 'bool') return v === 'yes' ? !!val : !val;
  if (def.kind === 'multi') {
    const sel = v as string[];
    if (!sel.length) return true;
    const have = String(val ?? '').split('|');
    return sel.some((s) => have.includes(s));
  }
  if (def.kind === 'range') {
    const r = v as Range;
    if (r.min == null && r.max == null) return true;
    if (val == null) return false;
    return (r.min == null || (val as number) >= r.min) && (r.max == null || (val as number) <= r.max);
  }
  const d = v as DateRange;
  if (!d.from && !d.to) return true;
  if (!val) return false;
  return (!d.from || (val as string) >= d.from) && (!d.to || (val as string) <= d.to);
}

export function runSearch(loc: Location, criteria: Criteria, leadLists: string[]): Property[] {
  const active = Object.entries(criteria).filter(([k]) => BY_KEY.has(k));
  const lists = LEAD_LISTS.filter((l) => leadLists.includes(l.key));
  return allProperties().filter(
    (p) => matchesLocation(p, loc) && lists.every((l) => l.test(p)) && active.every(([k, v]) => matchOne(BY_KEY.get(k)!, v, p)),
  );
}

export function isActive(def: FilterDef, v: Criteria[string] | undefined) {
  if (v == null) return false;
  if (def.kind === 'bool') return true;
  if (def.kind === 'multi') return (v as string[]).length > 0;
  if (def.kind === 'range') return (v as Range).min != null || (v as Range).max != null;
  return !!(v as DateRange).from || !!(v as DateRange).to;
}

export function describeCriteria(criteria: Criteria): { key: string; text: string }[] {
  const out: { key: string; text: string }[] = [];
  for (const def of FILTERS) {
    const v = criteria[def.key];
    if (!isActive(def, v)) continue;
    let text = def.label;
    if (def.kind === 'bool') text += v === 'yes' ? ': Yes' : ': No';
    else if (def.kind === 'multi') text += `: ${(v as string[]).join(', ')}`;
    else if (def.kind === 'range') {
      const r = v as Range;
      const f = (n: number) => (def.unit === '$' ? `$${n.toLocaleString()}` : def.unit === '%' ? `${n}%` : String(n));
      text += r.min != null && r.min === r.max ? `: ${f(r.min)}` : r.min != null && r.max != null ? `: ${f(r.min)} – ${f(r.max)}` : r.min != null ? `: ${f(r.min)}+` : `: up to ${f(r.max!)}`;
    } else {
      const d = v as DateRange;
      text += `: ${d.from ?? '…'} to ${d.to ?? '…'}`;
    }
    out.push({ key: def.key, text });
  }
  return out;
}

export interface Suggestion {
  loc?: Location;
  propertyId?: string;
  label: string;
  hint: string;
}

let places: Suggestion[] | null = null;
function placeIndex() {
  if (places) return places;
  const seen = new Set<string>();
  places = [];
  const add = (kind: Location['kind'], value: string, label: string, hint: string) => {
    if (seen.has(kind + value)) return;
    seen.add(kind + value);
    places!.push({ loc: { kind, value, label }, label, hint });
  };
  for (const m of MARKETS) {
    add('county', `${m.county}, ${m.state}`, `${m.county} County, ${m.state}`, 'County');
    for (const cl of m.clusters) {
      add('city', `${cl.city}, ${m.state}`, `${cl.city}, ${m.state}`, 'City');
      add('zip', cl.zip, `${cl.zip} (${cl.city}, ${m.state})`, 'ZIP');
    }
  }
  return places;
}

export function suggest(query: string): Suggestion[] {
  const q = query.trim().toLowerCase();
  if (!q) return placeIndex().filter((s) => s.hint === 'County');
  const out = placeIndex().filter((s) => s.label.toLowerCase().includes(q)).slice(0, 6);
  if (q.length >= 3) {
    let n = 0;
    for (const p of allProperties()) {
      if (p.address.toLowerCase().startsWith(q) || p.apn.toLowerCase().startsWith(q) || p.ownerName.toLowerCase().startsWith(q)) {
        out.push({ propertyId: p.id, label: `${p.address}, ${p.city}, ${p.state} ${p.zip}`, hint: p.apn.toLowerCase().startsWith(q) ? `APN ${p.apn}` : p.ownerName.toLowerCase().startsWith(q) ? p.ownerName : 'Address' });
        if (++n >= 6) break;
      }
    }
  }
  return out;
}

// Plain-language search: a rule-based parser that turns a sentence such as
// "vacant 3 bed houses in Mesa under 400k with high equity" into filters.
export function parseQuery(text: string): { loc?: Location; criteria: Criteria; leadLists: string[]; understood: string[] } {
  const t = ` ${text.toLowerCase()} `;
  const criteria: Criteria = {};
  const leadLists: string[] = [];
  const understood: string[] = [];
  const money = (s: string, suffix?: string) => parseFloat(s.replace(/,/g, '')) * (suffix === 'k' ? 1e3 : suffix === 'm' ? 1e6 : 1);

  const loc = placeIndex()
    .filter((s) => {
      const name = s.loc!.kind === 'zip' ? s.loc!.value : s.label.split(',')[0].replace(' County', '').toLowerCase();
      return new RegExp(`\\b${name}\\b`).test(t) && (s.loc!.kind !== 'county' || /county/.test(t));
    })
    .sort((a, b) => b.label.length - a.label.length)[0]?.loc;
  if (loc) understood.push(`Location: ${loc.label}`);

  const phrases: [RegExp, string][] = [
    [/pre.?foreclos|notice of default|lis pendens/, 'preForeclosure'], [/auction/, 'auction'], [/bank.owned|\breo\b/, 'bankOwned'],
    [/cash buyer/, 'cashBuyers'], [/\bliens?\b/, 'liens'], [/vacant land|\bland\b|\blots?\b/, 'vacantLand'], [/high equity/, 'highEquity'],
    [/free (and|&) clear|no mortgage|paid off/, 'freeClear'], [/bankrupt/, 'bankruptcy'], [/divorc/, 'divorce'],
    [/tax delinquen|back taxes|delinquent tax/, 'taxDelinquent'], [/flip/, 'flippers'], [/failed listing|expired|withdrawn/, 'failedListings'],
    [/senior|elderly|65\+/, 'seniorOwners'], [/tired landlord/, 'tiredLandlords'], [/probate|deceased/, 'preProbate'],
    [/upside.?down|underwater/, 'upsideDown'], [/zombie/, 'zombie'], [/on.?market|for sale|listed|active listing/, 'onMarket'],
  ];
  for (const [re, key] of phrases) if (re.test(t)) leadLists.push(key);
  if (/vacant/.test(t) && !leadLists.includes('vacantLand') && !leadLists.includes('zombie')) leadLists.push('vacant');
  leadLists.forEach((k) => understood.push(`Lead list: ${LEAD_LISTS.find((l) => l.key === k)!.name}`));

  const types: [RegExp, string][] = [[/single.family|\bsfr\b|\bhouses?\b|\bhomes?\b/, 'Single Family'], [/condo/, 'Condominium'], [/town.?ho/, 'Townhouse'], [/duplex|triplex|fourplex|multi.?family/, 'Multi-Family (2-4)'], [/apartment/, 'Apartment (5+)'], [/mobile|manufactured/, 'Mobile Home'], [/commercial/, 'Commercial']];
  const sel = types.filter(([re]) => re.test(t)).map(([, v]) => v);
  if (sel.length) criteria.type = sel;

  if (/absentee|out.of.state|landlord|investor.owned|non.owner/.test(t)) criteria.occupancy = /out.of.state/.test(t) ? ['Absentee Out-of-State'] : ['Absentee In-State', 'Absentee Out-of-State'];
  else if (/owner.occupied/.test(t)) criteria.occupancy = ['Owner Occupied'];
  if (/\bpool\b/.test(t)) criteria.pool = 'yes';
  if (/\bllc\b|corporate|company.owned/.test(t)) criteria.ownerType = ['Corporate / LLC'];

  let m: RegExpMatchArray | null;
  if ((m = t.match(/(\d+)\s*\+?\s*(?:bed|br\b|bd\b)/))) criteria.beds = /(\d+)\s*\+\s*(?:bed|br|bd)|at least/.test(t) ? { min: +m[1] } : { min: +m[1], max: +m[1] };
  if ((m = t.match(/(\d+(?:\.5)?)\s*\+?\s*(?:bath|ba\b)/))) criteria.baths = { min: +m[1] };
  if ((m = t.match(/(?:over|above|more than|at least|min(?:imum)?)\s*([\d,]+)\s*(?:sq\.? ?ft|sqft|square)/))) criteria.sqft = { min: money(m[1]) };
  if ((m = t.match(/(?:under|below|less than|max(?:imum)?)\s*([\d,]+)\s*(?:sq\.? ?ft|sqft|square)/))) criteria.sqft = { ...(criteria.sqft as Range), max: money(m[1]) };
  if ((m = t.match(/built (?:after|since) (\d{4})/))) criteria.yearBuilt = { min: +m[1] };
  if ((m = t.match(/built before (\d{4})/))) criteria.yearBuilt = { ...(criteria.yearBuilt as Range), max: +m[1] };
  if ((m = t.match(/(?:under|below|less than|up to|max(?:imum)?)\s*\$?\s*([\d,.]+)\s*(k|m)?(?!\s*(?:sq|%|year|bed|bath))/))) criteria.estValue = { max: money(m[1], m[2]) };
  if ((m = t.match(/(?:over|above|more than|at least|min(?:imum)?)\s*\$\s*([\d,.]+)\s*(k|m)?|(?:over|above|more than)\s*([\d,.]+)\s*(k|m)\b/))) criteria.estValue = { ...(criteria.estValue as Range), min: money(m[1] ?? m[3], m[2] ?? m[4]) };
  if ((m = t.match(/(\d+)\s*%\s*(?:\+|or more)?\s*equity|equity (?:over|above|of at least)\s*(\d+)\s*%/))) criteria.equityPct = { min: +(m[1] ?? m[2]) };
  if ((m = t.match(/owned (?:for )?(?:over |more than |at least )?(\d+)\s*\+?\s*years/))) criteria.yearsOwned = { min: +m[1] };

  describeCriteria(criteria).forEach((d) => understood.push(d.text));
  return { loc, criteria, leadLists, understood };
}
