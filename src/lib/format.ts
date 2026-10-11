import { fullAddress, type Property } from './data';

export const money = (n: number | null | undefined) => (n == null ? '—' : `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n)).toLocaleString()}`);
export const num = (n: number | null | undefined) => (n == null || n === 0 ? '—' : n.toLocaleString());
export const pct = (n: number | null | undefined) => (n == null ? '—' : `${n}%`);
export const date = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${m}/${d}/${y}`;
};
export const shortMoney = (n: number) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : Math.abs(n) >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\r\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function propertyCsv(props: Property[], skip: Record<string, { phones: { number: string }[]; emails: string[] }> = {}) {
  const head = ['Address', 'City', 'State', 'Zip', 'County', 'APN', 'Property Type', 'Beds', 'Baths', 'Sq Ft', 'Lot Sq Ft', 'Year Built', 'Owner 1', 'Owner 2', 'Owner Type', 'Occupancy', 'Mailing Address', 'Mailing City', 'Mailing State', 'Mailing Zip', 'Est Value', 'Est Equity', 'Equity %', 'Open Loan Balance', 'Last Sale Date', 'Last Sale Price', 'MLS Status', 'List Price', 'Foreclosure Status', 'Lien Amount', 'Tax Delinquent', 'Vacant', 'Phone 1', 'Phone 2', 'Phone 3', 'Email'];
  const rows = props.map((p) => {
    const s = skip[p.id];
    return [p.address, p.city, p.state, p.zip, p.county, p.apn, p.type, p.beds, p.baths, p.sqft, p.lotSqft, p.yearBuilt || '', p.ownerName, p.owner2, p.ownerType, p.occupancy, p.mailAddress, p.mailCity, p.mailState, p.mailZip, p.estValue, p.equity, p.equityPct, p.mortgageBalance, p.lastSaleDate, p.lastSalePrice, p.mlsStatus, p.listPrice, p.fcStatus, p.lienAmount, p.taxDelinquent ? 'Yes' : 'No', p.vacant ? 'Yes' : 'No', s?.phones[0]?.number, s?.phones[1]?.number, s?.phones[2]?.number, s?.emails[0]];
  });
  return [head, ...rows];
}

export function mergeFields(template: string, p: Property) {
  const first = p.ownerType === 'Individual' ? p.ownerName.split(' ')[0] : p.ownerName;
  return template
    .replace(/\{owner\}/gi, p.ownerName)
    .replace(/\{first_name\}/gi, first)
    .replace(/\{address\}/gi, p.address)
    .replace(/\{city\}/gi, p.city)
    .replace(/\{full_address\}/gi, fullAddress(p));
}

export function tags(p: Property): { text: string; tone: string }[] {
  const t: { text: string; tone: string }[] = [];
  if (p.mlsStatus === 'Active' || p.mlsStatus === 'Pending') t.push({ text: p.mlsStatus, tone: 'green' });
  if (['Expired', 'Withdrawn', 'Cancelled'].includes(p.mlsStatus)) t.push({ text: `${p.mlsStatus} Listing`, tone: 'gray' });
  if (p.fcStatus !== 'None') t.push({ text: p.fcStatus, tone: 'red' });
  if (p.vacant && p.type !== 'Vacant Land') t.push({ text: 'Vacant', tone: 'purple' });
  if (p.liens.length) t.push({ text: 'Lien', tone: 'red' });
  if (p.taxDelinquent) t.push({ text: 'Tax Delinquent', tone: 'red' });
  if (p.bankruptcy) t.push({ text: 'Bankruptcy', tone: 'red' });
  if (p.divorceDate) t.push({ text: 'Divorce', tone: 'gray' });
  if (p.deceased) t.push({ text: 'Pre-Probate', tone: 'gray' });
  if (p.equity < 0) t.push({ text: 'Upside Down', tone: 'red' });
  else if (p.mortgageBalance === 0 && p.type !== 'Vacant Land') t.push({ text: 'Free & Clear', tone: 'blue' });
  else if (p.equityPct >= 50) t.push({ text: 'High Equity', tone: 'blue' });
  if (p.occupancy !== 'Owner Occupied') t.push({ text: 'Absentee', tone: 'orange' });
  if (p.cashBuyer) t.push({ text: 'Cash Buyer', tone: 'blue' });
  if (p.flipped) t.push({ text: 'Flip', tone: 'orange' });
  return t;
}
