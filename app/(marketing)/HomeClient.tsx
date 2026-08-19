'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReCAPTCHA from 'react-google-recaptcha';
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '600', '700'] });

const RECAPTCHA_ENABLED = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === 'true';

const BRANDS = [
  'Tata Group','Infosys','Wipro','HCL Technologies',
  'Reliance Industries','HDFC Bank','Mahindra','Bajaj Finserv',
];

const HERO_ICONS = [
  { emoji: '✈️', label: 'Flights'   },
  { emoji: '🏨', label: 'Hotels'    },
  { emoji: '🏛️', label: 'Heritage'  },
  { emoji: '🚌', label: 'Ground'    },
  { emoji: '🌐', label: 'Visa'      },
  { emoji: '🧳', label: 'Packages'  },
];

const SERVICES = [
  {
    emoji: '✈️', bg: '#e8f4fd', title: 'Flight Bookings',
    desc: 'Instant access to 500+ airlines with negotiated corporate fares and priority check-in.',
  },
  {
    emoji: '🏨', bg: '#eafaf1', title: 'Hotel Management',
    desc: 'Curated hotel inventory with real-time availability and corporate rate guarantees.',
  },
  {
    emoji: '🚂', bg: '#f4ecfb', title: 'Rail & Ground',
    desc: 'Seamless train, bus, and cab bookings integrated into a single travel itinerary.',
  },
  {
    emoji: '📊', bg: '#fff6e8', title: 'Expense Analytics',
    desc: 'Real-time travel spend dashboards to help finance teams control costs effortlessly.',
  },
  {
    emoji: '🛡️', bg: '#edf2ff', title: 'Duty of Care',
    desc: '24/7 traveler tracking, emergency support, and risk alerts for every trip.',
  },
];

