import Link from 'next/link';
import type { Metadata } from 'next';
import { getMetadataFor } from '@/app/lib/seo';
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from '@/app/lib/jsonLd';

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataFor('why-us', '/why-us');
}

const REASONS = [
  {
    icon: '🏆', title: 'IATA Accredited Agency',
    desc: 'Fully certified by the International Air Transport Association — giving you direct airline access, priority ticketing, and guaranteed fare integrity.',
  },
  {
    icon: '🤝', title: '500+ Corporate Clients',
    desc: 'From mid-size companies to Fortune 500 enterprises, our corporate travel desk manages thousands of business trips every month.',
  },
  {
    icon: '⚡', title: 'Instant Confirmation',
    desc: 'Real-time booking engine connected to 500+ airlines, 1 lakh+ hotels, and all major rail networks — confirmations in under 60 seconds.',
  },
  {
    icon: '🛡️', title: 'Duty of Care',
    desc: '24/7 traveller tracking, live risk alerts, and emergency assistance so your employees are always safe, wherever they are.',
  },
  {
    icon: '📊', title: 'Spend Visibility',
    desc: 'Live dashboards, policy compliance reports, and GST-ready invoicing give your finance team complete control over travel budgets.',
  },
  {
    icon: '💬', title: 'Dedicated Account Manager',
    desc: 'Every corporate client gets a named account manager — one point of contact for bookings, escalations, and strategy.',
  },
];

const STATS = [
  { val: '16+',   lbl: 'Years in Business'      },
  { val: '500+',  lbl: 'Corporate Partners'      },
  { val: '2.4L+', lbl: 'Trips Managed'           },
  { val: '98%',   lbl: 'Client Retention Rate'   },
];

const TESTIMONIALS = [
  {
    quote: 'Shree Kalyanam reduced our travel costs by 22% in the first quarter. The expense dashboard alone saved our finance team hours every week.',
    name: 'Anil Kapoor', role: 'CFO, TechBridge Solutions', init: 'AK', bg: '#e3f2fd',
  },
  {
    quote: 'Our employees love the seamless booking experience. And whenever there\'s a last-minute change, the team handles it within minutes.',
    name: 'Sunita Rao', role: 'HR Director, Meridian Corp', init: 'SR', bg: '#e8f5e9',
  },
  {
    quote: 'We\'ve tried three other travel management companies. None came close to the transparency and responsiveness of Shree Kalyanam.',
    name: 'Deepak Mehta', role: 'COO, Inova Pharma', init: 'DM', bg: '#fff8e1',
  },
];

export default function WhyUsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Why Us', path: '/why-us' }])} />
      <JsonLd data={webPageJsonLd({ name: 'Why Choose Shree Kalyanam', description: 'Why leading Indian businesses trust Shree Kalyanam for corporate travel management.', path: '/why-us' })} />
      {/* Header */}
      <section className="section bg-warm">
        <div className="label">Why Shree Kalyanam</div>
        <h1 className="section-title">The Corporate Travel Partner<br />You've Been Looking For</h1>
        <p className="section-sub">
          We don't just book trips. We manage your entire corporate travel programme —
          saving time, cutting costs, and keeping your team safe at every step.
        </p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Link href="/partner-us" className="btn-primary">Become a Partner</Link>
          <Link href="/contact"    className="btn-outline">Talk to an Expert</Link>
        </div>
      </section>

      <div className="divider" />

      {/* Stats */}
      <div className="stats-bar">
        {STATS.map(s => (
          <div key={s.lbl} className="stat-item">
            <span className="stat-val">{s.val}</span>
            <span className="stat-lbl">{s.lbl}</span>
          </div>
        ))}
      </div>

      {/* Reasons */}
      <section className="section">
        <div className="centered" style={{ marginBottom: 48 }}>
          <div className="label">Our Strengths</div>
          <h2 className="section-title">6 Reasons Companies Choose Us</h2>
          <p className="section-sub">
            Built specifically for corporate travel — not adapted from a leisure platform.
          </p>
        </div>
        <div className="card-grid card-grid-3">
          {REASONS.map(r => (
            <div key={r.title} className="card">
              <div className="card-icon" style={{ fontSize: 22 }}>{r.icon}</div>
              <div className="card-title-sm">{r.title}</div>
              <p className="card-text">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* Testimonials */}
      <section className="section bg-warm">
        <div className="centered" style={{ marginBottom: 48 }}>
          <div className="label">Client Stories</div>
          <h2 className="section-title">What Our Clients Say</h2>
        </div>
        <div className="card-grid card-grid-3">
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '28px 24px' }}>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 22, fontStyle: 'italic' }}>
                "{t.quote}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cormorant Garamond',serif", fontSize: 16, fontWeight: 700, color: 'var(--gold-dk)', flexShrink: 0 }}>
                  {t.init}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{t.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--light)' }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* CTA */}
      <section className="section centered">
        <div className="label">Get Started</div>
        <h2 className="section-title">Ready to Transform Your Corporate Travel?</h2>
        <p className="section-sub">
          Join 500+ companies that trust Shree Kalyanam to manage their travel programme.
        </p>
        <Link href="/partner-us" className="btn-primary">Partner With Us →</Link>
      </section>
    </>
  );
}
