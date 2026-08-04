'use client';
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

const STATS = [
  { val:'500+',     lbl:'Corporate Clients'          },
  { val:'12M+',     lbl:'Trips Managed'              },
  { val:'99.2%',    lbl:'On-Time Support'            },
  { val:'₹800Cr+',  lbl:'Travel Savings Delivered'   },
];

const FEATURES = [
  {
    n:'01', icon:'⭐', title:'Dedicated Account Management',
    desc:"A named relationship manager who knows your travel policy, your top travelers, and your business goals. Not a call center — a partner who picks up on the first ring.",
    featured: false,
  },
  {
    n:'02', icon:'💎', title:'Guaranteed Cost Savings',
    desc:'Our volume-backed negotiated fares with 500+ airlines, 50,000+ hotels, and ground operators save an average of 23% vs. booking direct. We put it in writing.',
    featured: false,
  },
  {
    n:'03', icon:'⚡', title:'One-Click Policy Compliance',
    desc:'Your travel policy is embedded in the booking flow. Every ticket, hotel, and cab is automatically validated — no manual auditing, no policy leakage.',
    featured: false,
  },
  {
    n:'04', icon:'🛡', title:'24 × 7 Duty of Care',
    desc:"Real-time traveller tracking, proactive alerts for disruptions, and a dedicated emergency desk that never sleeps — because corporate travel doesn't follow business hours.",
    featured: false,
  },
  {
    n:'05', icon:'📊', title:'Finance-Grade Analytics',
    desc:'CFO-ready dashboards with spend-by-department, route, traveller, and vendor — plus AI-powered forecasting to plan your travel budget with confidence.',
    featured: false,
  },
  {
    n:'06', icon:'🌐', title:'End-to-End Integration',
    desc:'Native integrations with SAP Concur, Oracle, Zoho, and all major HRMS/ERP platforms. One source of truth for bookings, expenses, and approvals.',
    featured: true,
  },
];

const TESTIMONIALS = [
  {
    quote:'"Shree Kalyanam reduced our quarterly travel spend by 27% without compromising on comfort. The analytics dashboard alone is worth the partnership."',
    name:'Rajesh Verma', role:'CFO, Sinhgad Technologies', init:'RV', color:'#c9184a',
  },
  {
    quote:'"When a flight was cancelled at 2 AM in Singapore, their team had our director rebooked and in a hotel within 20 minutes. That\'s the standard we needed."',
    name:'Priya Mehta', role:'Head of Operations, NovaBridge', init:'PM', color:'#c8622a',
  },
  {
    quote:'"The policy compliance feature has been a game-changer. Our finance team no longer spends 40 hours a month auditing expense reports. It just works."',
    name:'Arjun Singh', role:'VP Finance, Lumina Global', init:'AS', color:'#6a1a8a',
  },
];

