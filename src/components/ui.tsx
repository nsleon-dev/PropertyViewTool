import { useEffect, useState, type ReactNode } from 'react';
import { addToList, createList, toggleStar, useStore, type Starred } from '../lib/store';
import type { Property } from '../lib/data';

const PATHS: Record<string, string> = {
  search: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
  home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  people: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
  phone: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
  mail: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z',
  dashboard: 'M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z',
  list: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
  sync: 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74A7.93 7.93 0 0 0 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z',
  person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  calc: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-6 4h5v1.5h-5V7zM6 7h5v1.5H6V7zm5 10H6v-1.5h5V17zm7 0h-5v-1.5h5V17zm0-4h-5v-1.5h5V13zm-7 0H6v-1.5h5V13z',
  filter: 'M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z',
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
  more: 'M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  sun: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zM20 11h3v2h-3zM4.2 5.6l1.4-1.4 2.2 2.1-1.5 1.5zM16.2 17.7l1.5-1.5 2.1 2.2-1.4 1.4zM4.2 18.4l2.1-2.2 1.5 1.5-2.2 2.1zM16.2 6.3l2.2-2.1 1.4 1.4-2.1 2.2z',
  spark: 'M12 2l1.8 5.4L19 9l-5.2 1.6L12 16l-1.8-5.4L5 9l5.2-1.6L12 2zm7 11l.9 2.6L22.5 16.5l-2.6.9L19 20l-.9-2.6-2.6-.9 2.6-.9.9-2.6z',
};

const PHONE = '(max-width: 720px)';
// True on phone-width screens; follows rotation and window resizing.
export function usePhone() {
  const [phone, setPhone] = useState(() => matchMedia(PHONE).matches);
  useEffect(() => {
    const mq = matchMedia(PHONE);
    const on = () => setPhone(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return phone;
}

export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Tag({ text, tone = 'gray' }: { text: string; tone?: string }) {
  return <span className={`tag tag-${tone}`}>{text}</span>;
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

// Illustrated placeholder: this dataset has no property photos.
export function Thumb({ p, size = 'sm' }: { p: Property; size?: 'sm' | 'lg' }) {
  const hue = (parseInt(p.id.slice(1), 10) * 47) % 360;
  const land = p.type === 'Vacant Land';
  return (
    <svg className={`thumb thumb-${size}`} viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="120" height="90" fill={`hsl(${205 + (hue % 20)} 60% 86%)`} />
      <rect y="62" width="120" height="28" fill={`hsl(${95 + (hue % 30)} 35% 62%)`} />
      {!land && (
        <>
          <rect x="34" y="38" width="52" height="32" fill={`hsl(${hue} 28% 78%)`} />
          <path d="M28 40 60 18l32 22z" fill={`hsl(${hue} 30% 38%)`} />
          <rect x="54" y="52" width="12" height="18" fill={`hsl(${hue} 30% 30%)`} />
          <rect x="40" y="46" width="10" height="9" fill="#fff" opacity=".85" />
          <rect x="70" y="46" width="10" height="9" fill="#fff" opacity=".85" />
        </>
      )}
    </svg>
  );
}

export function AddToListModal({ ids, onClose, source }: { ids: string[]; onClose: () => void; source?: Parameters<typeof createList>[2] }) {
  const { lists } = useStore();
  const [name, setName] = useState('');
  return (
    <Modal title={`Save ${ids.length.toLocaleString()} ${ids.length === 1 ? 'property' : 'properties'} to a list`} onClose={onClose}>
      <label className="field">
        <span>New list name</span>
        <div className="row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mesa absentee owners" autoFocus />
          <button
            className="btn primary"
            disabled={!name.trim()}
            onClick={() => {
              createList(name.trim(), ids, source);
              toast(`Saved to "${name.trim()}"`);
              onClose();
            }}
          >
            Create &amp; Save
          </button>
        </div>
      </label>
      {lists.length > 0 && <div className="divider">or add to an existing list</div>}
      <div className="pick-list">
        {lists.map((l) => (
          <button
            key={l.id}
            className="pick-row"
            onClick={() => {
              addToList(l.id, ids);
              toast(`Added to "${l.name}"`);
              onClose();
            }}
          >
            <span>{l.name}</span>
            <span className="muted">{l.propertyIds.length.toLocaleString()} properties</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

let pushToast: (msg: string) => void = () => {};
export const toast = (msg: string) => pushToast(msg);

export function Toasts() {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);
  useEffect(() => {
    pushToast = (msg) => {
      const id = Date.now() + Math.random();
      setItems((t) => [...t, { id, msg }]);
      setTimeout(() => setItems((t) => t.filter((i) => i.id !== id)), 3200);
    };
  }, []);
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast">{t.msg}</div>
      ))}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

// Star toggle that saves a property to My Properties > Starred.
export function StarButton({ item, className = '' }: { item: Omit<Starred, 'added'>; className?: string }) {
  const on = useStore().starred.some((x) => x.id === item.id);
  return (
    <button
      className={`icon-btn star-btn${on ? ' on' : ''} ${className}`}
      aria-pressed={on}
      aria-label={on ? 'Remove from My Properties' : 'Save to My Properties'}
      title={on ? 'Saved to My Properties — click to remove' : 'Save to My Properties'}
      onClick={() => toast(toggleStar(item) ? `Saved ${item.address} to My Properties` : 'Removed from My Properties')}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
    </button>
  );
}
