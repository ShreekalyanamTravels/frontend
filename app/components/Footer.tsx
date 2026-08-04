'use client';
import Link from 'next/link';

const FOOTER_LINKS = [
  { label: 'About Us',          href: '/about'       },
  { label: 'Terms & Conditions',href: '/terms'       },
  { label: 'Fare Rules',        href: '/fare-rules'  },
  { label: 'Payment Policy',    href: '/payment'     },
  { label: 'Contact Us',        href: '/contact'     },
];

export default function Footer() {
  return (
    <footer style={{
      background: '#111', padding: '20px 6%',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12,
    }}>
      <span style={{ fontSize: 12, color: '#7a7a7a' }}>
        © 2026 Shree Kalyanam. All rights reserved.
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {FOOTER_LINKS.map((l, i) => (
          <span key={l.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Link href={l.href} style={{ fontSize: 12, color: '#8a8a8a', textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#c9184a')}
              onMouseLeave={e => (e.currentTarget.style.color = '#8a8a8a')}>
              {l.label}
            </Link>
            {i < FOOTER_LINKS.length - 1 && (
              <span style={{ color: '#444', fontSize: 10 }}>·</span>
            )}
          </span>
        ))}
      </div>
    </footer>
  );
}