export default function WhyUsPage() {
  return (
    <div className={inter.className} style={{ background:'#fdf6f2', minHeight:'100vh', color:'#1a1a2e' }}>

      <CorpNav />

      {/* ── HERO ── */}
      <section style={{ background:'linear-gradient(160deg,#fde8e0 0%,#f8c8d4 60%,#f5b0c0 100%)', padding:'72px 6% 80px', textAlign:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:10.5, fontWeight:600,
          letterSpacing:'.1em', textTransform:'uppercase', color:'#7a1a2e',
          background:'rgba(255,255,255,.65)', border:'1px solid rgba(200,140,150,.5)',
          borderRadius:20, padding:'5px 16px', marginBottom:22 }}>
          ✦ India's Most Trusted Corporate Travel Partner
        </div>
        <h1 style={{ fontSize:'clamp(28px,4vw,52px)', fontWeight:800, lineHeight:1.15, margin:'0 0 12px', color:'#1a1a2e' }}>
          Why Corporations Choose<br />
          <span className={playfair.className} style={{ color:'#c8622a', fontStyle:'italic' }}>Shree Kalyanam</span>
        </h1>
        <p style={{ fontSize:14.5, color:'#6a5050', maxWidth:480, margin:'0 auto', lineHeight:1.75 }}>
          We don't just book trips — we engineer seamless corporate travel experiences backed by technology, expertise, and genuine care.
        </p>
      </section>

      {/* ── STATS BAR ── */}
      <div style={{ background:'#1c1510', display:'grid', gridTemplateColumns:'repeat(4,1fr)' }}>
        {STATS.map((s, i) => (
          <div key={s.lbl} style={{ padding:'32px 20px', textAlign:'center',
            borderRight: i < 3 ? '1px solid #2e2010' : 'none' }}>
            <div className={playfair.className} style={{ fontSize:40, fontWeight:700, color:'#c8622a', lineHeight:1, marginBottom:8 }}>
              {s.val}
            </div>
            <div style={{ fontSize:11.5, color:'#7a6a50', letterSpacing:'.05em', textTransform:'uppercase' }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── OUR DIFFERENCE ── */}
      <section style={{ padding:'72px 6%', background:'#fff' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:28, height:2, background:'#c9184a' }} />
            <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#c9184a' }}>Our Difference</span>
            <div style={{ width:28, height:2, background:'#c9184a' }} />
          </div>
          <h2 style={{ fontSize:'clamp(24px,3vw,42px)', fontWeight:800, color:'#1a1a2e', margin:'0 0 12px', lineHeight:1.2 }}>
            Built for the demands of<br />
            <span className={playfair.className} style={{ color:'#c8622a', fontStyle:'italic' }}>modern enterprise</span>
            {' '}travel
          </h2>
          <p style={{ fontSize:14, color:'#888', maxWidth:520, margin:'0 auto' }}>
            Every feature, every policy, every workflow — designed around how corporate India actually travels.
          </p>
        </div>

        {/* 2-col feature grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>
          {FEATURES.map(f => (
            <div key={f.n} style={{
              position:'relative', borderRadius:14, overflow:'hidden',
              border: f.featured ? 'none' : '1px solid #ede8e8',
              boxShadow:'0 2px 14px #0000000a', background:'#fff',
            }}>
              {/* gradient top border for featured card */}
              {f.featured && (
                <div style={{ height:4, background:'linear-gradient(90deg,#9b1535 0%,#c8622a 100%)' }} />
              )}
              <div style={{ padding:'32px 28px' }}>
                {/* faint number */}
                <div className={playfair.className} style={{ fontSize:52, fontWeight:700,
                  color: f.featured ? '#f5dde0' : '#f0e8e8', lineHeight:1, marginBottom:16,
                  position:'absolute', top:f.featured?12:8, left:24, zIndex:0, userSelect:'none' }}>
                  {f.n}
                </div>
                <div style={{ position:'relative', zIndex:1 }}>
                  <div style={{ width:44, height:44, borderRadius:11, background:'#fce8ec',
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, marginBottom:16 }}>
                    {f.icon}
                  </div>
                  <div style={{ fontSize:17, fontWeight:700, color:'#1a1a2e', marginBottom:10 }}>{f.title}</div>
                  <p style={{ fontSize:13.5, color:'#777', lineHeight:1.75, margin:0 }}>{f.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding:'72px 6%', background:'#1c1510' }}>
        <div style={{ marginBottom:48 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:28, height:2, background:'#c8622a' }} />
            <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#c8622a' }}>Client Stories</span>
          </div>
          <h2 style={{ fontSize:'clamp(24px,3vw,40px)', fontWeight:800, color:'#f0e8d8', margin:0, lineHeight:1.2 }}>
            {"Trusted by "}
            <span className={playfair.className} style={{ color:'#c8622a', fontStyle:'italic' }}>{"India's leading"}</span>
            {" enterprises"}
          </h2>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={{ background:'#241a14', border:'1px solid #2e2010',
              borderRadius:14, padding:'28px 24px' }}>
              {/* stars */}
              <div style={{ color:'#c8622a', fontSize:14, letterSpacing:2, marginBottom:16 }}>★★★★★</div>
              <p style={{ fontSize:13.5, color:'#c8b890', lineHeight:1.75, marginBottom:24, fontStyle:'italic' }}>{t.quote}</p>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:'50%', background:t.color,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:13, fontWeight:700, color:'#fff', flexShrink:0 }}>
                  {t.init}
                </div>
                <div>
                  <div style={{ fontSize:13.5, fontWeight:600, color:'#f0e8d8' }}>{t.name}</div>
                  <div style={{ fontSize:11.5, color:'#7a6a50', marginTop:2 }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background:'linear-gradient(135deg,#9b1535 0%,#c8622a 100%)', padding:'64px 6%',
        display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:24 }}>
        <div>
          <h2 style={{ fontSize:'clamp(20px,3vw,34px)', fontWeight:800, color:'#fff', margin:'0 0 8px', lineHeight:1.2 }}>
            Ready to transform your corporate travel?
          </h2>
          <p style={{ fontSize:14, color:'rgba(255,255,255,.75)', margin:0 }}>
            Join 500+ organisations already saving time and money with Shree Kalyanam.
          </p>
        </div>
        <Link href="/corporate/contact" style={{ padding:'14px 32px', background:'#fff', color:'#9b1535',
          borderRadius:10, fontSize:14, fontWeight:700, textDecoration:'none', whiteSpace:'nowrap',
          boxShadow:'0 4px 20px rgba(0,0,0,.15)' }}>
          Get a Free Consultation →
        </Link>
      </section>

      <CorpFooter ticker />
    </div>
  );
}
