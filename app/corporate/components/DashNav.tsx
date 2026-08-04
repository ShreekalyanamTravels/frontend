'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Playfair_Display } from 'next/font/google';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const playfair = Playfair_Display({ subsets:['latin'], weight:['700'], style:['italic'] });

const O = '#f07820'; const O2 = '#e86d18';

const MENU = [
  { icon:'📋', label:'My Bookings',    href:'/corporate/my-bookings'    },
  { icon:'👛', label:'My Wallet',      href:'/corporate/wallet'         },
  { icon:'💰', label:'Deposits',       href:'/corporate/deposits'       },
  { icon:'📒', label:'Ledger',         href:'/corporate/ledger'         },
  { icon:'💳', label:'Online Payment', href:'/corporate/online-payment' },
  { icon:'👤', label:'Profile',        href:'/corporate/profile'        },
  { icon:'🧾', label:'GST Detail',     href:'/corporate/gst-details'    },
];

export default function DashNav({ title }: { title?: string }) {
  const router = useRouter();
  const { user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <nav style={{
      background:'linear-gradient(90deg,#111 0%,#1e1e1e 100%)',
      padding:'0 5%', display:'flex', alignItems:'center',
      justifyContent:'space-between', height:58, flexShrink:0,
      boxShadow:'0 2px 12px rgba(0,0,0,.4)',
    }}>
      {/* Logo */}
      <Link href="/corporate/dashboard" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' }}>
        <span style={{ fontSize:24 }}>🪷</span>
        <span className={playfair.className} style={{ fontSize:21, fontWeight:700, color:'#c9184a', fontStyle:'italic', letterSpacing:'.01em' }}>
          Kalyanam
        </span>
        {title && (
          <span style={{ fontSize:13, color:'rgba(255,255,255,.4)', fontWeight:400, marginLeft:6, fontStyle:'normal', fontFamily:'inherit' }}>
            / {title}
          </span>
        )}
      </Link>

      <div style={{ display:'flex', alignItems:'center', gap:20 }}>
        <Link href="/corporate/dashboard" style={{
          fontSize:13, fontWeight:600, color:'rgba(255,255,255,.55)',
          textDecoration:'none', letterSpacing:'.01em',
          display:'flex', alignItems:'center', gap:5,
        }}>
          ← Dashboard
        </Link>

        {/* Avatar + dropdown */}
        <div ref={ref} style={{ position:'relative' }}>
          <div onClick={() => setOpen(p => !p)} style={{
            width:38, height:38, borderRadius:'50%',
            background:'linear-gradient(135deg,#2d8a4e,#1e6b3a)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:18, cursor:'pointer', border:'2px solid #3da862',
            boxShadow:'0 2px 8px rgba(0,0,0,.3)',
          }}>👤</div>

          {open && (
            <div style={{
              position:'absolute', top:'calc(100% + 10px)', right:0,
              background:'#fff', borderRadius:14,
              boxShadow:'0 12px 48px rgba(0,0,0,.2)', zIndex:500,
              minWidth:210, border:'1px solid #f0ebe5', overflow:'hidden',
            }}>
              <div style={{ background:`linear-gradient(135deg,${O},${O2})`, padding:'14px 18px' }}>
                <div style={{ fontSize:13.5, fontWeight:800, color:'#fff' }}>{user?.name || 'Account'}</div>
                <div style={{ fontSize:11.5, color:'rgba(255,255,255,.75)', marginTop:3 }}>
                  {user?.email}
                </div>
                {user?.corporateId && (
                  <div style={{ fontSize:11.5, color:'rgba(255,255,255,.75)', marginTop:3 }}>
                    Corp ID : <span style={{ fontWeight:700, letterSpacing:'.04em' }}>{user.corporateId}</span>
                  </div>
                )}
              </div>
              {MENU.map(item => (
                <Link key={item.label} href={item.href} onClick={() => setOpen(false)} style={{
                  display:'flex', alignItems:'center', gap:11,
                  padding:'11px 18px', textDecoration:'none',
                  color:'#333', fontSize:13.5, fontWeight:500,
                  borderBottom:'1px solid #f5f0ee',
                }}>
                  <span>{item.icon}</span> {item.label}
                </Link>
              ))}
              <button onClick={() => { setOpen(false); handleLogout(); }} style={{
                width:'100%', display:'flex', alignItems:'center', gap:11,
                padding:'11px 18px', background:'none', border:'none',
                color:'#c9184a', fontSize:13.5, fontWeight:600, cursor:'pointer',
                fontFamily:'inherit',
              }}>
                <span>🚪</span> Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
