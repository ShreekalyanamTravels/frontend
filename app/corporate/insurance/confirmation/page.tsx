'use client';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Inter, Playfair_Display } from 'next/font/google';
import CorpFooter from '../../components/CorpFooter';
import CorpHeader from '../../components/CorpHeader';
import { supplierColor, coverageBreakdown } from '../insuranceData';

const inter    = Inter({ subsets: ['latin'], weight: ['400','500','600','700','800'] });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'], style: ['italic'] });

const O  = '#f07820';
const O2 = '#e86d18';
const PK = '#c9184a';
const GR = '#2d8a4e';

const COVERS: Record<string, { label:string; amount:string }[]> = {
  basic:         [{ label:'Medical Expenses', amount:'₹5,00,000' },{ label:'Trip Cancellation', amount:'₹25,000' },{ label:'Baggage Loss', amount:'₹10,000' },{ label:'Personal Accident', amount:'₹2,50,000' }],
  standard:      [{ label:'Medical Expenses', amount:'₹10,00,000' },{ label:'Trip Cancellation', amount:'₹50,000' },{ label:'Baggage Loss', amount:'₹25,000' },{ label:'Personal Accident', amount:'₹5,00,000' }],
  premium:       [{ label:'Medical Expenses', amount:'₹25,00,000' },{ label:'Trip Cancellation', amount:'₹1,00,000' },{ label:'Baggage Loss', amount:'₹50,000' },{ label:'Personal Accident', amount:'₹10,00,000' }],
  comprehensive: [{ label:'Medical Expenses', amount:'₹50,00,000' },{ label:'Trip Cancellation', amount:'₹2,00,000' },{ label:'Baggage Loss', amount:'₹1,00,000' },{ label:'Personal Accident', amount:'₹25,00,000' }],
};

