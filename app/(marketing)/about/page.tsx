import Link from 'next/link';
import type { Metadata } from 'next';
import { getMetadataFor } from '@/app/lib/seo';
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from '@/app/lib/jsonLd';

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataFor('about', '/about');
}

const TEAM = [
  { name: 'Rajesh Kalyanam',   role: 'Founder & CEO',          init: 'RK', bg: '#f5ede0' },
  { name: 'Priya Mehta',       role: 'Director – Operations',  init: 'PM', bg: '#e3f2fd' },
  { name: 'Vikram Nair',       role: 'VP – Corporate Travel',  init: 'VN', bg: '#e8f5e9' },
  { name: 'Anita Sharma',      role: 'Head – Customer Success', init: 'AS', bg: '#fff8e1' },
];

const MILESTONES = [
  { year: '2008', text: 'Founded in Mumbai as a boutique travel consultancy.' },
  { year: '2012', text: 'Obtained IATA accreditation. Expanded to 4 cities.' },
  { year: '2016', text: 'Launched KalyanamKart — India\'s first integrated travel marketplace.' },
  { year: '2019', text: 'Crossed 1 lakh happy travellers. Opened 8 new offices pan-India.' },
  { year: '2022', text: 'Introduced corporate travel management division.' },
  { year: '2024', text: '2.4 lakh travellers served. Present in 12 cities with 50+ destinations.' },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'About Us', path: '/about' }])} />
      <JsonLd data={webPageJsonLd({ name: 'About Shree Kalyanam', description: "Learn about Shree Kalyanam's mission, leadership team, and corporate travel expertise.", path: '/about', schemaType: 'AboutPage' })} />
      {/* Header */}
      <section className="section bg-warm">
        <div className="label">Who We Are</div>
        <h1 className="section-title">About Shree Kalyanam</h1>
        <p className="section-sub">
          For over 16 years, Shree Kalyanam has been helping individuals, families, and businesses
          experience the world — with care, expertise, and transparency at every step.
        </p>
      </section>

      <div className="divider" />

      {/* Story + values */}
      <section className="section">
        <div className="two-col">
          <div>
            <div className="label">Our Story</div>
            <h2 className="section-title">From a Single Desk<br />to a National Network</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 16 }}>
              Shree Kalyanam was founded in 2008 by Rajesh Kalyanam with a simple belief: every
              traveller deserves honest advice, fair pricing, and genuine support.
            </p>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 16 }}>
              What started as a one-person consultancy in Mumbai has grown into a full-service
              travel company with offices across 12 cities, an IATA accreditation, and a
              digital platform — KalyanamKart — trusted by over 2.4 lakh customers.
            </p>
            <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.8 }}>
              Our growth has always been driven by referrals and repeat business — the clearest
              signal that we're doing something right.
            </p>
          </div>
          <div>
            <div className="label">Our Values</div>
            {[
              { title: 'Transparency', desc: 'No hidden charges, no bait-and-switch. What you see is what you pay.' },
              { title: 'Expertise',    desc: 'Our travel consultants are certified professionals with first-hand destination knowledge.' },
              { title: 'Accountability', desc: 'We stand by every booking. If something goes wrong, we fix it — no runaround.' },
              { title: 'Inclusion',    desc: 'Great travel should be accessible to everyone, at every budget.' },
            ].map(v => (
              <div key={v.title} className="value-item">
                <div className="value-dot" />
                <div>
                  <div className="value-title">{v.title}</div>
                  <div className="value-desc">{v.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="divider" />

      {/* Timeline */}
      <section className="section bg-warm">
        <div className="centered">
          <div className="label">Our Journey</div>
          <h2 className="section-title">Key Milestones</h2>
          <p className="section-sub">Sixteen years of growth, one milestone at a time.</p>
        </div>
        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 60, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
          {MILESTONES.map(m => (
            <div key={m.year} style={{ display: 'flex', gap: 24, marginBottom: 32, alignItems: 'flex-start' }}>
              <div style={{ width: 80, textAlign: 'right', flexShrink: 0 }}>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: 'var(--gold)' }}>
                  {m.year}
                </span>
              </div>
              <div style={{ position: 'relative', paddingLeft: 24, flex: 1 }}>
                <div style={{ position: 'absolute', left: -5, top: 7, width: 10, height: 10, borderRadius: '50%', background: 'var(--gold)' }} />
                <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.7, marginTop: 2 }}>{m.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* Team */}
      <section className="section">
        <div className="centered">
          <div className="label">Leadership</div>
          <h2 className="section-title">Our Team</h2>
          <p className="section-sub">The people behind every great journey.</p>
        </div>
        <div className="card-grid card-grid-2" style={{ maxWidth: 720, margin: '0 auto' }}>
          {TEAM.map(t => (
            <div key={t.name} className="team-card">
              <div className="team-avatar" style={{ background: t.bg, color: 'var(--gold-dk)' }}>{t.init}</div>
              <div className="team-info">
                <div className="team-name">{t.name}</div>
                <div className="team-role">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* CTA */}
      <section className="section centered">
        <div className="label">Work With Us</div>
        <h2 className="section-title">Let's Plan Something Great</h2>
        <p className="section-sub">Whether it's a solo trip or a corporate retreat, we're here to help.</p>
        <Link href="/contact" className="btn-primary">Get in Touch</Link>
      </section>
    </>
  );
}
