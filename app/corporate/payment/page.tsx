import Link from 'next/link';
import { Playfair_Display, Inter } from 'next/font/google';
import CorpNav from '../components/CorpNav';
import CorpFooter from '../components/CorpFooter';

const playfair = Playfair_Display({ subsets:['latin'], weight:['400','700'], style:['italic','normal'] });
const inter    = Inter({ subsets:['latin'], weight:['400','500','600','700','800'] });

const FOOTER_LINKS = [
  { label:'About Us',           href:'/corporate/about'      },
  { label:'Terms & Conditions', href:'/corporate/terms'      },
  { label:'Fare Rules',         href:'/corporate/fare-rules' },
  { label:'Payment Policy',     href:'/corporate/payment'    },
  { label:'Contact Us',         href:'/corporate/contact'    },
];

const BANKS_LEFT  = ['HDFC Bank','Axis Bank','SBI','ICICI Bank','YES Bank','Punjab National Bank','Bank of Baroda','Canara Bank'];
const BANKS_RIGHT = ['Union Bank','Central Bank of India','IDBI Bank','Karnataka Bank','Indian Bank','South Indian Bank','Standard Chartered','Others'];

const li: React.CSSProperties = { fontSize:13.5, color:'#5060a0', lineHeight:1.75 };

export default function PaymentPolicyPage() {
  return (
    <div className={inter.className} style={{ background:'#fdf6f2', minHeight:'100vh', color:'#1a1a2e', display:'flex', flexDirection:'column' }}>

      <CorpNav />

      {/* ── CONTENT ── */}
      <main style={{ flex:1, maxWidth:900, margin:'0 auto', width:'100%', padding:'48px 6% 80px' }}>

        {/* Intro */}
        <p style={{ fontSize:13.5, color:'#555', lineHeight:1.8, marginBottom:32 }}>
          Kalpvriksha Holidays ensures safe and secure payment processing through trusted gateways.
        </p>

        <div style={{ height:1, background:'#ede8e8', marginBottom:32 }} />

        {/* 1. Online Card Payments */}
        <div style={{ marginBottom:32 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'#1a1a2e', margin:'0 0 10px' }}>1. Online Card Payments</h2>
          <p style={{ fontSize:13.5, color:'#555', lineHeight:1.8, marginBottom:14 }}>
            We accept Visa, MasterCard, and American Express cards through a secure payment gateway.
          </p>
          <ul style={{ margin:'0 0 16px', paddingLeft:22, display:'flex', flexDirection:'column', gap:9 }}>
            {[
              '128-bit SSL encryption ensures complete data security',
              'Your card details are not stored on our servers',
              'Transactions are processed directly via banking networks',
            ].map(item => <li key={item} style={li}>{item}</li>)}
          </ul>
          <p style={{ fontSize:13.5, color:'#555', lineHeight:1.8, margin:0 }}>
            If your payment is declined, alternative payment must be completed at least{' '}
            <strong style={{ color:'#1a1a2e' }}>72 hours before departure</strong>, otherwise booking may be cancelled.
          </p>
        </div>

        <div style={{ height:1, background:'#ede8e8', marginBottom:32 }} />

        {/* 2. Internet Banking */}
        <div style={{ marginBottom:32 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'#1a1a2e', margin:'0 0 10px' }}>2. Internet Banking</h2>
          <p style={{ fontSize:13.5, color:'#555', lineHeight:1.8, marginBottom:14 }}>
            We support net banking for major banks including:
          </p>
          {/* Two-column bank list */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 40px' }}>
            <ul style={{ margin:0, paddingLeft:22, display:'flex', flexDirection:'column', gap:9 }}>
              {BANKS_LEFT.map(b => <li key={b} style={li}>{b}</li>)}
            </ul>
            <ul style={{ margin:0, paddingLeft:22, display:'flex', flexDirection:'column', gap:9 }}>
              {BANKS_RIGHT.map(b => <li key={b} style={li}>{b}</li>)}
            </ul>
          </div>
        </div>

        <div style={{ height:1, background:'#ede8e8', marginBottom:32 }} />

        {/* Transaction Confirmation */}
        <div style={{ marginBottom:32 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'#1a1a2e', margin:'0 0 10px' }}>Transaction Confirmation</h2>
          <p style={{ fontSize:13.5, color:'#5060a0', lineHeight:1.8, margin:0 }}>
            Please do not rely on booking status until you receive official confirmation via email or SMS. If you do not receive confirmation, check your spam folder or contact support.
          </p>
        </div>

        <div style={{ height:1, background:'#ede8e8', marginBottom:32 }} />

        {/* Delivery of Services */}
        <div style={{ marginBottom:0 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'#1a1a2e', margin:'0 0 10px' }}>Delivery of Services</h2>
          <p style={{ fontSize:13.5, color:'#5060a0', lineHeight:1.8, margin:0 }}>
            All bookings are delivered electronically via email (e-tickets, vouchers, etc.).
          </p>
        </div>
      </main>

      <CorpFooter />
    </div>
  );
}
