import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { runSkipTrace } from '../lib/actions';
import { allProperties, distanceMiles, getProperty, type Property } from '../lib/data';
import { date, money, num, tags } from '../lib/format';
import { coveredAreas, lookupParcel, type ParcelRecord, type ParcelResult } from '../lib/parcels';
import { usePlace } from '../lib/place';
import { lookupEstimates, lookupRecord, type ExternalRecord } from '../lib/provider';
import { dataKey, setState, spotId, uid, useStore } from '../lib/store';
import { StreetView } from './GoogleMap';
import { googleReady } from './MapView';
import { AddToListModal, Icon, StarButton, Tag, Thumb, toast } from './ui';

export type Focus = { kind: 'record'; id: string } | { kind: 'spot'; lat: number; lng: number; address?: string };

interface Props {
  focus: Focus;
  onClose: () => void;
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
  onOpenRecord: (id: string) => void;
  onParcel: (outline: ParcelRecord['outline'] | null) => void; // parcel boundary to draw on the map
}

function Rows({ rows }: { rows: [string, string | number][] }) {
  return (
    <dl className="info-rows">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function InfoPanel({ focus, onClose, isSelected, onToggle, onOpenRecord, onParcel }: Props) {
  const p = focus.kind === 'record' ? getProperty(focus.id) : undefined;
  return (
    <aside className="info-panel" aria-label="Property information">
      <button className="icon-btn info-close" onClick={onClose} aria-label="Close property information"><Icon name="close" /></button>
      {p ? <RecordInfo p={p} selected={isSelected(p.id)} onToggle={() => onToggle(p.id)} /> : focus.kind === 'spot' ? <SpotInfo lat={focus.lat} lng={focus.lng} known={focus.address} onOpenRecord={onOpenRecord} onParcel={onParcel} /> : null}
    </aside>
  );
}

function RecordInfo({ p, selected, onToggle }: { p: Property; selected: boolean; onToggle: () => void }) {
  const { skip } = useStore();
  const [adding, setAdding] = useState(false);
  const traced = skip[p.id];
  const land = p.type === 'Vacant Land';
  return (
    <>
      <StarButton className="info-star" item={{ id: p.id, address: `${p.address}, ${p.city}, ${p.state} ${p.zip}`, lat: p.lat, lng: p.lng, real: false }} />
      <Thumb p={p} size="lg" />
      <div className="info-body">
        <h2>{p.address}</h2>
        <div className="muted">{p.city}, {p.state} {p.zip} · {p.county} County</div>
        <div className="tags">{tags(p).map((t) => <Tag key={t.text} {...t} />)}</div>

        <div className="info-actions">
          <button className={`btn sm${selected ? ' on' : ''}`} onClick={onToggle} aria-pressed={selected}>{selected ? '✓ Selected' : 'Select'}</button>
          <button className="btn sm primary" onClick={() => setAdding(true)}>Save to List</button>
          <button className="btn sm" onClick={() => toast(runSkipTrace([p.id]).msg)}>Skip Trace</button>
        </div>

        <div className="info-stats">
          <div><span>Est. Value</span><b>{money(p.estValue)}</b></div>
          <div><span>Equity</span><b className={p.equity < 0 ? 'neg' : ''}>{money(p.equity)} ({p.equityPct}%)</b></div>
          <div><span>Loan Balance</span><b>{money(p.mortgageBalance)}</b></div>
          <div><span>Est. Rent</span><b>{land ? '—' : `${money(p.rentEst)}/mo`}</b></div>
        </div>

        <h3>Property</h3>
        <Rows rows={[['Type', p.type], ['Beds / Baths', land ? '—' : `${p.beds} / ${p.baths}`], ['Building Size', p.sqft ? `${num(p.sqft)} sq ft` : '—'], ['Lot Size', p.lotSqft ? `${num(p.lotSqft)} sq ft` : '—'], ['Year Built', p.yearBuilt || '—'], ['APN', p.apn]]} />
        <h3>Owner</h3>
        <Rows rows={[['Owner', p.owner2 ? `${p.ownerName}, ${p.owner2}` : p.ownerName], ['Occupancy', p.vacant && !land ? `Vacant · ${p.occupancy}` : p.occupancy], ['Mailing Address', `${p.mailAddress}, ${p.mailCity}, ${p.mailState} ${p.mailZip}`], ['Years Owned', p.yearsOwned], ['Phone', traced ? traced.phones.map((ph) => ph.number).join(', ') : 'Not skip traced']]} />
        <h3>Sale &amp; Status</h3>
        <Rows rows={[['Last Sale', `${money(p.lastSalePrice)} on ${date(p.lastSaleDate)}`], ['MLS Status', p.listPrice && p.mlsStatus !== 'Sold' ? `${p.mlsStatus} · ${money(p.listPrice)}` : p.mlsStatus], ['Foreclosure', p.fcStatus], ['Liens', p.liens.length ? `${p.liens.length} · ${money(p.lienAmount)}` : 'None'], ['Annual Tax', `${money(p.taxAmount)}${p.taxDelinquent ? ' · delinquent' : ''}`]]} />

        <Link className="btn primary block" to={`/property/${p.id}`}>View Full Details</Link>
      </div>
      {adding && <AddToListModal ids={[p.id]} onClose={() => setAdding(false)} />}
    </>
  );
}

function SpotInfo({ lat, lng, known, onOpenRecord, onParcel }: { lat: number; lng: number; known?: string } & Pick<Props, 'onOpenRecord' | 'onParcel'>) {
  useStore();
  const key = dataKey();
  const hasGoogle = googleReady();
  const [address, setAddress] = useState('');
  const [geoNote, setGeoNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [record, setRecord] = useState<ExternalRecord | null | undefined>(undefined); // undefined = not looked up yet
  const [estimates, setEstimates] = useState<[string, string][] | null>(null);
  const [error, setError] = useState('');
  const [parcel, setParcel] = useState<ParcelResult | 'loading' | { status: 'error'; msg: string }>('loading');

  // The public assessor record is free, so it is fetched as soon as a spot is picked.
  useEffect(() => {
    let live = true;
    setParcel('loading');
    onParcel(null);
    lookupParcel(lat, lng, known).then(
      (r) => {
        if (!live) return;
        setParcel(r);
        if (r.status === 'found') onParcel(r.record.outline);
      },
      (e) => live && setParcel({ status: 'error', msg: e instanceof Error ? e.message : 'The public record service could not be reached.' }),
    );
    return () => {
      live = false;
      onParcel(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);
  const pub = typeof parcel === 'object' && parcel.status === 'found' ? parcel.record : null;
  const place = usePlace(lat, lng);

  useEffect(() => {
    let live = true;
    setAddress(known ?? '');
    setRecord(undefined);
    setEstimates(null);
    setError('');
    // Reached by searching for an address: nothing to reverse-geocode.
    if (known) return setGeoNote('');
    setGeoNote(hasGoogle ? 'Finding address…' : 'Add a Google Maps key under Account to detect the address automatically, or type it below.');
    if (!hasGoogle) return;
    new google.maps.Geocoder()
      .geocode({ location: { lat, lng } })
      .then(({ results }) => {
        if (!live) return;
        const best = results.find((r) => r.types.some((t) => t === 'street_address' || t === 'premise' || t === 'subpremise')) ?? results[0];
        setAddress(best ? best.formatted_address.replace(/, USA$/, '') : '');
        setGeoNote(best ? '' : 'No street address found at this spot.');
      })
      .catch(() => live && setGeoNote('Address lookup failed. Make sure the Geocoding API is enabled for your Google key, or type the address below.'));
    return () => {
      live = false;
    };
  }, [lat, lng, known, hasGoogle]);

  const nearby = useMemo(
    () => allProperties().map((p) => ({ p, d: distanceMiles({ lat, lng }, p) })).filter((x) => x.d <= 0.25).sort((a, b) => a.d - b.d).slice(0, 4),
    [lat, lng],
  );

  const run = async (what: 'record' | 'estimates') => {
    setBusy(true);
    setError('');
    try {
      if (what === 'record') setRecord(await lookupRecord(address.trim(), key));
      else setEstimates(await lookupEstimates(address.trim(), key));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Lookup failed.');
    }
    setBusy(false);
  };

  return (
    <>
      <StarButton className="info-star" item={{ id: spotId(lat, lng), address: address || pub?.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng, real: true }} />
      {hasGoogle && <StreetView lat={lat} lng={lng} />}
      <div className="info-body">
        <h2>{address || pub?.address || 'Selected location'}</h2>
        <div className="muted">{lat.toFixed(5)}, {lng.toFixed(5)}</div>
        {geoNote && <p className="muted">{geoNote}</p>}
        <Link className="btn primary block" to={`/lookup?lat=${lat}&lng=${lng}&address=${encodeURIComponent(address || pub?.address || '')}`}>View Full Details</Link>

        <h3>Public Record</h3>
        {parcel === 'loading' && <p className="muted">Looking up the assessor record…</p>}
        {typeof parcel === 'object' && parcel.status === 'error' && <p className="neg">{parcel.msg}</p>}
        {typeof parcel === 'object' && parcel.status === 'empty' && <p className="muted">{parcel.source} has no parcel at this spot. Click directly on a lot or building.</p>}
        {typeof parcel === 'object' && parcel.status === 'uncovered' && (
          <p className="info-hint">No free public parcel source is set up for this area yet. Currently covered: {coveredAreas()}.</p>
        )}
        {pub && (
          <>
            {pub.owner && <div className="info-owner"><span>Owner of record</span><b>{pub.owner}</b></div>}
            <Rows rows={pub.rows} />
            {pub.links.length > 0 && <p className="info-links">{pub.links.map((l) => <a key={l.href} href={l.href} target="_blank" rel="noreferrer">{l.label} ↗</a>)}</p>}
            <p className="muted">Source: {pub.source}{pub.nearest ? ' · nearest parcel to this point' : ''}</p>
            {pub.owner && (
              <button
                className="btn sm"
                onClick={() => {
                  setState((s) => ({ contacts: [...s.contacts, { id: uid(), name: pub.owner!, phone: '', email: '', type: 'Owner', notes: address || pub.address || '' }] }));
                  toast(`Saved ${pub.owner} to Contacts`);
                }}
              >
                Save Owner to Contacts
              </button>
            )}
          </>
        )}

        <h3>Location Facts</h3>
        {!place ? <p className="muted">Looking up flood zone and districts…</p> : place.length ? <Rows rows={place} /> : <p className="muted">No location facts could be loaded.</p>}

        <h3>Building, Sales &amp; Estimates</h3>
        <label className="field">
          <span>Address to look up</span>
          <input value={address} onChange={(e) => { setAddress(e.target.value); setRecord(undefined); setEstimates(null); }} placeholder="123 Main St, City, ST 12345" />
        </label>
        {key ? (
          <div className="info-actions">
            <button className="btn sm primary" disabled={busy || !address.trim()} onClick={() => run('record')}>{busy ? 'Looking up…' : 'Look Up Property Record'}</button>
            <button className="btn sm" disabled={busy || !address.trim()} onClick={() => run('estimates')}>Value &amp; Rent Estimate</button>
          </div>
        ) : (
          <p className="muted">
            Bedrooms, bathrooms, sale history and value/rent estimates for any US address come from the optional property data key under <Link to="/account">Account</Link>.
          </p>
        )}
        {error && <p className="neg">{error}</p>}
        {record === null && <p className="muted">No property record was found for that address.</p>}

        {estimates && <><h3>Estimates</h3><Rows rows={estimates} /></>}
        {record?.sections.map((s) => (
          <div key={s.title}><h3>{s.title}</h3><Rows rows={s.rows} /></div>
        ))}
        {record?.ownerName && (
          <button
            className="btn sm"
            onClick={() => {
              setState((s) => ({ contacts: [...s.contacts, { id: uid(), name: record.ownerName!, phone: '', email: '', type: 'Owner', notes: record.address }] }));
              toast(`Saved ${record.ownerName} to Contacts`);
            }}
          >
            Save Owner to Contacts
          </button>
        )}

        {nearby.length > 0 && (
          <>
            <h3>Sample records nearby</h3>
            {nearby.map(({ p, d }) => (
              <button key={p.id} className="pick-row" onClick={() => onOpenRecord(p.id)}>
                <span>{p.address}</span>
                <span className="muted">{money(p.estValue)} · {d.toFixed(2)} mi</span>
              </button>
            ))}
          </>
        )}
      </div>
    </>
  );
}
