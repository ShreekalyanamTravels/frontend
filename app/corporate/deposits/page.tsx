'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Inter } from 'next/font/google';
import DashNav from '../components/DashNav';
import CorpFooter from '../components/CorpFooter';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const inter = Inter({ subsets:['latin'], weight:['400','500','600','700','800'] });
const O = '#f07820';

type Tab = 'cash' | 'neft' | 'atm' | 'cheque' | 'upi';
type DepStatus = 'Approved' | 'Pending' | 'Rejected';

interface Deposit {
  id: number;
  paymentType: string;
  bankLabel: string | null;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  remarks: string | null;
  postedDate: string;
}
interface CompanyBank {
  id: number;
  account_holder_name: string | null;
  bank_name: string | null;
  account_no: string | null;
  ifsc_code: string | null;
  branch: string | null;
}

const STATUS_STYLE: Record<DepStatus, { bg: string; color: string }> = {
  Approved: { bg:'#2d8a4e', color:'#fff' },
  Pending:  { bg:'#e57c00', color:'#fff' },
  Rejected: { bg:'#c9184a', color:'#fff' },
};

function toDepStatus(s: string): DepStatus {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as DepStatus;
}

const TABS: { key: Tab; label: string }[] = [
  { key:'cash',   label:'Cash'          },
  { key:'neft',   label:'Net Transfer'  },
  { key:'atm',    label:'Cash @ ATM'    },
  { key:'cheque', label:'Cheque'        },
  { key:'upi',    label:'UPI'           },
];

function Input({ label, value, onChange, type = 'text', placeholder = '' }:
  { label:string; value:string; onChange:(v:string)=>void; type?:string; placeholder?:string }) {
  const [focus, setFocus] = useState(false);
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:12.5, fontWeight:600, color:'#555' }}>{label}</label>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          padding:'10px 14px', border:`1.5px solid ${focus ? O : '#f0c080'}`,
          borderRadius:8, fontSize:14, fontFamily:'inherit', color:'#1a1a2e',
          outline:'none', background:'#fff', boxSizing:'border-box', width:'100%',
        }}
      />
    </div>
  );
}

