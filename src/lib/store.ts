import { useSyncExternalStore } from 'react';
import type { Rating } from './ai';
import type { SkipResult } from './data';
import type { Criteria, Location } from './filters';

export interface MarketingList {
  id: string;
  name: string;
  created: string;
  propertyIds: string[];
  // Present when the list was saved from a search; List Automator re-runs it.
  source?: { loc: Location; criteria: Criteria; leadLists: string[] };
  automator: boolean;
  lastRun?: string;
}
export interface SavedSearch {
  id: string;
  name: string;
  loc: Location;
  criteria: Criteria;
  leadLists: string[];
  created: string;
}
export interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  type: string;
  propertyId?: string;
  notes: string;
  dnc?: boolean;
}
export interface Campaign {
  id: string;
  name: string;
  type: 'Postcard' | 'Email' | 'Dialer' | 'Landing Page';
  listId: string;
  subject: string;
  body: string;
  schedule: string;
  status: 'Draft' | 'Scheduled' | 'Sent' | 'Active';
  recipients: number;
  cost: number;
  created: string;
  calls: Record<string, string>; // propertyId -> disposition, for dialer campaigns
}
export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  perms: Record<string, boolean>;
}
// A property starred from the map or a detail page. Sample records are keyed by their id,
// real addresses by `geo:lat,lng`.
export interface Starred {
  id: string;
  address: string;
  lat: number;
  lng: number;
  real: boolean;
  added: string;
}
export const spotId = (lat: number, lng: number) => `geo:${lat.toFixed(5)},${lng.toFixed(5)}`;
export interface SearchState {
  loc: Location;
  criteria: Criteria;
  leadLists: string[];
}

export interface State {
  search: SearchState;
  lists: MarketingList[];
  saved: SavedSearch[];
  skip: Record<string, SkipResult>;
  contacts: Contact[];
  campaigns: Campaign[];
  notes: Record<string, string>;
  status: Record<string, string>;
  tags: Record<string, string[]>;
  docs: Record<string, { id: string; name: string; url: string; added: string }[]>;
  team: Member[];
  wallet: number;
  starred: Starred[];
  ratings: Record<string, Rating>;
  settings: { googleKey: string; dataKey: string; aiKey?: string };
  activity: { t: number; msg: string }[];
}

export const LEAD_STATUSES = ['New', 'Contacted', 'Appointment Set', 'Offer Made', 'Under Contract', 'Closed', 'Dead'];
export const PERMISSIONS = ['Search', 'Export', 'Skip Tracing', 'Marketing', 'Billing'];
export const SKIP_COST = 0.12;
export const POSTCARD_COST = 0.48;

const KEY = 'propertyview.state.v1';

const initial: State = {
  search: { loc: { kind: 'county', value: 'Maricopa, AZ', label: 'Maricopa County, AZ' }, criteria: {}, leadLists: [] },
  lists: [],
  saved: [],
  skip: {},
  contacts: [],
  campaigns: [],
  notes: {},
  status: {},
  tags: {},
  docs: {},
  team: [{ id: 'owner', name: 'Account Owner', email: 'owner@example.com', role: 'Admin', perms: Object.fromEntries(PERMISSIONS.map((p) => [p, true])) }],
  wallet: 50,
  starred: [],
  ratings: {},
  settings: { googleKey: '', dataKey: '', aiKey: '' },
  activity: [],
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...initial, ...JSON.parse(raw) };
  } catch {
    // unreadable or blocked storage: start from defaults
  }
  return initial;
}

let state = load();
const listeners = new Set<() => void>();

export function getState() {
  return state;
}

export function setState(fn: (s: State) => Partial<State>) {
  state = { ...state, ...fn(state) };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // quota or private mode: keep working in memory
  }
  listeners.forEach((l) => l());
}

export function useStore(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}

// Keys entered under Account win; .env values (VITE_GOOGLE_MAPS_API_KEY, VITE_RENTCAST_API_KEY) are the fallback.
export const googleKey = (): string => state.settings.googleKey || import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
export const aiKey = (): string => state.settings.aiKey || import.meta.env.VITE_ANTHROPIC_API_KEY || '';
export const dataKey = (): string => state.settings.dataKey || import.meta.env.VITE_RENTCAST_API_KEY || '';

export const uid = () => Math.random().toString(36).slice(2, 10);
export const today = () => new Date().toISOString().slice(0, 10);

export function log(msg: string) {
  setState((s) => ({ activity: [{ t: Date.now(), msg }, ...s.activity].slice(0, 60) }));
}

export function toggleStar(item: Omit<Starred, 'added'>): boolean {
  const on = !state.starred.some((x) => x.id === item.id);
  setState((s) => ({ starred: on ? [{ ...item, added: today() }, ...s.starred] : s.starred.filter((x) => x.id !== item.id) }));
  return on;
}

export function addToList(listId: string, ids: string[]) {
  setState((s) => ({ lists: s.lists.map((l) => (l.id === listId ? { ...l, propertyIds: [...new Set([...l.propertyIds, ...ids])] } : l)) }));
}

export function createList(name: string, ids: string[], source?: MarketingList['source']): string {
  const id = uid();
  setState((s) => ({ lists: [...s.lists, { id, name, created: today(), propertyIds: [...new Set(ids)], source, automator: false }] }));
  log(`Created list "${name}" with ${ids.length.toLocaleString()} properties`);
  return id;
}

export function resetAll() {
  localStorage.removeItem(KEY);
  state = initial;
  listeners.forEach((l) => l());
}
