import { getProperty, skipTraceLookup, type Property } from './data';
import { runSearch } from './filters';
import { SKIP_COST, getState, log, setState, today, uid, type Contact } from './store';

// Skip traces every id that has no result yet, charges the wallet, and files the
// owners under Contacts. Returns a message describing what happened.
export function runSkipTrace(ids: string[]): { ok: boolean; msg: string } {
  const s = getState();
  const todo = ids.filter((id) => !s.skip[id]).map(getProperty).filter((p): p is Property => !!p);
  if (!todo.length) return { ok: true, msg: 'Already skip traced — no charge.' };
  const cost = Math.round(todo.length * SKIP_COST * 100) / 100;
  if (cost > s.wallet) return { ok: false, msg: `Wallet balance $${s.wallet.toFixed(2)} is below the $${cost.toFixed(2)} needed. Add funds under Account.` };

  const skip = { ...s.skip };
  const contacts: Contact[] = [];
  for (const p of todo) {
    const r = skipTraceLookup(p);
    skip[p.id] = r;
    contacts.push({ id: uid(), name: p.ownerName, phone: r.phones[0]?.number ?? '', email: r.emails[0] ?? '', type: 'Owner', propertyId: p.id, notes: '', dnc: r.phones[0]?.dnc });
  }
  setState((cur) => ({ skip, contacts: [...cur.contacts, ...contacts], wallet: Math.round((cur.wallet - cost) * 100) / 100 }));
  log(`Skip traced ${todo.length.toLocaleString()} ${todo.length === 1 ? 'owner' : 'owners'} ($${cost.toFixed(2)})`);
  return { ok: true, msg: `Skip traced ${todo.length.toLocaleString()} ${todo.length === 1 ? 'record' : 'records'} for $${cost.toFixed(2)}.` };
}

// Re-runs the search a list was saved from and adds anything new.
export function runAutomator(listId: string): { added: number; stale: number } {
  const list = getState().lists.find((l) => l.id === listId);
  if (!list?.source) return { added: 0, stale: 0 };
  const matches = new Set(runSearch(list.source.loc, list.source.criteria, list.source.leadLists).map((p) => p.id));
  const have = new Set(list.propertyIds);
  const fresh = [...matches].filter((id) => !have.has(id));
  const stale = list.propertyIds.filter((id) => !matches.has(id)).length;
  setState((s) => ({ lists: s.lists.map((l) => (l.id === listId ? { ...l, propertyIds: [...l.propertyIds, ...fresh], lastRun: today() } : l)) }));
  log(`List Automator ran on "${list.name}": ${fresh.length} added`);
  return { added: fresh.length, stale };
}