export default function DepositsPage() {
  const router = useRouter();
  const { user, loading: userLoading } = useCurrentUser();
  const [tab, setTab] = useState<Tab>('cash');

  // Common fields
  const [amount,  setAmount]  = useState('');
  const [authCode,setAuthCode]= useState('');
  const [tid,     setTid]     = useState('');
  const [rrn,     setRrn]     = useState('');
  const [paidTo,  setPaidTo]  = useState('');
  const [txnDate, setTxnDate] = useState(new Date().toISOString().slice(0,10));
  const [remarks, setRemarks] = useState('');

  // Cheque
  const [chequeNo,  setChequeNo]  = useState('');
  const [bankName,  setBankName]  = useState('');
  const [branch,    setBranch]    = useState('');

  // Net Transfer
  const [acNo,     setAcNo]     = useState('');

  // ATM
  const [atmId,    setAtmId]    = useState('');
  const [slipFile, setSlipFile] = useState<File | null>(null);

  // UPI
  const [upiRef,   setUpiRef]   = useState('');
  const [vpa,      setVpa]      = useState('');

  // Submission state
  const [submitting,    setSubmitting]    = useState(false);
  const [submitError,   setSubmitError]   = useState('');
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Transaction history
  const [deposits,       setDeposits]       = useState<Deposit[]>([]);
  const [banks,          setBanks]          = useState<CompanyBank[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [txnLoading,     setTxnLoading]     = useState(true);

  // Table filter
  const today = new Date().toISOString().slice(0,10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
  const [fromDate, setFromDate] = useState(firstOfMonth);
  const [toDate,   setToDate]   = useState(today);
  const [cug,      setCug]      = useState<'cug'|'others'>('cug');

  useEffect(() => {
    if (!userLoading && !user) router.push('/');
  }, [userLoading, user, router]);

  async function fetchDeposits(from: string, to: string) {
    setTxnLoading(true);
    try {
      const res = await fetch(`/api/deposits?from=${from}&to=${to}`);
      const data = await res.json();
      setDeposits(data.deposits ?? []);
      setBanks(data.banks ?? []);
      setSelectedBankId(prev => prev || (data.banks?.[0]?.id ? String(data.banks[0].id) : ''));
    } finally {
      setTxnLoading(false);
    }
  }

  useEffect(() => {
    if (user) fetchDeposits(fromDate, toDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function handleReset() {
    setAmount(''); setAuthCode(''); setTid(''); setRrn('');
    setTxnDate(new Date().toISOString().slice(0,10)); setRemarks('');
    setPaidTo(''); setChequeNo(''); setBankName(''); setBranch('');
    setAcNo(''); setUpiRef(''); setVpa(''); setAtmId(''); setSlipFile(null);
  }

  async function handleSubmit() {
    setSubmitError('');
    if (!amount || Number(amount) <= 0) {
      setSubmitError('Please enter a valid amount.');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('paymentType', TABS.find(t => t.key === tab)!.label);
      fd.append('amount', amount);
      fd.append('transactionDate', txnDate);
      if (remarks) fd.append('remarks', remarks);

      if (tab === 'cash') {
        if (paidTo) fd.append('holderName', paidTo);
      } else if (tab === 'neft') {
        if (!selectedBankId) { setSubmitError('Please select a bank account.'); return; }
        if (authCode) fd.append('authCode', authCode);
        if (acNo) fd.append('accountNumber', acNo);
        fd.append('bankId', selectedBankId);
      } else if (tab === 'atm') {
        if (authCode) fd.append('authCode', authCode);
        if (atmId) fd.append('atmId', atmId);
        if (tid) fd.append('tid', tid);
        if (slipFile) fd.append('slip', slipFile);
      } else if (tab === 'cheque') {
        if (chequeNo) fd.append('chequeNumber', chequeNo);
        if (bankName) fd.append('chequeBankName', bankName);
        if (branch) fd.append('branchName', branch);
      } else if (tab === 'upi') {
        if (upiRef) fd.append('transactionId', upiRef);
        if (vpa) fd.append('vpa', vpa);
        if (rrn) fd.append('rrn', rrn);
      }

      const res = await fetch('/api/deposits', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? 'Failed to submit deposit.');
        return;
      }
      handleReset();
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);
      fetchDeposits(fromDate, toDate);
    } catch {
      setSubmitError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={inter.className} style={{ background:'#f7f3ef', minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      <DashNav title="Deposits" />

      <main style={{ flex:1, padding:'28px 4% 60px' }}>

        {/* ── Entry form card ── */}
        <div style={{ background:'#fff', borderRadius:10, boxShadow:'0 2px 12px rgba(0,0,0,.07)', marginBottom:28, overflow:'hidden' }}>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'2px solid #eee' }}>
            {TABS.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding:'13px 26px', border:'none', background:'none', cursor:'pointer',
                fontFamily:'inherit', fontSize:14, fontWeight: tab === t.key ? 700 : 500,
                color: tab === t.key ? '#1565c0' : '#555',
                borderBottom: tab === t.key ? '2.5px solid #1565c0' : '2.5px solid transparent',
                marginBottom:'-2px',
              }}>{t.label}</button>
            ))}
          </div>

          {/* Form fields */}
          <div style={{ padding:'24px 28px' }}>

            {/* Row 1 — Cash */}
            {tab === 'cash' && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18, marginBottom:18 }}>
                <Input label="Amount (Rs.)" value={amount} onChange={setAmount} type="number" />
                <Input label="Paid To"      value={paidTo} onChange={setPaidTo} />
              </div>
            )}

            {/* Row 1 — Net Transfer */}
            {tab === 'neft' && (
              <>
                <div style={{ marginBottom:18 }}>
                  <label style={{ fontSize:12.5, fontWeight:600, color:'#555', display:'block', marginBottom:5 }}>
                    Transfer To (Bank Account)
                  </label>
                  <select value={selectedBankId} onChange={e => setSelectedBankId(e.target.value)} style={{
                    padding:'10px 14px', border:'1.5px solid #f0c080', borderRadius:8,
                    fontSize:14, fontFamily:'inherit', color:'#1a1a2e',
                    outline:'none', background:'#fff', boxSizing:'border-box', width:'100%', cursor:'pointer',
                  }}>
                    <option value="">Select bank account…</option>
                    {banks.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.bank_name || 'Bank'} — {b.account_no || '—'} ({b.account_holder_name || '—'}, IFSC: {b.ifsc_code || '—'})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:18, marginBottom:18 }}>
                  <Input label="Amount (Rs.)" value={amount}   onChange={setAmount}   type="number" />
                  <Input label="Auth. Code"   value={authCode} onChange={setAuthCode} />
                </div>
              </>
            )}

            {/* Row 1 — ATM */}
            {tab === 'atm' && (
              <div style={{ display:'flex', flexDirection:'column', gap:18, marginBottom:18 }}>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:18 }}>
                  <Input label="Amount (Rs.)" value={amount}   onChange={setAmount}   type="number" />
                  <Input label="Auth. Code"   value={authCode} onChange={setAuthCode} />
                  <Input label="ATM ID"       value={atmId}    onChange={setAtmId}    />
                  <Input label="TID"          value={tid}      onChange={setTid}      />
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <label style={{ fontSize:12.5, fontWeight:600, color:'#555' }}>Upload Receipt</label>
                  <input type="file" accept="image/*,application/pdf"
                    onChange={e => setSlipFile(e.target.files?.[0] ?? null)}
                    style={{ padding:'9px 14px', border:'1.5px solid #f0c080', borderRadius:8,
                      fontSize:13.5, fontFamily:'inherit', color:'#555',
                      background:'#fff', cursor:'pointer', width:'100%', boxSizing:'border-box' }} />
                </div>
              </div>
            )}

            {tab === 'cheque' && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:18, marginBottom:18 }}>
                <Input label="Amount (Rs.)" value={amount}   onChange={setAmount}   type="number" />
                <Input label="Cheque No."   value={chequeNo} onChange={setChequeNo} />
                <Input label="Bank Name"    value={bankName} onChange={setBankName} />
                <Input label="Branch"       value={branch}   onChange={setBranch}   />
              </div>
            )}

            {tab === 'upi' && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:18, marginBottom:18 }}>
                <Input label="Amount (Rs.)"    value={amount}  onChange={setAmount}  type="number" />
                <Input label="UPI Reference"   value={upiRef}  onChange={setUpiRef}  />
                <Input label="VPA / UPI ID"    value={vpa}     onChange={setVpa}     placeholder="name@upi" />
                <Input label="RRN Number"      value={rrn}     onChange={setRrn}     />
              </div>
            )}

            {tab === 'neft' && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:18, marginBottom:18 }}>
                <Input label="Your Account No." value={acNo} onChange={setAcNo} placeholder="Account you transferred from" />
              </div>
            )}

            {/* Row 2 — Date + Remarks */}
            <div style={{ display:'grid', gridTemplateColumns:'320px 1fr', gap:18, marginBottom:22 }}>
              <Input label="Transaction Date" value={txnDate} onChange={setTxnDate} type="date" />
              <Input label="Remarks"          value={remarks} onChange={setRemarks} placeholder="Optional remarks" />
            </div>

            {submitError && (
              <div style={{ fontSize:13, color:'#c9184a', background:'#fdeef1', border:'1px solid #f3c6d0',
                borderRadius:8, padding:'9px 14px', marginBottom:16 }}>
                {submitError}
              </div>
            )}
            {submitSuccess && (
              <div style={{ fontSize:13, color:'#2d8a4e', background:'#e8f5e9', border:'1px solid #bfe3c3',
                borderRadius:8, padding:'9px 14px', marginBottom:16 }}>
                ✓ Deposit submitted successfully. It will be reviewed and approved shortly.
              </div>
            )}

            {/* Buttons */}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10 }}>
              <button onClick={handleSubmit} disabled={submitting} style={{
                padding:'9px 28px', background:O, color:'#fff',
                border:'none', borderRadius:8, fontSize:14, fontWeight:700,
                cursor: submitting ? 'default' : 'pointer', fontFamily:'inherit', opacity: submitting ? 0.7 : 1,
              }}>{submitting ? 'Submitting…' : 'Submit'}</button>
              <button onClick={handleReset} style={{
                padding:'9px 24px', background:O, color:'#fff',
                border:'none', borderRadius:8, fontSize:14, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
              }}>Reset</button>
            </div>
          </div>
        </div>

        {/* ── Transaction Details ── */}
        <div style={{ background:'#fff', borderRadius:10, boxShadow:'0 2px 12px rgba(0,0,0,.07)', overflow:'hidden' }}>

          {/* Section header */}
          <div style={{ background:'#f0f0f0', padding:'13px 22px', borderBottom:'1px solid #e8e2db' }}>
            <span style={{ fontSize:15, fontWeight:700, color:'#1a1a2e' }}>Transaction Details</span>
          </div>

          {/* Filter row */}
          <div style={{ padding:'16px 22px', display:'flex', alignItems:'center', gap:24, borderBottom:'1px solid #f0ebe5' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <label style={{ fontSize:12, color:'#777', fontWeight:600 }}>From Date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                style={{ padding:'8px 12px', border:'1.5px solid #f0c080', borderRadius:8,
                  fontSize:13.5, fontFamily:'inherit', color:'#1a1a2e', outline:'none', background:'#fff' }} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <label style={{ fontSize:12, color:'#777', fontWeight:600 }}>To Date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                style={{ padding:'8px 12px', border:'1.5px solid #f0c080', borderRadius:8,
                  fontSize:13.5, fontFamily:'inherit', color:'#1a1a2e', outline:'none', background:'#fff' }} />
            </div>

            {/* Radio */}
            <div style={{ display:'flex', gap:20, paddingTop:18 }}>
              {(['cug','others'] as const).map(v => (
                <label key={v} style={{ display:'flex', alignItems:'center', gap:7, cursor:'pointer', fontSize:14, color:'#555' }}>
                  <input type="radio" name="cug" checked={cug === v} onChange={() => setCug(v)}
                    style={{ accentColor:'#1565c0', width:15, height:15 }} />
                  {v === 'cug' ? 'CUG' : 'Others'}
                </label>
              ))}
            </div>

            <button onClick={() => fetchDeposits(fromDate, toDate)} style={{ marginLeft:'auto', marginTop:18,
              padding:'9px 22px', background:O, color:'#fff',
              border:'none', borderRadius:8, fontSize:14, fontWeight:700,
              cursor:'pointer', fontFamily:'inherit' }}>
              Get Transactions
            </button>
          </div>

          {/* Table header */}
          <div style={{ display:'grid', gridTemplateColumns:'0.6fr 1fr 1.4fr 1fr 0.9fr 1fr 1.4fr',
            padding:'12px 22px', background:'#fdf6ec', borderBottom:'1px solid #f0ebe5' }}>
            {['Transaction Id','Payment Type','Bank Name / Ac No.','Amount','Status','Remarks','Posted Date'].map(h => (
              <div key={h} style={{ fontSize:12.5, fontWeight:700, color:O }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          {txnLoading ? (
            <div style={{ padding:'40px 22px', textAlign:'center', color:'#bbb', fontSize:14 }}>Loading transactions…</div>
          ) : deposits.length === 0 ? (
            <div style={{ padding:'40px 22px', textAlign:'center', color:'#bbb', fontSize:14 }}>No transactions found for this date range.</div>
          ) : deposits.map((t, i) => (
            <div key={t.id}
              onMouseEnter={e => (e.currentTarget.style.background = '#fdf9f7')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              style={{ display:'grid', gridTemplateColumns:'0.6fr 1fr 1.4fr 1fr 0.9fr 1fr 1.4fr',
                padding:'13px 22px', alignItems:'center',
                borderBottom: i < deposits.length - 1 ? '1px solid #f5f0ee' : 'none' }}>
              <div style={{ fontSize:13.5, color:'#555' }}>{t.id}</div>
              <div style={{ fontSize:13.5, color:'#555' }}>{t.paymentType}</div>
              <div style={{ fontSize:13, color:'#555', whiteSpace:'pre-line', lineHeight:1.5 }}>{t.bankLabel || 'N/A\n—'}</div>
              <div style={{ fontSize:13.5, fontWeight:600, color:'#1a1a2e' }}>₹{t.amount.toLocaleString('en-IN')}.00</div>
              <div>
                <span style={{ padding:'3px 12px', borderRadius:14, fontSize:12, fontWeight:700,
                  background: STATUS_STYLE[toDepStatus(t.status)].bg, color: STATUS_STYLE[toDepStatus(t.status)].color }}>
                  {toDepStatus(t.status)}
                </span>
              </div>
              <div style={{ fontSize:13, color:'#aaa' }}>{t.remarks || '—'}</div>
              <div style={{ fontSize:13, color:'#555' }}>{new Date(t.postedDate).toLocaleString('en-IN', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' })}</div>
            </div>
          ))}
        </div>
      </main>

      <CorpFooter />
    </div>
  );
}
