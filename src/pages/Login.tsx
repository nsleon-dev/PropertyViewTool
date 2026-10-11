import { useState, type FormEvent } from 'react';
import { authMessage, refreshUser, resendVerification, resetPassword, signInEmail, signInGoogle, signOut, signUpEmail } from '../lib/auth';

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="login">
      <div className="login-card">
        <div className="login-brand"><span className="brand-mark">PV</span> PropertyView</div>
        {children}
      </div>
    </div>
  );
}

export function Login() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const attempt = async (fn: () => Promise<unknown>, done = '') => {
    setBusy(true);
    setError('');
    setNote('');
    try {
      await fn();
      setNote(done);
    } catch (e) {
      setError(authMessage(e));
    }
    setBusy(false);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    attempt(() => (mode === 'in' ? signInEmail(email.trim(), password) : signUpEmail(email.trim(), password)));
  };

  return (
    <Shell>
      <h1>{mode === 'in' ? 'Sign in' : 'Create your account'}</h1>
      <button className="btn block google" disabled={busy} onClick={() => attempt(signInGoogle)}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
        Continue with Google
      </button>
      <div className="login-or"><span>or</span></div>
      <form onSubmit={submit}>
        <label className="field"><span>Email</span><input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="field"><span>Password</span><input type="password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        {error && <p className="error" role="alert">{error}</p>}
        {note && <p className="muted" role="status">{note}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Please wait…' : mode === 'in' ? 'Sign in with email' : 'Create account'}</button>
      </form>
      <div className="login-links">
        <button className="link" onClick={() => { setMode(mode === 'in' ? 'up' : 'in'); setError(''); setNote(''); }}>{mode === 'in' ? 'Create an account' : 'I already have an account'}</button>
        {mode === 'in' && <button className="link" onClick={() => (email.trim() ? attempt(() => resetPassword(email.trim()), 'If that email has an account, a reset link is on its way.') : setError('Enter your email above first.'))}>Forgot password?</button>}
      </div>
    </Shell>
  );
}

// Shown to email sign-ups until they click the link in their verification email.
export function VerifyEmail({ email }: { email: string }) {
  const [note, setNote] = useState('');
  const run = (fn: () => Promise<unknown>, done: string) => fn().then(() => setNote(done), (e) => setNote(authMessage(e) || 'That did not work. Try again.'));
  return (
    <Shell>
      <h1>Check your email</h1>
      <p>We sent a verification link to <b>{email}</b>. Open it, then come back here.</p>
      {note && <p className="muted" role="status">{note}</p>}
      <button className="btn primary block" onClick={() => run(refreshUser, 'Not verified yet. Click the link in the email first.')}>I've verified my email</button>
      <div className="login-links">
        <button className="link" onClick={() => run(resendVerification, 'Verification email sent again.')}>Resend email</button>
        <button className="link" onClick={() => signOut()}>Use a different account</button>
      </div>
    </Shell>
  );
}