function ConfirmationContent() {
  const searchParams = useSearchParams();
  const planName = searchParams.get('planName') || 'Travel Insurance';
  const supplier = searchParams.get('supplier') || '';
  const logo = searchParams.get('logo') || '';
  const coverage = parseInt(searchParams.get('coverage') || '0', 10);
  const adults   = parseInt(searchParams.get('adults') || '1');
  const children = parseInt(searchParams.get('children') || '0');
  const dest     = searchParams.get('dest') || 'Worldwide';
  const dep      = searchParams.get('dep') || '';
  const ret      = searchParams.get('ret') || '';
  const total    = parseInt(searchParams.get('total') || '0');

  const planColor = logo ? supplierColor(logo) : O;
  const covers = coverage > 0 ? coverageBreakdown(coverage, total).slice(0, 4) : COVERS.standard;

  const refParam = searchParams.get('ref') || '';
  const policyNumberParam = searchParams.get('policyNumber') || '';
  const POLICY_NO  = policyNumberParam || refParam || `KLM-INS-${Date.now().toString().slice(-8)}`;
  const ISSUED_ON  = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState('');

  async function handleResend() {
    if (!refParam) return;
    setResendStatus('sending');
    setResendError('');
    try {
      const res = await fetch(`/api/insurance/${encodeURIComponent(refParam)}/resend`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setResendError(data.error ?? 'Failed to resend email.');
        setResendStatus('error');
        return;
      }
      setResendStatus('sent');
    } catch {
      setResendError('Something went wrong. Please try again.');
      setResendStatus('error');
    }
  }

  return (
    <div className={inter.className} style={{ background: '#fdf6f2', minHeight: '100vh', color: '#1a1a2e' }}>

      {/* NAV */}
      <CorpHeader />

      {/* Steps — all done */}
      <div style={{ background: `linear-gradient(135deg,${GR},#1e6b3a)`, padding: '14px 5%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {['Plan Selected', 'Traveller Details', 'Payment', 'Policy Issued'].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 800, color: GR }}>✓</div>
              <span style={{ fontSize: 12, fontWeight: i === 3 ? 700 : 400, color: '#fff' }}>{s}</span>
              {i < 3 && <span style={{ fontSize: 12, color: 'rgba(255,255,255,.4)', marginLeft: 4 }}>›</span>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: '40px auto', padding: '0 20px' }}>

        {/* Success banner */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 70, height: 70, borderRadius: '50%',
            background: `linear-gradient(135deg,${GR},#1e6b3a)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 16px', boxShadow: `0 6px 24px ${GR}44` }}>✓</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e', margin: '0 0 8px' }}>
            Payment Successful!
          </h1>
          <p style={{ fontSize: 13.5, color: '#888', margin: 0 }}>
            Your travel insurance purchase is confirmed. Policy document will be sent to your registered email.
          </p>
        </div>

        {/* Policy card */}
        <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
          border: '1px solid #f0e8e0', boxShadow: '0 8px 32px rgba(0,0,0,.08)', marginBottom: 24 }}>

          {/* Header */}
          <div style={{ background: `linear-gradient(135deg,${planColor},${planColor}cc)`,
            padding: '24px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.75)',
                letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 6 }}>Policy Number</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '.04em' }}>{POLICY_NO}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', marginTop: 6 }}>Issued on {ISSUED_ON}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff',
                background: 'rgba(255,255,255,.2)', borderRadius: 8, padding: '6px 16px', marginBottom: 8 }}>
                {planName} Plan
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)' }}>🛡️ IRDAI Approved</div>
            </div>
          </div>

          <div style={{ padding: '24px 28px' }}>
            {/* Trip info row */}
            <div style={{ display: 'flex', gap: 32, paddingBottom: 20, borderBottom: '1px solid #f0e8e0', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '.08em',
                  textTransform: 'uppercase', marginBottom: 4 }}>Destination</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a2e' }}>{dest}</div>
              </div>
              {dep && <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '.08em',
                  textTransform: 'uppercase', marginBottom: 4 }}>Travel Dates</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a2e' }}>{dep} → {ret}</div>
              </div>}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '.08em',
                  textTransform: 'uppercase', marginBottom: 4 }}>Travellers</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a2e' }}>
                  {adults} Adult{adults > 1 ? 's' : ''}{children > 0 ? ` · ${children} Child${children > 1 ? 'ren':''}` : ''}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '.08em',
                  textTransform: 'uppercase', marginBottom: 4 }}>Premium Paid</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: planColor }}>₹{total.toLocaleString()}</div>
              </div>
            </div>

            {/* Coverage grid */}
            <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '.08em',
              textTransform: 'uppercase', marginBottom: 14 }}>Coverage Summary</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              {covers.map(c => (
                <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', background: '#fdf8f5', borderRadius: 10,
                  padding: '12px 16px', border: '1px solid #f5ede8' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: planColor, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#555' }}>{c.label}</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#1a1a2e' }}>{c.amount}</span>
                </div>
              ))}
            </div>

            {/* Emergency contacts */}
            <div style={{ background: '#f0faf4', border: '1px solid #c8ecd5', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: GR, marginBottom: 12 }}>
                🆘 Emergency Assistance Numbers
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {[
                  { label: 'India Toll-Free', number: '1800-XXX-XXXX' },
                  { label: 'International', number: '+91-XX-XXXX-XXXX' },
                  { label: 'Claims Helpdesk', number: 'claims@kalyanam.in' },
                ].map(c => (
                  <div key={c.label}>
                    <div style={{ fontSize: 10, color: '#888', fontWeight: 600, marginBottom: 3 }}>{c.label}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a2e' }}>{c.number}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
          {refParam ? (
            <a href={`/api/insurance/${encodeURIComponent(refParam)}/pdf`} target="_blank" rel="noopener noreferrer"
              style={{ padding: '12px 32px', background: `linear-gradient(135deg,${planColor},${planColor}cc)`,
                color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', display: 'inline-block' }}>
              📄 Download Policy PDF
            </a>
          ) : (
            <button disabled style={{ padding: '12px 32px', background: '#e8e2db',
              color: '#bbb', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 800,
              cursor: 'not-allowed', fontFamily: 'inherit' }}>
              📄 Download Policy PDF
            </button>
          )}
          <button onClick={handleResend} disabled={!refParam || resendStatus === 'sending'}
            style={{ padding: '12px 32px',
              background: resendStatus === 'sent' ? '#f0faf4' : '#fff',
              color: resendStatus === 'sent' ? GR : resendStatus === 'error' ? PK : '#555',
              border: `1.5px solid ${resendStatus === 'sent' ? '#c8ecd5' : resendStatus === 'error' ? PK : '#e8e0da'}`,
              borderRadius: 9, fontSize: 13, fontWeight: 700,
              cursor: (!refParam || resendStatus === 'sending') ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {resendStatus === 'sending' ? 'Sending…' : resendStatus === 'sent' ? '✓ Sent to your email' : '📧 Resend to Email'}
          </button>
          <Link href="/corporate/dashboard" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '12px 32px', background: '#fff',
              color: O, border: `1.5px solid ${O}`, borderRadius: 9, fontSize: 13,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ← Back to Dashboard
            </button>
          </Link>
        </div>
        {resendStatus === 'error' && (
          <div style={{ textAlign: 'center', fontSize: 12.5, color: PK, marginBottom: 28 }}>
            {resendError}
          </div>
        )}
        {resendStatus !== 'error' && <div style={{ marginBottom: 28 }} />}
      </div>

      <CorpFooter />
    </div>
  );
}

export default function ConfirmationPage() {
  return <Suspense><ConfirmationContent /></Suspense>;
}
