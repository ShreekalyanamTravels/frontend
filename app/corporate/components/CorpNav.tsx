'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({ subsets:['latin'], weight:['700'], style:['italic'] });

const NAV_LINKS = [
  { label:'Home',       href:'/corporate/login'      },
  { label:'Why Us',     href:'/corporate/why-us'     },
  { label:'Partner Us', href:'/corporate/partner-us' },
  { label:'Contact Us', href:'/corporate/contact'    },
];

export default function CorpNav() {
  const path = usePathname();

  function active(href: string) {
    if (href === '/corporate/login') return path === '/corporate/login' || path === '/corporate';
    return path === href;
  }

  return (
    <nav style={{ background:'#fff', borderBottom:'1px solid #f0e8e8', padding:'0 5%',
      display:'flex', alignItems:'center', justifyContent:'space-between', height:62 }}>
      <Link href="/corporate/login" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
        <span style={{ fontSize:26 }}>🪷</span>
        <span className={playfair.className} style={{ fontSize:22, fontWeight:700, color:'#c9184a', fontStyle:'italic' }}>Kalyanam</span>
      </Link>
      <ul style={{ display:'flex', gap:30, listStyle:'none', alignItems:'center', margin:0, padding:0 }}>
        {NAV_LINKS.map(l => (
          <li key={l.label}>
            <Link href={l.href} style={{ fontSize:13.5, color: active(l.href) ? '#c9184a' : '#444',
              textDecoration:'none', fontWeight:500,
              borderBottom: active(l.href) ? '2px solid #c9184a' : '2px solid transparent', paddingBottom:3 }}>
              {l.label}
            </Link>
          </li>
        ))}
        <li>
          <Link href="/corporate/login" style={{ padding:'6px 22px', background:'#fff', color:'#c9184a',
            border:'1.5px solid #c9184a', borderRadius:7, fontSize:13.5, fontWeight:600, textDecoration:'none' }}>
            Login
          </Link>
        </li>
      </ul>
    </nav>
  );
}