export default function Home() {
  const router = useRouter();
  const [email,    setEmail]   = useState('');
  const [password, setPassword]= useState('');
  const [showPw,   setShowPw]  = useState(false);
  const [error,    setError]   = useState('');
  const [loading,  setLoading] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  const [loginMethod, setLoginMethod] = useState<'email'|'mobile'>('email');
  const [mobile,   setMobile]   = useState('');
  const [otp,      setOtp]      = useState('');
  const [otpSent,  setOtpSent]  = useState(false);

  async function handleSendOtp() {
    setError('');
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login/mobile/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setOtpSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    setError('');
    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login/mobile/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Invalid or expired OTP');
        return;
      }
      router.push('/corporate/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (RECAPTCHA_ENABLED && !recaptchaToken) {
      setError('Please complete the reCAPTCHA.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, recaptchaToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Invalid email or password');
        recaptchaRef.current?.reset();
        setRecaptchaToken(null);
        return;
      }
      router.push('/corporate/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #e0e8f4',
    borderRadius: 9, fontSize: 13.5, fontFamily: 'inherit',
    color: '#1a1a2e', outline: 'none', boxSizing: 'border-box',
  };

  return (
    <>
      {/* ─── HERO ─── */}
      <section style={{ display: 'flex', alignItems: 'stretch', background: '#fdf7f5', minHeight: 'calc(100vh - 64px)', overflow: 'hidden' }}>

        {/* Left — pink card */}
        <div style={{
          flex: '0 0 54%',
          background: 'linear-gradient(150deg, #fde8e8 0%, #fbd0d0 55%, #f8bec4 100%)',
          padding: '64px 6%',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            border: '1px solid #d89090', borderRadius: 20,
            padding: '5px 14px', fontSize: 11, fontWeight: 700,
            color: '#7a2020', background: 'rgba(255,255,255,.55)',
            marginBottom: 26, letterSpacing: '.04em',
          }}>
            + TRUSTED BY 500+ CORPORATIONS
          </div>

          {/* Heading */}
          <h1 className={playfair.className} style={{ margin: '0 0 20px', lineHeight: 1.1, color: '#1a0a08', textAlign: 'center' }}>
            <span style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 700, display: 'block' }}>Shree Kalyanam</span>
            <span style={{ fontSize: 'clamp(30px,3.8vw,50px)', fontWeight: 700, color: '#c9184a', display: 'block' }}>For Corporate</span>
            <span style={{ fontSize: 'clamp(28px,3.5vw,46px)', fontWeight: 600, color: '#b84a10', display: 'block' }}>Organisation</span>
            <span style={{ fontSize: 'clamp(26px,3.2vw,42px)', fontWeight: 700, display: 'block' }}>& Brand Partners</span>
          </h1>

          {/* Sub */}
          <p style={{ fontSize: 14, color: '#6a4040', lineHeight: 1.75, marginBottom: 36, maxWidth: 380, textAlign: 'center' }}>
            Premium travel management, curated hospitality solutions &amp; seamless corporate experiences.
          </p>

          {/* Icon grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 56px)', gap: 14 }}>
            {HERO_ICONS.map(ic => (
              <div key={ic.label} title={ic.label} style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'rgba(255,255,255,.80)',
                boxShadow: '0 2px 10px rgba(0,0,0,.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, cursor: 'pointer',
              }}>
                {ic.emoji}
              </div>
            ))}
          </div>
        </div>

        {/* Right — sign-in card */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 6% 40px 4%', background: '#fdf7f5' }}>
          <div style={{
            width: '100%', maxWidth: 365,
            background: '#fff', borderRadius: 16,
            boxShadow: '0 8px 48px rgba(0,0,0,.11), 0 2px 12px rgba(0,0,0,.06)',
            padding: '36px 32px',
            borderTop: '3px solid #c9184a',
          }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px', fontFamily: 'inherit' }}>Sign in</h2>
            <p style={{ fontSize: 13, color: '#9a9a9a', margin: '0 0 18px' }}>Access your corporate travel dashboard</p>

            {/* Email / Mobile toggle */}
            <div style={{ display: 'flex', gap: 6, background: '#f2f2f2', borderRadius: 9, padding: 4, marginBottom: 20 }}>
              {(['email','mobile'] as const).map(m => (
                <button key={m} onClick={() => { setLoginMethod(m); setError(''); }}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                    fontSize: 12.5, fontWeight: 700, letterSpacing: '.02em', fontFamily: 'inherit',
                    background: loginMethod === m ? '#fff' : 'transparent',
                    color: loginMethod === m ? '#8b1a1a' : '#888',
                    boxShadow: loginMethod === m ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                  }}>
                  {m === 'email' ? 'Email' : 'Mobile'}
                </button>
              ))}
            </div>

            {loginMethod === 'email' ? (
              <>
                {/* Email */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7a7a7a', display: 'block', marginBottom: 7 }}>
                    EMAIL ID
                  </label>
                  <input
                    type="email" value={email} placeholder="Enter your email"
                    onChange={e => setEmail(e.target.value)}
                    style={{ ...inputBase, background: '#f0f4fb', borderColor: '#d8e4f4' }}
                  />
                </div>

                {/* Password */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7a7a7a', display: 'block', marginBottom: 7 }}>
                    PASSWORD
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'} value={password} placeholder="Enter password"
                      onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSignIn(); }}
                      style={{ ...inputBase, paddingRight: 42, background: '#fafafa', borderColor: '#e8e8e8' }}
                    />
                    <button onClick={() => setShowPw(p => !p)} style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: '#9a9a9a', fontSize: 15, padding: 0, lineHeight: 1,
                    }}>
                      {showPw ? '🙈' : '👁'}
                    </button>
                  </div>
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

                {/* Forgot */}
                <div style={{ textAlign: 'right', marginBottom: 20 }}>
                  <Link href="/forgot-password" style={{ fontSize: 12.5, color: '#c9184a', fontWeight: 500, textDecoration: 'none' }}>
                    Forgot Password?
                  </Link>
                </div>

                {error && (
                  <div style={{ fontSize: 12.5, color: '#c9184a', background: '#fdeef1', border: '1px solid #f3c6d0', borderRadius: 8, padding: '9px 12px', marginBottom: 16 }}>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '13px',
                    background: '#8b1a1a', color: '#fff', border: 'none',
                    borderRadius: 10, fontSize: 15, fontWeight: 700,
                    cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', letterSpacing: '.02em',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Signing in…' : 'Sign In →'}
                </button>
              </>
            ) : (
              <>
                {/* Mobile */}
                <div style={{ marginBottom: 18 }}>
                  <label style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7a7a7a', display: 'block', marginBottom: 7 }}>
                    MOBILE NUMBER
                  </label>
                  <input
                    type="tel" value={mobile} placeholder="10-digit mobile number" maxLength={10}
                    disabled={otpSent}
                    onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    style={{ ...inputBase, background: '#f0f4fb', borderColor: '#d8e4f4', opacity: otpSent ? 0.6 : 1 }}
                  />
                </div>

                {otpSent && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#7a7a7a', display: 'block', marginBottom: 7 }}>
                      ENTER OTP
                    </label>
                    <input
                      type="text" inputMode="numeric" value={otp} placeholder="6-digit OTP" maxLength={6}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      onKeyDown={e => { if (e.key === 'Enter') handleVerifyOtp(); }}
                      style={{ ...inputBase, background: '#fafafa', borderColor: '#e8e8e8' }}
                    />
                  </div>
                )}

                {error && (
                  <div style={{ fontSize: 12.5, color: '#c9184a', background: '#fdeef1', border: '1px solid #f3c6d0', borderRadius: 8, padding: '9px 12px', marginBottom: 16 }}>
                    {error}
                  </div>
                )}

                {otpSent && (
                  <div style={{ textAlign: 'right', marginBottom: 20 }}>
                    <button onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
                      style={{ background: 'none', border: 'none', fontSize: 12.5, color: '#c9184a', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                      Change Number
                    </button>
                  </div>
                )}

                <button
                  onClick={otpSent ? handleVerifyOtp : handleSendOtp}
                  disabled={loading}
                  style={{
                    width: '100%', padding: '13px',
                    background: '#8b1a1a', color: '#fff', border: 'none',
                    borderRadius: 10, fontSize: 15, fontWeight: 700,
                    cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', letterSpacing: '.02em',
                    opacity: loading ? 0.7 : 1, marginTop: otpSent ? 0 : 6,
                  }}
                >
                  {loading ? (otpSent ? 'Verifying…' : 'Sending OTP…') : (otpSent ? 'Verify & Sign In →' : 'Send OTP')}
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ─── BRAND PARTNERS TICKER ─── */}
      <div style={{ background: '#111', padding: '13px 0', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <span style={{
          fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase',
          color: '#c9a84c', flexShrink: 0, padding: '0 24px', whiteSpace: 'nowrap',
        }}>
          BRAND PARTNERS
        </span>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div className="marquee-inner">
            {[...BRANDS, ...BRANDS, ...BRANDS].map((b, i) => (
              <span key={i} style={{ fontSize: 13, fontWeight: 500, color: '#c8b898', marginRight: 52, whiteSpace: 'nowrap' }}>
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── SERVICES ─── */}
      <section style={{ padding: '80px 6% 96px', background: '#fdf7f5' }}>
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2 style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 800, color: '#1a1a2e', margin: '0 0 12px', lineHeight: 1.2 }}>
            Everything your <span style={{ color: '#c9184a' }}>Corporate Travel</span> needs
          </h2>
          <p style={{ fontSize: 14, color: '#8a8a9a', margin: 0 }}>
            One unified platform for flights, hotels, ground transport, and more.
          </p>
        </div>

        {/* Row 1 — 3 cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 1060, margin: '0 auto' }}>
          {SERVICES.slice(0, 3).map(s => (
            <ServiceCard key={s.title} {...s} />
          ))}
        </div>

        {/* Row 2 — 2 cards centered */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, maxWidth: 710, margin: '20px auto 0' }}>
          {SERVICES.slice(3).map(s => (
            <ServiceCard key={s.title} {...s} />
          ))}
        </div>
      </section>
    </>
  );
}

function ServiceCard({ emoji, bg, title, desc }: { emoji: string; bg: string; title: string; desc: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #ece8e4', borderRadius: 14,
      padding: '28px 24px', transition: 'all .2s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 28px rgba(0,0,0,.09)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
    >
      <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>
        {emoji}
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginBottom: 10 }}>{title}</div>
      <p style={{ fontSize: 13, color: '#7a7a8a', lineHeight: 1.75, margin: 0 }}>{desc}</p>
    </div>
  );
}
