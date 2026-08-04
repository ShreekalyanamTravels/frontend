'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Playfair_Display } from 'next/font/google';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { useWalletBalance } from '../../hooks/useWalletBalance';

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'], style: ['italic'] });

const O  = '#f07820';
const O2 = '#e86d18';
const PK = '#c9184a';
const GR = '#2d8a4e';
const RED = '#ff5c5c';

const fmt = (n: number) => `₹ ${Math.abs(n).toLocaleString('en-IN')}`;

const MENU_ITEMS = [
  { icon: '📋', label: 'My Bookings',    href: '/corporate/my-bookings'    },
  { icon: '👛', label: 'My Wallet',      href: '/corporate/wallet'         },
  { icon: '💰', label: 'Deposits',       href: '/corporate/deposits'       },
  { icon: '📒', label: 'Ledger',         href: '/corporate/ledger'         },
  { icon: '💳', label: 'Online Payment', href: '/corporate/online-payment' },
  { icon: '👤', label: 'Profile',        href: '/corporate/profile'        },
  { icon: '🧾', label: 'GST Detail',     href: '/corporate/gst-details'    },
];

/* Shared authenticated-flow header — Logo / Account Type / Balance (Show Balance toggle +
 * dropdown) / Avatar (profile info + Logout, same behavior as DashNav). Design lifted verbatim
 * from /corporate/results, the canonical reference, and reused everywhere else in the booking
 * flow that previously duplicated (and drifted from) this same markup. */
