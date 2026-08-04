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

const FAQS = [
  { q:'How quickly can you onboard a new corporate client?',  a:'We typically onboard new corporate clients within 2–3 business days, including account setup, travel policy configuration, and team training.' },
  { q:'Do you support international travel bookings?',         a:'Yes, we support bookings to 50+ countries across flights, hotels, visa assistance, and travel insurance.' },
  { q:'Is there a minimum travel spend to qualify?',           a:'There is no minimum spend to get started. We work with businesses of all sizes, from startups to large enterprises.' },
  { q:'How does billing and invoicing work?',                  a:'We offer monthly consolidated invoicing with GST-compliant bills, direct bank transfer, and corporate credit options.' },
  { q:'Can you handle MICE and corporate events?',             a:'Absolutely. Our MICE team manages conferences, incentive trips, corporate retreats, and group bookings end-to-end.' },
  { q:'What integrations do you support?',                     a:'We integrate with major HRMS, ERP, and expense management platforms including SAP Concur, Oracle, and Zoho Expense.' },
];

const OFFICES = [
  { name:'Mumbai – Head Office', addr:'Level 14, Bandra Kurla Complex,\nMumbai, Maharashtra 400 051', tag:'HQ',         tagClr:'#c9184a', tagBg:'#fce8ec', icon:'🏢' },
  { name:'New Delhi',            addr:'3rd Floor, Connaught Place,\nNew Delhi 110 001',                tag:'North India', tagClr:'#c8622a', tagBg:'#fef3e8', icon:'🏛' },
  { name:'Bengaluru',            addr:'12th Floor, Prestige Tower, MG Road,\nBengaluru, Karnataka 560 001', tag:'South India', tagClr:'#c8622a', tagBg:'#fef3e8', icon:'🏙' },
];

const CONTACT_CARDS = [
  { icon:'📞', title:'Call Us',        sub:'Speak directly with our corporate travel team', line1:'1800–123–4567',    line2:'Mon – Sat, 9 AM – 7 PM'       },
  { icon:'✉',  title:'Email Us',       sub:'For detailed enquiries and documentation',       line1:'hello@shreekalyanam.com', line2:'Response within 24 hrs'  },
  { icon:'💬', title:'Live Chat',      sub:'Chat with our support team in real-time',        line1:'Start a Chat →',  line2:'24 × 7 Available'              },
  { icon:'🆘', title:'Emergency Desk', sub:'For urgent on-trip assistance and disruptions',  line1:'1800–999–0001',   line2:'24 × 7 Emergency'              },
];

const TOPICS = ['Select a topic','Flight Booking','Hotel Reservation','Visa Assistance','Corporate Account','MICE & Events','Billing','Other'];

