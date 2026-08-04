'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Playfair_Display } from 'next/font/google';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'], style: ['italic'] });

const LINKS = [
  { href: '/',           label: 'Home'       },
  { href: '/why-us',     label: 'Why Us'     },
  { href: '/partner-us', label: 'Partner Us' },
  { href: '/contact',    label: 'Contact Us' },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav">
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
        <span style={{ fontSize: 22 }}>🪷</span>
        <span className={playfair.className} style={{ fontSize: 20, fontWeight: 700, color: '#c9184a', fontStyle: 'italic', letterSpacing: '.01em' }}>
          Kalyanam
        </span>
      </Link>

      <ul className="nav-links">
        {LINKS.map(l => (
          <li key={l.href}>
            <Link href={l.href} style={{
              color: path === l.href ? '#c9184a' : '#444',
              fontWeight: path === l.href ? 600 : 500,
              textDecoration: path === l.href ? 'underline' : 'none',
              textUnderlineOffset: 4,
              fontSize: 13.5,
              letterSpacing: '.01em',
            }}>
              {l.label}
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/corporate/login" style={{
        padding: '8px 24px', border: '1.5px solid #1a1408', borderRadius: 8,
        fontSize: 13, fontWeight: 600, color: '#1a1408', textDecoration: 'none',
        background: 'transparent', display: 'inline-block', letterSpacing: '.02em',
        transition: 'all .18s',
      }}>
        Login
      </Link>
    </nav>
  );
}
