'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Playfair_Display, Inter } from 'next/font/google';
import CorpNav from '../components/CorpNav';
import CorpFooter from '../components/CorpFooter';

const playfair = Playfair_Display({ subsets:['latin'], weight:['400','700'], style:['italic','normal'] });
const inter    = Inter({ subsets:['latin'], weight:['400','500','600','700','800'] });

const PARTNERS = [
  'Tata Group','Infosys','Wipro','HCL Technologies','Reliance Industries','HDFC Bank','Mahindra','Bajaj Finserv',
  'Tata Group','Infosys','Wipro','HCL Technologies','Reliance Industries','HDFC Bank','Mahindra','Bajaj Finserv',
];

const TRACKS = [
  {
    icon:'✈', title:'Airline & Transport',
    desc:'List your routes and seats with guaranteed volume commitments from our 500+ corporate clients.',
    features:['Volume-guaranteed bookings','Priority listing on our platform','Co-marketing opportunities','Real-time inventory integration'],
    featured: false,
  },
  {
    icon:'🏨', title:'Hotel & Hospitality',
    desc:'Access a steady stream of corporate guests with predictable revenue and long-stay bookings.',
    features:['Negotiated corporate rate programs','Last-room availability access','Dedicated corporate concierge','Seamless invoicing & billing'],
    featured: true,
  },
  {
    icon:'🚌', title:'Ground Transport',
    desc:'Integrate your cab, bus, or car rental fleet into our end-to-end travel itinerary platform.',
    features:['API-based fleet integration','Automated dispatch management','Corporate billing accounts','Performance-based rewards'],
    featured: false,
  },
  {
    icon:'💻', title:'Technology Partner',
    desc:'Build on top of the SK platform via our open API — expense tools, HR systems, analytics dashboards.',
    features:['Full REST API access','Dedicated sandbox environment','Joint go-to-market support','Revenue share program'],
    featured: false,
  },
  {
    icon:'🤝', title:'Referral Partner',
    desc:'Refer corporate clients and earn commissions. Perfect for consultants, HR firms, and business networks.',
    features:['Up to 8% referral commission','Dedicated partner portal','Real-time earnings tracker','Co-branded collateral'],
    featured: false,
  },
  {
    icon:'🌍', title:'DMC & Local Operator',
    desc:'Offer your destination expertise to SK\'s corporate clients planning events, offsites, and international travel.',
    features:['MICE event referrals','International corporate groups','Transparent commission structure','Multi-destination programs'],
    featured: false,
  },
];

const STEPS = [
  { n:'1', title:'Submit Interest',    desc:'Fill the partner enquiry form below. Takes less than 3 minutes.' },
  { n:'2', title:'Discovery Call',     desc:'Our partnerships team schedules a 30-min call to understand your business.' },
  { n:'3', title:'Agreement & Setup',  desc:'Sign the partnership agreement and complete API or inventory integration.' },
  { n:'4', title:'Go Live',            desc:"You're live on the SK platform and start receiving corporate bookings." },
];

const BENEFITS = [
  { icon:'📈', title:'Guaranteed Volume',   desc:'Access our 500+ active corporate accounts generating consistent, predictable demand.' },
  { icon:'💳', title:'Fast Payments',       desc:'Weekly settlement cycles with transparent reconciliation. No chasing invoices.' },
  { icon:'🎯', title:'Dedicated Support',   desc:'A named partner success manager and 24/7 operations desk at your disposal.' },
];

const SIZES   = ['Select size','1–10','11–50','51–200','201–500','500+'];
const TRACKS_DD = ['Select partnership type','Airline & Transport','Hotel & Hospitality','Ground Transport','Technology Partner','Referral Partner','DMC & Local Operator'];