export default function CorporateContactPage() {
  const [form, setForm]   = useState({ firstName:'', lastName:'', email:'', phone:'', company:'', topic:'Select a topic', message:'' });
  const [open, setOpen]   = useState<number|null>(null);
  const [sent, setSent]   = useState(false);

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
          ✦ We're Here to Help
        </div>
        <h1 style={{ fontSize:'clamp(28px,4vw,50px)', fontWeight:800, lineHeight:1.2, margin:'0 0 12px', color:'#1a1a2e' }}>
          Get in touch with<br />
          <span className={playfair.className} style={{ color:'#c8622a', fontStyle:'italic' }}>Shree Kalyanam</span>
        </h1>
        <p style={{ fontSize:14.5, color:'#6a5050', maxWidth:480, margin:'0 auto', lineHeight:1.75 }}>
          Whether you're a new client, an existing partner, or just curious —<br />
          our team is ready to respond within 24 hours.
        </p>
      </section>

      {/* ── CONTACT CARDS ── */}
      <section style={{ padding:'48px 6%', background:'#fff' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20 }}>
          {CONTACT_CARDS.map(c => (
            <div key={c.title} style={{ border:'1px solid #f0e8e8', borderRadius:14, padding:'28px 22px', textAlign:'center',
              boxShadow:'0 2px 14px #0000000a', background:'#fff' }}>
              <div style={{ fontSize:30, marginBottom:14 }}>{c.icon}</div>
              <div style={{ fontSize:15, fontWeight:700, color:'#1a1a2e', marginBottom:6 }}>{c.title}</div>
              <p style={{ fontSize:12.5, color:'#999', lineHeight:1.65, marginBottom:14 }}>{c.sub}</p>
              <div style={{ fontSize:13, fontWeight:600, color:'#c9184a', marginBottom:4 }}>{c.line1}</div>
              <div style={{ fontSize:11.5, color:'#c9184a' }}>{c.line2}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── OFFICES + FORM ── */}
      <section style={{ padding:'56px 6%', background:'#fdf6f2', display:'grid', gridTemplateColumns:'1fr 1fr', gap:60, alignItems:'start' }}>

        {/* LEFT — offices */}
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:28, height:2, background:'#c9184a' }} />
            <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#c9184a' }}>Our Offices</span>
          </div>
          <h2 style={{ fontSize:'clamp(22px,2.5vw,34px)', fontWeight:800, margin:'0 0 12px', lineHeight:1.2 }}>
            Find us{' '}
            <span className={playfair.className} style={{ color:'#c8622a', fontStyle:'italic' }}>across India</span>
          </h2>
          <p style={{ fontSize:13.5, color:'#888', lineHeight:1.7, marginBottom:28, maxWidth:380 }}>
            With offices in India's key business hubs, we're never far from where your business operates.
          </p>

          <div style={{ display:'flex', flexDirection:'column', gap:16, marginBottom:36 }}>
            {OFFICES.map(o => (
              <div key={o.name} style={{ display:'flex', gap:14, alignItems:'flex-start',
                background:'#fff', border:'1px solid #f0e8e8', borderRadius:12,
                padding:'18px 20px', boxShadow:'0 2px 10px #0000000a' }}>
                <div style={{ width:42, height:42, borderRadius:10, background:'#fce8ec',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {o.icon}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:'#1a1a2e', marginBottom:4 }}>{o.name}</div>
                  <div style={{ fontSize:12.5, color:'#888', lineHeight:1.6, whiteSpace:'pre-line', marginBottom:8 }}>{o.addr}</div>
                  <span style={{ display:'inline-block', fontSize:11, fontWeight:600, padding:'2px 10px',
                    borderRadius:20, background:o.tagBg, color:o.tagClr, border:`1px solid ${o.tagClr}40` }}>
                    {o.tag}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Social */}
          <div>
            <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#999', marginBottom:14 }}>Follow Us</div>
            <div style={{ display:'flex', gap:12 }}>
              {['in','𝕏','f','▶','✉'].map(s => (
                <div key={s} style={{ width:36, height:36, borderRadius:8, border:'1px solid #e8e0d8',
                  display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
                  color:'#888', cursor:'pointer', background:'#fff' }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — form */}
        <div style={{ background:'#fff', borderRadius:14, boxShadow:'0 4px 40px rgba(0,0,0,.08)', overflow:'hidden' }}>
          <div style={{ height:4, background:'linear-gradient(90deg,#9b1535 0%,#c8622a 100%)' }} />
          <div style={{ padding:'32px 30px' }}>
            <h3 style={{ fontSize:20, fontWeight:700, color:'#1a1a2e', marginBottom:4 }}>Send Us a Message</h3>
            <p style={{ fontSize:13, color:'#999', marginBottom:24 }}>{"We'll get back to you within one business day"}</p>

            {sent ? (
              <div style={{ textAlign:'center', padding:'32px 0' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>✓</div>
                <div style={{ fontSize:18, fontWeight:700, color:'#1a1a2e', marginBottom:8 }}>Message Sent!</div>
                <p style={{ fontSize:13, color:'#888' }}>{"We'll get back to you within one business day."}</p>
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); setSent(true); }} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div>
                    <label style={lbl}>First Name</label>
                    <input style={inp} placeholder="Priya" value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
                  </div>
                  <div>
                    <label style={lbl}>Last Name</label>
                    <input style={inp} placeholder="Nair" value={form.lastName} onChange={e => set('lastName', e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label style={lbl}>Business Email</label>
                  <input type="email" style={inp} placeholder="priya@company.com" value={form.email} onChange={e => set('email', e.target.value)} required />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div>
                    <label style={lbl}>Phone</label>
                    <input style={inp} placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                  <div>
                    <label style={lbl}>Company</label>
                    <input style={inp} placeholder="Company Pvt. Ltd." value={form.company} onChange={e => set('company', e.target.value)} />
                  </div>
                </div>
                <div>
                  <label style={lbl}>{"I'm Reaching Out About"}</label>
                  <select style={{ ...inp, appearance:'none', cursor:'pointer' }} value={form.topic} onChange={e => set('topic', e.target.value)}>
                    {TOPICS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Your Message</label>
                  <textarea style={{ ...inp, minHeight:110, resize:'vertical' }} placeholder="Tell us how we can help you..."
                    value={form.message} onChange={e => set('message', e.target.value)} required />
                </div>
                <button type="submit" style={{ width:'100%', padding:'14px', background:'#9b1535', color:'#fff',
                  border:'none', borderRadius:9, fontSize:14.5, fontWeight:700, cursor:'pointer', letterSpacing:'.02em' }}>
                  Send Message →
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding:'72px 6%', background:'#1c1510' }}>
        <div style={{ marginBottom:48 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:28, height:2, background:'#c8622a' }} />
            <span style={{ fontSize:10.5, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'#c8622a' }}>Quick Answers</span>
          </div>
          <h2 style={{ fontSize:'clamp(24px,3vw,40px)', fontWeight:800, color:'#f0e8d8', margin:0, lineHeight:1.2 }}>
            Frequently asked{' '}
            <span className={playfair.className} style={{ color:'#c8622a', fontStyle:'italic' }}>questions</span>
          </h2>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {FAQS.map((f, i) => (
            <div key={i} style={{ background:'#241a14', border:'1px solid #2e2010', borderRadius:10, overflow:'hidden', cursor:'pointer' }}
              onClick={() => setOpen(open === i ? null : i)}>
              <div style={{ padding:'18px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
                <span style={{ fontSize:13.5, fontWeight:500, color:'#e0d0c0', lineHeight:1.5,
                  fontStyle: i === 3 ? 'italic' : 'normal' }}>{f.q}</span>
                <div style={{ width:26, height:26, borderRadius:'50%', border:'1px solid #3a2a18',
                  display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  color:'#c8622a', fontSize:16, fontWeight:300 }}>
                  {open === i ? '−' : '+'}
                </div>
              </div>
              {open === i && (
                <div style={{ padding:'0 20px 18px', fontSize:13, color:'#9a8a70', lineHeight:1.75 }}>{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <CorpFooter ticker />
    </div>
  );
}
