'use client';
import { useState, useEffect } from 'react';
import { Inter } from 'next/font/google';
import DashNav from '../components/DashNav';
import CorpFooter from '../components/CorpFooter';
import { useWalletBalance } from '../../hooks/useWalletBalance';

const inter = Inter({ subsets: ['latin'], weight: ['400','500','600','700','800'] });

const ORANGE = '#f07820';
const PINK   = '#e91e8c';

/* ── Data ── */
const PROMO_STATS = { weekly: 120, monthly: 640,  yearly: 2800 };
const PROMO_ACC   = { received: 3256.29, spent: 1538.20, balance: 12540.00 };

type Tx = { date:string; time:string; txnId:string; type:'debit'|'credit'; walletType:string; desc:string; amount:number; balance:number };

const PROMO_TXN: Tx[] = [
  { date:'2026-01-15', time:'11:05', txnId:'NH24180434712345', type:'credit', walletType:'Promo', desc:'CASHBACK NH24180434712345',  amount:249.60, balance:12540.00 },
  { date:'2026-01-08', time:'16:20', txnId:'NH24180434670123', type:'debit',  walletType:'Promo', desc:'PROMO USED NH24180434670',   amount:125.00, balance:12290.40 },
  { date:'2025-12-20', time:'10:00', txnId:'NH24180434612345', type:'credit', walletType:'Promo', desc:'WELCOME BONUS',              amount:500.00, balance:12415.40 },
  { date:'2025-12-15', time:'14:30', txnId:'NH24180434598765', type:'credit', walletType:'Promo', desc:'REFERRAL BONUS',             amount:200.00, balance:11915.40 },
];

const FAQS = [
  { q:'What is My-Cash?',                           a:'My Cash is digital money you can use from your online wallet. Add it via recharge or receive it as a refund and use it for transactions on Kalyanam Kart only.' },
  { q:'What is Promo Cash?',                        a:'Promo Cash is the amount given by Kalyanam Kart through an offer or marketing activity.' },
  { q:'What is the validity of Promo Cash?',        a:'Promo Cash always comes with a validity date. This validity can vary based on the construct of the marketing activity it was earned from.' },
  { q:'Can I transfer My-Cash to my bank account?', a:'No, once money is added in the wallet it cannot be transferred back to a bank account.' },
  { q:'How do I use Promo Cash?',                   a:'Promo Cash will be automatically applied in each transaction. If the discount is already high, the Promo Cash value may be capped.' },
  { q:'What is the validity of My Cash?',           a:'My Cash added via recharge or received as a refund has no expiry. However, My Cash offered as a reward or cashback may or may not have a validity period.' },
];

/* ── Donut ── */
function Donut({ received, spent }: { received:number; spent:number }) {
  const r = 52, sw = 15, S = 130, C = S / 2;
  const circ = 2 * Math.PI * r;
  const tot  = received + spent || 1;
  const sLen = (spent    / tot) * circ;
  const rLen = (received / tot) * circ;
  const total = (received + spent).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  return (
    <div style={{ position:'relative', width:S, height:S, flexShrink:0 }}>
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={C} cy={C} r={r} fill="none" stroke="#f3e6f0" strokeWidth={sw}/>
        <circle cx={C} cy={C} r={r} fill="none" stroke={PINK}   strokeWidth={sw} strokeDasharray={`${sLen} ${circ-sLen}`}/>
        <circle cx={C} cy={C} r={r} fill="none" stroke={ORANGE} strokeWidth={sw} strokeDasharray={`${rLen} ${circ-rLen}`} strokeDashoffset={-sLen}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:9, color:'#bbb', fontWeight:500, marginBottom:1 }}>Total</span>
        <span style={{ fontSize:16, fontWeight:700, color:'#1a1a2e', lineHeight:1 }}>{total}</span>
        <span style={{ fontSize:9, color:'#bbb', marginTop:1 }}>₹</span>
      </div>
    </div>
  );
}

