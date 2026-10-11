import { useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Demographics, DocList, Fields, Meter, Notes, Section, TagEditor, TopCards } from '../components/detail';
import { MapView, type MapPoint } from '../components/MapView';
import { AddToListModal, Empty, Icon, Modal, StarButton, Tag, Thumb, toast } from '../components/ui';
import { runSkipTrace } from '../lib/actions';
import { REF, allProperties, distanceMiles, getProperty, type Property } from '../lib/data';
import { LEAD_LISTS } from '../lib/filters';
import { date, downloadCsv, money, num, propertyCsv, tags } from '../lib/format';
import { AiRating } from '../components/AiRating';
import { areaContext } from '../lib/ai';
import { foreclosureFactor, maturity, monthlyPayment, summarize, taxHistory, valueHistory } from '../lib/insight';
import { LEAD_STATUSES, setState, useStore } from '../lib/store';
import { pinColor } from './Search';

const TABS = ['Property Details', 'MLS Details', 'Comparables & Nearby Listings', 'Intelligence', 'Demographics', 'Tax Information', 'Mortgage & Transaction History', 'Documents & Reports'];
const COMPS = TABS[2];

export function PropertyDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const p = getProperty(id ?? '');
  const { lists, skip, status } = useStore();
  const [tab, setTab] = useState(TABS[0]);
  const [modal, setModal] = useState<'' | 'add' | 'summary' | 'tags'>('');

  if (!p) return <div className="page"><Empty title="Property not found"><Link to="/">Back to search</Link></Empty></div>;

  const inLists = lists.filter((l) => l.propertyIds.includes(p.id));
  const traced = skip[p.id];
  const land = p.type === 'Vacant Land';
  const ff = foreclosureFactor(p);
  const distressed = p.fcStatus !== 'None' || p.taxDelinquent || p.liens.length > 0 || !!p.bankruptcy;
  const years = Math.floor(p.yearsOwned);
  const sale = p.sales[0];
  const taxes = taxHistory(p);
  const sold = p.mlsStatus === 'Sold';
  const pct = (n: number | null) => (n == null ? '—' : <span className={n < 0 ? 'neg' : 'pos'}>{n.toFixed(1)}%</span>);
  const stamp = (amount: number, when: string): ReactNode => <>{money(amount)}<small>{date(when)}</small></>;

  return (
    <div className="page detail">
      <header className="detail-head">
        <button className="icon-btn no-print" onClick={() => nav(-1)} aria-label="Back"><Icon name="back" /></button>
        <div className="grow">
          <h1>{p.address} {p.city}, {p.state} {p.zip}</h1>
          <div className="tags">{tags(p).map((t) => <Tag key={t.text} {...t} />)}</div>
        </div>
        <div className="detail-actions no-print">
          <StarButton item={{ id: p.id, address: `${p.address}, ${p.city}, ${p.state} ${p.zip}`, lat: p.lat, lng: p.lng, real: false }} />
          <button className="btn pill violet" onClick={() => setModal('summary')}><Icon name="spark" size={15} /> Summary</button>
          <button className="btn pill primary" onClick={() => setModal('tags')}>Status / Tags</button>
          <button className="btn pill" onClick={() => toast(runSkipTrace([p.id]).msg)}>Skip Trace</button>
          <button className="btn pill" onClick={() => window.print()}>Print</button>
          <Link className="btn pill" to={`/calculators?pid=${p.id}`}>Analysis</Link>
          <button className="btn pill" onClick={() => setModal('add')}>Save{inLists.length ? ` (${inLists.length})` : ''}</button>
        </div>
      </header>

      <TopCards
        photo={<Thumb p={p} size="lg" />}
        beds={land ? null : p.beds}
        baths={land ? null : p.baths}
        left={[['SqFt', num(p.sqft)], ['Lot Size', num(p.lotSqft)], ['Year Built', p.yearBuilt || '—'], ['APN', p.apn]]}
        right={[['Property Type', p.type], ['Status', p.mlsStatus], ['Distressed', distressed ? 'Yes' : 'No'], ['Short Sale', p.equity < 0 && p.fcStatus !== 'None' ? 'Possible' : 'No'], ['HOA/COA', p.hoa ? 'Yes' : 'No'], ['Owner Type', p.ownerType], ['Owner Status', p.occupancy], ['Occupancy', p.vacant ? 'Vacant' : 'Occupied'], ['Length of Ownership', `${years} ${years === 1 ? 'Year' : 'Years'} ${Math.round((p.yearsOwned - years) * 12)} Months`], ['Purchase Method', p.cashBuyer ? 'Cash' : 'Financed'], ['County', p.county]]}
        value={{ label: 'Estimated Value', amount: p.estValue, points: valueHistory(p) }}
        debt={[['Open Mortgages', p.loans.length], ['Estimated Balance', money(p.mortgageBalance)], ['Involuntary Liens', p.liens.length], ['Involuntary Amount', money(p.lienAmount)]]}
        sale={[['Public Record', stamp(p.lastSalePrice, p.lastSaleDate)], ['MLS', sold ? stamp(p.lastSalePrice, p.lastSaleDate) : null], ['Document Type', sale.docType]]}
        equity={{ amount: p.equity, pct: p.equityPct }}
        opportunity={[['Linked Properties', p.propsOwned - 1], ['Est. Wholesale Price', money(p.estValue * 0.7)], ['Monthly Rent', land ? null : money(p.rentEst)], ['Gross Yield', land ? null : `${((p.rentEst * 1200) / p.estValue).toFixed(1)}%`]]}
        onComps={() => setTab(COMPS)}
      />

      <div className="intel-strip">
        <div className="intel-brand"><Icon name="spark" size={20} /> Intelligence</div>
        <Meter title="Foreclosure Factor" label={ff.label} level={ff.level} />
        <div className="muted grow">{ff.reasons.join(' · ')}</div>
        <button className="link no-print" onClick={() => setTab('Intelligence')}>How this is scored</button>
      </div>

      <div className="tabs no-print" role="tablist">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      <div className="tab-body">
        {tab === 'Property Details' && (
          <>
            <Section title="Contact Information" aside={!traced && <button className="btn pill primary no-print" onClick={() => toast(runSkipTrace([p.id]).msg)}>Skip Trace Owner</button>}>
              {traced ? (
                <Fields rows={[...traced.phones.map((ph, i): [string, ReactNode] => [`Phone ${i + 1} (${ph.type})`, <><a href={`tel:${ph.number.replace(/\D/g, '')}`}>{ph.number}</a> {ph.dnc && <Tag text="Do Not Call" tone="red" />}</>]), ['Email', traced.emails[0] ? <a href={`mailto:${traced.emails[0]}`}>{traced.emails[0]}</a> : 'None found'], ['Traced', date(traced.date)]]} />
              ) : <p className="muted">Skip trace this property to view owner contact details.</p>}
            </Section>
            <Section title="Ownership Information">
              <Fields rows={[['Owner 1 Name', p.ownerName], ['Owner 2 Name', p.owner2 ?? '—'], ['Mailing Address', `${p.mailAddress}, ${p.mailCity}, ${p.mailState} ${p.mailZip}`], ['Owner Type', p.ownerType], ['Owner Age', p.ownerAge ?? '—'], ['Properties Owned', p.propsOwned], ['Deceased', p.deceased ? 'Yes' : 'No']]} />
            </Section>
            <Section title="Property Characteristics">
              <Fields rows={[['Bedrooms', num(p.beds)], ['Total Bathrooms', num(p.baths)], ['Living Area', p.sqft ? `${num(p.sqft)} SqFt.` : '—'], ['Stories', num(p.stories)], ['Units', p.units], ['Garage Spaces', num(p.garage)], ['Pool', p.pool ? 'Yes' : 'No'], ['Year Built', p.yearBuilt || '—']]} />
            </Section>
            <div className="two-col">
              <Section title="Land / Location Information">
                <Fields rows={[['APN', p.apn], ['Property Type', p.type], ['Lot Area', p.lotSqft ? `${num(p.lotSqft)} SqFt.` : '—'], ['Lot Size', p.lotSqft ? `${(p.lotSqft / 43560).toFixed(2)} acres` : '—'], ['Subdivision', p.subdivision], ['Municipality', p.city], ['County', `${p.county}, ${p.state}`], ['HOA', p.hoa ? 'Yes' : 'No']]} />
              </Section>
              <div className="mini-map"><MapView points={[{ id: p.id, lat: p.lat, lng: p.lng, color: pinColor(p), label: p.address, big: true }]} fitKey={p.id} quiet /></div>
            </div>
            <Section title="Last Sale Information">
              <Fields rows={[['Sale Date', date(sale.date)], ['Sale Amount', money(sale.price)], ['Purchase Method', sale.cash ? 'Cash' : 'Financed'], ['Document Type', sale.docType], ['Buyer', sale.buyer], ['Seller', sale.seller]]} />
            </Section>
            {p.loans.map((l) => (
              <Section key={l.position} title={`${l.position === 1 ? 'First' : 'Second'} Mortgage Information`}>
                <Fields rows={[['Amount', money(l.amount)], ['Type', l.type], ['Lender Name', l.lender], ['Rate (Est.)', `${l.rate.toFixed(2)}%`], ['Term', `${l.term * 12} months`], ['Maturity Date', date(maturity(l))]]} />
              </Section>
            ))}
          </>
        )}

        {tab === 'MLS Details' && (p.mlsStatus === 'Off Market' ? <Empty title="Off market">No listing activity on record for this property.</Empty> : (
          <>
            <Section title="Listing">
              <Fields rows={[['Status Date', date(sold ? p.lastSaleDate : p.listDate)], ['Status', p.mlsStatus], ['Price', money(sold ? p.lastSalePrice : p.listPrice)], ['Days on Market', num(p.dom)], ['Listing Type', 'For Sale']]} />
            </Section>
            <Section title="Property Details">
              <Fields rows={[['Property Type', p.type], ['Living Area', p.sqft ? `${num(p.sqft)} SqFt.` : '—'], ['Total Bedrooms', num(p.beds)], ['Total Bathrooms', num(p.baths)], ['Price Per SqFt.', p.sqft && p.listPrice ? money(p.listPrice / p.sqft) : '—'], ['APN', p.apn]]} />
            </Section>
            <Section title="Agent Information"><Fields rows={[['Agent Name', p.agent ?? '—']]} /></Section>
            <Section title="Listing History">
              <table className="table">
                <thead><tr><th>Date</th><th>Action</th><th className="r">Price</th><th className="r">DOM</th><th>Agent</th></tr></thead>
                <tbody>
                  {p.mlsStatus !== 'Active' && <tr><td>{date(sold ? p.lastSaleDate : p.listDate)}</td><td>{p.mlsStatus}</td><td className="r">{money(sold ? p.lastSalePrice : p.listPrice)}</td><td className="r">{num(p.dom)}</td><td>{p.agent}</td></tr>}
                  <tr><td>{date(p.listDate)}</td><td>Listed</td><td className="r">{money(p.listPrice)}</td><td className="r">—</td><td>{p.agent}</td></tr>
                </tbody>
              </table>
            </Section>
          </>
        ))}

        {tab === COMPS && <Comps p={p} />}

        {tab === 'Intelligence' && (
          <>
            <AiRating
              id={p.id}
              note="This is a sample record, so the rating describes synthetic data"
              facts={async () => {
                const { id: _id, ownerName: _o, owner2: _o2, mailAddress: _m, mailCity: _mc, mailState: _ms, mailZip: _mz, ownerAge: _a, agent: _g, lat: _lat, lng: _lng, ...record } = p;
                return { record, ruleBasedForeclosureFactor: ff, neighbourhood: await areaContext(p.lat, p.lng) };
              }}
            />
            <Section title="Foreclosure Factor">
              <div className="intel-row">
                <Meter title="Likelihood of default" label={ff.label} level={ff.level} />
                <p className="muted grow">
                  A rule-based score from Very Low to Very High, built from the distress signals on this record: recorded foreclosure filings, delinquent taxes,
                  loan-to-value, involuntary liens, bankruptcy, divorce and vacancy. It is not a trained prediction model.
                </p>
              </div>
              <ul className="reasons">{ff.reasons.map((r) => <li key={r}>{r}</li>)}</ul>
            </Section>
            <Section title="Property Condition">
              <p className="muted">Condition grading (exterior, interior, kitchen, bathroom) is derived from listing photos, which this dataset does not include.</p>
            </Section>
          </>
        )}

        {tab === 'Demographics' && <Demographics lat={p.lat} lng={p.lng} />}

        {tab === 'Tax Information' && (
          <Section title="Tax Details">
            <Fields rows={[['Parcel Number', p.apn], ['Situs County', p.county], ['Primary Owner Full Name', p.ownerName], ['Tax Bill Mailing Address', `${p.mailAddress}, ${p.mailCity}, ${p.mailState} ${p.mailZip}`], ['Tax Year', taxes[0].year], ['Tax Amount', money(p.taxAmount)], ['Total Assessed Value', money(p.assessed)], ['Effective Rate', `${((p.taxAmount / p.estValue) * 100).toFixed(2)}%`], ['Tax Delinquent', p.taxDelinquent ? `Yes, since ${p.taxDelinquentYear} (${money(p.taxDelinquentAmt)})` : 'No']]} />
            <table className="table narrow">
              <thead><tr><th>Year</th><th className="r">Property Taxes</th><th className="r">Change</th><th className="r">Tax Assessment</th><th className="r">Change</th></tr></thead>
              <tbody>{taxes.map((t) => <tr key={t.year}><td>{t.year}</td><td className="r">{money(t.tax)}</td><td className="r">{pct(t.taxChange)}</td><td className="r">{money(t.assessed)}</td><td className="r">{pct(t.assessedChange)}</td></tr>)}</tbody>
            </table>
          </Section>
        )}

        {tab === 'Mortgage & Transaction History' && (
          <>
            <Section title="Current Mortgages">
              {p.loans.length ? (
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Loan Position</th><th>Recording Date</th><th>Loan Type</th><th>Lender Name</th><th className="r">Loan Amount</th><th className="r">Est. Rate</th><th className="r">Loan Term</th><th>Loan Due Date</th><th className="r">Est. Loan Payment</th><th className="r">Est. Loan Balance</th></tr></thead>
                    <tbody>
                      {p.loans.map((l) => (
                        <tr key={l.position}><td>Loan {l.position}</td><td>{date(l.date)}</td><td>{l.type}</td><td>{l.lender}</td><td className="r">{money(l.amount)}</td><td className="r">{l.rate.toFixed(2)}%</td><td className="r">{l.term * 12}</td><td>{date(maturity(l))}</td><td className="r">{money(monthlyPayment(l))}</td><td className="r">{money(l.balance)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <Empty title="Free & clear">No open mortgages are recorded against this property.</Empty>}
            </Section>
            <Section title="Transaction History">
              <table className="table">
                <thead><tr><th>Sale Date</th><th>Purchase Method</th><th>Document Type</th><th>Buyer Name(s)</th><th>Seller Name(s)</th><th className="r">Amount</th></tr></thead>
                <tbody>{p.sales.map((s) => <tr key={s.date}><td>{date(s.date)}</td><td>{s.cash ? 'Cash' : 'Financed'}</td><td>{s.docType}</td><td>{s.buyer}</td><td>{s.seller}</td><td className="r">{money(s.price)}</td></tr>)}</tbody>
              </table>
            </Section>
            <Section title="Foreclosure, Liens & Filings">
              <Fields rows={[['Foreclosure Status', p.fcStatus], ['Recording Date', date(p.fcDate)], ['Default Amount', money(p.defaultAmt)], ['Auction Date', date(p.auctionDate)], ['Opening Bid', money(p.openingBid)], ['Bankruptcy', p.bankruptcy ? `${p.bankruptcy} (${date(p.bankruptcyDate)})` : 'None'], ['Divorce Filed', date(p.divorceDate)]]} />
              {p.liens.length > 0 && (
                <table className="table">
                  <thead><tr><th>Lien Type</th><th>Recording Date</th><th>Lien Holder</th><th className="r">Amount</th></tr></thead>
                  <tbody>{p.liens.map((l, i) => <tr key={i}><td>{l.type}</td><td>{date(l.date)}</td><td>{l.holder}</td><td className="r">{money(l.amount)}</td></tr>)}</tbody>
                </table>
              )}
            </Section>
          </>
        )}

        {tab === 'Documents & Reports' && (
          <>
            <Section title="Reports">
              <table className="table">
                <thead><tr><th>Name</th><th>Description</th><th /></tr></thead>
                <tbody>
                  <tr><td>Property Detail</td><td>Printable report of the tab currently open, with the summary cards.</td><td className="r"><button className="link" onClick={() => window.print()}>Print</button></td></tr>
                  <tr><td>Property Data</td><td>All record fields as a spreadsheet row.</td><td className="r"><button className="link" onClick={() => downloadCsv(`${p.address}.csv`, propertyCsv([p], skip))}>Download CSV</button></td></tr>
                  <tr><td>Rental, Flip, Rehab &amp; ADU Analysis</td><td>Cash flow, profit and rehab calculators pre-filled from this property.</td><td className="r"><Link to={`/calculators?pid=${p.id}`}>Open</Link></td></tr>
                  <tr><td>Property Comps</td><td>Comparable sales and nearby listings.</td><td className="r"><button className="link" onClick={() => setTab(COMPS)}>Open</button></td></tr>
                </tbody>
              </table>
            </Section>
            <Section title="Documents"><DocList id={p.id} /></Section>
            <Section title="Notes"><Notes id={p.id} /></Section>
          </>
        )}
      </div>

      {modal === 'add' && <AddToListModal ids={[p.id]} onClose={() => setModal('')} />}
      {modal === 'summary' && (
        <Modal title={`Summary — ${p.address}`} onClose={() => setModal('')}>
          {summarize(p).map((line) => <p key={line}>{line}</p>)}
          <p className="muted">Generated from this record's fields.</p>
        </Modal>
      )}
      {modal === 'tags' && (
        <Modal title="Status / Tags" onClose={() => setModal('')}>
          <label className="field">
            <span>Lead status</span>
            <select value={status[p.id] ?? ''} onChange={(e) => setState((s) => ({ status: { ...s.status, [p.id]: e.target.value } }))}>
              <option value="">None</option>
              {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <div className="field"><span>Tags</span><TagEditor id={p.id} /></div>
        </Modal>
      )}
    </div>
  );
}

const TILES = ['cashBuyers', 'preForeclosure', 'bankOwned', 'liens', 'highEquity', 'vacant', 'freeClear', 'bankruptcy', 'divorce', 'flippers'];

function Comps({ p }: { p: Property }) {
  const nav = useNavigate();
  const [radius, setRadius] = useState(1);
  const [months, setMonths] = useState(12);
  const [sizePct, setSizePct] = useState(25);
  const [sameType, setSameType] = useState(true);
  const [beds, setBeds] = useState('');
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [tile, setTile] = useState('');

  const { around, comps, listings } = useMemo(() => {
    const cutoff = new Date(REF - months * 30.44 * 86400000).toISOString().slice(0, 10);
    const around = allProperties()
      .filter((c) => c.id !== p.id && c.zip.slice(0, 2) === p.zip.slice(0, 2))
      .map((c) => ({ c, d: distanceMiles(p, c) }))
      .filter((x) => x.d <= radius)
      .sort((a, b) => a.d - b.d);
    const similar = around.filter((x) => (!sameType || x.c.type === p.type) && (!p.sqft || Math.abs(x.c.sqft - p.sqft) / p.sqft <= sizePct / 100) && (!beds || x.c.beds >= +beds));
    return {
      around,
      comps: similar.filter((x) => x.c.lastSaleDate >= cutoff).slice(0, 25),
      listings: similar.filter((x) => x.c.mlsStatus === 'Active' || x.c.mlsStatus === 'Pending').slice(0, 25),
    };
  }, [p, radius, months, sizePct, sameType, beds]);

  const used = comps.filter((x) => !excluded.has(x.c.id));
  const avg = (f: (c: Property) => number) => (used.length ? used.reduce((s, x) => s + f(x.c), 0) / used.length : 0);
  const ppsf = avg((c) => (c.sqft ? c.lastSalePrice / c.sqft : 0));
  const compValue = p.sqft && ppsf ? ppsf * p.sqft : avg((c) => c.lastSalePrice);
  const doms = used.map((x) => x.c.dom).filter((d): d is number => d != null);
  const tileList = LEAD_LISTS.find((l) => l.key === tile);
  const shown = tile === 'neighbors' ? around : tileList ? around.filter((x) => tileList.test(x.c)) : [];

  const points: MapPoint[] = [
    { id: p.id, lat: p.lat, lng: p.lng, color: '#1b2536', label: `Subject: ${p.address}`, big: true },
    ...used.map((x) => ({ id: x.c.id, lat: x.c.lat, lng: x.c.lng, color: '#1a73c7', label: `Sold ${money(x.c.lastSalePrice)} · ${x.c.address}` })),
    ...listings.map((x) => ({ id: x.c.id, lat: x.c.lat, lng: x.c.lng, color: '#1e8e3e', label: `Listed ${money(x.c.listPrice)} · ${x.c.address}` })),
  ];

  return (
    <>
      <div className="tiles">
        <button className={`tile${tile === '' ? ' on' : ''}`} onClick={() => setTile('')}><b>{comps.length}</b><span>Comparables</span></button>
        <button className={`tile${tile === 'neighbors' ? ' on' : ''}`} onClick={() => setTile('neighbors')}><b>{around.length}</b><span>Neighbors</span></button>
        {TILES.map((k) => {
          const l = LEAD_LISTS.find((x) => x.key === k)!;
          return <button key={k} className={`tile${tile === k ? ' on' : ''}`} onClick={() => setTile(k)}><b>{around.filter((x) => l.test(x.c)).length}</b><span>{l.name}</span></button>;
        })}
      </div>

      {tile ? (
        <Section title={`${tile === 'neighbors' ? 'Neighbors' : tileList!.name} within ${radius} mi (${shown.length})`} aside={<button className="btn sm" onClick={() => downloadCsv('neighbors.csv', propertyCsv(shown.map((x) => x.c)))}>Export</button>}>
          {shown.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Address</th><th>Owner</th><th>Type</th><th className="r">Dist.</th><th className="r">Est. Value</th><th className="r">Equity</th><th>Last Sale</th></tr></thead>
                <tbody>{shown.slice(0, 100).map(({ c, d }) => <tr key={c.id}><td><Link to={`/property/${c.id}`}>{c.address}</Link></td><td>{c.ownerName}</td><td>{c.type}</td><td className="r">{d.toFixed(2)} mi</td><td className="r">{money(c.estValue)}</td><td className="r">{c.equityPct}%</td><td>{date(c.lastSaleDate)}</td></tr>)}</tbody>
              </table>
            </div>
          ) : <Empty title="None within this radius" />}
        </Section>
      ) : (
        <>
          <div className="comp-controls">
            <label>Distance<select value={radius} onChange={(e) => setRadius(+e.target.value)}>{[0.25, 0.5, 1, 2, 5].map((r) => <option key={r} value={r}>{r} mi</option>)}</select></label>
            <label>Sold within<select value={months} onChange={(e) => setMonths(+e.target.value)}>{[3, 6, 12, 24, 36].map((m) => <option key={m} value={m}>{m} months</option>)}</select></label>
            <label>Square footage<select value={sizePct} onChange={(e) => setSizePct(+e.target.value)}>{[10, 25, 50, 100].map((s) => <option key={s} value={s}>± {s}%</option>)}</select></label>
            <label>Bedrooms<select value={beds} onChange={(e) => setBeds(e.target.value)}><option value="">Any</option>{[1, 2, 3, 4, 5].map((b) => <option key={b} value={b}>{b}+</option>)}</select></label>
            <label className="check"><input type="checkbox" checked={sameType} onChange={(e) => setSameType(e.target.checked)} />Same property type</label>
          </div>
          <Fields rows={[['Comp-Based Value', used.length ? money(compValue) : null], ['Avg. Sale Price', used.length ? money(avg((c) => c.lastSalePrice)) : null], ['Avg. $ / SqFt', ppsf ? money(ppsf) : null], ['Avg. Days on Market', doms.length ? Math.round(doms.reduce((a, b) => a + b, 0) / doms.length) : null], ['Estimated Value', money(p.estValue)], ['Comps Used', `${used.length} of ${comps.length}`]]} />
          <div className="two-col comps">
            <div className="mini-map tall"><MapView points={points} fitKey={`${p.id}${radius}${months}${sizePct}${sameType}${beds}`} onPick={(id) => id !== p.id && nav(`/property/${id}`)} quiet /></div>
            <div>
              <Section title={`Comparable Properties (${comps.length})`} aside={<button className="btn sm" disabled={!used.length} onClick={() => downloadCsv('comps.csv', propertyCsv(used.map((x) => x.c)))}>Export</button>}>
                {comps.length ? (
                  <table className="table">
                    <thead><tr><th>Use</th><th>Address</th><th className="r">Dist.</th><th>Sold</th><th className="r">Amount</th><th className="r">Bd/Ba</th><th className="r">SqFt</th><th className="r">$/SqFt</th></tr></thead>
                    <tbody>
                      {comps.map(({ c, d }) => (
                        <tr key={c.id} className={excluded.has(c.id) ? 'dim' : ''}>
                          <td><input type="checkbox" aria-label={`Use ${c.address}`} checked={!excluded.has(c.id)} onChange={() => setExcluded((s) => { const n = new Set(s); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })} /></td>
                          <td><Link to={`/property/${c.id}`}>{c.address}</Link></td>
                          <td className="r">{d.toFixed(2)} mi</td><td>{date(c.lastSaleDate)}</td><td className="r">{money(c.lastSalePrice)}</td><td className="r">{c.beds}/{c.baths}</td><td className="r">{num(c.sqft)}</td><td className="r">{c.sqft ? money(c.lastSalePrice / c.sqft) : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : <Empty title="No comparable sales">Widen the distance, time window, or size range.</Empty>}
              </Section>
              <Section title={`Nearby Listings (${listings.length})`}>
                {listings.length ? (
                  <table className="table">
                    <thead><tr><th>Address</th><th>Status</th><th className="r">Dist.</th><th className="r">List Price</th><th className="r">DOM</th><th className="r">SqFt</th></tr></thead>
                    <tbody>{listings.map(({ c, d }) => <tr key={c.id}><td><Link to={`/property/${c.id}`}>{c.address}</Link></td><td>{c.mlsStatus}</td><td className="r">{d.toFixed(2)} mi</td><td className="r">{money(c.listPrice)}</td><td className="r">{num(c.dom)}</td><td className="r">{num(c.sqft)}</td></tr>)}</tbody>
                  </table>
                ) : <Empty title="No active listings nearby" />}
              </Section>
            </div>
          </div>
        </>
      )}
    </>
  );
}
