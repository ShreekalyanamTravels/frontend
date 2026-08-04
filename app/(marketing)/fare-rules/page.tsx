import type { Metadata } from 'next';
import { getMetadataFor } from '@/app/lib/seo';
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from '@/app/lib/jsonLd';

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataFor('fare-rules', '/fare-rules');
}

const FARE_TYPES = [
  {
    name: 'Corporate Saver',
    tag: 'Most Popular',
    tagClr: '#e8f5e9',
    tagTxt: '#2e7d32',
    changes: 'Allowed (₹500 + fare difference)',
    cancellation: 'Allowed (₹750 service fee)',
    refund: '7–10 business days',
    baggage: '15 kg check-in + 7 kg cabin',
    mealSeat: 'Complimentary',
    upgrade: 'Eligible',
  },
  {
    name: 'Corporate Flexi',
    tag: 'Full Flexibility',
    tagClr: '#e3f2fd',
    tagTxt: '#1565c0',
    changes: 'Free (up to 4 hrs before departure)',
    cancellation: 'Full refund (up to 2 hrs before)',
    refund: '3–5 business days',
    baggage: '20 kg check-in + 7 kg cabin',
    mealSeat: 'Complimentary + preferred seat',
    upgrade: 'Priority eligible',
  },
  {
    name: 'Economy Saver',
    tag: 'Budget',
    tagClr: '#fff8e1',
    tagTxt: '#f57f17',
    changes: 'Allowed (₹1,500 + fare difference)',
    cancellation: 'Allowed (₹1,500 service fee)',
    refund: '15–21 business days',
    baggage: '15 kg check-in + 7 kg cabin',
    mealSeat: 'Chargeable',
    upgrade: 'Not eligible',
  },
  {
    name: 'Non-Refundable',
    tag: 'Lowest Fare',
    tagClr: '#ffebee',
    tagTxt: '#c62828',
    changes: 'Not allowed',
    cancellation: 'Not allowed',
    refund: 'No refund',
    baggage: '15 kg check-in + 7 kg cabin',
    mealSeat: 'Chargeable',
    upgrade: 'Not eligible',
  },
];

const GENERAL_RULES = [
  { icon: '⏰', title: 'Check-in Deadlines', desc: 'Domestic: 45 minutes before departure. International: 60–90 minutes before departure. Shree Kalyanam is not responsible for missed check-ins.' },
  { icon: '📋', title: 'Name Changes', desc: 'Passenger names cannot be changed after ticketing. Minor corrections (1–2 characters) may be allowed by the airline at an additional fee.' },
  { icon: '🧳', title: 'Excess Baggage', desc: 'Charges are levied by the airline directly at the airport. We recommend pre-purchasing baggage allowance through our platform for the lowest rates.' },
  { icon: '🛂', title: 'Visa & Documentation', desc: 'It is the traveller\'s responsibility to carry valid travel documents. Shree Kalyanam is not liable for denied boarding due to documentation issues.' },
  { icon: '✈️', title: 'Flight Changes by Airline', desc: 'In case of airline-initiated changes or cancellations, refunds or re-booking will be processed as per the carrier\'s policy. We will assist at no extra charge.' },
  { icon: '💰', title: 'Service Fees', desc: 'Shree Kalyanam charges a service fee per ticket as per the corporate agreement. This fee is non-refundable regardless of the fare type.' },
];

export default function FareRulesPage() {
  const TH: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--light)', background: '#faf8f4', borderBottom: '2px solid var(--border)', whiteSpace: 'nowrap' };
  const TD: React.CSSProperties = { padding: '12px 16px', fontSize: 13, color: 'var(--muted)', borderBottom: '1px solid var(--border)', verticalAlign: 'top' };
  const FIELDS: { key: keyof typeof FARE_TYPES[0], label: string }[] = [
    { key: 'changes',      label: 'Date/Flight Change' },
    { key: 'cancellation', label: 'Cancellation'       },
    { key: 'refund',       label: 'Refund Timeline'    },
    { key: 'baggage',      label: 'Baggage Allowance'  },
    { key: 'mealSeat',     label: 'Meal & Seat'        },
    { key: 'upgrade',      label: 'Upgrade Eligibility'},
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Fare Rules', path: '/fare-rules' }])} />
      <JsonLd data={webPageJsonLd({ name: 'Fare Rules', description: "Shree Kalyanam's corporate fare types, cancellation policies, and rescheduling rules.", path: '/fare-rules' })} />
      {/* Header */}
      <section className="section bg-warm">
        <div className="label">Fare Information</div>
        <h1 className="section-title">Fare Rules</h1>
        <p className="section-sub">
          Understand the conditions, flexibility, and charges that apply to each fare type
          available on the Shree Kalyanam corporate platform.
        </p>
      </section>

      <div className="divider" />

      {/* Fare comparison table */}
      <section className="section">
        <div className="label" style={{ marginBottom: 24 }}>Fare Comparison</div>
        <h2 className="section-title" style={{ marginBottom: 32 }}>Corporate Fare Types</h2>
        <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid var(--border)', boxShadow: '0 2px 16px rgba(0,0,0,.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
            <thead>
              <tr>
                <th style={{ ...TH, minWidth: 150 }}>Rule</th>
                {FARE_TYPES.map(f => (
                  <th key={f.name} style={{ ...TH, minWidth: 180 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', textTransform: 'none', letterSpacing: 0, marginBottom: 6 }}>{f.name}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, background: f.tagClr, color: f.tagTxt, padding: '2px 8px', borderRadius: 12 }}>{f.tag}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FIELDS.map(field => (
                <tr key={field.key}>
                  <td style={{ ...TD, fontWeight: 600, color: 'var(--text)', background: '#faf8f4' }}>{field.label}</td>
                  {FARE_TYPES.map(f => (
                    <td key={f.name} style={TD}>{f[field.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--light)', marginTop: 14, lineHeight: 1.7 }}>
          * Fare rules above are indicative. Actual charges may vary by airline and route. Always confirm at the time of booking.
        </p>
      </section>

      <div className="divider" />

      {/* General rules */}
      <section className="section bg-warm">
        <div className="centered" style={{ marginBottom: 48 }}>
          <div className="label">General Policies</div>
          <h2 className="section-title">Important Rules to Know</h2>
        </div>
        <div className="card-grid card-grid-3">
          {GENERAL_RULES.map(r => (
            <div key={r.title} className="card">
              <div className="card-icon" style={{ fontSize: 20 }}>{r.icon}</div>
              <div className="card-title-sm">{r.title}</div>
              <p className="card-text">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
