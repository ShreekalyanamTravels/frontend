'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const FOOTER_LINKS = [
  { label:'About Us',           href:'/corporate/about'      },
  { label:'Terms & Conditions', href:'/corporate/terms'      },
  { label:'Fare Rules',         href:'/corporate/fare-rules' },
  { label:'Payment Policy',     href:'/corporate/payment'    },
  { label:'Contact Us',         href:'/corporate/contact'    },
];

const PARTNERS = [
  'Tata Group','Infosys','Wipro','HCL Technologies','Reliance Industries','HDFC Bank','Mahindra','Bajaj Finserv',
  'Tata Group','Infosys','Wipro','HCL Technologies','Reliance Industries','HDFC Bank','Mahindra','Bajaj Finserv',
];

export default function CorpFooter({ ticker = false }: { ticker?: boolean }) {
  const path = usePathname();
  return (
    <>
      {ticker && (
        <div style={{ background:'#1c1c1c', padding:'16px 0', overflow:'hidden', display:'flex', alignItems:'center' }}>
          <div style={{ flexShrink:0, padding:'0 20px 0 28px', fontSize:10, fontWeight:700,
            letterSpacing:'.1em', textTransform:'uppercase', color:'#c9184a',
            borderRight:'1px solid #333', whiteSpace:'nowrap' }}>
            BRAND PARTNERS
          </div>
          <div style={{ display:'flex', animation:'ticker 30s linear infinite', whiteSpace:'nowrap' }}>
            {PARTNERS.map((p, i) => (
              <span key={i} style={{ fontSize:13.5, fontWeight:500, color:'#ccc',
                padding:'0 36px', borderRight:'1px solid #2a2a2a', flexShrink:0 }}>{p}</span>
            ))}
          </div>
          <style>{`@keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
        </div>
      )}
      <footer style={{ background:'#1c1c1c', padding:'18px 6%', display:'flex',
        justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
        <span style={{ fontSize:12.5, color:'#666' }}>
          © 2026 Shree Kalyanam.{' '}
          <span style={{ color:'#c9184a' }}>All rights reserved.</span>
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap' }}>
          {FOOTER_LINKS.map((l, i, arr) => (
            <span key={l.label} style={{ display:'flex', alignItems:'center', gap:4 }}>
              <Link href={l.href} style={{ fontSize:12.5,
                color: path === l.href ? '#c9184a' : '#888',
                textDecoration:'none' }}>
                {l.label}
              </Link>
              {i < arr.length-1 && <span style={{ color:'#444', padding:'0 4px' }}>·</span>}
            </span>
          ))}
        </div>
      </footer>
    </>
  );
}
