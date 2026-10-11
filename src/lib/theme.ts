// Light / dark appearance. A device preference rather than account data, so it is kept
// outside the per-account store and already applies on the sign-in screen.
import { useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark' | 'system';
const KEY = 'propertyview.theme';
const listeners = new Set<() => void>();
const dark = window.matchMedia('(prefers-color-scheme: dark)');

let theme: Theme = 'system';
try {
  const saved = localStorage.getItem(KEY);
  if (saved === 'light' || saved === 'dark') theme = saved;
} catch {
  // storage unavailable: follow the system
}

export const resolved = (): 'light' | 'dark' => (theme === 'system' ? (dark.matches ? 'dark' : 'light') : theme);
const apply = () => {
  document.documentElement.dataset.theme = resolved();
  listeners.forEach((l) => l());
};
dark.addEventListener('change', apply);
apply();

export function setTheme(next: Theme) {
  theme = next;
  try {
    if (next === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  } catch {
    // keep the choice for this session only
  }
  apply();
}

export function useTheme() {
  const sub = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };
  return { theme: useSyncExternalStore(sub, () => theme), shown: useSyncExternalStore(sub, resolved) };
}
