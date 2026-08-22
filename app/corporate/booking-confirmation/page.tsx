'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Inter, Playfair_Display } from 'next/font/google';
import BookingProgress from '../components/BookingProgress';
import CorpHeader from '../components/CorpHeader';
import CorpFooter from '../components/CorpFooter';
import { useCurrentUser } from '../../hooks/useCurrentUser';

const inter    = Inter({ subsets: ['latin'], weight: ['400','500','600','700','800'] });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['700'], style: ['italic'] });

const O  = '#f07820';
const O2 = '#e86d18';
const PK = '#c9184a';
const GR = '#2d8a4e';

interface BookingDetail {
  ref: string; invoiceNo: string | null; status: string; paymentStatus: string | null;
  travelClass: string | null; fareType: string | null;
  adt: number; chd: number; inf: number;
  totalFlightAmt: number; serviceFee: number; convenienceFee: number; discount: number;
  totalPayableAmt: number; paymentMode: string | null; paymentReferenceNo: string | null; pnr: string | null;
  createdAt: string; tripType: 'one-way' | 'round' | 'multi';
  automationEnabled: boolean; automationResponse: string | null;
}
interface Sector { id: number; route: string; originCity: string | null; destinationCity: string | null; date: string | null; pnr: string | null; }
interface Passenger {
  id: number; name: string; type: string | null;
  title: string | null; firstName: string | null; lastName: string | null;
  dob: string | null;
  nationality: string | null; passport: string | null;
  issuingCountry: string | null; issuingCountryCode: string | null;
  passportExpiry: string | null;
}
interface Ticket { travellerId: string | null; sector: string | null; ticketNo: string; pnr: string | null; status: string | null; }

const inrFmt = (n: number) => n.toLocaleString('en-IN');

function fmtDate(s: string | null): string {
  if (!s) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PAX_TYPE_LABEL: Record<string, string> = { ADT: 'Adult', CHD: 'Child', INF: 'Infant' };

function normalizeStatus(status: string): string {
  const s = status.trim().toLowerCase();
  if (s.includes('cancel')) return 'Cancelled';
  if (s.includes('refund')) return 'Refunded';
  if (s.includes('hold')) return 'On Hold';
  if (s.includes('tick')) return 'Ticketed';
  // Yatra's own confirmed-ticket status is literally "SUCCESS" (see reviewBooking.ts) — some
  // bookings get booking.status set to that verbatim rather than 'Tickted'. Matched by exact
  // equality, not .includes(), so a value like "unsuccessful" doesn't false-positive here.
  if (s === 'success') return 'Ticketed';
  return 'Pending';
}

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  Ticketed:  { bg: '#e8f5e9', color: '#2d8a4e' },
  Pending:   { bg: '#fff8e1', color: '#b8860b' },
  Cancelled: { bg: '#fce4ec', color: '#c9184a' },
  Refunded:  { bg: '#e3f2fd', color: '#1565c0' },
  'On Hold': { bg: '#f3e5f5', color: '#6a1b9a' },
};

function normalizePaymentStatus(status: string | null): string {
  const s = (status ?? '').trim().toLowerCase();
  if (s.includes('fail')) return 'Failed';
  if (s.includes('refund')) return 'Refunded';
  if (s.includes('pend')) return 'Pending';
  return 'Successful';
}

const PAYMENT_STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  Successful: { bg: '#e8f5e9', color: '#2d8a4e' },
  Pending:    { bg: '#fff8e1', color: '#b8860b' },
  Failed:     { bg: '#fce4ec', color: '#c9184a' },
  Refunded:   { bg: '#e3f2fd', color: '#1565c0' },
};

const STATUS_MESSAGE: Record<string, { title: string; sub: string }> = {
  Ticketed:  { title: 'Payment Successful',   sub: 'When Your tickets are confirmed. E-tickets have been sent to your registered email.' },
  // Payment has definitely gone through by the time this page loads — status only reflects
  // whether the airline ticket itself has been confirmed yet (see booking.status in createBooking.ts).
  Pending:   { title: 'Payment Successful!',  sub: 'Your payment has been received. Your ticket is awaiting airline confirmation and will update automatically once issued.' },
  Cancelled: { title: 'Booking Cancelled',    sub: 'This booking has been cancelled.' },
  Refunded:  { title: 'Booking Refunded',     sub: 'This booking has been refunded.' },
  'On Hold': { title: 'Booking On Hold',      sub: 'Part of this booking is on hold pending airline confirmation.' },
};

