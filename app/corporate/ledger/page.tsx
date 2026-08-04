'use client';
import { useState } from 'react';
import { Inter } from 'next/font/google';
import DashNav from '../components/DashNav';
import CorpFooter from '../components/CorpFooter';

const inter = Inter({ subsets:['latin'], weight:['400','500','600','700','800'] });
const O = '#f07820';

type TxnType = 'credit' | 'debit';

interface Txn {
  date: string; narration: string; ref: string;
  type: TxnType; amount: number; balance: number;
}

const LEDGER: Txn[] = [
  { date:'28 Jun 2026', narration:'Deposit - NEFT',             ref:'UTR202606281034', type:'credit', amount:50000,  balance:49998  },
  { date:'27 Jun 2026', narration:'Flight Booking - BK001',     ref:'BK001/ABCD12',   type:'debit',  amount:11240,  balance:-2     },
  { date:'25 Jun 2026', narration:'Deposit - UPI',              ref:'UTR202606251782', type:'credit', amount:25000,  balance:11238  },
  { date:'24 Jun 2026', narration:'Flight Booking - BK002',     ref:'BK002/EFGH34',   type:'debit',  amount:22800,  balance:-13762 },
  { date:'22 Jun 2026', narration:'Deposit - RTGS',             ref:'UTR202606220045', type:'credit', amount:100000, balance:86238  },
  { date:'22 Jun 2026', narration:'Service Charge - Jun 2026',  ref:'SC/2026/06',      type:'debit',  amount:500,    balance:-13762 },
  { date:'20 Jun 2026', narration:'Flight Booking - BK004',     ref:'BK004/MNOP78',   type:'debit',  amount:3495,   balance:-14262 },
  { date:'18 Jun 2026', narration:'Refund - BK005 Cancellation',ref:'BK005/REF',       type:'credit', amount:18600,  balance:4338   },
  { date:'15 Jun 2026', narration:'Deposit - NEFT',             ref:'UTR202606150823', type:'credit', amount:75000,  balance:79338  },
  { date:'10 Jun 2026', narration:'Flight Booking - BK007',     ref:'BK007/YZAB22',   type:'debit',  amount:5120,   balance:74218  },
  { date:'05 Jun 2026', narration:'GST Adjustment - May 2026',  ref:'GST/2026/05',     type:'debit',  amount:2340,   balance:71878  },
  { date:'01 Jun 2026', narration:'Opening Balance - Jun 2026', ref:'OB/2026/06',      type:'credit', amount:71878,  balance:71878  },
];

const totalCredit = LEDGER.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
const totalDebit  = LEDGER.filter(t => t.type === 'debit' ).reduce((s, t) => s + t.amount, 0);
const closingBal  = -2;

const PERIODS = ['This Month', 'Last Month', 'Last 3 Months', 'Custom Range'];

const fmt = (n: number) =>
  (n < 0 ? '−₹' : '₹') + Math.abs(n).toLocaleString('en-IN');

