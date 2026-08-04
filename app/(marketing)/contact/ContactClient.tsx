'use client';
import { useState } from 'react';

const OFFICES = [
  { city: 'Mumbai (HQ)', addr: '14, Nariman Point, Mumbai – 400021', phone: '+91 22 4001 0000', email: 'mumbai@shreekalyanam.com' },
  { city: 'Delhi',       addr: 'B-12, Connaught Place, New Delhi – 110001', phone: '+91 11 4001 0000', email: 'delhi@shreekalyanam.com' },
  { city: 'Bengaluru',   addr: '3rd Floor, MG Road, Bengaluru – 560001', phone: '+91 80 4001 0000', email: 'bengaluru@shreekalyanam.com' },
];

const SERVICES = ['Flight Booking', 'Hotel Reservation', 'Holiday Package', 'Visa Assistance', 'Travel Insurance', 'Corporate Travel', 'Other'];

export default function ContactPage() {
  const [form, setForm]       = useState({ name: '', email: '', phone: '', company: '', service: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  return (
    <>
      {/* Header */}
      <section className="section bg-warm">
        <div className="label">Reach Out</div>
        <h1 className="section-title">Contact Us</h1>
        <p className="section-sub">
          Talk to a travel expert today. We respond to all enquiries within 2 business hours.
        </p>
      </section>

      <div className="divider" />

      {/* Form + Info */}
      <section className="section">
        <div className="two-col" style={{ alignItems: 'start' }}>
          {/* Form */}
          <div>
            <div className="label">Send an Enquiry</div>
            <h2 className="section-title" style={{ marginBottom: 28 }}>Let's Talk Travel</h2>
            {submitted ? (
              <div style={{ background: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: 12, padding: '32px 28px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>✓</div>
                <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: '#1a1408', marginBottom: 8 }}>
                  Thank you, {form.name.split(' ')[0]}!
                </div>
                <p style={{ fontSize: 13, color: '#4a7a50', lineHeight: 1.7 }}>
                  We've received your enquiry and will get back to you within 2 business hours.
                </p>
              </div>
            ) : (
              <form className="form-wrap" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" required placeholder="Rahul Sharma" value={form.name} onChange={e => set('name', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address *</label>
                    <input className="form-input" type="email" required placeholder="rahul@example.com" value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={e => set('phone', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Company (optional)</label>
                    <input className="form-input" placeholder="Your company name" value={form.company} onChange={e => set('company', e.target.value)} />
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Service of Interest *</label>
                    <select className="form-select" required value={form.service} onChange={e => set('service', e.target.value)}>
                      <option value="">Select a service</option>
                      {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Your Message *</label>
                    <textarea className="form-textarea" required placeholder="Tell us about your travel requirements — destination, dates, number of travellers, budget, etc." value={form.message} onChange={e => set('message', e.target.value)} />
                  </div>
                </div>
                <div style={{ marginTop: 20 }}>
                  <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', textAlign: 'center' }}>
                    Send Enquiry
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Info */}
          <div>
            <div className="label">Our Offices</div>
            <h2 className="section-title" style={{ marginBottom: 28 }}>Find Us</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 36 }}>
              {OFFICES.map(o => (
                <div key={o.city} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>{o.city}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.7 }}>
                    <div>{o.addr}</div>
                    <div style={{ marginTop: 6 }}><a href={`tel:${o.phone}`} style={{ color: 'var(--gold-dk)', textDecoration: 'none', fontWeight: 500 }}>{o.phone}</a></div>
                    <div><a href={`mailto:${o.email}`} style={{ color: 'var(--gold-dk)', textDecoration: 'none', fontWeight: 500 }}>{o.email}</a></div>
                  </div>
                </div>
              ))}
            </div>

            {/* Hours */}
            <div style={{ background: 'var(--warm)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 22px' }}>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 17, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Business Hours</div>
              {[
                { day: 'Mon – Fri', hrs: '9:00 AM – 7:00 PM' },
                { day: 'Saturday',  hrs: '10:00 AM – 5:00 PM' },
                { day: 'Sunday',    hrs: 'Emergency support only' },
              ].map(h => (
                <div key={h.day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--muted)', marginBottom: 8 }}>
                  <span>{h.day}</span>
                  <span style={{ fontWeight: 500, color: 'var(--text)' }}>{h.hrs}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid var(--border)', marginTop: 12, paddingTop: 12, fontSize: 11.5, color: 'var(--light)' }}>
                24/7 emergency travel support on +91 98000 00000
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
