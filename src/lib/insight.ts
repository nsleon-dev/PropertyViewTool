import { REF, type Loan, type Property } from './data';
import { money } from './format';

const LEVELS = ['Very Low', 'Low', 'Medium', 'High', 'Very High'];

// A transparent, rule-based likelihood-of-default score built from the distress signals
// on the record. It is not a trained model: every point it adds is listed in `reasons`.
export function foreclosureFactor(p: Property): { level: number; label: string; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const add = (pts: number, why: string) => {
    score += pts;
    reasons.push(why);
  };
  if (p.fcStatus === 'Auction') add(4, 'Foreclosure auction is scheduled');
  else if (p.fcStatus === 'Notice of Default' || p.fcStatus === 'Lis Pendens') add(3, `${p.fcStatus} recorded`);
  if (p.taxDelinquent) add(1.5, 'Property taxes are delinquent');
  if (p.ltv > 95) add(1.5, `Loan-to-value is ${p.ltv}%`);
  else if (p.ltv > 80) add(0.75, `Loan-to-value is ${p.ltv}%`);
  if (p.liens.length) add(1, `${p.liens.length} involuntary ${p.liens.length === 1 ? 'lien' : 'liens'}`);
  if (p.bankruptcy) add(1, `${p.bankruptcy} bankruptcy filing`);
  if (p.divorceDate) add(0.5, 'Divorce filing');
  if (p.vacant && p.type !== 'Vacant Land') add(0.5, 'Property is vacant');
  if (!p.loans.length) reasons.push('No open mortgage to default on');
  const level = p.loans.length ? Math.max(1, Math.min(5, 1 + Math.round(score))) : 1;
  if (reasons.length === 0) reasons.push('No distress signals on record');
  return { level, label: LEVELS[level - 1], reasons };
}

export function monthlyPayment(l: Loan) {
  const r = l.rate / 1200;
  const n = l.term * 12;
  return r ? (l.amount * r) / (1 - Math.pow(1 + r, -n)) : l.amount / n;
}

export function maturity(l: Loan) {
  const d = new Date(l.date);
  d.setUTCFullYear(d.getUTCFullYear() + l.term);
  return d.toISOString().slice(0, 10);
}

// Five years of tax history modelled back from the current bill (sample dataset only).
export function taxHistory(p: Property) {
  const year = new Date(REF).getUTCFullYear() - 1;
  const rows = [0, 1, 2, 3, 4].map((back) => ({ year: year - back, tax: Math.round(p.taxAmount / Math.pow(1.038, back)), assessed: Math.round(p.assessed / Math.pow(1.045, back) / 100) * 100 }));
  return rows.map((r, i) => {
    const prev = rows[i + 1];
    return { ...r, taxChange: prev ? ((r.tax - prev.tax) / prev.tax) * 100 : null, assessedChange: prev ? ((r.assessed - prev.assessed) / prev.assessed) * 100 : null };
  });
}

export function valueHistory(p: Property): { label: string; value: number }[] {
  const pts = [...p.sales].reverse().map((s) => ({ label: `Sold ${s.date.slice(0, 4)}`, value: s.price }));
  return [...pts, { label: 'Est. now', value: p.estValue }];
}

// Plain-language summary assembled from the record's fields.
export function summarize(p: Property): string[] {
  const land = p.type === 'Vacant Land';
  const ff = foreclosureFactor(p);
  const out = [
    land
      ? `${p.address} is a ${p.lotSqft.toLocaleString()} sq ft vacant parcel in ${p.city}, ${p.state}.`
      : `${p.address} is a ${p.beds}-bed, ${p.baths}-bath ${p.type.toLowerCase()} of ${p.sqft.toLocaleString()} sq ft in ${p.city}, ${p.state}, built in ${p.yearBuilt}.`,
    `It is owned by ${p.ownerName} (${p.ownerType.toLowerCase()}, ${p.occupancy.toLowerCase()}) and has been held for ${p.yearsOwned} years, last selling for ${money(p.lastSalePrice)}${p.cashBuyer ? ' in a cash purchase' : ''}.`,
    `Estimated value is ${money(p.estValue)} against ${p.loans.length ? `${money(p.mortgageBalance)} of open loans` : 'no open loans'}, leaving ${money(p.equity)} (${p.equityPct}%) in estimated equity.`,
  ];
  if (!land) out.push(`Estimated rent of ${money(p.rentEst)}/mo implies a ${((p.rentEst * 1200) / p.estValue).toFixed(1)}% gross yield; a 70%-of-value wholesale price would be about ${money(p.estValue * 0.7)}.`);
  if (p.mlsStatus !== 'Off Market') out.push(`MLS status is ${p.mlsStatus}${p.listPrice ? ` at ${money(p.listPrice)}` : ''}${p.dom ? ` after ${p.dom} days on market` : ''}.`);
  out.push(`Foreclosure factor is ${ff.label}: ${ff.reasons.join('; ').toLowerCase()}.`);
  return out;
}
