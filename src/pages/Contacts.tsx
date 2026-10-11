import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Empty, Modal, Tag } from '../components/ui';
import { getProperty } from '../lib/data';
import { downloadCsv } from '../lib/format';
import { setState, uid, useStore, type Contact } from '../lib/store';

const TYPES = ['Owner', 'Buyer', 'Seller', 'Agent', 'Lender', 'Contractor', 'Other'];
const blank = (): Contact => ({ id: '', name: '', phone: '', email: '', type: 'Owner', notes: '' });

export function Contacts() {
  const { contacts } = useStore();
  const [find, setFind] = useState('');
  const [type, setType] = useState('');
  const [edit, setEdit] = useState<Contact | null>(null);

  const q = find.trim().toLowerCase();
  const rows = contacts.filter((c) => (!type || c.type === type) && (!q || `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(q)));

  const save = () => {
    if (!edit || !edit.name.trim()) return;
    setState((s) => ({ contacts: edit.id ? s.contacts.map((c) => (c.id === edit.id ? edit : c)) : [...s.contacts, { ...edit, id: uid() }] }));
    setEdit(null);
  };

  return (
    <div className="page">
      <div className="content-head">
        <h1>Contacts</h1>
        <span className="muted">{contacts.length.toLocaleString()} total</span>
        <span className="grow" />
        <button className="btn" disabled={!rows.length} onClick={() => downloadCsv('contacts.csv', [['Name', 'Type', 'Phone', 'Email', 'Do Not Call', 'Property', 'Notes'], ...rows.map((c) => [c.name, c.type, c.phone, c.email, c.dnc ? 'Yes' : '', c.propertyId ? getProperty(c.propertyId)?.address : '', c.notes])])}>Export CSV</button>
        <button className="btn primary" onClick={() => setEdit(blank())}>+ Add Contact</button>
      </div>
      <div className="toolbar">
        <input placeholder="Search name, phone, or email" value={find} onChange={(e) => setFind(e.target.value)} />
        <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Contact type">
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      {!rows.length ? (
        <Empty title={contacts.length ? 'No contacts match' : 'No contacts yet'}>Owners are added here automatically when you skip trace, or add a contact by hand.</Empty>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Type</th><th>Phone</th><th>Email</th><th>Property</th><th>Notes</th><th /></tr></thead>
            <tbody>
              {rows.slice(0, 500).map((c) => {
                const p = c.propertyId ? getProperty(c.propertyId) : undefined;
                return (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.type}</td>
                    <td>{c.phone ? <a href={`tel:${c.phone.replace(/\D/g, '')}`}>{c.phone}</a> : '—'} {c.dnc && <Tag text="DNC" tone="red" />}</td>
                    <td>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : '—'}</td>
                    <td>{p ? <Link to={`/property/${p.id}`}>{p.address}</Link> : '—'}</td>
                    <td className="clip">{c.notes}</td>
                    <td className="r nowrap">
                      <button className="link" onClick={() => setEdit(c)}>Edit</button>{' '}
                      <button className="link danger" onClick={() => confirm(`Delete ${c.name}?`) && setState((s) => ({ contacts: s.contacts.filter((x) => x.id !== c.id) }))}>Delete</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length > 500 && <p className="muted">Showing the first 500. Narrow the search or export to see all.</p>}
        </div>
      )}

      {edit && (
        <Modal title={edit.id ? 'Edit contact' : 'Add contact'} onClose={() => setEdit(null)}>
          <label className="field"><span>Name</span><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></label>
          <label className="field"><span>Type</span><select value={edit.type} onChange={(e) => setEdit({ ...edit, type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          <label className="field"><span>Phone</span><input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></label>
          <label className="field"><span>Email</span><input type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></label>
          <label className="check"><input type="checkbox" checked={!!edit.dnc} onChange={(e) => setEdit({ ...edit, dnc: e.target.checked })} />Do not call</label>
          <label className="field"><span>Notes</span><textarea rows={3} value={edit.notes} onChange={(e) => setEdit({ ...edit, notes: e.target.value })} /></label>
          <div className="modal-actions"><button className="btn primary" disabled={!edit.name.trim()} onClick={save}>Save</button></div>
        </Modal>
      )}
    </div>
  );
}
