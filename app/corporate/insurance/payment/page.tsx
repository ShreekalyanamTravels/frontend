'use client';
import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Script from 'next/script';
import { Inter, Playfair_Display } from 'next/font/google';
import { supplierColor, coverageBreakdown, SUPPLIER_LABELS, type ProposerForm, type TravellerForm } from '../insuranceData';
import CorpHeader from '../../components/CorpHeader';
import { useCurrentUser } from '../../../hooks/useCurrentUser';
import { useWalletBalance } from '../../../hooks/useWalletBalance';
import { useRazorpayConfig } from '../../../hooks/useRazorpayConfig';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const inter    = Inter({ subsets: ['latin'], weight: ['400','500','600','700','800'] });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'], style: ['italic'] });

const O  = '#f07820';
const O2 = '#e86d18';
const GR = '#2d8a4e';
const PK = '#c9184a';

const STEPS  = ['Plan Search', 'Select Plan', 'Traveller Details', 'Payment', 'Policy Issued'];
const ACTIVE = 3;

const MODES = [
  { id: 'upi',        label: 'UPI',              sub: 'Google Pay, PhonePe, Paytm',    icon: '📲' },
  { id: 'netbanking', label: 'Net Banking',       sub: 'All major banks supported',     icon: '🏦' },
  { id: 'credit',     label: 'Credit Card',       sub: 'Visa, Mastercard, Amex',        icon: '💳' },
  { id: 'debit',      label: 'Debit Card',        sub: 'All major banks',               icon: '🏧' },
  { id: 'creditpool', label: 'Creditpool',        sub: 'Use your travel credit balance', icon: '💰' },
] as const;
type Mode = typeof MODES[number]['id'];
const CHECKOUT_BLOCK: Record<Exclude<Mode, 'creditpool'>, { name: string; instruments: Array<{ method: string; types?: string[] }> }> = {
  upi:        { name: 'UPI',         instruments: [{ method: 'upi' }] },
  netbanking: { name: 'Net Banking', instruments: [{ method: 'netbanking' }] },
  credit:     { name: 'Credit Card', instruments: [{ method: 'card', types: ['credit'] }] },
  debit:      { name: 'Debit Card',  instruments: [{ method: 'card', types: ['debit'] }] },
};

