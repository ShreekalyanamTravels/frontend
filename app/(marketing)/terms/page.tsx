import type { Metadata } from 'next';
import { getMetadataFor } from '@/app/lib/seo';
import { JsonLd, breadcrumbJsonLd, webPageJsonLd } from '@/app/lib/jsonLd';

export async function generateMetadata(): Promise<Metadata> {
  return getMetadataFor('terms', '/terms');
}

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: [
      'By accessing or using the Shree Kalyanam corporate travel platform ("Platform"), you agree to be bound by these Terms & Conditions. If you do not agree, please discontinue use immediately.',
      'These terms apply to all users including corporate account holders, individual travellers, and sub-agents accessing the Platform on behalf of an organisation.',
    ],
  },
  {
    title: '2. Corporate Account Obligations',
    body: [
      'Corporate accounts are activated upon execution of a signed Master Service Agreement (MSA). The account holder is responsible for all bookings made under their credentials.',
      'Organisations must designate an authorised administrator and promptly notify Shree Kalyanam of any changes to account access or personnel.',
      'Corporate credit limits are subject to periodic review. Exceeding the approved credit limit may result in temporary suspension of booking privileges.',
    ],
  },
  {
    title: '3. Booking & Ticketing',
    body: [
      'All bookings are subject to availability and carrier/hotel policies at the time of confirmation. Prices displayed are indicative and final fare is confirmed at the time of ticket issuance.',
      'E-tickets and vouchers are issued to the registered email address. Shree Kalyanam is not responsible for errors arising from incorrect traveller details provided at the time of booking.',
      'Bookings made through the Platform are governed by the respective airline, hotel, or service provider\'s terms in addition to these Terms.',
    ],
  },
  {
    title: '4. Cancellation & Refund Policy',
    body: [
      'Cancellation charges vary by airline, hotel, and fare type. Non-refundable fares will not attract any refund upon cancellation.',
      'Refund processing time is subject to the respective supplier\'s timeline, typically 7–21 business days from the date of cancellation confirmation.',
      'Service fees charged by Shree Kalyanam are non-refundable unless the booking was cancelled due to an error on our part.',
    ],
  },
  {
    title: '5. Credit Pool & Payments',
    body: [
      'Corporate clients using the Credit Pool facility must maintain their account within the approved credit limit. Invoices are generated on a weekly or monthly cycle as agreed in the MSA.',
      'Payment is due within the credit period specified in the MSA. Late payments may attract interest at 2% per month on the outstanding balance.',
      'Shree Kalyanam reserves the right to suspend credit facilities upon default without prior notice.',
    ],
  },
  {
    title: '6. Limitation of Liability',
    body: [
      'Shree Kalyanam acts as an intermediary between travellers and travel service providers. We are not liable for delays, cancellations, or service failures caused by airlines, hotels, or other third-party providers.',
      'Our total liability in any claim shall not exceed the value of the booking in question. We are not liable for indirect, consequential, or punitive damages.',
    ],
  },
  {
    title: '7. Privacy & Data',
    body: [
      'Personal data collected during the booking process is used solely for fulfilling travel services and is handled in accordance with our Privacy Policy.',
      'By using the Platform, you consent to the processing of traveller data for booking, reporting, and compliance purposes.',
    ],
  },
  {
    title: '8. Governing Law',
    body: [
      'These Terms are governed by the laws of India. Any dispute arising under these Terms shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.',
    ],
  },
];

export default function TermsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Terms & Conditions', path: '/terms' }])} />
      <JsonLd data={webPageJsonLd({ name: 'Terms & Conditions', description: "Terms and conditions governing the use of Shree Kalyanam's corporate travel booking platform.", path: '/terms' })} />
      {/* Header */}
      <section className="section bg-warm">
        <div className="label">Legal</div>
        <h1 className="section-title">Terms & Conditions</h1>
        <p className="section-sub">
          Please read these terms carefully before using the Shree Kalyanam corporate travel platform.
          Last updated: 1 January 2026.
        </p>
      </section>

      <div className="divider" />

      {/* Content */}
      <section className="section">
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 36 }}>
          {SECTIONS.map(s => (
            <div key={s.title}>
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>
                {s.title}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {s.body.map((p, i) => (
                  <p key={i} style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.85, margin: 0 }}>{p}</p>
                ))}
              </div>
              <div style={{ height: 1, background: 'var(--border)', marginTop: 28 }} />
            </div>
          ))}

          <p style={{ fontSize: 12.5, color: 'var(--light)', lineHeight: 1.8 }}>
            For queries regarding these terms, write to us at{' '}
            <a href="mailto:legal@shreekalyanam.com" style={{ color: 'var(--gold-dk)', textDecoration: 'none', fontWeight: 500 }}>
              legal@shreekalyanam.com
            </a>
          </p>
        </div>
      </section>
    </>
  );
}
