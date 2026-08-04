'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import DashNav from '../components/DashNav';
import CorpFooter from '../components/CorpFooter';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useConvenienceFee } from '../../hooks/useConvenienceFee';

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const inter = Inter({ subsets:['latin'], weight:['400','500','600','700','800'] });

const O = '#f07820'; const O2 = '#e86d18';

const QUICK_AMOUNTS = [5000, 10000, 25000, 50000, 100000];

type Method = 'upi' | 'netbanking' | 'credit' | 'debit';

const METHODS: { key: Method; label: string; icon: string }[] = [
  { key:'upi',        label:'UPI',          icon:'📱' },
  { key:'netbanking', label:'Net Banking',  icon:'🏦' },
  { key:'credit',     label:'Credit Card',  icon:'💳' },
  { key:'debit',      label:'Debit Card',   icon:'🏧' },
];

// Matches payment_modes.id, same mapping the flight booking payment-details page uses.
const MODE_ID: Record<Method, string> = { upi:'1', netbanking:'2', credit:'3', debit:'4' };

const CHECKOUT_BLOCK: Record<Method, { name: string; instruments: Array<{ method: string; types?: string[] }> }> = {
  upi:        { name:'UPI',         instruments:[{ method:'upi' }] },
  netbanking: { name:'Net Banking', instruments:[{ method:'netbanking' }] },
  credit:     { name:'Credit Card', instruments:[{ method:'card', types:['credit'] }] },
  debit:      { name:'Debit Card',  instruments:[{ method:'card', types:['debit'] }] },
};

