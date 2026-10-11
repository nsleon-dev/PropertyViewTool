import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Stat } from '../components/ui';
import { getProperty } from '../lib/data';
import { money } from '../lib/format';

const TABS = ['Fix & Flip', 'Rental ROI', 'Rehab Estimator', 'ADU'];
type Vals = Record<string, number>;

function Fields({ vals, set, defs }: { vals: Vals; set: (v: Vals) => void; defs: [string, string, string?][] }) {
  return (
    <div className="calc-fields">
      {defs.map(([key, label, unit]) => (
        <label key={key} className="field">
          <span>{label}{unit ? ` (${unit})` : ''}</span>
          <input type="number" value={Number.isFinite(vals[key]) ? vals[key] : ''} onChange={(e) => set({ ...vals, [key]: e.target.value === '' ? NaN : +e.target.value })} />
        </label>
      ))}
    </div>
  );
}

const n = (v: number) => (Number.isFinite(v) ? v : 0);
const payment = (principal: number, ratePct: number, years: number) => {
  const r = ratePct / 1200;
  const m = years * 12;
  if (!principal || !m) return 0;
  return r ? (principal * r) / (1 - Math.pow(1 + r, -m)) : principal / m;
};
const signed = (v: number) => <span className={v < 0 ? 'neg' : 'pos'}>{money(v)}</span>;

const REHAB_ITEMS: [string, string, number][] = [
  ['Interior paint', 'sq ft', 2.5], ['Flooring', 'sq ft', 6], ['Kitchen remodel', 'each', 18000], ['Bathroom remodel', 'each', 9000],
  ['Roof replacement', 'sq ft', 5.5], ['HVAC system', 'each', 8500], ['Windows', 'each', 650], ['Exterior paint', 'sq ft', 2],
  ['Electrical update', 'each', 6000], ['Plumbing update', 'each', 5500], ['Landscaping', 'each', 3500], ['Appliances', 'each', 4500],
];