export default function LedgerPage() {
  const [period, setPeriod] = useState(0);
  const [search, setSearch] = useState('');

  const rows = LEDGER.filter(t =>
    !search ||
    t.narration.toLowerCase().includes(search.toLowerCase()) ||
    t.ref.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={inter.className} style={{ background:'#f4f0ec', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <DashNav title="Ledger" />

      <main style={{ flex:1, padding:'28px 4% 60px' }}>

        {/* Header row */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:24 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:800, color:'#1a1a2e', margin:'0 0 3px', letterSpacing:'-.01em' }}>Account Ledger</h1>
            <p style={{ fontSize:13, color:'#aaa', margin:0 }}>June 2026 · AGT0042</p>
          </div>
          <button style={{
            display:'flex', alignItems:'center', gap:7, padding:'9px 20px',
            border:`1.5px solid ${O}`, borderRadius:8, background:'#fff',
            color:O, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
          }}>⬇ Export CSV</button>
        </div>

        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
          {[
            { label:'Opening Balance', value:fmt(71878),      color:'#1565c0', icon:'🔓', sub:'01 Jun 2026' },
            { label:'Total Credits',   value:fmt(totalCredit), color:'#2d8a4e', icon:'⬆',  sub:`${LEDGER.filter(t=>t.type==='credit').length} transactions` },
            { label:'Total Debits',    value:fmt(totalDebit),  color:'#c9184a', icon:'⬇',  sub:`${LEDGER.filter(t=>t.type==='debit').length} transactions`  },
            { label:'Closing Balance', value:fmt(closingBal),  color: closingBal < 0 ? '#c9184a' : '#2d8a4e', icon:'🏦', sub:'As of today' },
          ].map(c => (
            <div key={c.label} style={{
              background:'#fff', borderRadius:12, padding:'18px 20px',
              boxShadow:'0 2px 10px rgba(0,0,0,.06)',
              borderLeft:`4px solid ${c.color}`,
              display:'flex', flexDirection:'column', gap:4,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:12, fontWeight:700, color:'#bbb', letterSpacing:'.07em', textTransform:'uppercase' }}>{c.label}</span>
                <span style={{ fontSize:18 }}>{c.icon}</span>
              </div>
              <div style={{ fontSize:22, fontWeight:800, color:c.color }}>{c.value}</div>
              <div style={{ fontSize:11.5, color:'#bbb' }}>{c.sub}</div>
            </div>
          ))}
        </div>

        {/* Filter + Search bar */}
        <div style={{
          background:'#fff', borderRadius:12, padding:'14px 20px',
          boxShadow:'0 2px 10px rgba(0,0,0,.06)', marginBottom:16,
          display:'flex', gap:10, alignItems:'center', flexWrap:'wrap',
        }}>
          {/* Period pills */}
          <div style={{ display:'flex', gap:6 }}>
            {PERIODS.map((p, i) => (
              <button key={p} onClick={() => setPeriod(i)} style={{
                padding:'6px 14px', borderRadius:18, border:'none', cursor:'pointer',
                fontSize:12.5, fontWeight:600, fontFamily:'inherit',
                background: period === i ? `linear-gradient(135deg,${O},#e86d18)` : '#f5f0ee',
                color: period === i ? '#fff' : '#666',
              }}>{p}</button>
            ))}
          </div>

          {/* Spacer */}
          <div style={{ flex:1 }} />

          {/* Search */}
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#ccc', fontSize:13 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search narration or ref…"
              style={{ padding:'8px 12px 8px 30px', border:'1.5px solid #e8e2db', borderRadius:8,
                fontSize:13, fontFamily:'inherit', color:'#333', outline:'none', width:230 }} />
          </div>
        </div>

        {/* Table */}
        <div style={{ background:'#fff', borderRadius:12, boxShadow:'0 2px 10px rgba(0,0,0,.06)', overflow:'hidden' }}>

          {/* Table header */}
          <div style={{
            display:'grid', gridTemplateColumns:'110px 1fr 160px 110px 110px 120px',
            padding:'11px 22px', background:'#faf7f5',
            borderBottom:'2px solid #f0ebe5',
          }}>
            {['Date', 'Narration', 'Reference', 'Debit', 'Credit', 'Balance'].map(h => (
              <div key={h} style={{ fontSize:11, fontWeight:800, color:'#aaa',
                letterSpacing:'.1em', textTransform:'uppercase' }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {rows.map((t, i) => (
            <div key={i}
              onMouseEnter={e => (e.currentTarget.style.background = '#fdf9f7')}
              onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fdfcfb')}
              style={{
                display:'grid', gridTemplateColumns:'110px 1fr 160px 110px 110px 120px',
                padding:'13px 22px', alignItems:'center',
                background: i % 2 === 0 ? '#fff' : '#fdfcfb',
                borderBottom: i < rows.length - 1 ? '1px solid #f5f0ee' : 'none',
                transition:'background .12s',
              }}>

              {/* Date */}
              <div style={{ fontSize:12.5, color:'#888' }}>{t.date}</div>

              {/* Narration + type badge */}
              <div style={{ display:'flex', alignItems:'center', gap:9 }}>
                <div style={{
                  width:32, height:32, borderRadius:'50%', flexShrink:0,
                  background: t.type === 'credit' ? '#e8f5e9' : '#fce4ec',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:14,
                }}>{t.type === 'credit' ? '↑' : '↓'}</div>
                <span style={{ fontSize:13.5, fontWeight:600, color:'#1a1a2e' }}>{t.narration}</span>
              </div>

              {/* Reference */}
              <div style={{ fontSize:11.5, color:'#bbb', fontFamily:'monospace' }}>{t.ref}</div>

              {/* Debit */}
              <div style={{ fontSize:13.5, fontWeight:700, color: t.type === 'debit' ? '#c9184a' : '#ddd' }}>
                {t.type === 'debit' ? fmt(t.amount) : '—'}
              </div>

              {/* Credit */}
              <div style={{ fontSize:13.5, fontWeight:700, color: t.type === 'credit' ? '#2d8a4e' : '#ddd' }}>
                {t.type === 'credit' ? fmt(t.amount) : '—'}
              </div>

              {/* Balance */}
              <div style={{
                fontSize:13.5, fontWeight:800,
                color: t.balance < 0 ? '#c9184a' : '#1a1a2e',
                display:'flex', alignItems:'center', gap:6,
              }}>
                {fmt(t.balance)}
                {t.balance < 0 && (
                  <span style={{ fontSize:10, background:'#fce4ec', color:'#c9184a',
                    padding:'2px 6px', borderRadius:6, fontWeight:700 }}>DR</span>
                )}
              </div>
            </div>
          ))}

          {/* Footer totals */}
          <div style={{
            display:'grid', gridTemplateColumns:'110px 1fr 160px 110px 110px 120px',
            padding:'13px 22px', background:'#faf7f5', borderTop:'2px solid #e8e2db',
          }}>
            <div style={{ gridColumn:'1/4', fontSize:12, fontWeight:800, color:'#888',
              letterSpacing:'.08em', textTransform:'uppercase', display:'flex', alignItems:'center' }}>
              Period Totals
            </div>
            <div style={{ fontSize:14, fontWeight:800, color:'#c9184a' }}>{fmt(totalDebit)}</div>
            <div style={{ fontSize:14, fontWeight:800, color:'#2d8a4e' }}>{fmt(totalCredit)}</div>
            <div style={{ fontSize:14, fontWeight:800, color: closingBal < 0 ? '#c9184a' : '#1a1a2e' }}>
              {fmt(closingBal)}
            </div>
          </div>
        </div>

        {/* Row count */}
        <div style={{ textAlign:'right', marginTop:10, fontSize:12, color:'#bbb' }}>
          Showing {rows.length} of {LEDGER.length} transactions
        </div>
      </main>

      <CorpFooter />
    </div>
  );
}
