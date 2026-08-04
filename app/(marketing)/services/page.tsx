import Link from 'next/link';
import type { Metadata } from 'next';
import { getMetadataFor } from '@/app/lib/seo';
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from '@/app/lib/jsonLd';

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataFor('services', '/services');
}

const SERVICES = [
  {
    icon: '✈',
    title: 'Flight Booking',
    color: '#e3f2fd',
    clr: '#1565c0',
    features: [
      'Domestic & international flights',
      'Direct airline access via IATA accreditation',
      'Lowest fare guarantee',
      'Group booking discounts',
      'Instant e-ticket confirmation',
      '24/7 rescheduling & cancellation support',
    ],
    desc: 'We book flights across 200+ airlines including Air India, IndiGo, Emirates, Singapore Airlines, and more. Our IATA accreditation means direct access to fare inventory — no GDS markup.',
  },
  {
    icon: '🏨',
    title: 'Hotel Reservations',
    color: '#e8f5e9',
    clr: '#2e7d32',
    features: [
      'Budget to luxury properties',
      'Verified ratings and reviews',
      'Flexible cancellation options',
      'Corporate rate agreements',
      'Airport transfers included',
      'Breakfast and meal packages',
    ],
    desc: "From business hotels to boutique resorts, we've pre-negotiated rates with 10,000+ properties across India and 50+ countries. All properties are independently verified by our team.",
  },
  {
    icon: '🌏',
    title: 'Holiday Packages',
    color: '#fff8e1',
    clr: '#f57f17',
    features: [
      'Customised domestic & international tours',
      'Group, family, and honeymoon packages',
      'All-inclusive pricing',
      'Expert-led itineraries',
      'Sightseeing and excursions',
      'On-ground local support',
    ],
    desc: 'Our travel designers craft bespoke holiday packages for every occasion — romantic getaways, family vacations, adventure trips, and pilgrimages. Over 500 curated itineraries available.',
  },
  {
    icon: '📋',
    title: 'Visa Assistance',
    color: '#f3e5f5',
    clr: '#6a1b9a',
    features: [
      '50+ country visa processing',
      'Document checklist and guidance',
      'Application form assistance',
      'Appointment scheduling',
      'Visa status tracking',
      'Emergency visa support',
    ],
    desc: "Visa rejections and delays are handled by us so you don't have to worry. Our visa team has a 98% approval rate across Schengen, US, UK, Australia, and Southeast Asia.",
  },
  {
    icon: '🛡',
    title: 'Travel Insurance',
    color: '#ffebee',
    clr: '#c62828',
    features: [
      'Comprehensive trip protection',
      'Medical emergency coverage',
      'Baggage loss and delay',
      'Flight cancellation cover',
      'Single and multi-trip plans',
      'Instant policy issuance',
    ],
    desc: 'Partnered with leading insurers to offer the most comprehensive travel protection plans. Policies issued instantly — domestic from ₹99, international from ₹299.',
  },
  {
    icon: '🏢',
    title: 'Corporate Travel',
    color: '#e8eaf6',
    clr: '#283593',
    features: [
      'Dedicated travel desk',
      'Monthly billing and invoicing',
      'Custom travel policy enforcement',
      'Real-time reporting dashboard',
      'Priority booking during peak seasons',
      'Employee travel app',
    ],
    desc: 'Trusted by 200+ companies for managed travel programs. We handle the entire employee travel lifecycle — from approval workflows to expense reporting — saving 20–30% on travel costs.',
  },
];

export default function ServicesPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Services', path: '/services' }])} />
      <JsonLd data={webPageJsonLd({ name: 'Our Services', description: "Shree Kalyanam's corporate travel services — flights, hotels, visas, and ground transport.", path: '/services' })} />
      {/* Header */}
      <section className="section bg-warm">
        <div className="label">What We Do</div>
        <h1 className="section-title">Our Services</h1>
        <p className="section-sub">
          A complete suite of travel services — from planning to protection — delivered by
          certified experts with 16+ years of experience.
        </p>
      </section>

      <div className="divider" />

      {/* Services */}
      <section className="section">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
          {SERVICES.map((s, i) => (
            <div key={s.title} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'start', direction: i % 2 === 1 ? 'rtl' : 'ltr' }}>
              <div style={{ direction: 'ltr' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 14, background: s.color, fontSize: 26, marginBottom: 20 }}>{s.icon}</div>
                <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>{s.title}</h2>
                <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.8, marginBottom: 24 }}>{s.desc}</p>
                <Link href="/contact" className="btn-outline" style={{ fontSize: 12 }}>Enquire Now →</Link>
              </div>
              <div style={{ direction: 'ltr' }}>
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 14, padding: '28px 26px' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: s.clr, marginBottom: 18 }}>What's Included</div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {s.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text)' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.clr, flexShrink: 0, display: 'inline-block' }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* CTA */}
      <section className="section centered bg-warm">
        <div className="label">Get Started</div>
        <h2 className="section-title">Need a Custom Quote?</h2>
        <p className="section-sub">
          Tell us your requirements and we'll put together a tailored proposal within 2 business hours.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/contact" className="btn-primary">Request a Quote</Link>
          <a href="tel:+918000000000" className="btn-outline">Call Us Now</a>
        </div>
      </section>
    </>
  );
}
