'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReCAPTCHA from 'react-google-recaptcha';
import { Playfair_Display, Inter } from 'next/font/google';
import CorpNav from '../components/CorpNav';
import CorpFooter from '../components/CorpFooter';

const playfair = Playfair_Display({ subsets:['latin'], weight:['400','700'], style:['italic','normal'] });
const inter    = Inter({ subsets:['latin'], weight:['400','500','600','700','800'] });

const RECAPTCHA_ENABLED = process.env.NEXT_PUBLIC_RECAPTCHA_ENABLED === 'true';

const PARTNERS = [
  'Tata Group','Infosys','Wipro','HCL Technologies','Reliance Industries','HDFC Bank','Mahindra','Bajaj Finserv',
  'Tata Group','Infosys','Wipro','HCL Technologies','Reliance Industries','HDFC Bank','Mahindra','Bajaj Finserv',
];

const FEATURES = [
  { icon:'✈', title:'Flight Bookings',   desc:'Instant access to 500+ airlines with negotiated corporate fares and priority check-in.' },
  { icon:'🏨', title:'Hotel Management', desc:'Curated hotel inventory with real-time availability and corporate rate guarantees.' },
  { icon:'🚆', title:'Rail & Ground',    desc:'Seamless train, bus, and cab bookings integrated into a single travel itinerary.' },
  { icon:'📊', title:'Expense Analytics',desc:'Real-time travel spend dashboards to help finance teams control costs effortlessly.' },
  { icon:'🛡', title:'Duty of Care',     desc:'24/7 traveller tracking, emergency support, and risk alerts for every trip.' },
];

const ICONS = [
  { icon:'✈', lbl:'Flights'  },
  { icon:'🏨', lbl:'Hotels'  },
  { icon:'🚆', lbl:'Trains'  },
  { icon:'🚌', lbl:'Buses'   },
  { icon:'🌐', lbl:'Global'  },
  { icon:'🧳', lbl:'Baggage' },
];