const FARE_RULES = [
  'Total Rescheduling Charges = Airlines Rescheduling fees + Fare Difference (if applicable) + EMT Fees.',
  'The airline cancel/reschedule fees is indicative and can be changed without any prior notice by the airlines.',
  'Shree Kalyanam does not guarantee the accuracy of cancel/reschedule fees.',
  'Partial cancellation is not allowed on flight tickets booked under special round-trip discounted fares.',
  'Airlines do not allow any additional baggage allowance for any infant added to the booking.',
  'In certain situations of restricted cases, no amendments and cancellation is allowed.',
  'Airlines cancel/reschedule should be reconfirmed before requesting a cancellation or amendment.',
];

/* ── Complete Fare Summary — same collapsible pax-wise / base-fare / additional-charges layout
 * used on the payment page's FareSummaryCard, rebuilt here from what's actually persisted on the
 * `booking` row (total_flight_amt / service_fee / convenience_fee / discount). Unlike the payment
 * page, there's no stored per-traveller-type base+tax split (that breakdown is only ever computed
 * client-side at checkout and never written to the DB), so "Base Fare" shows pax-type counts
 * against the one stored flight-amount total rather than a per-unit rate. ── */
function FareSummaryDetail({ booking, paxCount }: { booking: BookingDetail; paxCount: number }) {
  const [showDetails, setShowDetails] = useState(true);
  const [openPax,  setOpenPax]  = useState(true);
  const [openAdd,  setOpenAdd]  = useState(true);

  const gstOnServiceFee = Math.round(booking.serviceFee * 0.18);
  const paxKinds: { label: string; count: number }[] = [
    { label: 'Adult', count: booking.adt },
    { label: 'Child', count: booking.chd },
    { label: 'Infant', count: booking.inf },
  ].filter(k => k.count > 0);

  const SectionHeader = ({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) => (
    <div onClick={onClick} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: '#faf6f2', padding: '6px 16px', cursor: 'pointer', userSelect: 'none',
      borderTop: '1px solid #f0e8e2', borderBottom: '1px solid #f0e8e2',
    }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: '#8a8378', lineHeight: 1.15,
        letterSpacing: '.08em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 8, color: O, transition: 'transform .15s', lineHeight: 1,
        display: 'inline-block', transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}>▲</span>
    </div>
  );

  const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: bold ? '6px 16px' : '4px 16px', background: '#fff',
      borderTop: bold ? '1px dashed #eee2d8' : 'none' }}>
      <span style={{ fontSize: bold ? 12.5 : 12, color: bold ? '#1a1a2e' : '#8a8378', lineHeight: 1.15,
        fontWeight: bold ? 800 : 500 }}>{label}</span>
      <span style={{ fontSize: bold ? 13 : 12, color: bold ? O : '#3a3530', lineHeight: 1.15,
        fontWeight: bold ? 800 : 600, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );

  return (
    <div style={{ borderRadius: 12, overflow: 'hidden',
      border: '1px solid #f0e8e2', boxShadow: '0 4px 18px rgba(0,0,0,.05)' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: `linear-gradient(135deg,${O} 0%,${O2} 100%)`, padding: '9px 16px' }}>
        <span onClick={() => setShowDetails(p => !p)} style={{
          fontSize: 10.5, color: '#fff', fontWeight: 700, letterSpacing: '.02em', lineHeight: 1.15,
          textDecoration: 'underline', textUnderlineOffset: 3, cursor: 'pointer' }}>
          {showDetails ? '− Hide Details' : '+ Show Details'}
        </span>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>
          ₹ {inrFmt(booking.totalPayableAmt)}
        </span>
      </div>

      {showDetails && (
        <>
          <SectionHeader label="Base Fare" open={openPax} onClick={() => setOpenPax(p => !p)} />
          {openPax && (
            <>
              {paxKinds.map(k => (
                <Row key={k.label} label={`${k.label} × ${k.count}`} value="" />
              ))}
              <Row label="Total Flight Amount" value={`₹ ${inrFmt(booking.totalFlightAmt)}`} bold />
            </>
          )}

          <SectionHeader label="Additional Charges" open={openAdd} onClick={() => setOpenAdd(p => !p)} />
          {openAdd && (
            <>
              {booking.serviceFee > 0 && <Row label="Service Fee" value={`₹ ${inrFmt(booking.serviceFee)}`} />}
              {gstOnServiceFee > 0 && <Row label="GST on Service Fee (18%)" value={`₹ ${inrFmt(gstOnServiceFee)}`} />}
              {booking.convenienceFee > 0 && <Row label="Convenience Fee" value={`₹ ${inrFmt(booking.convenienceFee)}`} />}
              {booking.discount > 0 && <Row label="Discount" value={`− ₹ ${inrFmt(booking.discount)}`} />}
              {booking.serviceFee <= 0 && gstOnServiceFee <= 0 && booking.convenienceFee <= 0 && booking.discount <= 0 && (
                <Row label="No additional charges" value="" />
              )}
            </>
          )}
        </>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 16px', borderTop: `2px solid ${O}30`,
        background: `linear-gradient(135deg,${O}12,${O}05)` }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, color: O, lineHeight: 1.15,
          letterSpacing: '.08em', textTransform: 'uppercase' }}>Total payable ({paxCount} pax, incl. taxes &amp; fees)</span>
        <span style={{ fontSize: 14.5, fontWeight: 800, color: O, letterSpacing: '-.01em', lineHeight: 1.15,
          fontVariantNumeric: 'tabular-nums' }}>₹ {inrFmt(booking.totalPayableAmt)}</span>
      </div>
    </div>
  );
}

function ConfirmationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ref = searchParams.get('ref');
  const { user, loading: userLoading } = useCurrentUser();

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    if (!userLoading && !user) router.push('/');
  }, [userLoading, user, router]);

  useEffect(() => {
    if (!user || !ref) { setLoading(false); return; }
    fetch(`/api/bookings/${encodeURIComponent(ref)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return;
        setBooking(data.booking);
        setSectors(data.sectors);
        setPassengers(data.passengers);
        setTickets(data.tickets ?? []);
      })
      .finally(() => setLoading(false));
  }, [user, ref]);

  // Airline ticket confirmation happens asynchronously after payment (see automation_responce /
  // reviewBooking.ts) — while the booking is still 'Pending', re-check every few seconds so the
  // Ticket Status badge updates on its own once the ticket is issued, without a manual refresh.
  // Self-terminates once the status moves off 'Pending' (or the tab is left/component unmounts).
  useEffect(() => {
    if (!user || !ref || !booking) return;
    if (normalizeStatus(booking.status) !== 'Pending') return;

    const timer = setTimeout(() => {
      fetch(`/api/bookings/${encodeURIComponent(ref)}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!data) return;
          setBooking(data.booking);
          setSectors(data.sectors);
          setPassengers(data.passengers);
          setTickets(data.tickets ?? []);
        });
    }, 8000);

    return () => clearTimeout(timer);
  }, [user, ref, booking]);

  if (userLoading || loading) {
    return <div style={{ minHeight: '100vh', background: '#fdf6f2' }} />;
  }

  if (!booking) {
    return (
      <div className={inter.className} style={{ background: '#fdf6f2', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ fontSize: 40 }}>🔍</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>Booking not found</div>
        <div style={{ fontSize: 13, color: '#888' }}>{ref ? `No booking matches reference ${ref}.` : 'No booking reference was provided.'}</div>
        <Link href="/corporate/my-bookings" style={{ padding: '10px 26px', background: `linear-gradient(135deg,${O},${O2})`, color: '#fff', borderRadius: 9, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
          Back to My Bookings
        </Link>
      </div>
    );
  }

  const bStatus   = normalizeStatus(booking.status);
  const statusClr = STATUS_COLOR[bStatus] ?? STATUS_COLOR.Pending;
  const message   = STATUS_MESSAGE[bStatus] ?? STATUS_MESSAGE.Pending;
  const pStatus    = normalizePaymentStatus(booking.paymentStatus);
  const pStatusClr = PAYMENT_STATUS_COLOR[pStatus] ?? PAYMENT_STATUS_COLOR.Successful;
  const isRound   = booking.tripType === 'round';
  const travelDt  = sectors[0]?.date ?? '';

  const segments = sectors.map(s => {
    const [from, to] = s.route.split('-');
    return { pnr: s.pnr, date: s.date ?? '-', from: from ?? s.route, to: to ?? '' };
  });

  return (
    <div className={inter.className} style={{ background: '#fdf6f2', minHeight: '100vh', color: '#1a1a2e' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* NAV */}
      <CorpHeader />

      {/* STEPPER */}
      <div style={{ padding: '20px 0 0' }}>
        <BookingProgress step={6} />
      </div>

      {/* HERO — status banner, driven by ticket status (bStatus): stays green for
       * Ticketed/Pending/On Hold alike, and only turns red once the booking is actually
       * Cancelled/Refunded. See the Payment Status badge below for booking.payment_status. */}
      <div style={{ background: bStatus === 'Cancelled' || bStatus === 'Refunded'
          ? 'linear-gradient(135deg,#7a1a2e 0%,#8a2d3c 55%,#5c1a24 100%)'
          : 'linear-gradient(135deg,#1a7a3c 0%,#2d8a4e 55%,#1a5c2e 100%)',
        padding: '32px 5%', textAlign: 'center', marginTop: 20 }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,.2)',
          border: '2.5px solid rgba(255,255,255,.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px', fontSize: 28, color: '#fff', fontWeight: 800 }}>
          {bStatus === 'Cancelled' || bStatus === 'Refunded' ? '✕' : '✓'}
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
          {message.title}
        </h1>
        <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.85)', margin: '0 0 16px' }}>
          {message.sub}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          {booking.paymentReferenceNo && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.35)',
              borderRadius: 24, padding: '7px 22px' }}>
              <span style={{ fontSize: 12.5, fontWeight: 700, color: '#fff', letterSpacing: '.04em' }}>PAYMENT REF NO:</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', letterSpacing: '.08em' }}>{booking.paymentReferenceNo}</span>
            </div>
          )}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,.18)', border: '1px solid rgba(255,255,255,.35)',
            borderRadius: 24, padding: '7px 18px' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>
              {isRound ? 'Round Trip' : booking.tripType === 'multi' ? 'Multi City' : 'One Way'}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN CARD */}
      <div style={{ maxWidth: 1000, margin: '28px auto', padding: '0 5%', boxSizing: 'border-box' }}>
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #f0e8e8',
          boxShadow: '0 4px 24px rgba(0,0,0,.07)', overflow: 'hidden' }}>

          {/* ── BOOKING DETAILS HEADER ── */}
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #f0e8e8',
            display: 'flex', alignItems: 'flex-start', gap: 24,
            background: 'linear-gradient(135deg,#fff9f5,#fff)' }}>

            {/* Company info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#bbb',
                textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 4 }}>Booking Details</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: O, marginBottom: 6 }}>Kalpvriksha Holidays Pvt Ltd</div>
              <div style={{ fontSize: 12.5, color: '#666', lineHeight: 1.6 }}>
                961, Mookim House, Pano Ka Dariba<br />
                Jaipur, Rajasthan, India — 302001
              </div>
              <div style={{ fontSize: 12.5, color: '#666', marginTop: 4 }}>
                Phone: 8769924784
              </div>
            </div>

            {/* Ref + dates */}
            <div style={{ borderLeft: '1px solid #f0e8e8', paddingLeft: 24, flexShrink: 0 }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: '#bbb', textTransform: 'uppercase',
                  letterSpacing: '.08em', marginBottom: 3 }}>Reference No.</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#1a1a2e', letterSpacing: '.05em' }}>
                  {booking.ref}
                </div>
              </div>
              <div style={{ fontSize: 12.5, color: '#666', marginBottom: 3 }}>
                <span style={{ fontWeight: 600, color: '#444' }}>Booked on:</span> {new Date(booking.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
              <div style={{ fontSize: 12.5, color: '#666' }}>
                <span style={{ fontWeight: 600, color: '#444' }}>Travel date:</span> {travelDt}
              </div>
            </div>

            {/* Payment Status — separate from ticket status; driven by booking.payment_status,
             * not derived from the airline ticket confirmation state. */}
            <div style={{ borderLeft: '1px solid #f0e8e8', paddingLeft: 24, flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: '#bbb', textTransform: 'uppercase',
                letterSpacing: '.08em', marginBottom: 8 }}>Payment Status</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                background: pStatusClr.bg, border: `1.5px solid ${pStatusClr.color}`,
                borderRadius: 20, padding: '5px 14px' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: pStatusClr.color }} />
                <span style={{ fontSize: 12.5, fontWeight: 800, color: pStatusClr.color }}>{pStatus}</span>
              </div>

            </div>

            {/* Ticket Status — driven by booking.status, which starts 'Pending' and only
             * becomes 'Tickted' once processReviewBookingResponse() confirms a real airline
             * ticket (see app/lib/reviewBooking.ts). The badge/text below re-render straight off
             * bStatus, so the background poll above flips this from Pending -> Ticketed on its
             * own the moment the airline confirms — no separate "replace" logic needed. */}
            <div style={{ borderLeft: '1px solid #f0e8e8', paddingLeft: 24, flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: '#bbb', textTransform: 'uppercase',
                letterSpacing: '.08em', marginBottom: 8 }}>Ticket Status</div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                background: statusClr.bg, border: `1.5px solid ${statusClr.color}`,
                borderRadius: 20, padding: '5px 14px' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusClr.color }} />
                <span style={{ fontSize: 12.5, fontWeight: 800, color: statusClr.color }}>{bStatus}</span>
                {bStatus === 'Pending' && (
                  <div style={{ width: 10, height: 10, borderRadius: '50%',
                    border: `2px solid ${statusClr.color}33`, borderTopColor: statusClr.color,
                    animation: 'spin .8s linear infinite' }} />
                )}
              </div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 8, maxWidth: 150, lineHeight: 1.4 }}>
                {bStatus === 'Pending'
                  ? 'Checking with the airline for confirmation…'
                  : 'Once your ticket is confirmed, the e-ticket will be sent to your registered email address.'}
              </div>
            </div>
          </div>

          {/* ── FLIGHT INFORMATION ── */}
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #f0e8e8' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a2e', marginBottom: 14 }}>
              Flight Information
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {segments.map((seg, i) => {
                const isReturn = isRound && i === 1;
                const accent   = isReturn ? PK : O;
                return (
                  <div key={i} style={{ border: '1px solid #f0e8e8',
                    borderLeft: `3px solid ${accent}`, borderRadius: 10,
                    padding: '14px 18px', background: '#fafafa' }}>

                    {/* Top row: PNR + class */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {seg.pnr && bStatus === 'Ticketed' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4,
                            background: '#f5f5f5', borderRadius: 5, padding: '3px 10px' }}>
                            <span style={{ fontSize: 11, color: '#555' }}>✈ PNR: {seg.pnr}</span>
                          </div>
                        )}
                        {booking.travelClass && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4,
                            background: '#f5f5f5', borderRadius: 5, padding: '3px 10px' }}>
                            <span style={{ fontSize: 11, color: '#555' }}>🪑 {booking.travelClass}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ marginLeft: 'auto' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center',
                          background: isReturn ? '#fce8ee' : `${O}12`,
                          border: `1px solid ${isReturn ? '#f5c0cc' : `${O}44`}`,
                          borderRadius: 5, padding: '2px 10px' }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: accent,
                            textTransform: 'uppercase', letterSpacing: '.08em' }}>
                            {segments.length > 1 ? (isReturn ? 'Return Flight' : `Sector ${i + 1}`) : 'Flight'} · {bStatus}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>

                      {/* From */}
                      <div style={{ minWidth: 90 }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>
                          {seg.from}
                        </div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#444', marginTop: 5 }}>
                          {seg.date}
                        </div>
                      </div>

                      {/* Line */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 5 }}>
                        <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 0 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%',
                            border: `2px solid ${accent}`, flexShrink: 0 }} />
                          <div style={{ flex: 1, height: 1.5, background: `${accent}44` }} />
                          <svg width="18" height="14" viewBox="0 0 24 14" fill={accent}>
                            <path d="M23 7L15 1v3.5L3 5v3.5L15 9V13z"/>
                          </svg>
                        </div>
                      </div>

                      {/* To */}
                      <div style={{ minWidth: 90, textAlign: 'right' }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>
                          {seg.to}
                        </div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: '#444', marginTop: 5 }}>
                          {seg.date}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── PASSENGERS ── */}
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #f0e8e8' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a2e', marginBottom: 14 }}>
              Passengers
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {passengers.map((p, i) => {
                const paxTickets = tickets.filter(t => t.travellerId === String(p.id));
                const details = [
                  p.title && { label: 'Title', value: p.title },
                  p.dob && { label: 'Date of Birth', value: fmtDate(p.dob) },
                  p.nationality && { label: 'Nationality', value: p.nationality },
                  p.passport && { label: 'Passport No.', value: p.passport },
                  p.issuingCountry && { label: 'Issuing Country', value: p.issuingCountryCode ? `${p.issuingCountry} (${p.issuingCountryCode})` : p.issuingCountry },
                  p.passportExpiry && { label: 'Passport Expiry', value: fmtDate(p.passportExpiry) },
                  ...paxTickets.filter(t => t.ticketNo).map(t => ({
                    label: paxTickets.length > 1 ? `Ticket No. (${(t.sector ?? '').replace('-', ' → ')})` : 'Ticket No.',
                    value: t.ticketNo,
                  })),
                ].filter((d): d is { label: string; value: string } => !!d);

                return (
                  <div key={p.id} style={{ padding: '14px 18px', background: '#fafafa',
                    border: '1px solid #f0e8e8', borderRadius: 10 }}>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                      <div style={{ minWidth: 140, flexShrink: 0 }}>
                        <div style={{ fontSize: 11, color: '#bbb', marginBottom: 3 }}>
                          Passenger {i + 1}
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center',
                          background: `${O}12`, border: `1px solid ${O}44`,
                          borderRadius: 5, padding: '2px 10px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: O }}>
                            {(p.type && PAX_TYPE_LABEL[p.type]) || p.type || 'Adult'}
                          </span>
                        </div>
                      </div>

                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 11, color: '#bbb', fontWeight: 600 }}>Name : </span>
                        <span style={{ fontSize: 13.5, fontWeight: 800, color: PK }}>{p.name}</span>
                      </div>
                    </div>

                    {details.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                        gap: '10px 16px', marginTop: 12, paddingTop: 12, borderTop: '1px dashed #e8e0e0' }}>
                        {details.map(d => (
                          <div key={d.label}>
                            <div style={{ fontSize: 9.5, color: '#bbb', fontWeight: 700,
                              textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 2 }}>{d.label}</div>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a2e' }}>{d.value}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── FARE SUMMARY ── */}
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #f0e8e8' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a2e', marginBottom: 14 }}>
              Fare Summary
            </div>
            <FareSummaryDetail booking={booking} paxCount={passengers.length} />
          </div>

          {/* ── FARE RULES ── */}
          <div style={{ padding: '20px 28px', borderBottom: '1px solid #f0e8e8' }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: '#1a1a2e', marginBottom: 14 }}>
              Fare Rules
            </div>
            <div style={{ background: '#fafafa', border: '1px solid #f0e8e8',
              borderRadius: 10, padding: '16px 20px' }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a2e', marginBottom: 10 }}>
                Terms &amp; Conditions
              </div>
              <ul style={{ margin: 0, paddingLeft: 18,
                display: 'flex', flexDirection: 'column', gap: 7 }}>
                {FARE_RULES.map((rule, i) => (
                  <li key={i} style={{ fontSize: 12.5, color: i % 2 === 1 ? O : '#555',
                    lineHeight: 1.6 }}>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── ACTION BUTTONS ── */}
          <div style={{ padding: '20px 28px', display: 'flex',
            justifyContent: 'center', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            {bStatus === 'Ticketed' && (
              <a href={`/api/bookings/${encodeURIComponent(booking.ref)}/ticket`} target="_blank" rel="noopener noreferrer" style={{
                padding: '11px 26px', background: 'none',
                border: '1.5px solid #ddd', borderRadius: 9,
                fontSize: 13, fontWeight: 700, color: '#666',
                cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
              }}>
                🖨 Print Ticket
              </a>
            )}
            <a href={`/api/bookings/${encodeURIComponent(booking.ref)}/invoice`} target="_blank" rel="noopener noreferrer" style={{
              padding: '11px 26px', background: 'none',
              border: `1.5px solid ${O}`, borderRadius: 9,
              fontSize: 13, fontWeight: 700, color: O,
              cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none',
            }}>
              Invoice
            </a>
            <Link href="/corporate/my-bookings" style={{
              padding: '12px 34px',
              background: `linear-gradient(135deg,${O},${O2})`,
              color: '#fff', border: 'none', borderRadius: 9,
              fontSize: 13.5, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'inherit', textDecoration: 'none',
              boxShadow: `0 4px 16px ${O}44`,
              display: 'inline-block',
            }}>
              Back To My Bookings
            </Link>
          </div>

        </div>

        {/* Booking note */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, marginTop: 16, marginBottom: 28 }}>
          <span style={{ fontSize: 15 }}>✉️</span>
          <span style={{ fontSize: 12.5, color: '#aaa' }}>
            Booking confirmation has been sent to your registered email.
          </span>
        </div>
      </div>

      <CorpFooter />
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#fdf6f2' }} />}>
      <ConfirmationContent />
    </Suspense>
  );
}