function fmtDate(s: string) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function PaymentContent() {
  const router   = useRouter();
  const sp       = useSearchParams();
  const { user, loading: userLoading } = useCurrentUser();
  const razorpayConfig = useRazorpayConfig();

  useEffect(() => {
    if (!userLoading && !user) router.push('/');
  }, [userLoading, user, router]);

  const { balance } = useWalletBalance(!!user);

  const planId   = sp.get('plan')     || '';
  const planName = sp.get('planName') || 'Travel Insurance';
  const supplier = sp.get('supplier') || '';
  const logo     = sp.get('logo')     || '';
  const coverage = parseInt(sp.get('coverage') || '0', 10);
  const adults   = parseInt(sp.get('adults')   || '1', 10);
  const children = parseInt(sp.get('children') || '0', 10);
  const dest     = sp.get('dest') || '';
  const dep      = sp.get('dep')  || '';
  const ret      = sp.get('ret')  || '';
  const total    = parseInt(sp.get('total') || '0', 10);

  const proposer: ProposerForm | null = (() => {
    try {
      const raw = sp.get('proposer');
      return raw ? JSON.parse(raw) as ProposerForm : null;
    } catch { return null; }
  })();
  const travellers: TravellerForm[] = (() => {
    try {
      const raw = sp.get('travellers');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr as TravellerForm[] : [];
    } catch { return []; }
  })();

  const color  = logo ? supplierColor(logo) : O;
  const lbl    = logo && SUPPLIER_LABELS[logo] ? SUPPLIER_LABELS[logo] : { line1: supplier.slice(0,6), line2: '' };
  const covers = coverage > 0 ? coverageBreakdown(coverage, total).slice(0, 4) : [];

  const baseFare   = Math.round(total / 1.18);
  const gstAmt     = total - baseFare;
  const strikeAmt  = Math.round(total * 0.927);

  const pax = adults + children;

  const [selectedMode, setSelectedMode] = useState<Mode>('upi');
  const [payStatus, setPayStatus] = useState<'idle' | 'processing'>('idle');
  const [error, setError] = useState('');
  const [scriptReady, setScriptReady] = useState(false);

  // Credit Pool spends the Main Balance first, then draws on OD — usable as long as the total
  // Credit Pool (odLimit + walletBalance) covers the amount. Until the balance has loaded we
  // don't know yet, so it stays selectable rather than flashing disabled/enabled.
  const creditpoolInsufficient = balance !== null && balance.creditPool < total;
  useEffect(() => {
    if (creditpoolInsufficient && selectedMode === 'creditpool') setSelectedMode('upi');
  }, [creditpoolInsufficient, selectedMode]);

  const canPay = payStatus !== 'processing' && (selectedMode === 'creditpool' || scriptReady);

  function goToConfirmation(ref: string, policyNumber?: string) {
    const params = new URLSearchParams({
      ref,
      policyNumber: policyNumber || ref,
      plan: planId, planName, supplier, logo,
      coverage: String(coverage), adults: String(adults),
      children: String(children), dest, dep, ret, total: String(total),
    });
    router.push(`/corporate/insurance/confirmation?${params.toString()}`);
  }

  async function handlePay() {
    setError('');
    setPayStatus('processing');

    const emailPayload = {
      planName, supplier, coverage, dest, dep, ret,
      adults, children, proposer, travellers,
    };

    try {
      if (selectedMode === 'creditpool') {
        const res = await fetch('/api/insurance/purchase', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: total, ...emailPayload }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error ?? 'Payment failed.'); setPayStatus('idle'); return; }
        goToConfirmation(data.ref, data.policyNumber);
        return;
      }

      const orderRes = await fetch('/api/payments/razorpay/insurance/create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: total }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) { setError(order.error ?? 'Failed to initiate payment.'); setPayStatus('idle'); return; }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: Math.round(order.amount * 100),
        currency: 'INR',
        name: razorpayConfig?.companyName || 'Shree Kalyanam',
        description: 'Travel Insurance Premium',
        image: razorpayConfig?.logo,
        order_id: order.orderId,
        prefill: { name: user?.name, email: proposer?.email, contact: proposer?.mobile },
        theme: { color: razorpayConfig?.themeColor || O },
        config: {
          display: {
            blocks: { highlighted: CHECKOUT_BLOCK[selectedMode] },
            sequence: ['block.highlighted'],
            preferences: { show_default_blocks: false },
          },
        },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setPayStatus('processing');
          try {
            const verifyRes = await fetch('/api/payments/razorpay/insurance/verify', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                mode: selectedMode,
                amount: total, ...emailPayload,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              setError(verifyData.error ?? 'Payment verification failed. Please contact support.');
              setPayStatus('idle');
              return;
            }
            goToConfirmation(verifyData.ref, verifyData.policyNumber);
          } catch {
            setError('Payment succeeded but policy issuance failed. Please contact support.');
            setPayStatus('idle');
          }
        },
        modal: { ondismiss: () => setPayStatus('idle') },
      });
      rzp.open();
      setPayStatus('idle');
    } catch {
      setError('Something went wrong. Please try again.');
      setPayStatus('idle');
    }
  }

  if (userLoading) {
    return <div style={{ minHeight: '100vh', background: '#fdf6f2' }} />;
  }

  return (
    <div className={inter.className} style={{ background: '#fdf6f2', minHeight: '100vh', color: '#1a1a2e' }}>

      {/* NAV */}
      <CorpHeader />

      {/* Stepper */}
      <div style={{ background: `linear-gradient(90deg,${O},#e86d18)`, padding: '0 3%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '12px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '4%', right: '4%',
              top: 15, transform: 'translateY(-50%)',
              height: 2, background: 'rgba(255,255,255,.35)', zIndex: 0 }} />
            {STEPS.map((s, i) => (
              <div key={s} style={{ display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 5, zIndex: 1, minWidth: 80 }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%',
                  background: i <= ACTIVE ? '#fff' : 'rgba(255,255,255,.2)',
                  border: i === ACTIVE ? '2.5px solid #fff' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800,
                  color: i <= ACTIVE ? O : 'rgba(255,255,255,.7)',
                  boxShadow: i === ACTIVE ? '0 0 0 3px rgba(255,255,255,.25)' : 'none' }}>
                  {i < ACTIVE ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 9.5, whiteSpace: 'nowrap', textAlign: 'center',
                  fontWeight: i === ACTIVE ? 700 : 400,
                  color: i <= ACTIVE ? '#fff' : 'rgba(255,255,255,.6)' }}>{s}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg,#f07820 0%,#c8622a 55%,#7a3010 100%)',
        padding: '28px 5%', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>Payment Method</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', margin: '0 0 16px' }}>
          Review your policy summary and complete payment securely.
        </p>
        <div style={{ display: 'inline-flex', gap: 8 }}>
          {['1. Policy Review', '2. Select Payment Mode', '3. Pay Securely'].map((s, i) => (
            <div key={i} style={{ padding: '5px 16px', background: 'rgba(255,255,255,.18)',
              borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#fff',
              border: '1px solid rgba(255,255,255,.3)' }}>{s}</div>
          ))}
        </div>
      </div>

      {/* TWO-COLUMN */}
      <div style={{ display: 'flex', gap: 22, padding: '26px 5%', maxWidth: 1280,
        margin: '0 auto', width: '100%', boxSizing: 'border-box', alignItems: 'flex-start' }}>

        {/* ── LEFT ── */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Policy Summary */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0e8e8',
            boxShadow: '0 2px 12px rgba(0,0,0,.05)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 22px', borderBottom: '1px solid #f0e8e8',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Policy Summary</h2>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
                background: `${O}12`, border: `1px solid ${O}44`, borderRadius: 20, padding: '3px 12px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: O }}>
                  TRAVEL INSURANCE · {pax} Pax
                </span>
              </div>
            </div>
            <div style={{ padding: '16px 22px' }}>
              {/* Plan card */}
              <div style={{ background: '#fafafa', border: '1px solid #f0e8e8',
                borderLeft: `3px solid ${color}`, borderRadius: 9, padding: '14px 18px', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                  <div style={{ width: 48, height: 38, borderRadius: 6, background: color, flexShrink: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{lbl.line1}</span>
                    <span style={{ fontSize: 8, fontWeight: 600, color: 'rgba(255,255,255,.85)', lineHeight: 1.2 }}>{lbl.line2}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: color,
                      textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 3 }}>
                      {supplier}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#1a1a2e' }}>{planName}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                  {[
                    { label: 'Destination',  val: dest || 'Worldwide' },
                    { label: 'Start Date',   val: fmtDate(dep) },
                    { label: 'End Date',     val: fmtDate(ret) },
                    { label: 'Sum Insured',  val: coverage > 0 ? '$' + coverage.toLocaleString('en-US') : '—' },
                  ].map(f => (
                    <div key={f.label}>
                      <div style={{ fontSize: 9.5, color: '#aaa', fontWeight: 600,
                        textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{f.label}</div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a2e' }}>{f.val}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Coverage highlights */}
              {covers.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  {covers.map(c => (
                    <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between',
                      alignItems: 'center', padding: '8px 12px',
                      background: '#fafafa', border: '1px solid #f0e8e8', borderRadius: 7 }}>
                      <span style={{ fontSize: 12, color: '#666' }}>{c.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{c.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Proposer Details */}
          {proposer && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0e8e8',
              boxShadow: '0 2px 12px rgba(0,0,0,.05)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 22px', borderBottom: '1px solid #f0e8e8',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Proposer Details</h2>
                <button onClick={() => window.history.back()} style={{ background: 'none',
                  border: `1.5px solid ${O}55`, borderRadius: 7, padding: '5px 14px',
                  fontSize: 12, fontWeight: 700, color: O, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✎ Edit
                </button>
              </div>
              <div style={{ padding: '14px 22px', display: 'grid',
                gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
                {[
                  { label: 'Mobile Number', val: proposer.mobile || '—' },
                  { label: 'Email ID',      val: proposer.email  || '—' },
                  { label: 'Nationality',   val: proposer.nationality || '—' },
                  { label: 'Address',       val: [proposer.address1, proposer.address2].filter(Boolean).join(', ') || '—' },
                  { label: 'City / District', val: [proposer.city, proposer.district].filter(Boolean).join(', ') || '—' },
                  { label: 'State / Pincode', val: [proposer.state, proposer.pincode].filter(Boolean).join(' - ') || '—' },
                  ...(proposer.gst ? [{ label: 'GST Number', val: proposer.gst }] : []),
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: 9.5, color: '#aaa', fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 3 }}>{f.label}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a2e' }}>{f.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Traveller Summary */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0e8e8',
            boxShadow: '0 2px 12px rgba(0,0,0,.05)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 22px', borderBottom: '1px solid #f0e8e8',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Traveller Details</h2>
              <button onClick={() => window.history.back()} style={{ background: 'none',
                border: `1.5px solid ${O}55`, borderRadius: 7, padding: '5px 14px',
                fontSize: 12, fontWeight: 700, color: O, cursor: 'pointer', fontFamily: 'inherit' }}>
                ✎ Edit
              </button>
            </div>
            {travellers.length > 0 ? (
              <div style={{ padding: '14px 22px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {travellers.map((t, idx) => {
                  const isChild = idx >= adults;
                  return (
                    <div key={t.id ?? idx} style={{ display: 'flex', alignItems: 'center', gap: 14,
                      padding: '10px 14px', background: '#fafafa', border: '1px solid #f0e8e8',
                      borderRadius: 8, flexWrap: 'wrap' }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%',
                        background: isChild ? '#f0faf4' : `${O}14`,
                        border: isChild ? '1.5px solid #c8ecd5' : `1.5px solid ${O}44`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 15, flexShrink: 0 }}>{isChild ? '🧒' : '👤'}</div>
                      <div style={{ minWidth: 150 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>
                          {t.title} {t.firstName} {t.lastName}
                        </div>
                        <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>
                          {isChild ? 'Child' : idx === 0 ? 'Lead Traveller' : 'Traveller'} · {t.relationship || '—'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 20, marginLeft: 'auto' }}>
                        <div>
                          <div style={{ fontSize: 9.5, color: '#aaa', fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>DOB</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{fmtDate(t.dob)}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9.5, color: '#aaa', fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>Passport</div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{t.passport || '—'}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '14px 22px', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {Array.from({ length: adults }, (_, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', background: '#fafafa', border: '1px solid #f0e8e8',
                    borderRadius: 8, minWidth: 180 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${O}14`,
                      border: `1.5px solid ${O}44`, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>👤</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>
                        Adult {i + 1}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>
                        {i === 0 ? 'Lead Traveller' : 'Traveller'}
                      </div>
                    </div>
                  </div>
                ))}
                {Array.from({ length: children }, (_, i) => (
                  <div key={`c${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', background: '#fafafa', border: '1px solid #f0e8e8',
                    borderRadius: 8, minWidth: 180 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f0faf4',
                      border: '1.5px solid #c8ecd5', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>🧒</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a2e' }}>Child {i + 1}</div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>Traveller</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Select Payment Mode */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #f0e8e8',
            boxShadow: '0 2px 12px rgba(0,0,0,.05)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 22px', borderBottom: '1px solid #f0e8e8' }}>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1a1a2e', margin: 0 }}>Select Payment Mode</h2>
            </div>
            <div style={{ padding: '16px 22px' }}>
              {/* Row 1: UPI · Net Banking · Credit Card */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 10 }}>
                {MODES.slice(0, 3).map(m => (
                  <button key={m.id} onClick={() => setSelectedMode(m.id)} style={{
                    padding: '16px 10px', background: selectedMode === m.id ? `${O}08` : '#fafafa',
                    border: selectedMode === m.id ? `2px solid ${O}` : '1.5px solid #e8e0e0',
                    borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 24, marginBottom: 7 }}>{m.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 800,
                      color: selectedMode === m.id ? O : '#1a1a2e' }}>{m.label}</div>
                    <div style={{ fontSize: 10.5, color: '#aaa', marginTop: 3 }}>{m.sub}</div>
                  </button>
                ))}
              </div>
              {/* Row 2: Debit Card · Creditpool */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginBottom: 16 }}>
                {MODES.slice(3).map(m => {
                  const disabled = m.id === 'creditpool' && creditpoolInsufficient;
                  return (
                    <button key={m.id} onClick={() => !disabled && setSelectedMode(m.id)} disabled={disabled} style={{
                      padding: '16px 10px',
                      background: disabled ? '#f5f5f5' : selectedMode === m.id ? `${O}08` : '#fafafa',
                      border: disabled ? '1.5px solid #eee' : selectedMode === m.id ? `2px solid ${O}` : '1.5px solid #e8e0e0',
                      borderRadius: 10, cursor: disabled ? 'not-allowed' : 'pointer',
                      fontFamily: 'inherit', textAlign: 'center', opacity: disabled ? 0.55 : 1,
                    }}>
                      <div style={{ fontSize: 24, marginBottom: 7 }}>{m.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 800,
                        color: disabled ? '#aaa' : selectedMode === m.id ? O : '#1a1a2e' }}>{m.label}</div>
                      <div style={{ fontSize: 10.5, color: disabled ? PK : '#aaa', marginTop: 3, fontWeight: disabled ? 700 : 400 }}>
                        {disabled ? 'Insufficient balance' : m.sub}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Gateway notice */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', background: '#fff9f0',
                border: `1px solid ${O}44`, borderRadius: 9 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>🔒</span>
                <div style={{ fontSize: 12.5, color: '#555', lineHeight: 1.5 }}>
                  {selectedMode === 'creditpool'
                    ? <>Clicking <strong style={{ color: O }}>Pay Now</strong> will deduct this amount from your Creditpool wallet balance.</>
                    : <>Clicking <strong style={{ color: O }}>Pay Now</strong> will open our secure payment gateway to complete the transaction. No card or UPI details are stored on this site.</>}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT — Billing + Pay Now ── */}
        <div style={{ width: 292, flexShrink: 0, position: 'sticky', top: 74 }}>
          <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden',
            border: '1px solid #f0e8e8', boxShadow: '0 8px 32px rgba(240,120,32,.12)', marginBottom: 12 }}>

            {/* Orange header */}
            <div style={{ background: `linear-gradient(135deg,${O} 0%,${O2} 100%)`, padding: '18px 22px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,.75)',
                letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 8 }}>Billing Detail</div>
              <div style={{ display: 'inline-flex', alignItems: 'center',
                background: 'rgba(255,255,255,.2)', borderRadius: 5, padding: '3px 12px' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>
                  TRAVEL INSURANCE · {pax} Pax
                </span>
              </div>
            </div>

            <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 0 }}>

              {/* Base Premium */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                paddingBottom: 12, borderBottom: '1px dashed #f0e8e8', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a2e' }}>Base Premium</div>
                  <div style={{ fontSize: 10.5, color: '#bbb', marginTop: 3 }}>
                    {pax} Pax · {dest || 'Worldwide'}
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1a1a2e' }}>
                  ₹{baseFare.toLocaleString()}
                </div>
              </div>

              {/* GST */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>GST (18%)</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#1a1a2e' }}>₹{gstAmt.toLocaleString()}</div>
              </div>

              {/* Convenience Fee */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingBottom: 10, borderBottom: '1px dashed #f0e8e8', marginBottom: 10 }}>
                <div style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>Convenience Fee</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: GR }}>+ ₹ 0</div>
              </div>

              {/* IRDAI badge */}
              <div style={{ padding: '8px 10px', background: '#f0faf4',
                border: '1px solid #c8ecd5', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13 }}>✅</span>
                  <span style={{ fontSize: 11, color: GR, fontWeight: 700 }}>IRDAI Approved Policy</span>
                </div>
              </div>
            </div>

            {/* Total */}
            <div style={{ background: `linear-gradient(135deg,${O}12,${O}06)`,
              borderTop: `2px solid ${O}30`, padding: '14px 22px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: O,
                    letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 3 }}>Total Amount</div>
                  <div style={{ fontSize: 10.5, color: '#bbb' }}>Incl. 18% GST</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#bbb', textDecoration: 'line-through',
                    textAlign: 'right', marginBottom: 2 }}>
                    ₹{strikeAmt.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: O }}>
                    ₹{total.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Secure badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, marginBottom: 12 }}>
            <span style={{ fontSize: 15 }}>🔒</span>
            <span style={{ fontSize: 11, color: '#aaa', fontWeight: 500 }}>Secure &amp; Encrypted Payment</span>
          </div>

          {error && (
            <div style={{ fontSize: 12.5, color: PK, background: '#fdeef1', border: '1px solid #f3c6d0',
              borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
              {error}
            </div>
          )}

          {/* Pay Now */}
          <button onClick={handlePay} disabled={!canPay}
            style={{ width: '100%', padding: '14px 0',
              background: canPay ? `linear-gradient(135deg,${O},${O2})` : '#e8e2db',
              color: canPay ? '#fff' : '#bbb', border: 'none', borderRadius: 10,
              fontSize: 15, fontWeight: 800, cursor: canPay ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', letterSpacing: '.02em',
              boxShadow: canPay ? `0 6px 20px ${O}55` : 'none', marginBottom: 10 }}>
            {payStatus === 'processing' ? 'Processing…' : `Pay Now ₹${total.toLocaleString()}`}
          </button>

          <button onClick={() => window.history.back()}
            style={{ width: '100%', padding: '10px 0', background: 'none',
              border: '1.5px solid #e8e0e0', borderRadius: 10, fontSize: 13,
              fontWeight: 700, color: '#888', cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Back to Traveller Details
          </button>
        </div>
      </div>

      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setScriptReady(true)} />
    </div>
  );
}

export default function PaymentPage() {
  return <Suspense><PaymentContent /></Suspense>;
}