export default function CorporateLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [tab,      setTab]      = useState<'login'|'reset'>('login');
  const [newPass,  setNewPass]  = useState('');
  const [confPass, setConfPass] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
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

  const inp: React.CSSProperties = {
    width:'100%', padding:'11px 14px', background:'#edf1f9',
    border:'1.5px solid #dde3f0', borderRadius:8, fontSize:13.5,
    color:'#1a1a2e', outline:'none', boxSizing:'border-box',
  };
  const lbl: React.CSSProperties = {
    display:'block', fontSize:10, fontWeight:700, letterSpacing:'.09em',
    textTransform:'uppercase', color:'#999', marginBottom:7,
  };

  return (
    <div className={inter.className} style={{ background:'#fdf6f2', minHeight:'100vh', color:'#1a1a2e' }}>

      <CorpNav />

      {/* ── HERO + FORM two-column ── */}
      <section style={{ display:'grid', gridTemplateColumns:'52% 48%', minHeight:'calc(100vh - 62px)' }}>

        {/* LEFT */}
        <div style={{
          background:'linear-gradient(145deg, #fde8e0 0%, #f8b8c8 45%, #f090a8 80%, #e87090 100%)',
          padding:'56px 8%', display:'flex', flexDirection:'column',
          justifyContent:'center', alignItems:'center', textAlign:'center',
          position:'relative', overflow:'hidden',
        }}>
          {/* large decorative circle */}
          <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translateX(-50%)',
            width:'72%', aspectRatio:'1', borderRadius:'50%',
            background:'rgba(255,255,255,.17)', pointerEvents:'none' }} />

          {/* badge */}
          <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:10.5, fontWeight:600,
            letterSpacing:'.1em', textTransform:'uppercase', color:'#7a1a2e',
            background:'rgba(255,255,255,.65)', border:'1px solid rgba(200,140,150,.5)',
            borderRadius:20, padding:'5px 16px', marginBottom:22 }}>
            ✦ Trusted by 500+ Corporations
          </div>

          {/* headline */}
          <h1 style={{ fontSize:'clamp(26px,2.8vw,42px)', fontWeight:800, lineHeight:1.2, margin:'0 0 12px', color:'#1a1a2e' }}>
            Shree Kalyanam
            <br />
            <span className={playfair.className} style={{ color:'#c8622a', fontStyle:'italic', fontWeight:700 }}>For Corporate</span>
            <br />
            <span className={playfair.className} style={{ color:'#c8622a', fontStyle:'italic', fontWeight:700 }}>Organisation</span>
            <br />
            <span style={{ color:'#c9184a', fontWeight:800 }}>{'& '}Brand Partners</span>
          </h1>

          <p style={{ fontSize:13.5, color:'#5a3040', lineHeight:1.75, marginBottom:36, maxWidth:300 }}>
            Premium travel management, curated hospitality solutions &amp; seamless corporate experiences.
          </p>

          {/* icons 3×2 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,72px)', gap:16, position:'relative', zIndex:1 }}>
            {ICONS.map(s => (
              <div key={s.lbl} style={{ width:68, height:68, borderRadius:'50%',
                background:'rgba(255,255,255,.82)', display:'flex', alignItems:'center',
                justifyContent:'center', fontSize:28, boxShadow:'0 2px 12px #0001' }}>
                {s.icon}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ background:'#f5ede8', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 7%' }}>
          <div style={{ width:'100%', maxWidth:390, background:'#fff', borderRadius:14,
            boxShadow:'0 4px 40px rgba(0,0,0,.08)', overflow:'hidden' }}>

            {/* gradient top bar */}
            <div style={{ height:5, background:'linear-gradient(90deg, #9b1535 0%, #c8622a 100%)' }} />

            <div style={{ padding:'32px 30px' }}>
              {tab === 'login' ? (
                <>
                  <h2 style={{ fontSize:24, fontWeight:700, color:'#1a1a2e', marginBottom:4 }}>Sign in</h2>
                  <p style={{ fontSize:13, color:'#999', marginBottom:18 }}>Access your corporate travel dashboard</p>

                  {/* Email / Mobile toggle */}
                  <div style={{ display:'flex', gap:6, background:'#f2f2f2', borderRadius:9, padding:4, marginBottom:20 }}>
                    {(['email','mobile'] as const).map(m => (
                      <button key={m} onClick={() => { setLoginMethod(m); setError(''); }}
                        style={{
                          flex:1, padding:'8px 0', borderRadius:6, border:'none', cursor:'pointer',
                          fontSize:12.5, fontWeight:700, letterSpacing:'.02em',
                          background: loginMethod === m ? '#fff' : 'transparent',
                          color: loginMethod === m ? '#9b1535' : '#888',
                          boxShadow: loginMethod === m ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
                        }}>
                        {m === 'email' ? 'Email' : 'Mobile'}
                      </button>
                    ))}
                  </div>

                  {loginMethod === 'email' ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:15 }}>
                      <div>
                        <label style={lbl}>Email ID</label>
                        <input type="email" placeholder="you@company.com" value={email}
                          onChange={e => setEmail(e.target.value)} style={inp} />
                      </div>
                      <div>
                        <label style={lbl}>Password</label>
                        <div style={{ position:'relative' }}>
                          <input type={showPass ? 'text' : 'password'} placeholder="••••••••"
                            value={password} onChange={e => setPassword(e.target.value)}
                            style={{ ...inp, paddingRight:42 }} />
                          <button onClick={() => setShowPass(v => !v)}
                            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                              background:'none', border:'none', cursor:'pointer', fontSize:15, color:'#bbb', lineHeight:1 }}>
                            {showPass ? '🙈' : '👁'}
                          </button>
                        </div>
                      </div>

                      {RECAPTCHA_ENABLED && (
                        <div style={{ transform:'scale(0.92)', transformOrigin:'left' }}>
                          <ReCAPTCHA
                            ref={recaptchaRef}
                            sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                            onChange={token => setRecaptchaToken(token)}
                            onExpired={() => setRecaptchaToken(null)}
                          />
                        </div>
                      )}

                      {error && (
                        <div style={{ fontSize:12.5, color:'#c9184a', background:'#fdeef1',
                          border:'1px solid #f3c6d0', borderRadius:8, padding:'9px 12px' }}>
                          {error}
                        </div>
                      )}

                      <div style={{ textAlign:'right', marginTop:-6 }}>
                        <button onClick={() => setTab('reset')}
                          style={{ background:'none', border:'none', fontSize:12.5, color:'#c9184a',
                            cursor:'pointer', fontWeight:500 }}>
                          Forgot Password?
                        </button>
                      </div>

                      <button onClick={handleSignIn} disabled={loading}
                        style={{ width:'100%', padding:'13px', background:'#9b1535', color:'#fff',
                        border:'none', borderRadius:9, fontSize:14.5, fontWeight:700,
                        cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
                        letterSpacing:'.02em' }}>
                        {loading ? 'Signing in…' : 'Sign In →'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:15 }}>
                      <div>
                        <label style={lbl}>Mobile Number</label>
                        <input type="tel" placeholder="10-digit mobile number" value={mobile}
                          disabled={otpSent} maxLength={10}
                          onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          style={{ ...inp, opacity: otpSent ? 0.6 : 1 }} />
                      </div>

                      {otpSent && (
                        <div>
                          <label style={lbl}>Enter OTP</label>
                          <input type="text" inputMode="numeric" placeholder="6-digit OTP" value={otp}
                            maxLength={6} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            style={inp} />
                        </div>
                      )}

                      {error && (
                        <div style={{ fontSize:12.5, color:'#c9184a', background:'#fdeef1',
                          border:'1px solid #f3c6d0', borderRadius:8, padding:'9px 12px' }}>
                          {error}
                        </div>
                      )}

                      {otpSent && (
                        <div style={{ textAlign:'right', marginTop:-6 }}>
                          <button onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
                            style={{ background:'none', border:'none', fontSize:12.5, color:'#c9184a',
                              cursor:'pointer', fontWeight:500 }}>
                            Change Number
                          </button>
                        </div>
                      )}

                      <button onClick={otpSent ? handleVerifyOtp : handleSendOtp} disabled={loading}
                        style={{ width:'100%', padding:'13px', background:'#9b1535', color:'#fff',
                        border:'none', borderRadius:9, fontSize:14.5, fontWeight:700,
                        cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
                        letterSpacing:'.02em' }}>
                        {loading ? (otpSent ? 'Verifying…' : 'Sending OTP…') : (otpSent ? 'Verify & Sign In →' : 'Send OTP')}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 style={{ fontSize:24, fontWeight:700, color:'#1a1a2e', marginBottom:4 }}>Reset Password</h2>
                  <p style={{ fontSize:13, color:'#999', marginBottom:22 }}>Enter and confirm your new password</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:15 }}>
                    <div>
                      <label style={lbl}>New Password</label>
                      <input type="password" placeholder="Enter new password" value={newPass}
                        onChange={e => setNewPass(e.target.value)} style={inp} />
                    </div>
                    <div>
                      <label style={lbl}>Confirm Password</label>
                      <input type="password" placeholder="Confirm new password" value={confPass}
                        onChange={e => setConfPass(e.target.value)} style={inp} />
                    </div>
                    <button style={{ width:'100%', padding:'13px', background:'#9b1535', color:'#fff',
                      border:'none', borderRadius:9, fontSize:14.5, fontWeight:700, cursor:'pointer' }}>
                      Update Password
                    </button>
                    <button onClick={() => setTab('login')}
                      style={{ background:'none', border:'none', fontSize:12.5, color:'#999',
                        cursor:'pointer', textAlign:'center' }}>
                      ← Back to Sign In
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── PARTNERS TICKER ── */}
      <div style={{ background:'#1c1c1c', padding:'16px 0', overflow:'hidden', display:'flex', alignItems:'center' }}>
        <div style={{ flexShrink:0, padding:'0 20px 0 28px', fontSize:10, fontWeight:700,
          letterSpacing:'.1em', textTransform:'uppercase', color:'#c9184a',
          borderRight:'1px solid #333', whiteSpace:'nowrap' }}>
          BRAND PARTNERS
        </div>
        <div style={{ display:'flex', animation:'ticker 30s linear infinite', whiteSpace:'nowrap', overflow:'hidden' }}>
          {PARTNERS.map((p, i) => (
            <span key={i} style={{ fontSize:13.5, fontWeight:500, color:'#ccc',
              padding:'0 36px', borderRight:'1px solid #2a2a2a', flexShrink:0 }}>{p}</span>
          ))}
        </div>
        <style>{`@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      </div>

      {/* ── FEATURES ── */}
      <section style={{ padding:'80px 6%', background:'#fdf6f2' }}>
        <div style={{ textAlign:'center', marginBottom:52 }}>
          <h2 style={{ fontSize:'clamp(26px,3.2vw,40px)', fontWeight:800, color:'#1a1a2e', margin:0, lineHeight:1.2 }}>
            Everything your{' '}
            <span className={playfair.className} style={{ color:'#c9184a', fontStyle:'italic' }}>Corporate Travel</span>
            {' '}needs
          </h2>
          <p style={{ fontSize:14, color:'#999', marginTop:12 }}>One unified platform for flights, hotels, ground transport, and more.</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20, marginBottom:20 }}>
          {FEATURES.slice(0,3).map(f => (
            <div key={f.title} style={{ background:'#fff', border:'1px solid #ede8e8', borderRadius:14,
              padding:'28px 24px', boxShadow:'0 2px 14px #0000000a' }}>
              <div style={{ width:50, height:50, borderRadius:'50%', background:'#fce8ec',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:16 }}>{f.icon}</div>
              <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e', marginBottom:8 }}>{f.title}</div>
              <p style={{ fontSize:13, color:'#888', lineHeight:1.75, margin:0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:20, maxWidth:'66.6%' }}>
          {FEATURES.slice(3).map(f => (
            <div key={f.title} style={{ background:'#fff', border:'1px solid #ede8e8', borderRadius:14,
              padding:'28px 24px', boxShadow:'0 2px 14px #0000000a' }}>
              <div style={{ width:50, height:50, borderRadius:'50%', background:'#fce8ec',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:16 }}>{f.icon}</div>
              <div style={{ fontSize:16, fontWeight:700, color:'#1a1a2e', marginBottom:8 }}>{f.title}</div>
              <p style={{ fontSize:13, color:'#888', lineHeight:1.75, margin:0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <CorpFooter />
    </div>
  );
}
