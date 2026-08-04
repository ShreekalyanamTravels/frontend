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

export default function FareRulesPage() {
  return (
    <div className={inter.className} style={{ background:'#fdf6f2', minHeight:'100vh', color:'#1a1a2e', display:'flex', flexDirection:'column' }}>

      <CorpNav />

      {/* ── CONTENT ── */}
      <main style={{ flex:1, maxWidth:860, margin:'0 auto', width:'100%', padding:'48px 6% 80px' }}>

        {/* Domestic Flight Tickets */}
        <div style={{ marginBottom:32 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'#1a1a2e', margin:'0 0 10px' }}>Domestic Flight Tickets</h2>
          <p style={{ fontSize:13.5, color:'#555', lineHeight:1.8, margin:0 }}>
            Any changes including cancellation, rescheduling, or itinerary modification must be made at least{' '}
            <strong style={{ color:'#1a1a2e' }}>5 hours before departure</strong>.
          </p>
        </div>

        <div style={{ height:1, background:'#ede8e8', marginBottom:32 }} />

        {/* International Flight Tickets */}
        <div style={{ marginBottom:32 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'#1a1a2e', margin:'0 0 10px' }}>International Flight Tickets</h2>
          <p style={{ fontSize:13.5, color:'#555', lineHeight:1.8, margin:0 }}>
            International bookings are subject to airline-specific rules and cancellation charges. Please contact airline or our support team for details.
          </p>
        </div>

        <div style={{ height:1, background:'#ede8e8', marginBottom:32 }} />

        {/* Refund Policy */}
        <div style={{ marginBottom:32 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'#1a1a2e', margin:'0 0 14px' }}>Refund Policy</h2>
          <ul style={{ margin:0, paddingLeft:22, display:'flex', flexDirection:'column', gap:10 }}>
            {[
              'Refunds will be processed based on payment method',
              'Credit card payments → refunded to same card',
              'Cash payments → refunded to customer wallet/pool',
            ].map(item => (
              <li key={item} style={{ fontSize:13.5, color:'#5060a0', lineHeight:1.75 }}>{item}</li>
            ))}
          </ul>
        </div>

        <div style={{ height:1, background:'#ede8e8', marginBottom:32 }} />

        {/* Important Notes */}
        <div style={{ marginBottom:0 }}>
          <h2 style={{ fontSize:17, fontWeight:700, color:'#1a1a2e', margin:'0 0 14px' }}>Important Notes</h2>
          <ul style={{ margin:0, paddingLeft:22, display:'flex', flexDirection:'column', gap:10 }}>
            {[
              'No refund for no-show cases unless airline permits',
              'Service fees may be non-refundable',
              'Processing time may vary depending on airline/bank',
            ].map(item => (
              <li key={item} style={{ fontSize:13.5, color:'#5060a0', lineHeight:1.75 }}>{item}</li>
            ))}
          </ul>
        </div>
      </main>

      <CorpFooter />
    </div>
  );
}