/* ── StatBox ── */
function StatBox({ color, arrow, label, amount }: { color:string; arrow:string; label:string; amount:number }) {
  const bg = color === ORANGE ? '#fff4ec' : '#fde8f4';
  return (
    <div style={{ borderRadius:12, padding:'11px 14px', background:bg, border:`1px solid ${color}30`, flex:1 }}>
      <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
        <span style={{ color, fontSize:15, fontWeight:600 }}>{arrow}</span>
        <span style={{ fontSize:13.5, fontWeight:600, color }}>
          {amount.toLocaleString('en-IN', { minimumFractionDigits:2 })}
          <span style={{ fontSize:10, fontWeight:400, marginLeft:2 }}>₹</span>
        </span>
      </div>
      <div style={{ fontSize:11, color, fontWeight:600 }}>{label}</div>
    </div>
  );
}

/* ── Summary Card ── */
function SummaryCard({ title, stats, received, spent, accent }: {
  title:string; stats:{weekly:number;monthly:number;yearly:number}; received:number; spent:number; accent:string;
}) {
  return (
    <div style={{ background:'#fff', borderRadius:18, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,.09)', border:'1px solid #f0ebe5' }}>
      {/* coloured top accent bar */}
      <div style={{ height:5, background:`linear-gradient(90deg,${accent},${accent}88)` }}/>
      <div style={{ padding:'20px 20px 22px' }}>
        <p style={{ margin:'0 0 18px', fontSize:14.5, fontWeight:600, color:'#1a1a2e' }}>{title}</p>

        {/* stats row */}
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:18, paddingBottom:16, borderBottom:'1px solid #f5f0ee' }}>
          {(['weekly','monthly','yearly'] as const).map(p => (
            <div key={p}>
              <div style={{ fontSize:10.5, color:'#bbb', marginBottom:4 }}>{p.charAt(0).toUpperCase()+p.slice(1)}</div>
              <div style={{ fontSize:19, fontWeight:600, color:'#1a1a2e' }}>{stats[p].toLocaleString('en-IN')}</div>
            </div>
          ))}
        </div>

        {/* last month + filter */}
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
          <span style={{ fontSize:12, color:'#999' }}>Last Month</span>
          <button style={{ fontSize:11, padding:'3px 12px', border:`1.5px solid ${accent}`, borderRadius:20, background:'transparent', color:accent, cursor:'pointer', fontWeight:600 }}>+ Filter</button>
        </div>

        {/* donut + stat boxes */}
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Donut received={received} spent={spent}/>
          <div style={{ display:'flex', flexDirection:'column', gap:10, flex:1 }}>
            <StatBox color={ORANGE} arrow="↓" label="Received" amount={received}/>
            <StatBox color={PINK}   arrow="↑" label="Spent"    amount={spent}/>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Account Card ── */
function AccountCard({ title, received, spent, balance, accent, balanceColor, subtitle }: {
  title:string; received:number; spent:number; balance:number; accent:string;
  /** Overrides the balance figure's color (e.g. red when Main Balance is negative / OD in use). */
  balanceColor?: string; subtitle?: string;
}) {
  const negative = balance < 0;
  const absBalance = Math.abs(balance);
  const balInt = Math.floor(absBalance).toLocaleString('en-IN');
  const balDec = absBalance.toFixed(2).split('.')[1];
  return (
    <div style={{ background:'#fff', borderRadius:18, overflow:'hidden', boxShadow:'0 4px 24px rgba(0,0,0,.09)', border:'1px solid #f0ebe5' }}>
      <div style={{ height:4, background:`linear-gradient(90deg,${accent},${accent}66)` }}/>
      <div style={{ padding:'16px 20px 20px' }}>
        <div style={{ fontSize:9.5, color:'#bbb', fontWeight:600, letterSpacing:'.1em', marginBottom:5 }}>MAIN ACCOUNT</div>
        <div style={{ fontSize:16, fontWeight:600, color:'#1a1a2e', marginBottom:5 }}>{title}</div>
        <div style={{ fontSize:12, color:'#d0cac4', letterSpacing:'.2em', fontFamily:'monospace', marginBottom:16 }}>•••• •••• •••• 1234</div>

        <div style={{ display:'flex', gap:14, marginBottom:16 }}>
          {/* received */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, background:'#fff4ec', borderRadius:12, padding:'10px 12px' }}>
            <div style={{ width:30, height:30, borderRadius:8, background:ORANGE, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ color:'#fff', fontSize:14, fontWeight:600 }}>↓</span>
            </div>
            <div>
              <div style={{ fontSize:12.5, fontWeight:600, color:ORANGE }}>{received.toLocaleString('en-IN', { minimumFractionDigits:2 })} <span style={{ fontSize:9, fontWeight:400 }}>₹</span></div>
              <div style={{ fontSize:10, color:'#bbb' }}>Received</div>
            </div>
          </div>
          {/* spent */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, background:'#fde8f4', borderRadius:12, padding:'10px 12px' }}>
            <div style={{ width:30, height:30, borderRadius:8, background:PINK, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ color:'#fff', fontSize:14, fontWeight:600 }}>↑</span>
            </div>
            <div>
              <div style={{ fontSize:12.5, fontWeight:600, color:PINK }}>{spent.toLocaleString('en-IN', { minimumFractionDigits:2 })} <span style={{ fontSize:9, fontWeight:400 }}>₹</span></div>
              <div style={{ fontSize:10, color:'#bbb' }}>Spent</div>
            </div>
          </div>
        </div>

        <div style={{ background:'#faf8f5', borderRadius:12, padding:'12px 14px' }}>
          <div style={{ fontSize:10.5, color:'#bbb', marginBottom:5 }}>{subtitle || 'Available Balance'}</div>
          <div style={{ fontSize:28, fontWeight:600, color: balanceColor || '#1a1a2e', letterSpacing:'-.01em', lineHeight:1 }}>
            {negative ? '− ' : ''}{balInt}<sup style={{ fontSize:13, fontWeight:500, color:'#999', verticalAlign:'super' }}>.{balDec}</sup>
            <span style={{ fontSize:13, color:'#bbb', fontWeight:400, marginLeft:4 }}>₹</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── FAQ ── */
function FaqItem({ q, a }: { q:string; a:string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom:'1px solid #f5f0ee' }}>
      <button onClick={() => setOpen(o => !o)} style={{ width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center', padding:'15px 0', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
        <span style={{ fontSize:13.5, fontWeight:500, color:'#1a1a2e' }}>{q}</span>
        <span style={{ color:ORANGE, fontSize:16, fontWeight:600, flexShrink:0, marginLeft:16 }}>{open ? '∧' : '∨'}</span>
      </button>
      {open && <p style={{ fontSize:13, color:'#777', lineHeight:1.8, margin:'0 0 14px' }}>{a}</p>}
    </div>
  );
}

interface RealTxn {
  id: number; amount: number; direction: 'credit' | 'debit'; isDeposit: boolean;
  transactionId: string | null; description: string | null; balanceAfter: number; createdAt: string;
}

/* ── Page ── */
export default function WalletPage() {
  const [stmtTab, setStmtTab] = useState<'wallet'|'promo'>('wallet');
  const [fromDate, setFromDate] = useState('2025-11-01');
  const [toDate,   setToDate]   = useState('2026-03-31');

  // Credit Pool (Main Balance + OD Balance) — real data. "My Promo Wallet" stays mock/unrelated.
  const { balance } = useWalletBalance();
  const [realTxns, setRealTxns] = useState<RealTxn[]>([]);
  useEffect(() => {
    fetch('/api/wallet/transactions').then(res => res.json())
      .then(data => { if (Array.isArray(data.transactions)) setRealTxns(data.transactions); })
      .catch(() => {});
  }, []);

  const cashReceived = realTxns.filter(t => t.direction === 'credit').reduce((s, t) => s + t.amount, 0);
  const cashSpent     = realTxns.filter(t => t.direction === 'debit').reduce((s, t) => s + t.amount, 0);
  const activityInPeriod = (days: number) => {
    const cutoff = Date.now() - days * 86400000;
    return realTxns.filter(t => new Date(t.createdAt).getTime() >= cutoff).reduce((s, t) => s + t.amount, 0);
  };
  const cashStats = { weekly: activityInPeriod(7), monthly: activityInPeriod(30), yearly: activityInPeriod(365) };

  const realCashTxns: Tx[] = realTxns.map(t => {
    const d = new Date(t.createdAt);
    return {
      date: d.toISOString().slice(0, 10),
      time: d.toTimeString().slice(0, 5),
      txnId: t.transactionId || String(t.id),
      type: t.direction,
      walletType: 'Credit Pool',
      desc: t.description || '',
      amount: t.amount,
      balance: t.balanceAfter,
    };
  });

  const txns = stmtTab === 'wallet' ? realCashTxns : PROMO_TXN;

  return (
    <div className={inter.className} style={{ background:'#f7f8fa', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <DashNav title="My Wallet"/>

      <main style={{ flex:1, padding:'24px 4% 60px' }}>

        {/* ── 3-column ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.1fr 1fr', gap:20, marginBottom:24 }}>
          <SummaryCard title="My Cash Wallet"  stats={cashStats}  received={cashReceived}  spent={cashSpent}  accent={ORANGE}/>

          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <AccountCard title="My Cash Wallet" received={cashReceived} spent={cashSpent}
              balance={balance?.displayBalance ?? 0} accent={ORANGE} subtitle="Main Balance"
              balanceColor={balance && balance.displayBalance < 0 ? '#c9184a' : '#1a8a4a'}/>
            <AccountCard title="My Promo Wallet" received={PROMO_ACC.received} spent={PROMO_ACC.spent} balance={PROMO_ACC.balance} accent={PINK}/>
          </div>

          <SummaryCard title="Promo Wallet"    stats={PROMO_STATS} received={PROMO_ACC.received} spent={PROMO_ACC.spent} accent={PINK}/>
        </div>

        {/* ── Wallet Statement ── */}
        <div style={{ background:'#fff', borderRadius:18, boxShadow:'0 4px 24px rgba(0,0,0,.09)', border:'1px solid #f0ebe5', marginBottom:24, overflow:'hidden' }}>
          <div style={{ height:4, background:`linear-gradient(90deg,${ORANGE},${PINK})` }}/>

          {/* header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 24px', borderBottom:'1px solid #f5f0ee', flexWrap:'wrap', gap:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <span style={{ fontSize:16, fontWeight:600, color:'#1a1a2e' }}>Wallet Statement</span>
              <div style={{ display:'flex', background:'#f5f0ee', borderRadius:20, padding:3 }}>
                {(['wallet','promo'] as const).map(t => (
                  <button key={t} onClick={() => setStmtTab(t)} style={{
                    padding:'5px 20px', fontSize:12.5, fontWeight:600, border:'none', cursor:'pointer', borderRadius:20,
                    background: stmtTab===t ? ORANGE : 'transparent',
                    color:       stmtTab===t ? '#fff'  : '#999',
                    transition:'all .15s',
                  }}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontSize:10, color:'#bbb', fontWeight:600, letterSpacing:'.06em' }}>FROM</span>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  style={{ fontSize:12, border:'1px solid #e8e0d8', borderRadius:8, padding:'6px 10px', color:'#1a1a2e', outline:'none', background:'#faf8f5' }}/>
                <span style={{ fontSize:10, color:'#bbb', fontWeight:600, letterSpacing:'.06em' }}>TO</span>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  style={{ fontSize:12, border:'1px solid #e8e0d8', borderRadius:8, padding:'6px 10px', color:'#1a1a2e', outline:'none', background:'#faf8f5' }}/>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                <button style={{ fontSize:12, color:ORANGE, background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:0, textAlign:'right' }}>↓ Download Wallet Statement</button>
                <button style={{ fontSize:12, color:ORANGE, background:'none', border:'none', cursor:'pointer', fontWeight:600, padding:0, textAlign:'right' }}>↓ Download Wallet TDS Statement</button>
              </div>
            </div>
          </div>

          {/* table */}
          <div className="wallet-scroll" style={{ overflowX:'auto', overflowY:'auto', maxHeight:280 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:860 }}>
              <thead>
                <tr style={{ background:'#faf8f5' }}>
                  {['DATE','TIME','TRANSACTION ID','TYPE','WALLET TYPE','DESCRIPTION','AMOUNT','TOTAL BALANCE'].map(h => (
                    <th key={h} style={{ padding:'11px 18px', textAlign:'left', fontSize:10, fontWeight:600, color:'#bbb', letterSpacing:'.07em', borderBottom:'1px solid #f0ebe5', whiteSpace:'nowrap', position:'sticky', top:0, background:'#faf8f5', zIndex:1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {txns.map((tx, i) => (
                  <tr key={tx.txnId} style={{ borderBottom:i<txns.length-1?'1px solid #f8f5f2':'none', transition:'background .12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background='#fdf9f6')}
                    onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                    <td style={{ padding:'13px 18px', fontSize:12.5, color:'#555', whiteSpace:'nowrap' }}>{tx.date}</td>
                    <td style={{ padding:'13px 18px', fontSize:12.5, color:'#888', whiteSpace:'nowrap' }}>{tx.time}</td>
                    <td style={{ padding:'13px 18px', fontSize:11.5, color:'#777', fontFamily:'monospace', whiteSpace:'nowrap' }}>{tx.txnId}</td>
                    <td style={{ padding:'13px 18px' }}>
                      <span style={{ fontSize:11.5, fontWeight:600, padding:'4px 14px', borderRadius:20, whiteSpace:'nowrap',
                        background: tx.type==='credit'?'#e6f9ee':'#fff3ec',
                        color:       tx.type==='credit'?'#1a8a4a':ORANGE }}>
                        {tx.type==='credit'?'Credit':'Debit'}
                      </span>
                    </td>
                    <td style={{ padding:'13px 18px', fontSize:12.5, color:'#555' }}>{tx.walletType}</td>
                    <td style={{ padding:'13px 18px', fontSize:12, color:'#444', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{tx.desc}</td>
                    <td style={{ padding:'13px 18px', fontSize:13.5, fontWeight:600, whiteSpace:'nowrap', color:tx.type==='credit'?'#1a8a4a':ORANGE }}>
                      {tx.type==='credit'?'+ ':'− '}{tx.amount.toLocaleString('en-IN', { minimumFractionDigits:2 })}
                    </td>
                    <td style={{ padding:'13px 18px', fontSize:13, fontWeight:500, color:'#1a1a2e', whiteSpace:'nowrap' }}>
                      {tx.balance.toLocaleString('en-IN', { minimumFractionDigits:2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FAQs ── */}
        <div style={{ background:'#fff', borderRadius:18, boxShadow:'0 4px 24px rgba(0,0,0,.09)', border:'1px solid #f0ebe5', overflow:'hidden' }}>
          <div style={{ height:4, background:`linear-gradient(90deg,${ORANGE},${PINK})` }}/>
          <div style={{ padding:'22px 28px' }}>
            <h2 style={{ fontSize:17, fontWeight:600, color:'#1a1a2e', margin:'0 0 6px' }}>FAQs</h2>
            <p style={{ fontSize:12.5, color:'#bbb', margin:'0 0 16px' }}>Common questions about your wallet</p>
            {FAQS.map(f => <FaqItem key={f.q} q={f.q} a={f.a}/>)}
          </div>
        </div>

      </main>
      <CorpFooter/>
    </div>
  );
}
