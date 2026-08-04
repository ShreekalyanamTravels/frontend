'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import ReCAPTCHA from 'react-google-recaptcha';
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '600', '700'] });

const RECAPTCHA_ENABLED = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === 'true';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #e0e8f4',
    borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit',
    color: '#1a1a2e', outline: 'none', boxSizing: 'border-box',
    background: '#f0f4fb',
  };

  async function handleSubmit() {
    setError('');
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    if (RECAPTCHA_ENABLED && !recaptchaToken) {
      setError('Please complete the reCAPTCHA.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, recaptchaToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        recaptchaRef.current?.reset();
        setRecaptchaToken(null);
        return;
      }
      setSent(true);
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
        <h2 className={playfair.className} style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px' }}>Forgot Password</h2>

        {sent ? (
          <>
            <p style={{ fontSize: 13.5, color: '#444', lineHeight: 1.7, margin: '18px 0 26px' }}>
              If an account exists for <strong>{email}</strong>, we've sent a password reset link to that address.
              Please check your inbox.
            </p>
            <Link href="/" style={{ display: 'inline-block', fontSize: 13, color: '#c9184a', fontWeight: 600, textDecoration: 'none' }}>
              ← Back to Sign In
            </Link>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: '#9a9a9a', margin: '0 0 26px' }}>
              Enter your email and we'll send you a link to reset your password.
            </p>

            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7a7a7a', display: 'block', marginBottom: 7 }}>
                EMAIL ID
              </label>
              <input
                type="email" value={email} placeholder="Enter your email"
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
                style={inputBase}
              />
            </div>

            {RECAPTCHA_ENABLED && (
              <div style={{ marginBottom: 16, transform: 'scale(0.92)', transformOrigin: 'left' }}>
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                  onChange={token => setRecaptchaToken(token)}
                  onExpired={() => setRecaptchaToken(null)}
                />
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
                opacity: loading ? 0.7 : 1, marginBottom: 16,
              }}
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <div style={{ textAlign: 'center' }}>
              <Link href="/" style={{ fontSize: 12.5, color: '#999', textDecoration: 'none' }}>
                ← Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
