// Sign-in with Google or email and password, through Firebase Authentication.
// Enabled only when the build has a Firebase config (VITE_FIREBASE_API_KEY and
// VITE_FIREBASE_PROJECT_ID); without one the app runs open, as it does locally.
import { initializeApp } from 'firebase/app';
import { GoogleAuthProvider, createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut as fbSignOut, type User } from 'firebase/auth';
import { useSyncExternalStore } from 'react';
import { switchUser } from './store';

const projectId: string = import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '';
const apiKey: string = import.meta.env.VITE_FIREBASE_API_KEY ?? '';
export const AUTH_ENABLED = !!(projectId && apiKey);

const auth = AUTH_ENABLED ? getAuth(initializeApp({ apiKey, projectId, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`, appId: import.meta.env.VITE_FIREBASE_APP_ID })) : null;

let snapshot: { ready: boolean; user: User | null } = { ready: !AUTH_ENABLED, user: null };
const listeners = new Set<() => void>();
const publish = (user: User | null) => {
  // Each account keeps its own saved lists, notes and starred properties in this browser.
  switchUser(user?.uid ?? null);
  snapshot = { ready: true, user };
  listeners.forEach((l) => l());
};
if (auth) onAuthStateChanged(auth, publish);

export function useAuth() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
  );
}

// Sent with property-data requests so the server can check who is asking.
export const idToken = async (): Promise<string | null> => (auth?.currentUser ? auth.currentUser.getIdToken() : null);

export const signInGoogle = () => signInWithPopup(auth!, new GoogleAuthProvider());
export const signInEmail = (email: string, password: string) => signInWithEmailAndPassword(auth!, email, password);
export async function signUpEmail(email: string, password: string) {
  const { user } = await createUserWithEmailAndPassword(auth!, email, password);
  await sendEmailVerification(user);
}
export const resendVerification = () => sendEmailVerification(auth!.currentUser!);
export const resetPassword = (email: string) => sendPasswordResetEmail(auth!, email);
export const signOut = () => fbSignOut(auth!);
// Picks up a verification done in another tab.
export async function refreshUser() {
  await auth!.currentUser?.reload();
  await auth!.currentUser?.getIdToken(true);
  publish(auth!.currentUser);
}

const MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'That email and password do not match an account.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/email-already-in-use': 'An account already exists for that email. Sign in instead.',
  'auth/weak-password': 'Choose a password of at least 6 characters.',
  'auth/missing-password': 'Enter your password.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/popup-blocked': 'The sign-in window was blocked. Allow pop-ups for this site and try again.',
  'auth/unauthorized-domain': 'This web address is not authorised for sign-in yet (Firebase > Authentication > Settings > Authorised domains).',
  'auth/operation-not-allowed': 'That sign-in method is not switched on for this site.',
  'auth/network-request-failed': 'The sign-in service could not be reached. Check your connection.',
};
export function authMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return '';
  return MESSAGES[code] ?? 'Sign-in failed. Try again.';
}
