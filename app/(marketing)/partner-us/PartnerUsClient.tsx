'use client';
import { useState } from 'react';
import Link from 'next/link';

const PARTNER_TYPES = [
  {
    icon: '🏢', title: 'Corporate Client',
    desc: 'Manage your company\'s travel programme end-to-end — bookings, policy, reporting, and duty of care under one roof.',
    benefits: ['Negotiated corporate fares', 'Dedicated account manager', 'GST-ready invoices', 'Live spend dashboard'],
  },
  {
    icon: '🤝', title: 'Travel Agent / Sub-Agent',
    desc: 'Become a registered sub-agent and access our full inventory, booking tools, and support network.',
    benefits: ['GDS & direct airline access', 'Competitive commissions', 'Training & certification', '24/7 support desk'],
  },
  {
    icon: '🏨', title: 'Hotel / Vendor Partner',
    desc: 'List your property or service on our corporate platform and connect with hundreds of business travellers.',
    benefits: ['Direct corporate clients', 'Guaranteed rate agreements', 'Real-time inventory sync', 'Monthly settlement'],
  },
];

const PROCESS = [
  { step: '01', title: 'Submit Enquiry',   desc: 'Fill out the partnership form below with your business details.' },
  { step: '02', title: 'Discovery Call',   desc: 'Our partnerships team will connect with you within 48 hours.' },
  { step: '03', title: 'Agreement',        desc: 'We sign a simple partnership agreement with clear terms.' },
  { step: '04', title: 'Onboarding',       desc: 'Get access to our platform, tools, and dedicated support.' },
];

const SERVICES_LIST = ['Corporate Client', 'Travel Agent / Sub-Agent', 'Hotel / Vendor Partner', 'Technology Partner', 'Other'];

export default function PartnerUsPage() {
  const [form, setForm]           = useState({ name: '', company: '', email: '', phone: '', type: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }
  function handleSubmit(e: React.FormEvent) { e.preventDefault(); setSubmitted(true); }

  return (
    <>
      {/* Header */}
      <section className="section bg-warm">
        <div className="label">Partner With Us</div>
        <h1 className="section-title">Grow Together with<br />Shree Kalyanam</h1>
        <p className="section-sub">
          Whether you're a corporation looking to streamline travel, an agent seeking better tools,
          or a vendor wanting corporate clients — there's a partnership model designed for you.
        </p>
      </section>

      <div className="divider" />

      {/* Partner types */}
      <section className="section">
        <div className="centered" style={{ marginBottom: 48 }}>
          <div className="label">Partnership Models</div>
          <h2 className="section-title">Choose Your Partnership Type</h2>
        </div>
        <div className="card-grid card-grid-3">
          {PARTNER_TYPES.map(p => (
            <div key={p.title} className="card">
              <div className="card-icon" style={{ fontSize: 22 }}>{p.icon}</div>
              <div className="card-title-sm">{p.title}</div>
              <p className="card-text" style={{ marginBottom: 18 }}>{p.desc}</p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                {p.benefits.map(b => (
                  <li key={b} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--muted)' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* Process */}
      <section className="section bg-warm">
        <div className="centered" style={{ marginBottom: 48 }}>
          <div className="label">How It Works</div>
          <h2 className="section-title">Simple 4-Step Onboarding</h2>
        </div>
        <div className="card-grid card-grid-2" style={{ maxWidth: 800, margin: '0 auto' }}>
          {PROCESS.map(p => (
            <div key={p.step} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '28px 24px', display: 'flex', gap: 18 }}>
              <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 36, fontWeight: 700, color: 'var(--gold)', lineHeight: 1, flexShrink: 0 }}>{p.step}</span>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{p.title}</div>
                <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.75, margin: 0 }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* Form */}
      <section className="section">
        <div className="two-col" style={{ alignItems: 'start' }}>
          <div>
            <div className="label">Apply Now</div>
            <h2 className="section-title" style={{ marginBottom: 12 }}>Start Your Partnership</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 28 }}>
              Fill out the form and our partnerships team will reach out within 48 hours.
            </p>
            {submitted ? (
              <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 12, padding: '36px 28px', textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>🎉</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                  Application Received!
                </div>
                <p style={{ fontSize: 13, color: '#4a7a50', lineHeight: 1.7 }}>
                  Thanks for your interest, {form.name.split(' ')[0]}. We'll be in touch within 48 hours.
                </p>
              </div>
            ) : (
              <form className="form-wrap" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Your Name *</label>
                    <input className="form-input" required placeholder="Full name" value={form.name} onChange={e => set('name', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Company Name *</label>
                    <input className="form-input" required placeholder="Organisation name" value={form.company} onChange={e => set('company', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Business Email *</label>
                    <input className="form-input" type="email" required placeholder="you@company.com" value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Partnership Type *</label>
                    <select className="form-select" required value={form.type} onChange={e => set('type', e.target.value)}>
                      <option value="">Select type</option>
                      {SERVICES_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Tell Us About Your Business</label>
                    <textarea className="form-textarea" placeholder="Briefly describe your business and what you're looking for from this partnership." value={form.message} onChange={e => set('message', e.target.value)} />
                  </div>
                </div>
                <div style={{ marginTop: 20 }}>
                  <button type="submit" className="btn-primary" style={{ width: '100%', textAlign: 'center' }}>
                    Submit Partnership Application
                  </button>
                </div>
              </form>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="label">Why Partner With Us</div>
            <h2 className="section-title" style={{ marginBottom: 8 }}>The Shree Kalyanam Advantage</h2>
            {[
              { icon:'🌐', t:'Pan-India Network',    d:'12 offices, 50+ destinations, and a growing partner ecosystem.' },
              { icon:'💰', t:'Competitive Terms',    d:'Fair commissions, transparent settlement, and no hidden deductions.' },
              { icon:'📱', t:'Modern Tech Stack',    d:'Online booking tools, live reporting dashboards, and API integrations.' },
              { icon:'🎓', t:'Training & Support',   d:'Regular training sessions, certifications, and a dedicated partner helpdesk.' },
            ].map(v => (
              <div key={v.t} style={{ background: 'var(--warm)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{v.icon}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{v.t}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7 }}>{v.d}</div>
                </div>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <Link href="/contact" className="btn-outline">Have Questions? Contact Us</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
