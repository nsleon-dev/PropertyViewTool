import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, Modal, Tag, toast } from '../components/ui';
import { getProperty, type Property } from '../lib/data';
import { date, downloadCsv, mergeFields } from '../lib/format';
import { POSTCARD_COST, log, setState, today, uid, useStore, type Campaign, type State } from '../lib/store';

const TYPES: Campaign['type'][] = ['Postcard', 'Email', 'Dialer', 'Landing Page'];
const DISPOSITIONS = ['No Answer', 'Left Voicemail', 'Wrong Number', 'Not Interested', 'Call Back', 'Interested', 'Do Not Call'];
const TEMPLATES: Record<Campaign['type'], { subject: string; body: string }> = {
  Postcard: { subject: 'We want to buy {address}', body: 'Hi {first_name},\n\nI am a local buyer interested in your property at {address} in {city}. I can pay cash, close on your timeline, and buy as-is — no repairs, no commissions.\n\nCall or text me for a no-obligation offer.' },
  Email: { subject: 'Quick question about {address}', body: 'Hi {first_name},\n\nI came across your property at {full_address} and wanted to ask whether you have considered selling. I buy homes directly and can make a fair cash offer.\n\nWould you be open to a short conversation this week?' },
  Dialer: { subject: 'Call script', body: 'Hi, is this {first_name}? I am calling about the property at {address}. I am a local investor — have you thought about selling it?' },
  'Landing Page': { subject: 'Sell Your House Fast for Cash', body: 'No repairs. No commissions. Close in as little as 7 days. Tell us about your property and get a fair cash offer within 24 hours.' },
};

const draft = (listId: string): Campaign => ({ id: '', name: '', type: 'Postcard', listId, ...TEMPLATES.Postcard, schedule: today(), status: 'Draft', recipients: 0, cost: 0, created: today(), calls: {} });

function audience(c: Campaign, s: State): Property[] {
  const list = s.lists.find((l) => l.id === c.listId);
  const props = (list?.propertyIds ?? []).map(getProperty).filter((p): p is Property => !!p);
  if (c.type === 'Email') return props.filter((p) => s.skip[p.id]?.emails.length);
  if (c.type === 'Dialer') return props.filter((p) => s.skip[p.id]?.phones.some((ph) => !ph.dnc));
  return props;
}