export default function CorpHeader() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { balance, refetch: refetchBalance } = useWalletBalance(!!user);
  const [showBal, setShowBal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  }

  return (
    <nav style={{ background: 'linear-gradient(90deg,#111,#1e1e1e)', padding: '0 5%',
      height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      boxShadow: '0 2px 12px rgba(0,0,0,.4)', position: 'sticky', top: 0, zIndex: 200 }}>

      {/* Logo */}
      <Link href="/corporate/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
        <span style={{ fontSize: 24 }}>🪷</span>
        <span className={playfair.className}
          style={{ fontSize: 21, fontWeight: 700, color: PK, fontStyle: 'italic', letterSpacing: '.01em' }}>Kalyanam</span>
      </Link>

      {/* Right group: Account Type → balance controls → Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>

        {/* Account type */}
        <div style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,.45)' }}>ACCOUNT TYPE</span>
            <span style={{ fontSize: 8, color: PK }}>▼</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: '.05em', textTransform: 'uppercase' }}>
            CREDIT POOL
          </div>
        </div>

        <div style={{ width: 1, height: 38, background: 'rgba(255,255,255,.18)' }} />

        {/* Balance controls */}
        {showBal ? (
          <>
            <button onClick={refetchBalance} style={{ background: 'none', border: 'none', cursor: 'pointer',
              padding: '0 6px', color: '#4a9eff', fontSize: 20, lineHeight: 1 }}>↻</button>

            <div style={{ position: 'relative' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,.45)' }}>MAIN BALANCE</span>
                  <button onClick={() => setShowBal(false)} style={{
                    width: 17, height: 17, borderRadius: '50%', background: '#f44336',
                    border: 'none', cursor: 'pointer', color: '#fff', fontSize: 9, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                  }}>✕</button>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: balance && balance.displayBalance < 0 ? RED : GR }}>
                  {balance ? `${balance.displayBalance < 0 ? '-' : ''}${fmt(balance.displayBalance)}` : '…'}
                </div>
              </div>

              {/* Balance dropdown */}
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 14px)',
                background: '#fff', borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 12px 56px rgba(0,0,0,.22), 0 2px 10px rgba(0,0,0,.08)',
                zIndex: 300, minWidth: 268, border: '1px solid rgba(240,120,32,.15)' }}>
                <div style={{ position: 'absolute', top: -7, right: 22, width: 14, height: 14,
                  background: O, transform: 'rotate(45deg)', borderRadius: 2 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  background: `linear-gradient(135deg,${O},${O2})`, padding: '14px 20px' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff',
                    letterSpacing: '.04em' }}>Balance Summary</span>
                </div>
                <div style={{ padding: '16px 20px 20px' }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: '#bbb',
                    textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 14 }}>CREDIT POOL</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid #f5f0ee' }}>
                    <span style={{ fontSize: 14, color: '#555' }}>OD Balance</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: O }}>
                      {balance ? fmt(balance.odBalance) : '…'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 0', borderBottom: '1px solid #f5f0ee' }}>
                    <span style={{ fontSize: 14, color: '#555' }}>Main Balance</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: balance && balance.displayBalance < 0 ? PK : GR }}>
                      {balance ? `${balance.displayBalance < 0 ? '-' : ''}${fmt(balance.displayBalance)}` : '…'}
                    </span>
                  </div>
                  {balance && (
                    <div style={{ fontSize: 11, color: '#999', padding: '8px 0 0' }}>
                      Your OD Limit is ₹ {balance.permanentOdLimit.toLocaleString('en-IN')}
                    </div>
                  )}
                  {balance && balance.tempOdValid && balance.tempOdBal > 0 && (
                    <div style={{ fontSize: 11, color: '#999', padding: '4px 0 0' }}>
                      Temporary OD: ₹ {balance.tempOdBal.toLocaleString('en-IN')} (valid till {balance.tempOdExpiry})
                    </div>
                  )}
                  <div style={{ textAlign: 'right', marginTop: 14 }}>
                    <button onClick={() => router.push('/corporate/online-payment')} style={{
                      background: `linear-gradient(135deg,${O},${O2})`,
                      color: '#fff', border: 'none', borderRadius: 26, padding: '10px 28px',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      boxShadow: `0 4px 16px ${O}55` }}>Recharge</button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <button onClick={() => setShowBal(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 13, fontWeight: 600, color: PK,
              textDecoration: 'underline', textUnderlineOffset: 3, fontFamily: 'inherit' }}>
            Show Balance
          </button>
        )}

        <div style={{ width: 1, height: 38, background: 'rgba(255,255,255,.18)' }} />

        {/* Avatar + dropdown */}
        <div ref={menuRef} style={{ position: 'relative' }}>
          <div onClick={() => setShowMenu(p => !p)} style={{
            width: 38, height: 38, borderRadius: '50%',
            background: 'linear-gradient(135deg,#2d8a4e,#1e6b3a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, cursor: 'pointer', border: '2px solid #3da862',
            boxShadow: '0 2px 8px rgba(0,0,0,.3)' }}>👤</div>

          {showMenu && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              background: '#fff', borderRadius: 14,
              boxShadow: '0 12px 48px rgba(0,0,0,.2)', zIndex: 500,
              minWidth: 210, border: '1px solid #f0ebe5', overflow: 'hidden',
            }}>
              <div style={{ background: `linear-gradient(135deg,${O},${O2})`, padding: '14px 18px' }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: '#fff' }}>{user?.name || 'Account'}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.75)', marginTop: 3 }}>
                  {user?.email}
                </div>
                {user?.corporateId && (
                  <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,.75)', marginTop: 3 }}>
                    Corp ID : <span style={{ fontWeight: 700, letterSpacing: '.04em' }}>{user.corporateId}</span>
                  </div>
                )}
              </div>
              {MENU_ITEMS.map(item => (
                <Link key={item.label} href={item.href} onClick={() => setShowMenu(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '11px 18px', textDecoration: 'none',
                  color: '#333', fontSize: 13.5, fontWeight: 500,
                  borderBottom: '1px solid #f5f0ee',
                }}>
                  <span>{item.icon}</span> {item.label}
                </Link>
              ))}
              <button onClick={() => { setShowMenu(false); handleLogout(); }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 11,
                padding: '11px 18px', background: 'none', border: 'none',
                color: '#c9184a', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
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
