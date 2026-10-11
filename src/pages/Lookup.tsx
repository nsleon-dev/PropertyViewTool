import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AiRating } from '../components/AiRating';
import { Demographics, DocList, Fields, Notes, Section, TagEditor, TopCards } from '../components/detail';
import { StreetView } from '../components/GoogleMap';
import { MapView, useGoogleReady } from '../components/MapView';
import { Empty, Icon, Modal, StarButton, toast } from '../components/ui';
import { areaContext } from '../lib/ai';
import { money } from '../lib/format';
import { coveredAreas, lookupParcel, pick, type ParcelResult } from '../lib/parcels';
import { lookupEstimates, lookupRecord, type ExternalRecord } from '../lib/provider';
import { LEAD_STATUSES, dataKey, setState, spotId, uid, useStore } from '../lib/store';

const TABS = ['Property Details', 'Intelligence', 'Demographics', 'Tax Information', 'Sales History', 'Documents & Reports'];
const amount = (text: string | null) => (text ? Number(text.replace(/[^0-9.]/g, '')) || null : null);

// Full-page view of a real address: the public assessor record, census demographics,
// and (with a property data key) building facts, sales and estimates.
export function Lookup() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  const address = params.get('address') ?? '';
  const id = spotId(lat, lng);
  const { status } = useStore();
  const key = dataKey();
  const hasGoogle = useGoogleReady();

  const [tab, setTab] = useState(TABS[0]);
  const [parcel, setParcel] = useState<ParcelResult | null>(null);
  const [error, setError] = useState('');
  const [ext, setExt] = useState<ExternalRecord | null>(null);
  const [estimates, setEstimates] = useState<[string, string][] | null>(null);
  const [busy, setBusy] = useState(false);
  const [tagging, setTagging] = useState(false);

  useEffect(() => {
    let live = true;
    setParcel(null);
    setExt(null);
    setEstimates(null);
    lookupParcel(lat, lng, address || undefined).then((r) => live && setParcel(r), (e) => live && setError(e instanceof Error ? e.message : 'The public record service could not be reached.'));
    return () => {
      live = false;
    };
  }, [lat, lng, address]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (!lat && !lng)) return <div className="page"><Empty title="No location given"><Link to="/">Back to search</Link></Empty></div>;

  const rec = parcel?.status === 'found' ? parcel.record : null;
  const rows = rec?.rows ?? [];
  const title = address || rec?.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const f = ext?.facts;
  const assessed = amount(pick(rows, /^total value|^parval|full cash|market total|total market|^total.*val/i));
  const estValue = amount(estimates?.find(([k]) => k === 'Estimated Value')?.[1] ?? null);
  const rent = amount(estimates?.find(([k]) => k === 'Estimated Rent')?.[1] ?? null);
  const salePrice = f?.lastSalePrice ?? amount(pick(rows, /sale.?price/i));
  const saleDate = f?.lastSaleDate ? new Date(f.lastSaleDate).toLocaleDateString() : pick(rows, /sale.?date/i);
  const lot = f?.lotSize ? `${f.lotSize.toLocaleString()}` : pick(rows, /sq.? ?f(ee)?t|land.?size|stated ?area/i);
  const owner = rec?.owner ?? ext?.ownerName ?? null;
  const taxLike = rows.filter(([k]) => /value|tax|assess|exempt|district/i.test(k));

  const load = async (what: 'record' | 'estimates') => {
    setBusy(true);
    try {
      if (what === 'record') {
        const r = await lookupRecord(address || rec?.address || '', key);
        if (r) setExt(r);
        else toast('No building record was found for this address.');
      } else setEstimates(await lookupEstimates(address || rec?.address || '', key));
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Lookup failed.');
    }
    setBusy(false);
  };

  return (
    <div className="page detail">
      <header className="detail-head">
        <button className="icon-btn no-print" onClick={() => nav(-1)} aria-label="Back"><Icon name="back" /></button>
        <div className="grow">
          <h1>{title}</h1>
          <div className="muted">{rec ? `Public record · ${rec.source}${rec.nearest ? ' · nearest parcel to this point' : ''}` : parcel ? 'No public parcel record for this location' : error || 'Loading public record…'}</div>
        </div>
        <div className="detail-actions no-print">
          <StarButton item={{ id, address: title, lat, lng, real: true }} />
          <button className="btn pill primary" onClick={() => setTagging(true)}>Status / Tags{status[id] ? ` · ${status[id]}` : ''}</button>
          <button className="btn pill" onClick={() => window.print()}>Print</button>
          <Link className="btn pill" to="/calculators">Analysis</Link>
          {owner && (
            <button className="btn pill" onClick={() => { setState((s) => ({ contacts: [...s.contacts, { id: uid(), name: owner, phone: '', email: '', type: 'Owner', notes: title }] })); toast(`Saved ${owner} to Contacts`); }}>Save Owner</button>
          )}
        </div>
      </header>

      <TopCards
        photo={hasGoogle ? <StreetView lat={lat} lng={lng} /> : <div className="thumb thumb-lg photo-none">Street View needs a Google Maps key</div>}
        beds={f?.beds ?? null}
        baths={f?.baths ?? null}
        left={[['SqFt', f?.sqft?.toLocaleString() ?? null], ['Lot Size', lot], ['Year Built', f?.yearBuilt ?? pick(rows, /year.?built|const.?year/i)], ['APN', pick(rows, /parcel id|^apn|parno|parcelid|dashpin|^pin$/i)]]}
        right={[['Property Type', f?.type ?? pick(rows, /class ?d|use ?desc|parusedesc|comm ?res/i)], ['Owner', owner], ['Mailing City', pick(rows, /mail.*city|^mcity/i)], ['Zoning', pick(rows, /zoning class|zone ?name|^zoning/i)], ['Subdivision', pick(rows, /subdiv|subname/i)], ['Acres', pick(rows, /^acres|gisacres/i)], ['Legal', pick(rows, /legal/i)]]}
        value={{ label: estValue ? 'Estimated Value' : 'Assessor Total Value', amount: estValue ?? assessed, note: estValue ? undefined : assessed ? 'Assessed for tax purposes; market value is usually higher.' : undefined, points: (f?.sales ?? []).filter((s) => s.price).reverse().map((s) => ({ label: s.date.slice(0, 4), value: s.price! })) }}
        debt={[['Open Mortgages', null], ['Estimated Balance', null], ['Involuntary Liens', null], ['Involuntary Amount', null]]}
        debtNote="Mortgage and lien records are not published by public assessor sources."
        sale={[['Sale Price', salePrice ? money(salePrice) : null], ['Sale Date', saleDate]]}
        equity={{ amount: null, pct: null }}
        opportunity={[['Est. Wholesale Price', estValue ? money(estValue * 0.7) : null], ['Monthly Rent', rent ? money(rent) : null], ['Gross Yield', rent && estValue ? `${((rent * 1200) / estValue).toFixed(1)}%` : null]]}
      />

      <div className="tabs no-print" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t}</button>)}
      </div>

      <div className="tab-body">
        {tab === 'Property Details' && (
          <>
            {parcel?.status === 'uncovered' && <Empty title="No free public parcel source for this area yet">Currently covered: {coveredAreas()}.</Empty>}
            {parcel?.status === 'empty' && <Empty title="No parcel at this exact spot">{parcel.source} returned nothing here. Go back and click directly on the lot.</Empty>}
            {error && <Empty title="Public record unavailable">{error}</Empty>}
            <div className="two-col">
              <div>
                {rec && (
                  <Section title="Public Record" aside={<span className="muted">{rec.source}</span>}>
                    <Fields rows={rows} />
                    {rec.links.length > 0 && <p className="info-links">{rec.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</p>}
                  </Section>
                )}
              </div>
              <div className="mini-map"><MapView points={[{ id, lat, lng, color: '#f26b21', label: title, big: true }]} fitKey={id} outline={rec?.outline} quiet /></div>
            </div>
            <Section title="Building, Sales & Estimates" aside={key && <span className="row no-print"><button className="btn sm primary" disabled={busy} onClick={() => load('record')}>{busy ? 'Loading…' : 'Load Building & Sales Data'}</button><button className="btn sm" disabled={busy} onClick={() => load('estimates')}>Value &amp; Rent Estimate</button></span>}>
              {!key && <p className="muted">Bedrooms, bathrooms, living area, sale history and value/rent estimates come from the optional property data key under <Link to="/account">Account</Link>. County assessor layers do not publish them.</p>}
              {estimates && <Fields rows={estimates} />}
              {ext?.sections.map((s) => <div key={s.title}><h4>{s.title}</h4><Fields rows={s.rows} /></div>)}
            </Section>
          </>
        )}

        {tab === 'Intelligence' && (
          <>
            <AiRating
              id={id}
              loading={!parcel && !error}
              facts={async () => ({
                address: title,
                // Owner name and mailing rows stay out of the request.
                publicAssessorRecord: Object.fromEntries(rows.filter(([k]) => !/owner|mail|name/i.test(k))),
                building: f ? { ...f, sales: f.sales.slice(0, 10) } : null,
                estimates: estimates ? Object.fromEntries(estimates) : null,
                mortgagesAndLiens: null,
                neighbourhood: await areaContext(lat, lng),
              })}
            />
            <Section title="What the rating can see">
              <Fields rows={[['Public assessor record', rec ? `${rows.length} fields` : null], ['Building & sale history', f ? 'Loaded' : key ? 'Not loaded yet' : null], ['Value & rent estimates', estimates ? 'Loaded' : key ? 'Not loaded yet' : null], ['Mortgages & liens', null], ['Neighbourhood (1 mile)', 'Census ACS']]} />
              <p className="muted">{key ? 'Load the building data and estimates on the Property Details tab first; the rating uses whatever is loaded when you press the button.' : 'Add the property data key under Account for building facts, sales and estimates.'} Mortgage and lien records have no source here, so the model is told they are unknown.</p>
            </Section>
          </>
        )}

        {tab === 'Demographics' && <Demographics lat={lat} lng={lng} />}

        {tab === 'Tax Information' && (
          <Section title="Tax Details">
            {taxLike.length ? <Fields rows={[['Primary Owner', owner], ...taxLike]} /> : <p className="muted">No assessment values in the public record for this parcel.</p>}
            {rec && rec.links.length > 0 && <p className="info-links">{rec.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</p>}
            {f && f.taxes.length > 0 ? (
              <table className="table narrow">
                <thead><tr><th>Year</th><th className="r">Property Taxes</th><th className="r">Tax Assessment</th></tr></thead>
                <tbody>{f.taxes.map((t) => <tr key={t.year}><td>{t.year}</td><td className="r">{money(t.tax)}</td><td className="r">{money(t.assessed)}</td></tr>)}</tbody>
              </table>
            ) : <p className="muted">Year-by-year tax history is on the county tax page linked above where available{key ? ', or load the building & sales data on the Property Details tab' : ''}.</p>}
          </Section>
        )}

        {tab === 'Sales History' && (
          <Section title="Transaction History">
            {f && f.sales.length > 0 ? (
              <table className="table narrow">
                <thead><tr><th>Date</th><th>Event</th><th className="r">Amount</th></tr></thead>
                <tbody>{f.sales.map((s) => <tr key={s.date + s.event}><td>{new Date(s.date).toLocaleDateString()}</td><td>{s.event}</td><td className="r">{money(s.price)}</td></tr>)}</tbody>
              </table>
            ) : salePrice || saleDate ? <Fields rows={[['Last Sale Price', salePrice ? money(salePrice) : null], ['Last Sale Date', saleDate]]} /> : <p className="muted">This county's public layer does not include sales. {key ? 'Load the building & sales data on the Property Details tab.' : 'Sale history needs the optional property data key under Account.'} Mortgage records are not available from either source.</p>}
          </Section>
        )}

        {tab === 'Documents & Reports' && (
          <>
            <Section title="Documents"><DocList id={id} fixed={rec?.links} /></Section>
            <Section title="Notes"><Notes id={id} /></Section>
          </>
        )}
      </div>

      {tagging && (
        <Modal title="Status / Tags" onClose={() => setTagging(false)}>
          <label className="field">
            <span>Lead status</span>
            <select value={status[id] ?? ''} onChange={(e) => setState((s) => ({ status: { ...s.status, [id]: e.target.value } }))}>
              <option value="">None</option>
              {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <div className="field"><span>Tags</span><TagEditor id={id} /></div>
        </Modal>
      )}
    </div>
  );
}