function landingHtml(c: Campaign) {
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(c.subject)}</title>
<style>body{margin:0;font:16px/1.5 system-ui,sans-serif;color:#1b2536;background:#f3f5f8}main{max-width:560px;margin:0 auto;padding:48px 20px}h1{font-size:34px;line-height:1.15;margin:0 0 12px}form{background:#fff;padding:24px;border-radius:10px;margin-top:24px;display:grid;gap:12px}input,button{font:inherit;padding:12px;border-radius:6px;border:1px solid #c5ccd6}button{background:#f26b21;color:#fff;border:0;font-weight:600;cursor:pointer}</style></head>
<body><main><h1>${esc(c.subject)}</h1><p>${esc(c.body).replace(/\n/g, '<br>')}</p>
<!-- Point this form at your own endpoint or form service to collect leads. -->
<form method="post" action="#"><input name="name" placeholder="Your name" required><input name="phone" placeholder="Phone" required><input name="email" type="email" placeholder="Email"><input name="address" placeholder="Property address" required><button>Get My Cash Offer</button></form></main></body></html>`;
}

export function Campaigns() {
  const s = useStore();
  const { campaigns, lists, wallet } = s;
  const [edit, setEdit] = useState<Campaign | null>(null);
  const [dialing, setDialing] = useState<string | null>(null);

  const recipients = edit ? audience(edit, s) : [];
  const sample = recipients[0];
  const cost = edit?.type === 'Postcard' ? Math.round(recipients.length * POSTCARD_COST * 100) / 100 : 0;

  const exportFile = (c: Campaign) => {
    const who = audience(c, s);
    if (c.type === 'Landing Page') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([landingHtml(c)], { type: 'text/html' }));
      a.download = `${c.name || 'landing-page'}.html`;
      a.click();
      return;
    }
    downloadCsv(`${c.name}-${c.type.toLowerCase()}.csv`, [
      ['Owner', 'Mailing Address', 'Mailing City', 'Mailing State', 'Mailing Zip', 'Email', 'Phone', 'Property Address', 'Subject', 'Message'],
      ...who.map((p) => [p.ownerName, p.mailAddress, p.mailCity, p.mailState, p.mailZip, s.skip[p.id]?.emails[0], s.skip[p.id]?.phones.find((ph) => !ph.dnc)?.number, p.address, mergeFields(c.subject, p), mergeFields(c.body, p)]),
    ]);
  };

  const launch = () => {
    if (!edit) return;
    if (cost > wallet) return toast(`Wallet balance $${wallet.toFixed(2)} is below the $${cost.toFixed(2)} needed.`);
    const status: Campaign['status'] = edit.type === 'Dialer' || edit.type === 'Landing Page' ? 'Active' : edit.schedule > today() ? 'Scheduled' : 'Sent';
    const c: Campaign = { ...edit, id: edit.id || uid(), name: edit.name.trim() || `${edit.type} campaign`, status, recipients: recipients.length, cost };
    setState((cur) => ({ campaigns: [c, ...cur.campaigns.filter((x) => x.id !== c.id)], wallet: Math.round((cur.wallet - cost) * 100) / 100 }));
    log(`Launched ${c.type.toLowerCase()} campaign "${c.name}" to ${c.recipients.toLocaleString()} recipients`);
    if (c.type !== 'Dialer') exportFile(c);
    setEdit(null);
    if (c.type === 'Dialer') setDialing(c.id);
  };

  const saveDraft = () => {
    if (!edit) return;
    const c = { ...edit, id: edit.id || uid(), name: edit.name.trim() || `${edit.type} campaign`, recipients: recipients.length };
    setState((cur) => ({ campaigns: [c, ...cur.campaigns.filter((x) => x.id !== c.id)] }));
    setEdit(null);
  };

  const dial = campaigns.find((c) => c.id === dialing);

  return (
    <div className="page">
      <div className="content-head">
        <h1>Marketing</h1>
        <span className="grow" />
        <button className="btn primary" disabled={!lists.length} onClick={() => setEdit(draft(lists[0].id))}>+ New Campaign</button>
      </div>
      <p className="muted">
        Postcards and emails are prepared here and exported as a merged mail file for your print or email provider — this app does not transmit mail itself.
        Dialer campaigns place calls through your device’s phone app.
      </p>

      {!lists.length ? (
        <Empty title="Create a marketing list first">Campaigns are sent to a list. Save properties from <Link to="/">Search</Link> to begin.</Empty>
      ) : !campaigns.length ? (
        <Empty title="No campaigns yet">Create a postcard, email, dialer campaign, or landing page.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Campaign</th><th>Type</th><th>List</th><th>Status</th><th className="r">Recipients</th><th className="r">Cost</th><th>Date</th><th /></tr></thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.type}</td>
                  <td>{lists.find((l) => l.id === c.listId)?.name ?? <span className="muted">Deleted list</span>}</td>
                  <td><Tag text={c.status} tone={c.status === 'Draft' ? 'gray' : c.status === 'Scheduled' ? 'orange' : 'green'} /></td>
                  <td className="r">{c.recipients.toLocaleString()}{c.type === 'Dialer' && ` (${Object.keys(c.calls).length} called)`}</td>
                  <td className="r">{c.cost ? `$${c.cost.toFixed(2)}` : '—'}</td>
                  <td>{date(c.schedule)}</td>
                  <td className="r nowrap">
                    {c.status === 'Draft' && <button className="link" onClick={() => setEdit(c)}>Edit</button>}{' '}
                    {c.type === 'Dialer' && c.status !== 'Draft' && <button className="link" onClick={() => setDialing(c.id)}>Open Dialer</button>}{' '}
                    {c.type !== 'Dialer' && c.status !== 'Draft' && <button className="link" onClick={() => exportFile(c)}>Download</button>}{' '}
                    <button className="link danger" onClick={() => confirm(`Delete "${c.name}"?`) && setState((cur) => ({ campaigns: cur.campaigns.filter((x) => x.id !== c.id) }))}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {edit && (
        <Modal wide title={edit.id ? 'Edit campaign' : 'New campaign'} onClose={() => setEdit(null)}>
          <div className="two-col">
            <div>
              <div className="seg wide">
                {TYPES.map((t) => <button key={t} className={edit.type === t ? 'on' : ''} onClick={() => setEdit({ ...edit, type: t, ...TEMPLATES[t] })}>{t}</button>)}
              </div>
              <label className="field"><span>Campaign name</span><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder={`${edit.type} campaign`} /></label>
              {edit.type !== 'Landing Page' && (
                <label className="field"><span>Marketing list</span>
                  <select value={edit.listId} onChange={(e) => setEdit({ ...edit, listId: e.target.value })}>{lists.map((l) => <option key={l.id} value={l.id}>{l.name} ({l.propertyIds.length.toLocaleString()})</option>)}</select>
                </label>
              )}
              <label className="field"><span>{edit.type === 'Landing Page' ? 'Headline' : edit.type === 'Dialer' ? 'Script title' : edit.type === 'Postcard' ? 'Front headline' : 'Subject'}</span><input value={edit.subject} onChange={(e) => setEdit({ ...edit, subject: e.target.value })} /></label>
              <label className="field"><span>{edit.type === 'Dialer' ? 'Call script' : 'Message'}</span><textarea rows={7} value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} /></label>
              {edit.type !== 'Landing Page' && <p className="muted">Merge fields: {'{first_name} {owner} {address} {city} {full_address}'}</p>}
              {(edit.type === 'Postcard' || edit.type === 'Email') && <label className="field"><span>Send date</span><input type="date" value={edit.schedule} min={today()} onChange={(e) => setEdit({ ...edit, schedule: e.target.value })} /></label>}
            </div>
            <div>
              <h3>Preview</h3>
              <div className={`preview preview-${edit.type.split(' ')[0].toLowerCase()}`}>
                <strong>{sample ? mergeFields(edit.subject, sample) : edit.subject}</strong>
                <p>{sample ? mergeFields(edit.body, sample) : edit.body}</p>
                {edit.type === 'Postcard' && sample && <address>{sample.ownerName}<br />{sample.mailAddress}<br />{sample.mailCity}, {sample.mailState} {sample.mailZip}</address>}
                {edit.type === 'Landing Page' && <div className="fake-form"><span>Your name</span><span>Phone</span><span>Property address</span><b>Get My Cash Offer</b></div>}
              </div>
              {edit.type !== 'Landing Page' && (
                <p>
                  <b>{recipients.length.toLocaleString()}</b> recipients
                  {edit.type === 'Email' && ' with an email on file'}
                  {edit.type === 'Dialer' && ' with a callable number (Do Not Call numbers are excluded)'}
                  {edit.type === 'Postcard' && <> · {recipients.length.toLocaleString()} × ${POSTCARD_COST.toFixed(2)} = <b>${cost.toFixed(2)}</b></>}
                </p>
              )}
              {(edit.type === 'Email' || edit.type === 'Dialer') && !recipients.length && <p className="neg">No one on this list has been skip traced yet. Run <Link to="/skip-tracing">Skip Tracing</Link> first.</p>}
            </div>
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={saveDraft}>Save Draft</button>
            <button className="btn primary" disabled={edit.type !== 'Landing Page' && !recipients.length} onClick={launch}>
              {edit.type === 'Dialer' ? 'Start Dialing' : edit.type === 'Landing Page' ? 'Publish & Download HTML' : 'Launch & Download Mail File'}
            </button>
          </div>
        </Modal>
      )}

      {dial && (
        <Modal wide title={`Dialer — ${dial.name}`} onClose={() => setDialing(null)}>
          <div className="preview"><strong>{dial.subject}</strong><p>{dial.body}</p></div>
          <table className="table">
            <thead><tr><th>Owner</th><th>Property</th><th>Phone</th><th>Disposition</th></tr></thead>
            <tbody>
              {audience(dial, s).slice(0, 200).map((p) => {
                const ph = s.skip[p.id].phones.find((x) => !x.dnc)!;
                return (
                  <tr key={p.id} className={dial.calls[p.id] ? 'dim' : ''}>
                    <td>{p.ownerName}</td>
                    <td><Link to={`/property/${p.id}`}>{p.address}</Link></td>
                    <td><a className="btn sm primary" href={`tel:${ph.number.replace(/\D/g, '')}`}>Call {ph.number}</a></td>
                    <td>
                      <select
                        aria-label={`Disposition for ${p.ownerName}`}
                        value={dial.calls[p.id] ?? ''}
                        onChange={(e) => setState((cur) => ({ campaigns: cur.campaigns.map((c) => (c.id === dial.id ? { ...c, calls: { ...c.calls, [p.id]: e.target.value } } : c)) }))}
                      >
                        <option value="">Not called</option>
                        {DISPOSITIONS.map((d) => <option key={d}>{d}</option>)}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Modal>
      )}
    </div>
  );
}
