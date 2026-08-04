import type { TicketProps } from "@/app/lib/ticket";

const ISSUER = {
  name: "Kalpvriksha Holidays Pvt Ltd",
  cin: "U52291RJ2025PTC109844",
  gstin: "08AAMCK4210B1ZY",
  address: "961, Mookim House, Pano Ka Dariba, Jaipur, Rajasthan, 302001",
  phone: "8769924784",
};

const CONFIRMED_STATUSES = new Set(["confirm", "confirmed", "tickted", "ticketed", "complete", "completed"]);

function esc(v: string | number | null | undefined): string {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c] as string));
}

function barcodeUrl(value: string): string {
  return `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(value)}&code=Code128`;
}

function formatMoney(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/* Renders the e-ticket as a standalone print-ready HTML page — same CSS/markup structure as the
 * Laravel Blade template this was ported from, adapted to this app's data (TicketProps, already
 * shared with the PDF version in ticket.tsx) instead of Eloquent relations/raw Yatra JSON. Airline
 * icons are referenced directly from /airline_icons/{code}.png (public/) rather than the
 * base64-re-encoded path the PDF renderer needs, since a browser can load indexed PNGs natively. */
export function buildTicketHtml(props: TicketProps): string {
  const {
    bookingRef, status, bookingDate, countryCode, phone, gstin, travelClass, fareType, tripType, passengers, legs,
    totalFlightAmt, serviceFeeExGst, serviceFeeGst, convenienceFee, discount, totalPayableAmt,
  } = props;

  const isConfirmed = CONFIRMED_STATUSES.has(status.trim().toLowerCase());

  const flightInfoRows = legs.flatMap(leg =>
    leg.segments.map(
      seg => `
    <tr>
      <td>${esc(seg.airlineName)} (${esc(seg.airlineCode)}-${esc(seg.flightNumber)})</td>
      <td>${esc(seg.depCityName)} → ${esc(seg.arrCityName)}</td>
      <td>${formatDate(seg.depDate)}, ${esc(seg.depTime)}</td>
      <td>${formatDate(seg.arrDate)}, ${esc(seg.arrTime)}</td>
      <td>${esc(seg.durationLabel)}</td>
      <td>${esc(leg.pnr || "—")}</td>
      <td>${esc(travelClass || "Economy")}</td>
    </tr>`
    )
  ).join("");

  const passengerRows = passengers.map((p, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${esc(p.name)}</td>
      <td>${esc(p.type)}</td>
      <td>${esc(p.ticketNo)}</td>
      <td>—</td>
      <td style="text-align:center;">
        ${p.ticketNo && p.ticketNo !== "-" ? `<img src="${barcodeUrl(p.ticketNo)}" height="30" width="100" alt="${esc(p.ticketNo)}">` : "—"}
      </td>
    </tr>`).join("");

  const legSections = legs.map(leg => `
    <div class="section-bar">Flight itinerary — ${esc(leg.originCity)} to ${esc(leg.destinationCity)}</div>
    <div class="section-body">
      ${leg.segments.map((seg, si) => `
        <div class="leg-card">
          <div class="leg-head">
            <span>${esc(seg.depCityName)} — ${esc(seg.arrCityName)}
            ${leg.segments.length > 1 ? `<span style="font-size:10px;font-weight:500;">(Segment ${si + 1})</span>` : ""}</span>
            <span class="leg-head-basics">${esc(travelClass || "Economy")}${fareType ? ` · ${esc(fareType)}` : ""}</span>
          </div>
          <table class="leg-body-table">
            <tr>
              <td class="leg-airline" style="width:160px;">
                <img src="/airline_icons/${esc(seg.airlineCode)}.png" width="50" alt="${esc(seg.airlineName)}"
                  onerror="this.style.display='none'">
                <div style="margin-top:6px;font-weight:700;">${esc(seg.airlineName)}</div>
                <div style="font-size:11px;color:#666;">${esc(seg.airlineCode)}-${esc(seg.flightNumber)}</div>
                <div style="font-size:9.5px;margin-top:8px;">
                  Baggage: <strong>${esc(leg.baggage || "As per airline")}</strong>
                </div>
              </td>
              <td class="leg-mid">
                <table width="100%">
                  <tr>
                    <td class="leg-col">
                      <div class="lbl">Departure</div>
                      <div class="big">${formatDate(seg.depDate)}</div>
                      <div class="big">${esc(seg.depTime)}</div>
                      <div class="sub">${esc(seg.depCityName)}</div>
                      ${[seg.depAirportName, seg.depTerminal].filter(Boolean).length ? `<div class="sub">${esc([seg.depAirportName, seg.depTerminal].filter(Boolean).join(" · "))}</div>` : ""}
                    </td>
                    <td class="leg-center">
                      <div class="lbl">Duration</div>
                      <div class="big" style="color:#c2410c;font-size:16px;">${esc(seg.durationLabel)}</div>
                    </td>
                    <td class="leg-end">
                      <div class="lbl">Arrival</div>
                      <div class="big">${formatDate(seg.arrDate)}</div>
                      <div class="big">${esc(seg.arrTime)}</div>
                      <div class="sub">${esc(seg.arrCityName)}</div>
                      ${[seg.arrAirportName, seg.arrTerminal].filter(Boolean).length ? `<div class="sub">${esc([seg.arrAirportName, seg.arrTerminal].filter(Boolean).join(" · "))}</div>` : ""}
                    </td>
                  </tr>
                </table>
              </td>
              <td class="pnr-box" style="width:130px;">
                <div class="lbl">PNR</div>
                <div class="num">${esc(leg.pnr || "—")}</div>
                ${leg.pnr && leg.pnr !== "-" ? `<div style="margin-top:12px;"><img src="${barcodeUrl(leg.pnr)}" height="38" alt="${esc(leg.pnr)}"></div>` : ""}
              </td>
            </tr>
          </table>
          <div class="leg-foot">
            Operated by <strong>${esc(seg.airlineName)}</strong>. Verify terminal &amp; baggage on airline website.
          </div>
        </div>
      `).join("")}
    </div>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>E-Ticket — ${esc(bookingRef)}</title>
<style>
  @page { margin: 10px; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
  body { font-family: 'DejaVu Sans', sans-serif; font-size: 11px; color: #1c1917; background: #f5f5f4; margin: 0; padding: 15px; }
  .ticket-doc { max-width: 900px; margin: 0 auto; background: #fff; border: 1px solid #e7e5e4; border-radius: 12px; overflow: hidden; border-top: 6px solid #ea580c; }
  .doc-header { padding: 22px 24px; border-bottom: 1px solid #fed7aa; display: table; width: 100%; }
  .doc-header > div { display: table-cell; vertical-align: top; }
  .logo { font-size: 24px; font-weight: 800; font-style: italic; color: #c9184a; }
  .company-block { text-align: right; width: 58%; }
  .company-block .name { font-size: 14px; font-weight: 800; color: #ea580c; text-transform: uppercase; }
  .company-block .meta { font-size: 10px; line-height: 1.55; color: #57534e; }
  .alert-strip { margin: 0 24px 16px; padding: 11px 14px; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; font-size: 10.5px; color: #7c2d12; }
  .summary-table { width: 100%; padding: 0 24px 18px; border-collapse: separate; border-spacing: 8px; }
  .summary-box { border: 1px solid #e7e5e4; border-radius: 8px; padding: 11px 12px; background: #fafaf9; }
  .summary-box .lbl { font-size: 9px; text-transform: uppercase; color: #57534e; font-weight: 700; }
  .summary-box .val { font-size: 12.5px; font-weight: 700; margin-top: 4px; }
  .badge-confirmed { background: #22c55e; color: #fff; font-size: 9px; padding: 2px 9px; border-radius: 999px; margin-left: 6px; }
  .section-bar { background: #fff7ed; padding: 9px 24px; font-size: 11px; font-weight: 800; color: #9a3412; text-transform: uppercase; letter-spacing: 0.6px; border-top: 1px solid #fed7aa; border-bottom: 1px solid #fed7aa; }
  .section-body { padding: 16px 24px; }
  .data-table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  .data-table th, .data-table td { border: 1px solid #e7e5e4; padding: 8px 10px; }
  .data-table th { background: #fff7ed; font-weight: 700; color: #7c2d12; }
  .fare-table { table-layout: fixed; white-space: nowrap; }
  .fare-table th, .fare-table td { text-align: right; font-size: 10px; padding: 9px 8px; }
  .fare-table th:first-child, .fare-table td:first-child { text-align: left; }
  .fare-table .fare-total-col { background: #fff7ed; color: #c2410c; font-size: 12px; }
  .leg-card { border: 1px solid #fed7aa; border-radius: 10px; margin-bottom: 16px; overflow: hidden; }
  .leg-head { background: #fff7ed; padding: 9px 16px; font-weight: 800; font-size: 12px; color: #9a3412; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .leg-head-basics { font-size: 10px; font-weight: 700; color: #9a3412; background: #fff; border: 1px solid #fed7aa; border-radius: 999px; padding: 3px 10px; white-space: nowrap; }
  .leg-body-table { width: 100%; border-collapse: collapse; }
  .leg-body-table td { padding: 14px 8px; vertical-align: top; }
  .leg-airline { width: 160px; }
  .leg-mid { width: auto; }
  .leg-col { width: 32%; }
  .leg-center { text-align: center; width: 26%; }
  .leg-end { text-align: right; }
  .lbl { font-size: 9px; color: #57534e; text-transform: uppercase; font-weight: 700; }
  .big { font-size: 15px; font-weight: 800; line-height: 1.1; }
  .sub { font-size: 10px; color: #57534e; margin-top: 3px; }
  .pnr-box { width: 125px; background: #f5f5f4; border: 1px dashed #fed7aa; border-radius: 8px; padding: 12px 8px; text-align: center; }
  .pnr-box .num { font-size: 17px; font-weight: 800; color: #ea580c; }
  .leg-foot { padding: 9px 16px; font-size: 10px; color: #b45309; background: #fffbeb; border-top: 1px solid #fde68a; }
  .divider { text-align: center; margin: 22px 24px; padding: 10px; border-top: 1px dashed #d6d3d1; border-bottom: 1px dashed #d6d3d1; font-size: 10px; color: #78716c; }
  .notes-section { margin: 0 24px 20px; border: 1px solid #fecaca; border-radius: 8px; overflow: hidden; }
  .notes-head { background: #fff1f2; padding: 9px 14px; font-weight: 800; font-size: 11px; color: #9f1239; }
  .notes-body { padding: 12px 14px; font-size: 10.5px; color: #57534e; }
  .doc-footer { text-align: center; padding: 16px 24px 22px; background: linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%); font-size: 11.5px; font-weight: 800; color: #9a3412; }
  .text-end { text-align: right; }
  img { max-width: 100%; height: auto; }
</style>
</head>
<body>
<div class="ticket-doc">

  <div class="doc-header">
    <div><span class="logo">Kalyanam</span></div>
    <div class="company-block">
      <div class="name">${esc(ISSUER.name)}</div>
      <div class="meta">
        <strong>CIN:</strong> ${esc(ISSUER.cin)}<br>
        <strong>GSTIN:</strong> ${esc(ISSUER.gstin)}<br>
        ${esc(ISSUER.address)}<br>
        <strong>Phone:</strong> ${esc(ISSUER.phone)}
      </div>
    </div>
  </div>

  <div class="alert-strip">
    Please carry a valid identity proof along with this e-ticket. We recommend you check in at least 2 hours prior to departure.
  </div>

  <table class="summary-table">
    <tr>
      <td class="summary-box">
        <div class="lbl">Booking ref</div>
        <div class="val">${esc(bookingRef)}${isConfirmed ? ' <span class="badge-confirmed">CONFIRMED</span>' : ""}</div>
      </td>
      <td class="summary-box">
        <div class="lbl">Booking date</div>
        <div class="val">${esc(bookingDate)}</div>
      </td>
      <td class="summary-box">
        <div class="lbl">Phone</div>
        <div class="val">${phone ? `+${esc(countryCode ?? "91")} ${esc(phone)}` : "—"}</div>
      </td>
      <td class="summary-box">
        <div class="lbl">Guest GSTIN</div>
        <div class="val">${esc(gstin || "—")}</div>
      </td>
      <td class="summary-box">
        <div class="lbl">Trip type</div>
        <div class="val">${esc(tripType)}</div>
      </td>
    </tr>
  </table>

  <div class="section-bar">Flight information</div>
  <div class="section-body">
    <table class="data-table">
      <thead>
        <tr><th>Airline / Flight</th><th>Route</th><th>Departure</th><th>Arrival</th><th>Duration</th><th>PNR</th><th>Class</th></tr>
      </thead>
      <tbody>
        ${flightInfoRows || `<tr><td colspan="7">No flight records.</td></tr>`}
      </tbody>
    </table>
  </div>

  <div class="section-bar">Passenger details</div>
  <div class="section-body">
    <table class="data-table">
      <thead>
        <tr><th>Sr</th><th>Name</th><th>Type</th><th>Ticket number</th><th>Seat</th><th>Barcode / QR</th></tr>
      </thead>
      <tbody>
        ${passengerRows || `<tr><td colspan="6">No passenger records.</td></tr>`}
      </tbody>
    </table>
  </div>

  ${legSections}

  <div class="section-bar">Fare details</div>
  <div class="section-body">
    <table class="data-table fare-table">
      <thead>
        <tr>
          <th>Flight fare</th>
          <th>Service fee</th>
          <th>GST on service fee</th>
          <th>Convenience fee</th>
          <th>Discount</th>
          <th class="fare-total-col">Total paid</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="text-end">₹ ${formatMoney(totalFlightAmt)}</td>
          <td class="text-end">₹ ${formatMoney(serviceFeeExGst)}</td>
          <td class="text-end">₹ ${formatMoney(serviceFeeGst)}</td>
          <td class="text-end">₹ ${formatMoney(convenienceFee)}</td>
          <td class="text-end">− ₹ ${formatMoney(discount)}</td>
          <td class="text-end fare-total-col"><strong>₹ ${formatMoney(totalPayableAmt)}</strong></td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="divider">✂ KEEP THIS SECTION FOR YOUR RECORDS ✂</div>

  <div class="notes-section">
    <div class="notes-head">Important notes</div>
    <div class="notes-body">
      <ul>
        <li>Date and time mentioned on the ticket are local to the respective airports.</li>
        <li>Passenger names must match government-issued photo ID exactly.</li>
        <li>Baggage and check-in rules are as per the operating airline.</li>
        <li>Cancellation / modification charges depend on fare rules.</li>
        <li>For support, contact ${esc(ISSUER.name)} with your booking reference.</li>
      </ul>
    </div>
  </div>

  <div class="doc-footer">Thank you for booking with ${esc(ISSUER.name.toUpperCase())}</div>

</div>
</body>
</html>`;
}
