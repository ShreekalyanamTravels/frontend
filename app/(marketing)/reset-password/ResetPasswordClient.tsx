'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '600', '700'] });

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const [newPwd,  setNewPwd]  = useState('');
  const [confPwd, setConfPwd] = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const pwdStrong = newPwd.length >= 8;
  const pwdMatch  = newPwd === confPwd;

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #e0e8f4',
    borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit',
    color: '#1a1a2e', outline: 'none', boxSizing: 'border-box',
    background: '#f0f4fb',
  };

  async function handleSubmit() {
    setError('');
    if (!token || !email) {
      setError('This reset link is invalid. Please request a new one.');
      return;
    }
    if (!newPwd || !confPwd) {
      setError('Please fill in both password fields.');
      return;
    }
    if (!pwdStrong) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!pwdMatch) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setDone(true);
      setTimeout(() => router.push('/'), 2500);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fdf7f5', minHeight: 'calc(100vh - 64px)', padding: '40px 6%' }}>
      <div style={{
        width: '100%', maxWidth: 400,
        background: '#fff', borderRadius: 16,
        boxShadow: '0 8px 48px rgba(0,0,0,.11), 0 2px 12px rgba(0,0,0,.06)',
        padding: '36px 32px',
        borderTop: '3px solid #c9184a',
      }}>
        <h2 className={playfair.className} style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px' }}>Reset Password</h2>

        {done ? (
          <p style={{ fontSize: 13.5, color: '#2d8a4e', lineHeight: 1.7, margin: '18px 0 0' }}>
            ✓ Your password has been updated. Redirecting you to sign in…
          </p>
        ) : !token || !email ? (
          <>
            <p style={{ fontSize: 13.5, color: '#c9184a', lineHeight: 1.7, margin: '18px 0 26px' }}>
              This reset link is invalid or incomplete. Please request a new one.
            </p>
            <Link href="/forgot-password" style={{ fontSize: 13, color: '#c9184a', fontWeight: 600, textDecoration: 'none' }}>
              ← Request a new link
            </Link>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: '#9a9a9a', margin: '0 0 26px' }}>
              Choose a new password for <strong>{email}</strong>.
            </p>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7a7a7a', display: 'block', marginBottom: 7 }}>
                NEW PASSWORD
              </label>
              <input type="password" value={newPwd} placeholder="Enter new password"
                onChange={e => setNewPwd(e.target.value)} style={inputBase} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7a7a7a', display: 'block', marginBottom: 7 }}>
                CONFIRM PASSWORD
              </label>
              <input type="password" value={confPwd} placeholder="Confirm new password"
                onChange={e => setConfPwd(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                style={inputBase} />
            </div>

            {newPwd && (
              <div style={{ marginBottom: 14, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, color: pwdStrong ? '#2d8a4e' : '#c9184a', fontWeight: 600 }}>
                  {pwdStrong ? '✓' : '✗'} Min. 8 characters
                </span>
                {confPwd && (
                  <span style={{ fontSize: 12, color: pwdMatch ? '#2d8a4e' : '#c9184a', fontWeight: 600 }}>
                    {pwdMatch ? '✓' : '✗'} Passwords match
                  </span>
                )}
              </div>
            )}

            {error && (
              <div style={{ fontSize: 12.5, color: '#c9184a', background: '#fdeef1', border: '1px solid #f3c6d0', borderRadius: 8, padding: '9px 12px', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: '100%', padding: '13px',
                background: '#8b1a1a', color: '#fff', border: 'none',
                borderRadius: 10, fontSize: 15, fontWeight: 700,
                cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
