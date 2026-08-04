const METHODS = [
  { icon: '🏦', title: 'Net Banking / NEFT / RTGS', desc: 'Transfer funds directly to the Shree Kalyanam escrow account. Credited within 2–4 business hours. Preferred for large corporate top-ups.' },
  { icon: '💳', title: 'Credit / Debit Card', desc: 'Visa, Mastercard, and RuPay accepted. A processing fee of 1.5% applies on card payments. No surcharge on RuPay cards.' },
  { icon: '📱', title: 'UPI', desc: 'Instant payments via any UPI app (GPay, PhonePe, Paytm, etc.). No processing fee. Daily limit ₹2,00,000 per UPI ID.' },
  { icon: '🏢', title: 'Corporate Credit Pool', desc: 'Pre-approved credit facility for registered corporate clients. Book now, pay later within your agreed credit period (15/30/45 days).' },
  { icon: '📄', title: 'Cheque / Demand Draft', desc: 'Payable to "Shree Kalyanam Travel Pvt Ltd". Allow 2–3 days for clearance. Not recommended for time-sensitive bookings.' },
];

const FAQS = [
  { q: 'How long does a top-up take to reflect in my account?', a: 'NEFT/RTGS: 2–4 business hours. UPI: Instant. Card payments: Immediate. Cheque: 2–3 business days after deposit.' },
  { q: 'Is there a transaction fee?', a: 'Credit/Debit card payments attract a 1.5% processing fee. All other methods (NEFT, UPI, RTGS) are free of charge.' },
  { q: 'Can we get a GST-compliant invoice for payments?', a: 'Yes. All invoices are GST-compliant. Download them directly from the corporate dashboard under Deposits > Invoices.' },
  { q: 'What happens if my credit pool limit is exceeded?', a: 'Bookings will be paused until the outstanding is settled. You will receive an email alert at 80% and 100% utilisation.' },
  { q: 'Can we set up auto-debit for monthly settlements?', a: 'Yes, for NACH-registered corporate clients. Contact your account manager to set this up.' },
  { q: 'What currency does the platform accept?', a: 'All transactions are processed in Indian Rupees (INR). International wire transfers are accepted — please contact your account manager.' },
];

const BILLING_CYCLES = [
  { cycle: 'Weekly', desc: 'Invoices raised every Monday for the previous week\'s bookings. Due within 7 days.' },
  { cycle: 'Bi-Weekly', desc: 'Invoices on 1st and 15th of each month. Due within 10 days.' },
  { cycle: 'Monthly', desc: 'Single consolidated invoice on the 1st of each month. Due within 15 days.' },
  { cycle: 'Per Booking', desc: 'Immediate payment required at the time of booking for accounts without credit approval.' },
];

export default function PaymentPage() {
  return (
    <>
      {/* Header */}
      <section className="section bg-warm">
        <div className="label">Billing & Payments</div>
        <h1 className="section-title">Payment Policy</h1>
        <p className="section-sub">
          Transparent, flexible payment options for corporate accounts — from instant UPI
          to monthly credit settlement.
        </p>
      </section>

      <div className="divider" />

      {/* Payment methods */}
      <section className="section">
        <div className="label" style={{ marginBottom: 24 }}>How to Pay</div>
        <h2 className="section-title" style={{ marginBottom: 36 }}>Accepted Payment Methods</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {METHODS.map(m => (
            <div key={m.title} style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', display: 'flex', gap: 18, alignItems: 'flex-start' }}>
              <div style={{ width: 46, height: 46, borderRadius: 11, background: '#f5ede0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {m.icon}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>{m.title}</div>
                <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.75, margin: 0 }}>{m.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bank details */}
        <div style={{ background: 'var(--warm)', border: '1px solid var(--border)', borderRadius: 14, padding: '28px 28px', marginTop: 32 }}>
          <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 600, color: 'var(--text)', marginBottom: 18 }}>Bank Transfer Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 32px' }}>
            {[
              ['Account Name',  'Shree Kalyanam Travel Pvt Ltd'],
              ['Account No.',   'XXXX XXXX XXXX 4201'],
              ['IFSC Code',     'HDFC0001234'],
              ['Bank',          'HDFC Bank Ltd'],
              ['Branch',        'Nariman Point, Mumbai'],
              ['Account Type',  'Current Account'],
            ].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--light)', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', fontFamily: label.includes('No') || label.includes('IFSC') ? 'monospace' : 'inherit' }}>{val}</div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--light)', marginTop: 18, lineHeight: 1.7 }}>
            Always quote your <strong>Corporate ID</strong> and <strong>Invoice Number</strong> in the payment reference.
          </p>
        </div>
      </section>

      <div className="divider" />

      {/* Billing cycles */}
      <section className="section bg-warm">
        <div className="centered" style={{ marginBottom: 40 }}>
          <div className="label">Billing</div>
          <h2 className="section-title">Billing Cycles</h2>
          <p className="section-sub">Choose the billing frequency that suits your organisation.</p>
        </div>
        <div className="card-grid card-grid-2" style={{ maxWidth: 800, margin: '0 auto' }}>
          {BILLING_CYCLES.map(b => (
            <div key={b.cycle} className="card">
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: 'var(--gold)', marginBottom: 8 }}>{b.cycle}</div>
              <p className="card-text">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="divider" />

      {/* FAQs */}
      <section className="section">
        <div className="centered" style={{ marginBottom: 40 }}>
          <div className="label">FAQs</div>
          <h2 className="section-title">Payment FAQs</h2>
        </div>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 0 }}>
          {FAQS.map((f, i) => (
            <div key={i} style={{ padding: '22px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Q. {f.q}</div>
              <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.8, margin: 0 }}>{f.a}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
