import Link from 'next/link';
import { Playfair_Display, Inter } from 'next/font/google';
import CorpNav from '../components/CorpNav';
import CorpFooter from '../components/CorpFooter';

const playfair = Playfair_Display({ subsets:['latin'], weight:['400','700'], style:['italic','normal'] });
const inter    = Inter({ subsets:['latin'], weight:['400','500','600','700','800'] });

const PARTNERS = [
  'Tata Group','Infosys','Wipro','HCL Technologies','Reliance Industries','HDFC Bank','Mahindra','Bajaj Finserv',
  'Tata Group','Infosys','Wipro','HCL Technologies','Reliance Industries','HDFC Bank','Mahindra','Bajaj Finserv',
];

const SECTIONS = [
  {
    title: 'About Us',
    type: 'para',
    content: 'Kalpvriksha Holidays is a leading travel service provider offering flight bookings, hotel reservations, travel insurance, and tour packages worldwide. We provide access to over 400,000 hotels globally with competitive pricing and 24/7 customer support.',
  },
  {
    title: 'Our Services',
    type: 'list',
    items: ['Flight Booking', 'Hotel Booking', 'Travel Insurance', 'Tour Packages', 'Rail Booking'],
  },
  {
    title: 'E-Ticket & Travel',
    type: 'list',
    items: [
      'E-tickets are issued via email after booking',
      'Carry e-ticket and valid ID at airport',
      'Failure to present documents may result in denied boarding',
    ],
  },
  {
    title: 'Passenger Responsibilities',
    type: 'list',
    items: [
      'Provide accurate booking information',
      'Carry valid passport/visa where required',
      'Follow airline and government regulations',
    ],
  },
  {
    title: 'Passport & Visa',
    type: 'para',
    content: 'Passport details are mandatory for international travel. Ensure you have valid visa and travel documents before departure.',
  },
  {
    title: 'Limitation of Liability',
    type: 'para',
    content: 'Kalpvriksha Holidays acts only as an intermediary and is not responsible for delays, cancellations, or service issues caused by airlines or third-party providers.',
  },
  {
    title: 'Contact Support',
    type: 'support',
    content: 'For any queries, please contact us at',
    phone: '9079850298',
  },
];

export default function TermsPage() {
  return (
    <div className={inter.className} style={{ background:'#fdf6f2', minHeight:'100vh', color:'#1a1a2e' }}>

      <CorpNav />

      {/* ── CONTENT ── */}
      <main style={{ maxWidth:860, margin:'0 auto', padding:'56px 6% 80px' }}>

        {/* Intro */}
        <p style={{ fontSize:14, color:'#444', marginBottom:36, lineHeight:1.75 }}>
          Welcome to <strong>Kalpvriksha Holidays</strong>. By using our services, you agree to the following terms and conditions.
        </p>

        <div style={{ borderTop:'1px solid #ede8e8', paddingTop:0 }}>
          {SECTIONS.map((s, i) => (
            <div key={s.title} style={{ paddingTop: i === 0 ? 0 : 32, paddingBottom:32, borderBottom:'1px solid #ede8e8' }}>

              <h2 style={{ fontSize:17, fontWeight:700, color:'#1a1a2e', margin:'0 0 14px' }}>{s.title}</h2>

              {s.type === 'para' && (
                <p style={{ fontSize:13.5, color:'#555', lineHeight:1.8, margin:0 }}>{s.content}</p>
              )}

              {s.type === 'list' && (
                <ul style={{ margin:0, paddingLeft:22, display:'flex', flexDirection:'column', gap:9 }}>
                  {(s.items as string[]).map(item => (
                    <li key={item} style={{ fontSize:13.5, color:'#5060a0', lineHeight:1.7 }}>{item}</li>
                  ))}
                </ul>
              )}

              {s.type === 'support' && (
                <p style={{ fontSize:13.5, color:'#555', lineHeight:1.8, margin:0 }}>
                  {s.content}{' '}
                  <strong style={{ color:'#1a1a2e' }}>{s.phone}</strong>.
                </p>
              )}
            </div>
          ))}
        </div>
      </main>

      <CorpFooter ticker />
    </div>
  );
}