export default function OnlinePaymentPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<Method>('upi');
  const [payStatus, setPayStatus] = useState<'idle' | 'creating' | 'success'>('idle');
  const [error, setError] = useState('');
  const [scriptReady, setScriptReady] = useState(false);

  const numAmount = parseFloat(amount) || 0;

  // Same dynamic convenience_fee lookup (payment_mode + sector) the flight booking payment page
  // uses — sector is always 'O' here since a wallet recharge has no trip type of its own, matching
  // the same 'O' fallback the flight flow already relies on for corporate bookings.
  const convenience = useConvenienceFee(MODE_ID[method], 'O', numAmount);
  const [gstPercentage, setGstPercentage] = useState(0);
  useEffect(() => {
    fetch('/api/gst-percentage').then(res => res.json())
      .then(data => setGstPercentage(Number(data.gstPercentage) || 0))
      .catch(() => setGstPercentage(0));
  }, []);
  const gst         = numAmount > 0 ? Math.round((convenience * gstPercentage) / 100) : 0;
  const total       = numAmount + convenience + gst;
  const amountValid = numAmount >= 100;
  const canPay      = amountValid && scriptReady && payStatus !== 'creating';

  useEffect(() => {
    if (!userLoading && !user) router.push('/');
  }, [userLoading, user, router]);

  async function handlePay() {
    setError('');
    setPayStatus('creating');
    try {
      const orderRes = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount, paymentMode: MODE_ID[method] }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok) {
        setError(order.error ?? 'Failed to initiate payment.');
        setPayStatus('idle');
        return;
      }

      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: Math.round(order.total * 100),
        currency: 'INR',
        name: 'Shree Kalyanam',
        description: 'Wallet Top-up',
        order_id: order.orderId,
        prefill: { name: user?.name, email: user?.email },
        theme: { color: O },
        config: {
          display: {
            blocks: { highlighted: CHECKOUT_BLOCK[method] },
            sequence: ['block.highlighted'],
            preferences: { show_default_blocks: false },
          },
        },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          setPayStatus('creating');
          try {
            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                amount: order.amount,
                convenienceFee: order.convenienceFee,
                total: order.total,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              setError(verifyData.error ?? 'Payment verification failed. Please contact support.');
              setPayStatus('idle');
              return;
            }
            setPayStatus('success');
          } catch {
            setError('Payment succeeded but verification failed. Please contact support.');
            setPayStatus('idle');
          }
        },
        modal: {
          ondismiss: () => setPayStatus('idle'),
        },
      });
      rzp.open();
      setPayStatus('idle');
    } catch {
      setError('Something went wrong. Please try again.');
      setPayStatus('idle');
    }
  }

  return (
    <div className={inter.className} style={{ background:'#f9f2ec', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <DashNav title="Online Payment" />

      <main style={{ flex:1, padding:'40px 5% 60px' }}>
        <div style={{ maxWidth:560, margin:'0 auto' }}>

          <div style={{ marginBottom:28 }}>
            <h1 style={{ fontSize:24, fontWeight:800, color:'#1a1a2e', margin:'0 0 4px', letterSpacing:'-.01em' }}>Online Payment</h1>
            <p style={{ fontSize:13, color:'#aaa', margin:0 }}>Add funds to your wallet securely</p>
          </div>

          {/* Amount */}
          <div style={{ background:'#fff', borderRadius:14, padding:'24px 26px',
            boxShadow:'0 4px 20px rgba(0,0,0,.08)', marginBottom:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#888', marginBottom:12 }}>Enter Amount</div>

            <div style={{ position:'relative', marginBottom:14 }}>
              <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)',
                fontSize:20, fontWeight:800, color:'#1a1a2e' }}>₹</span>
              <input
                type="number" value={amount} onChange={e => setAmount(e.target.value)}
                placeholder="0.00" min="100"
                style={{ width:'100%', padding:'14px 14px 14px 38px',
                  border:`2px solid ${amount ? O : '#e8e2db'}`,
                  borderRadius:10, fontSize:22, fontWeight:800, color:'#1a1a2e',
                  fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
              />
            </div>

            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {QUICK_AMOUNTS.map(a => (
                <button key={a} onClick={() => setAmount(String(a))} style={{
                  padding:'6px 14px', borderRadius:18, fontFamily:'inherit',
                  border:`1.5px solid ${amount === String(a) ? O : '#e8e2db'}`,
                  background: amount === String(a) ? `${O}18` : '#fff',
                  color: amount === String(a) ? O : '#666',
                  fontSize:12.5, fontWeight:700, cursor:'pointer',
                }}>₹{a >= 100000 ? '1L' : `${a/1000}K`}</button>
              ))}
            </div>
          </div>

          {/* Payment method selector */}
          <div style={{ background:'#fff', borderRadius:14, padding:'24px 26px',
            boxShadow:'0 4px 20px rgba(0,0,0,.08)', marginBottom:18 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#888', marginBottom:14 }}>Payment Method</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10 }}>
              {METHODS.map(m => (
                <div key={m.key} onClick={() => setMethod(m.key)} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'14px 16px',
                  borderRadius:10, cursor:'pointer',
                  border:`2px solid ${method === m.key ? O : '#e8e2db'}`,
                  background: method === m.key ? `${O}0d` : '#fff',
                }}>
                  <span style={{ fontSize:22 }}>{m.icon}</span>
                  <span style={{ fontSize:13.5, fontWeight:700,
                    color: method === m.key ? O : '#555' }}>{m.label}</span>
                  {method === m.key && (
                    <span style={{ marginLeft:'auto', fontSize:16, color:O }}>✓</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Fee summary */}
          <div style={{ background:'#fff', borderRadius:14, padding:'20px 26px',
            boxShadow:'0 4px 20px rgba(0,0,0,.08)', marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:700, color:'#888', marginBottom:14 }}>Payment Summary</div>
            {[
              { label:'Amount',                                 value: numAmount > 0 ? `₹${numAmount.toLocaleString('en-IN')}` : '—' },
              { label:'Convenience Fee',                        value: convenience > 0 ? `₹${convenience.toLocaleString('en-IN')}` : '—' },
              { label:`GST on Fee${gstPercentage ? ` (${gstPercentage}%)` : ''}`, value: gst > 0 ? `₹${gst.toLocaleString('en-IN')}` : '—' },
            ].map(r => (
              <div key={r.label} style={{ display:'flex', justifyContent:'space-between',
                padding:'9px 0', borderBottom:'1px solid #f5f0ee', fontSize:13.5 }}>
                <span style={{ color:'#777' }}>{r.label}</span>
                <span style={{ fontWeight:600, color:'#1a1a2e' }}>{r.value}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0 0', fontSize:15 }}>
              <span style={{ fontWeight:800, color:'#1a1a2e' }}>Total Payable</span>
              <span style={{ fontWeight:800, color:O }}>{total > 0 ? `₹${total.toLocaleString('en-IN')}` : '—'}</span>
            </div>
          </div>

          {error && (
            <div style={{ fontSize:12.5, color:'#c9184a', background:'#fdeef1', border:'1px solid #f3c6d0',
              borderRadius:8, padding:'10px 14px', marginBottom:14 }}>
              {error}
            </div>
          )}

          {payStatus === 'success' ? (
            <div style={{ background:'#e8f5e9', border:'1px solid #bfe3c3', borderRadius:11,
              padding:'18px', textAlign:'center' }}>
              <div style={{ fontSize:15, fontWeight:800, color:'#2d8a4e', marginBottom:4 }}>✓ Payment Successful</div>
              <p style={{ fontSize:13, color:'#3a6b47', margin:0 }}>
                ₹{numAmount.toLocaleString('en-IN')} has been added to your wallet.
              </p>
            </div>
          ) : (
            <>
              {/* CTA */}
              <button onClick={handlePay} disabled={!canPay} style={{
                width:'100%', padding:'14px',
                background: canPay ? `linear-gradient(135deg,${O},${O2})` : '#e8e2db',
                color: canPay ? '#fff' : '#bbb',
                border:'none', borderRadius:11, fontSize:16, fontWeight:800,
                cursor: canPay ? 'pointer' : 'not-allowed', fontFamily:'inherit',
                boxShadow: canPay ? `0 6px 24px ${O}55` : 'none',
              }}>
                {payStatus === 'creating' ? 'Processing…' : 'Proceed to Payment Gateway →'}
              </button>

              {amountValid && (
                <p style={{ fontSize:12, color:'#bbb', textAlign:'center', marginTop:12 }}>
                  You will be redirected to a secure payment gateway to complete the transaction.
                </p>
              )}
            </>
          )}
        </div>
      </main>

      <CorpFooter />

      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptReady(true)}
      />
    </div>
  );
}
