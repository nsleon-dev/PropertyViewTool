import { useEffect, useState } from 'react';
import { money } from '../lib/format';
import { listParcels, lookupParcel, pick, type ParcelItem, type ParcelRecord } from '../lib/parcels';
import { lookupEstimates, lookupNearby, type Neighbor } from '../lib/provider';
import { dataKey, spotId } from '../lib/store';
import { StreetView } from './GoogleMap';
import { useGoogleReady } from './MapView';
import { Icon, StarButton } from './ui';

export interface Target {
  lat: number;
  lng: number;
  address: string;
}
interface Props {
  lat: number;
  lng: number;
  known?: string; // set when reached by searching an address
  onClose: () => void;
  onOpen: (t: Target) => void; // full details pop-up
  onParcel: (outline: ParcelRecord['outline'] | null) => void;
}

const amount = (text: string | null | undefined) => (text ? Number(text.replace(/[^0-9.]/g, '')) || null : null);
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit', year: 'numeric', timeZone: 'UTC' }) : null);
const dash = <span className="na">–</span>;
const houseKey = (a: string) => a.toUpperCase().match(/^\s*(\d+)\s+(?:[NSEW]\s+)?([A-Z0-9]+)/)?.slice(1).join(' ') ?? '';

// The searched or clicked property with the properties around it: a summary card on top
// and a neighbours table below. Addresses open the full details pop-up.
export function SubjectPanel({ lat, lng, known, onClose, onOpen, onParcel }: Props) {
  const key = dataKey();
  const hasGoogle = useGoogleReady();
  const [address, setAddress] = useState(known ?? '');
  const [parcel, setParcel] = useState<ParcelRecord | null>(null);
  const [near, setNear] = useState<Neighbor[] | null>(null);
  const [lots, setLots] = useState<ParcelItem[] | null>(null);
  const [est, setEst] = useState<[string, string][] | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setAddress(known ?? '');
    setParcel(null);
    setNear(null);
    setLots(null);
    setEst(null);
    setNote('');
    onParcel(null);
    lookupParcel(lat, lng, known).then((r) => {
      if (!live || r.status !== 'found') return;
      setParcel(r.record);
      onParcel(r.record.outline);
    }, () => undefined);
    if (!known && hasGoogle)
      new google.maps.Geocoder().geocode({ location: { lat, lng } }).then(({ results }) => {
        const best = results.find((r) => r.types.some((t) => t === 'street_address' || t === 'premise' || t === 'subpremise')) ?? results[0];
        if (live && best) setAddress(best.formatted_address.replace(/, USA$/, ''));
      }, () => undefined);
    // One request returns the property and its neighbours with beds, baths and last sale.
    if (key) lookupNearby(lat, lng, key).then((r) => live && setNear(r), (e) => live && (setNear([]), setNote(e instanceof Error ? e.message : 'Nearby properties could not be loaded.')));
    else listParcels(lat, lng, 17).then((r) => live && setLots(r.items), () => live && setLots([]));
    return () => {
      live = false;
      onParcel(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, known, hasGoogle, key]);

  const title = address || parcel?.address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const want = houseKey(address || parcel?.address || '');
  const me = near?.find((n) => want && houseKey(n.street) === want) ?? (near?.[0] && near[0].miles < 0.02 ? near[0] : undefined);
  const others = (near ?? []).filter((n) => n !== me);
  const rows = parcel?.rows ?? [];
  const assessed = me?.assessed ?? amount(pick(rows, /^total value|^parval|full cash|just.*val|market.*val|total.*val|assess.*tot/i));
  const estValue = amount(est?.find(([k]) => k === 'Estimated Value')?.[1]);
  const lot = me?.lotSize ?? amount(pick(rows, /sq.? ?f(ee)?t|land.?size|stated ?area|lot.?size/i));
  const full = me?.address ?? title;
  const open = () => onOpen({ lat, lng, address: full });

  const estimate = async () => {
    setBusy(true);
    try {
      setEst(await lookupEstimates(full, key));
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'The estimate could not be loaded.');
    }
    setBusy(false);
  };

  return (
    <div className="subject">
      <div className="subject-photo">
        {hasGoogle ? <StreetView lat={lat} lng={lng} /> : <div className="subject-nophoto">Street View needs a Google Maps key</div>}
        <StarButton className="subject-star" item={{ id: spotId(lat, lng), address: full, lat, lng, real: true }} />
        <div className="subject-photo-actions">
          <button className="btn pill sm" onClick={open}>Details</button>
          <button className="icon-btn subject-close" onClick={onClose} aria-label="Close property"><Icon name="close" /></button>
        </div>
      </div>

      <div className="subject-card">
        <div className="subject-main">
          <div className="subject-value">
            <b>{estValue ? money(estValue) : assessed ? money(assessed) : '—'}</b>
            <span>{estValue ? 'EST. VALUE' : assessed ? 'ASSESSED VALUE' : 'NO VALUE ON RECORD'}</span>
          </div>
          <button className="link subject-addr" onClick={open}>{full}</button>
          <div className="subject-facts">
            <span><b>{me?.beds ?? '–'}</b> bd</span>
            <span><b>{me?.baths ?? '–'}</b> ba</span>
            <span><b>{me?.sqft?.toLocaleString() ?? '–'}</b> sqft</span>
            <span><b>{lot ? Math.round(lot).toLocaleString() : '–'}</b> lot</span>
          </div>
          {key && !est && <button className="btn sm" disabled={busy} onClick={estimate} title="Uses two requests from the property data plan">{busy ? 'Loading…' : 'Get Value & Rent Estimate'}</button>}
          {est && <div className="muted">Rent {est.find(([k]) => k === 'Estimated Rent')?.[1] ?? '—'} · range {est.find(([k]) => k === 'Value Range')?.[1] ?? '—'}</div>}
        </div>
        <dl className="subject-side">
          <div><dt>Owner</dt><dd>{parcel?.owner ?? me?.ownerName ?? dash}</dd></div>
          <div><dt>Owner Occupied</dt><dd>{me?.ownerOccupied == null ? dash : me.ownerOccupied ? 'Yes' : 'No'}</dd></div>
          <div><dt>Type</dt><dd>{me?.type ?? pick(rows, /class ?d|use ?desc|zoning class/i) ?? dash}</dd></div>
          <div><dt>Year Built</dt><dd>{me?.yearBuilt ?? pick(rows, /year.?built/i) ?? dash}</dd></div>
          <div><dt>Last Sale</dt><dd>{me?.salePrice ? `${money(me.salePrice)}${me.saleDate ? ` · ${day(me.saleDate)}` : ''}` : dash}</dd></div>
        </dl>
      </div>

      <div className="subject-nearby-head">
        <b>Nearby</b>
        <span className="chip lead">Neighbors ({key ? others.length : lots?.length ?? 0})</span>
        {key ? near === null && <span className="muted">Loading…</span> : lots === null && <span className="muted">Loading…</span>}
      </div>
      {note && <p className="error pad">{note}</p>}
      <div className="subject-table">
        <table className="table compact">
          <thead><tr><th>#</th><th>Address</th><th className="r">Beds</th><th className="r">Baths</th><th className="r">Assessed Value</th><th className="r">Sale Amount</th><th>Sale Date</th></tr></thead>
          <tbody>
            {key
              ? others.map((n, i) => (
                  <tr key={n.address}>
                    <td>{i + 1}</td>
                    <td><button className="link" onClick={() => onOpen({ lat: n.lat, lng: n.lng, address: n.address })}>{n.street}</button></td>
                    <td className="r">{n.beds ?? dash}</td>
                    <td className="r">{n.baths ?? dash}</td>
                    <td className="r">{n.assessed ? money(n.assessed) : dash}</td>
                    <td className="r">{n.salePrice ? money(n.salePrice) : dash}</td>
                    <td>{day(n.saleDate) ?? dash}</td>
                  </tr>
                ))
              : (lots ?? []).map((p, i) => (
                  <tr key={p.key}>
                    <td>{i + 1}</td>
                    <td><button className="link" onClick={() => onOpen({ lat: p.lat, lng: p.lng, address: p.address ?? '' })}>{p.address ?? p.id ?? 'Parcel'}</button></td>
                    <td className="r">{dash}</td>
                    <td className="r">{dash}</td>
                    <td className="r">{p.value ?? dash}</td>
                    <td className="r">{dash}</td>
                    <td>{dash}</td>
                  </tr>
                ))}
          </tbody>
        </table>
        {key && near && !others.length && !note && <p className="muted pad">No nearby properties were returned for this spot.</p>}
        {!key && <p className="muted pad">Beds, baths and sale history come from the property data service, which is not set up in this browser. Showing public parcel records only.</p>}
      </div>
    </div>
  );
}