export function Calculators() {
  const [params] = useSearchParams();
  const p = getProperty(params.get('pid') ?? '');
  const [tab, setTab] = useState(TABS[0]);
  const value = p?.estValue ?? 300000;
  const sqft = p?.sqft || 1600;

  const [flip, setFlip] = useState<Vals>({ purchase: Math.round(value * 0.7), rehab: 40000, arv: Math.round(value * 1.1), months: 6, down: 20, rate: 10, points: 2, buyClose: 2, sellCost: 7, monthly: 600 });
  const [rent, setRent] = useState<Vals>({ purchase: value, down: 25, rate: 7, term: 30, closing: 3, rehab: 0, rent: p?.rentEst || Math.round(value * 0.007), vacancy: 6, taxes: p?.taxAmount ?? Math.round(value * 0.011), insurance: 1500, mgmt: 8, maint: 6, hoa: 0, appreciation: 3 });
  const [qty, setQty] = useState<Record<string, number>>({ 'Interior paint': sqft, Flooring: Math.round(sqft * 0.7), 'Kitchen remodel': 1, 'Bathroom remodel': p ? Math.max(1, Math.floor(p.baths)) : 2 });
  const [unit, setUnit] = useState<Record<string, number>>(Object.fromEntries(REHAB_ITEMS.map(([k, , c]) => [k, c])));
  const [contingency, setContingency] = useState(10);
  const [adu, setAdu] = useState<Vals>({ sqft: 600, costPerSqft: 275, soft: 25000, rent: 1600, expenses: 25, down: 100, rate: 8, term: 20, valuePerSqft: Math.round((value / sqft) * 0.7) });

  // Fix & flip
  const fLoan = n(flip.purchase) * (1 - n(flip.down) / 100);
  const fInterest = (fLoan * n(flip.rate)) / 1200 * n(flip.months);
  const fPoints = (fLoan * n(flip.points)) / 100;
  const fBuy = (n(flip.purchase) * n(flip.buyClose)) / 100;
  const fSell = (n(flip.arv) * n(flip.sellCost)) / 100;
  const fHold = n(flip.monthly) * n(flip.months);
  const fCosts = n(flip.rehab) + fInterest + fPoints + fBuy + fSell + fHold;
  const fProfit = n(flip.arv) - n(flip.purchase) - fCosts;
  const fCash = n(flip.purchase) - fLoan + n(flip.rehab) + fPoints + fBuy + fInterest + fHold;
  const fMao = n(flip.arv) * 0.7 - n(flip.rehab);

  // Rental
  const rLoan = n(rent.purchase) * (1 - n(rent.down) / 100);
  const rPI = payment(rLoan, n(rent.rate), n(rent.term));
  const rGross = n(rent.rent) * 12;
  const rEff = rGross * (1 - n(rent.vacancy) / 100);
  const rOpex = n(rent.taxes) + n(rent.insurance) + n(rent.hoa) * 12 + (rEff * (n(rent.mgmt) + n(rent.maint))) / 100;
  const rNoi = rEff - rOpex;
  const rCashFlow = rNoi - rPI * 12;
  const rCashIn = n(rent.purchase) * (n(rent.down) / 100) + (n(rent.purchase) * n(rent.closing)) / 100 + n(rent.rehab);

  // Rehab
  const rehabSub = REHAB_ITEMS.reduce((s, [k]) => s + n(qty[k] ?? 0) * n(unit[k]), 0);
  const rehabTotal = rehabSub * (1 + contingency / 100);

  // ADU
  const aBuild = n(adu.sqft) * n(adu.costPerSqft) + n(adu.soft);
  const aLoan = aBuild * (1 - n(adu.down) / 100);
  const aDebt = payment(aLoan, n(adu.rate), n(adu.term)) * 12;
  const aNoi = n(adu.rent) * 12 * (1 - n(adu.expenses) / 100);
  const aValue = n(adu.sqft) * n(adu.valuePerSqft);
  const aCash = aBuild - aLoan;

  return (
    <div className="page">
      <div className="content-head">
        <h1>Analysis</h1>
        {p && <span className="muted">Pre-filled from <Link to={`/property/${p.id}`}>{p.address}</Link></span>}
      </div>
      <div className="tabs" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      {tab === 'Fix & Flip' && (
        <div className="calc">
          <Fields vals={flip} set={setFlip} defs={[['purchase', 'Purchase price', '$'], ['rehab', 'Rehab budget', '$'], ['arv', 'After-repair value', '$'], ['months', 'Holding period', 'months'], ['down', 'Down payment', '%'], ['rate', 'Loan interest rate', '%'], ['points', 'Loan points', '%'], ['buyClose', 'Purchase closing costs', '%'], ['sellCost', 'Selling costs', '% of ARV'], ['monthly', 'Monthly holding costs', '$']]} />
          <div className="calc-out">
            <div className="stats">
              <Stat label="Net Profit" value={signed(fProfit)} />
              <Stat label="Return on Cash" value={fCash > 0 ? `${((fProfit / fCash) * 100).toFixed(1)}%` : '—'} sub={`${money(fCash)} cash needed`} />
              <Stat label="Max Offer (70% rule)" value={money(fMao)} sub={n(flip.purchase) <= fMao ? 'Purchase price is within the rule' : `${money(n(flip.purchase) - fMao)} over`} />
            </div>
            <table className="table">
              <tbody>
                <tr><td>After-repair value</td><td className="r">{money(n(flip.arv))}</td></tr>
                <tr><td>Purchase price</td><td className="r">−{money(n(flip.purchase))}</td></tr>
                <tr><td>Rehab</td><td className="r">−{money(n(flip.rehab))}</td></tr>
                <tr><td>Loan interest ({money(fLoan)} loan)</td><td className="r">−{money(fInterest)}</td></tr>
                <tr><td>Loan points</td><td className="r">−{money(fPoints)}</td></tr>
                <tr><td>Purchase closing costs</td><td className="r">−{money(fBuy)}</td></tr>
                <tr><td>Holding costs</td><td className="r">−{money(fHold)}</td></tr>
                <tr><td>Selling costs</td><td className="r">−{money(fSell)}</td></tr>
                <tr className="total"><td>Net profit</td><td className="r">{signed(fProfit)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Rental ROI' && (
        <div className="calc">
          <Fields vals={rent} set={setRent} defs={[['purchase', 'Purchase price', '$'], ['down', 'Down payment', '%'], ['rate', 'Interest rate', '%'], ['term', 'Loan term', 'years'], ['closing', 'Closing costs', '%'], ['rehab', 'Upfront repairs', '$'], ['rent', 'Monthly rent', '$'], ['vacancy', 'Vacancy', '%'], ['taxes', 'Annual property tax', '$'], ['insurance', 'Annual insurance', '$'], ['hoa', 'Monthly HOA', '$'], ['mgmt', 'Management', '% of rent'], ['maint', 'Maintenance', '% of rent'], ['appreciation', 'Annual appreciation', '%']]} />
          <div className="calc-out">
            <div className="stats">
              <Stat label="Monthly Cash Flow" value={signed(rCashFlow / 12)} sub={`${money(rCashFlow)} per year`} />
              <Stat label="Cap Rate" value={n(rent.purchase) ? `${((rNoi / n(rent.purchase)) * 100).toFixed(2)}%` : '—'} />
              <Stat label="Cash-on-Cash Return" value={rCashIn > 0 ? `${((rCashFlow / rCashIn) * 100).toFixed(2)}%` : '—'} sub={`${money(rCashIn)} cash invested`} />
              <Stat label="Debt Service Coverage" value={rPI ? (rNoi / (rPI * 12)).toFixed(2) : '—'} />
            </div>
            <table className="table">
              <tbody>
                <tr><td>Gross scheduled rent</td><td className="r">{money(rGross)}</td></tr>
                <tr><td>Vacancy loss</td><td className="r">−{money(rGross - rEff)}</td></tr>
                <tr><td>Operating expenses</td><td className="r">−{money(rOpex)}</td></tr>
                <tr className="total"><td>Net operating income</td><td className="r">{money(rNoi)}</td></tr>
                <tr><td>Mortgage (principal &amp; interest, {money(rPI)}/mo)</td><td className="r">−{money(rPI * 12)}</td></tr>
                <tr className="total"><td>Annual cash flow</td><td className="r">{signed(rCashFlow)}</td></tr>
                <tr><td>Year-one appreciation</td><td className="r">{money((n(rent.purchase) * n(rent.appreciation)) / 100)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'Rehab Estimator' && (
        <div className="calc-out">
          <table className="table rehab">
            <thead><tr><th>Item</th><th>Unit</th><th className="r">Quantity</th><th className="r">Unit Cost ($)</th><th className="r">Total</th></tr></thead>
            <tbody>
              {REHAB_ITEMS.map(([k, u]) => (
                <tr key={k}>
                  <td>{k}</td><td className="muted">{u}</td>
                  <td className="r"><input type="number" min={0} aria-label={`${k} quantity`} value={qty[k] ?? ''} onChange={(e) => setQty({ ...qty, [k]: +e.target.value })} /></td>
                  <td className="r"><input type="number" min={0} aria-label={`${k} unit cost`} value={unit[k]} onChange={(e) => setUnit({ ...unit, [k]: +e.target.value })} /></td>
                  <td className="r">{money(n(qty[k] ?? 0) * n(unit[k]))}</td>
                </tr>
              ))}
              <tr><td colSpan={4}>Subtotal</td><td className="r">{money(rehabSub)}</td></tr>
              <tr><td colSpan={3}>Contingency (%)</td><td className="r"><input type="number" min={0} aria-label="Contingency percent" value={contingency} onChange={(e) => setContingency(+e.target.value)} /></td><td className="r">{money(rehabTotal - rehabSub)}</td></tr>
              <tr className="total"><td colSpan={4}>Total rehab estimate{sqft ? ` · ${money(rehabTotal / sqft)} per sq ft` : ''}</td><td className="r">{money(rehabTotal)}</td></tr>
            </tbody>
          </table>
          <button className="btn primary" onClick={() => { setFlip({ ...flip, rehab: Math.round(rehabTotal) }); setTab('Fix & Flip'); }}>Use in Fix &amp; Flip</button>
        </div>
      )}

      {tab === 'ADU' && (
        <div className="calc">
          <Fields vals={adu} set={setAdu} defs={[['sqft', 'ADU size', 'sq ft'], ['costPerSqft', 'Build cost', '$ / sq ft'], ['soft', 'Permits, design & utility fees', '$'], ['rent', 'Expected monthly rent', '$'], ['expenses', 'Operating expenses', '% of rent'], ['down', 'Paid in cash', '%'], ['rate', 'Financing rate', '%'], ['term', 'Financing term', 'years'], ['valuePerSqft', 'Value added', '$ / sq ft']]} />
          <div className="calc-out">
            <div className="stats">
              <Stat label="Total Build Cost" value={money(aBuild)} />
              <Stat label="Annual Cash Flow" value={signed(aNoi - aDebt)} sub={`${money(aNoi)} NOI`} />
              <Stat label="Cash-on-Cash Return" value={aCash > 0 ? `${(((aNoi - aDebt) / aCash) * 100).toFixed(1)}%` : '—'} />
              <Stat label="Payback Period" value={aNoi > 0 ? `${(aBuild / aNoi).toFixed(1)} yrs` : '—'} />
              <Stat label="Value Added" value={money(aValue)} sub={<>{signed(aValue - aBuild)} vs cost</>} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