export default function PartnerUsPage() {
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', company:'', phone:'', size:'Select size', track:'Select partnership type', about:'' });
  const [sent, setSent] = useState(false);
  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const inp: React.CSSProperties = {
    width:'100%', padding:'11px 14px', background:'#fff', border:'1.5px solid #e8e0d8',
    borderRadius:8, fontSize:13.5, color:'#1a1a2e', outline:'none', boxSizing:'border-box',
  };
  const lbl: React.CSSProperties = {
    display:'block', fontSize:10, fontWeight:700, letterSpacing:'.09em',
    textTransform:'uppercase', color:'#999', marginBottom:6,
  };

  return (
    <div className={inter.className} style={{ background:'#fdf6f2', minHeight:'100vh', color:'#1a1a2e' }}>

      <CorpNav />

      {/* ── HERO ── */}
      <section style={{ background:'linear-gradient(160deg,#fde8e0 0%,#f8c8d4 60%,#f5b0c0 100%)', padding:'72px 6% 80px', textAlign:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:10.5, fontWeight:600,
          letterSpacing:'.1em', textTransform:'uppercase', color:'#7a1a2e',
          background:'rgba(255,255,255,.65)', border:'1px solid rgba(200,140,150,.5)',
          borderRadius:20, padding:'5px 16px', marginBottom:22 }}>
          ✦ Grow Together With Us
        </div>
        <h1 style={{ fontSize:'clamp(28px,4vw,52px)', fontWeight:800, lineHeight:1.2, margin:'0 0 12px', color:'#1a1a2e' }}>
          Partner with<br />
          <span className={playfair.className} style={{ color:'#c8622a', fontStyle:'italic' }}>Shree Kalyanam</span>
        </h1>
        <p style={{ fontSize:14.5, color:'#6a5050', maxWidth:500, margin:'0 auto', lineHeight:1.75 }}>
          Join our ecosystem of 500+ trusted partners — airlines, hotels, ground operators, and technology providers powering India's corporate travel.
        </p>
      </section>

      {/* ── PARTNERSHIP TRACKS ── */}
      <section style={{ padding:'64px 6%', background:'#fff' }}>
        <div style={{ marginBottom:40 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:28, height:2, background:'#c9184a' }} />
            <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#c9184a' }}>Partnership Tracks</span>
          </div>
          <h2 style={{ fontSize:'clamp(22px,3vw,36px)', fontWeight:800, margin:'0 0 10px', lineHeight:1.2 }}>
            Find your{' '}
            <span className={playfair.className} style={{ color:'#c8622a', fontStyle:'italic' }}>perfect partnership</span>
            {' '}model
          </h2>
          <p style={{ fontSize:14, color:'#888', maxWidth:580 }}>
            {"Whether you're an airline, hotel chain, technology platform, or a boutique travel operator — there's a place for you in the SK ecosystem."}
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
          {TRACKS.map(t => (
            <div key={t.title} style={{
              borderRadius:14, padding:'28px 24px',
              background: t.featured ? '#8b1535' : '#fff',
              border: t.featured ? 'none' : '1px solid #ede8e8',
              boxShadow: t.featured ? '0 8px 40px rgba(139,21,53,.3)' : '0 2px 14px #0000000a',
            }}>
              <div style={{ width:48, height:48, borderRadius:12,
                background: t.featured ? 'rgba(255,255,255,.2)' : '#fce8ec',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:18 }}>
                {t.icon}
              </div>
              <div style={{ fontSize:17, fontWeight:700, color: t.featured ? '#fff' : '#1a1a2e', marginBottom:8 }}>{t.title}</div>
              <p style={{ fontSize:13, color: t.featured ? 'rgba(255,255,255,.75)' : '#888', lineHeight:1.7, marginBottom:16 }}>{t.desc}</p>
              <ul style={{ listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:7 }}>
                {t.features.map(f => (
                  <li key={f} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:12.5,
                    color: t.featured ? 'rgba(255,255,255,.85)' : '#555' }}>
                    <span style={{ color: t.featured ? '#f9a8c0' : '#c9184a', fontWeight:700, flexShrink:0, marginTop:1 }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── ONBOARDING STEPS ── */}
      <section style={{ padding:'72px 6%', background:'#1c1510' }}>
        <div style={{ marginBottom:52 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:28, height:2, background:'#c8622a' }} />
            <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#c8622a' }}>The Process</span>
          </div>
          <h2 style={{ fontSize:'clamp(24px,3vw,40px)', fontWeight:800, color:'#f0e8d8', margin:'0 0 10px', lineHeight:1.2 }}>
            Onboarding in{' '}
            <span className={playfair.className} style={{ color:'#c8622a', fontStyle:'italic' }}>4 simple steps</span>
          </h2>
          <p style={{ fontSize:14, color:'#7a6a50', maxWidth:440 }}>
            From first enquiry to live partnership — typically completed in under 7 business days.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:32 }}>
          {STEPS.map((s, i) => (
            <div key={s.n} style={{ textAlign:'center' }}>
              {/* connector line */}
              <div style={{ position:'relative', display:'flex', justifyContent:'center', marginBottom:20 }}>
                {i < STEPS.length - 1 && (
                  <div style={{ position:'absolute', left:'50%', top:'50%', transform:'translateY(-50%)',
                    width:'100%', height:2, background:'#2e2010', zIndex:0 }} />
                )}
                <div style={{ width:54, height:54, borderRadius:'50%', background:'#8b1535',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:20, fontWeight:800, color:'#fff', position:'relative', zIndex:1,
                  boxShadow:'0 4px 20px rgba(139,21,53,.4)' }}>
                  {s.n}
                </div>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:'#f0e8d8', marginBottom:8 }}>{s.title}</div>
              <p style={{ fontSize:12.5, color:'#7a6a50', lineHeight:1.7, margin:0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── ENQUIRY SECTION ── */}
      <section style={{ padding:'64px 6%', background:'#fdf6f2', display:'grid', gridTemplateColumns:'1fr 1.2fr', gap:60, alignItems:'start' }}>

        {/* LEFT */}
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:28, height:2, background:'#c9184a' }} />
            <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#c9184a' }}>Partner Enquiry</span>
          </div>
          <h2 style={{ fontSize:'clamp(22px,2.8vw,36px)', fontWeight:800, margin:'0 0 14px', lineHeight:1.2, color:'#1a1a2e' }}>
            {"Let's build something"}<br />
            <span className={playfair.className} style={{ color:'#c8622a', fontStyle:'italic' }}>great together</span>
          </h2>
          <p style={{ fontSize:13.5, color:'#888', lineHeight:1.75, marginBottom:36, maxWidth:360 }}>
            Tell us about your business and we'll match you to the right partnership track within 48 hours.
          </p>

          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
            {BENEFITS.map(b => (
              <div key={b.title} style={{ display:'flex', gap:16, alignItems:'flex-start' }}>
                <div style={{ width:42, height:42, borderRadius:10, background:'#fce8ec',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {b.icon}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:4 }}>{b.title}</div>
                  <p style={{ fontSize:13, color:'#888', lineHeight:1.65, margin:0 }}>{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — form */}
        <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 4px 40px rgba(0,0,0,.08)', overflow:'hidden' }}>
          <div style={{ height:4, background:'linear-gradient(90deg,#9b1535 0%,#c8622a 100%)' }} />
          <div style={{ padding:'32px 30px' }}>
            <h3 style={{ fontSize:20, fontWeight:700, color:'#1a1a2e', marginBottom:4 }}>Partner Enquiry Form</h3>
            <p style={{ fontSize:13, color:'#999', marginBottom:24 }}>Our team will respond within 48 business hours</p>

            {sent ? (
              <div style={{ textAlign:'center', padding:'32px 0' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>✓</div>
                <div style={{ fontSize:18, fontWeight:700, color:'#1a1a2e', marginBottom:8 }}>Enquiry Submitted!</div>
                <p style={{ fontSize:13, color:'#888' }}>{"We'll be in touch within 48 hours."}</p>
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); setSent(true); }} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div>
                    <label style={lbl}>First Name</label>
                    <input style={inp} placeholder="Arjun" value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
                  </div>
                  <div>
                    <label style={lbl}>Last Name</label>
                    <input style={inp} placeholder="Sharma" value={form.lastName} onChange={e => set('lastName', e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Business Email</label>
                  <input type="email" style={inp} placeholder="arjun@company.com" value={form.email} onChange={e => set('email', e.target.value)} required />
                </div>
                <div>
                  <label style={lbl}>Company Name</label>
                  <input style={inp} placeholder="Your Company Pvt. Ltd." value={form.company} onChange={e => set('company', e.target.value)} required />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div>
                    <label style={lbl}>Phone Number</label>
                    <input style={inp} placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>Company Size</label>
                    <select style={{ ...inp, appearance:'none', cursor:'pointer' }} value={form.size} onChange={e => set('size', e.target.value)}>
                      {SIZES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Partnership Track</label>
                  <select style={{ ...inp, appearance:'none', cursor:'pointer' }} value={form.track} onChange={e => set('track', e.target.value)}>
                    {TRACKS_DD.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Tell Us About Your Business</label>
                  <textarea style={{ ...inp, minHeight:110, resize:'vertical' }}
                    placeholder="Briefly describe your company, services, and what you're looking to achieve with this partnership..."
                    value={form.about} onChange={e => set('about', e.target.value)} required />
                </div>
                <button type="submit" style={{ width:'100%', padding:'14px', background:'#9b1535', color:'#fff',
                  border:'none', borderRadius:9, fontSize:14.5, fontWeight:700, cursor:'pointer', letterSpacing:'.02em' }}>
                  Submit Partnership Enquiry →
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <CorpFooter ticker />
    </div>
  );
}
