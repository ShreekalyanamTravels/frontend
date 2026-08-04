import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";

const ISSUER = {
  name: "KALPVRIKSHA HOLIDAYS PVT LTD",
  cin: "U52291RJ2025PTC109844",
  gstin: "08AAMCK4210B1ZY",
  address: "961, Mookim House, Pano Ka Dariba, Jaipur, Rajasthan, 302001",
  phone: "8769924784",
};

const ACCENT = "#ea580c";
const ACCENT_DARK = "#9a3412";
const ACCENT_ALERT = "#7c2d12";
const ACCENT_NOTE = "#b45309";
const CONFIRMED_GREEN = "#22c55e";
const NOTES_RED = "#9f1239";
const PINK = "#c9184a";

const barcodeUrl = (value: string) =>
  `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(value)}&code=Code128`;

const styles = StyleSheet.create({
  page: { backgroundColor: "#f5f5f4", padding: 18, fontSize: 9, fontFamily: "Helvetica", color: "#1c1917" },
  card: { backgroundColor: "#fff", borderRadius: 10, borderWidth: 1, borderColor: "#e7e5e4", overflow: "hidden" },
  topBar: { height: 5, backgroundColor: ACCENT },
  cardInner: { padding: 24 },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  logo: { fontSize: 20, fontFamily: "Times-BoldItalic", color: PINK },
  issuerName: { fontSize: 13, fontFamily: "Times-Bold", color: ACCENT, textAlign: "right" },
  issuerLine: { fontSize: 8, color: "#57534e", textAlign: "right", marginTop: 2 },

  notice: { backgroundColor: "#fff7ed", borderWidth: 1, borderColor: "#fed7aa", borderRadius: 6,
    padding: 10, marginBottom: 14, fontSize: 8.5, color: ACCENT_ALERT },

  metaBar: { flexDirection: "column", gap: 8, marginBottom: 14 },
  metaRow: { flexDirection: "row", gap: 8 },
  metaCell: { flex: 1, borderWidth: 1, borderColor: "#ececea", borderRadius: 8, backgroundColor: "#fafaf9", padding: 10 },
  metaCellRef: { flex: 1.8, borderWidth: 1, borderColor: "#ececea", borderRadius: 8, backgroundColor: "#fafaf9", padding: 10 },
  metaCellPnr: { flex: 1, borderWidth: 1, borderColor: "#ececea", borderRadius: 8, backgroundColor: "#fafaf9", padding: 10 },
  metaLabel: { fontSize: 7, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  metaValue: { fontSize: 10.5, fontWeight: 600, color: "#292524" },
  metaValueAccent: { fontSize: 10.5, fontWeight: 600, color: ACCENT_DARK },
  metaRefRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", rowGap: 4 },
  confirmedBadge: { fontSize: 6.5, fontWeight: 600, color: "#fff", backgroundColor: CONFIRMED_GREEN,
    borderRadius: 8, paddingVertical: 2, paddingHorizontal: 5, marginLeft: 6 },

  sectionHeader: { backgroundColor: "#fff7ed", borderTopWidth: 1, borderBottomWidth: 1, borderColor: "#fed7aa",
    padding: 8, marginBottom: 10 },
  sectionHeaderText: { fontSize: 10, fontFamily: "Times-Bold", color: ACCENT_DARK, textTransform: "uppercase", letterSpacing: 0.5 },

  table: { marginBottom: 14 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#fff7ed", paddingVertical: 6, paddingHorizontal: 4, fontWeight: 700, borderBottomWidth: 1, borderBottomColor: "#fed7aa" },
  tableRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", alignItems: "center" },
  colSl: { width: 22 },
  colName: { flex: 1.6 },
  colType: { flex: 0.9 },
  colTicket: { flex: 1.3 },
  colSeat: { width: 40 },
  colBarcode: { flex: 1.6, alignItems: "center" },
  barcodeImg: { width: 100, height: 26 },
  barcodeText: { fontSize: 6.5, color: "#555", marginTop: 1, letterSpacing: 1 },

  legCard: { borderWidth: 1, borderColor: "#fed7aa", borderRadius: 8, marginBottom: 12, overflow: "hidden" },
  legHead: { backgroundColor: "#fff7ed", padding: 9, fontSize: 11, fontFamily: "Times-Bold", color: ACCENT_DARK },
  legHeadSegment: { fontSize: 8.5, fontFamily: "Helvetica", color: ACCENT_DARK },
  legBody: { flexDirection: "row", padding: 12 },

  airlineCol: { width: 130, paddingRight: 8 },
  airlineBox: { width: 30, height: 30, borderRadius: 5, backgroundColor: "#003580",
    alignItems: "center", justifyContent: "center", marginBottom: 6, overflow: "hidden" },
  airlineBoxText: { color: "#fff", fontSize: 8, fontWeight: 700 },
  airlineIcon: { width: 30, height: 30, borderRadius: 5, marginBottom: 6 },
  airlineName: { fontSize: 9.5, fontWeight: 600, color: "#292524" },
  flightCode: { fontSize: 8, color: "#78716c", marginTop: 1 },
  baggageLine: { fontSize: 8, color: "#57534e", marginTop: 8 },
  baggageValue: { fontWeight: 600, color: "#292524" },

  midCol: { flex: 1, flexDirection: "row" },
  timelineCol: { flex: 1 },
  timelineColCenter: { flex: 0.8, alignItems: "center" },
  timelineLabel: { fontSize: 7, fontWeight: 600, color: "#a8a29e", textTransform: "uppercase", marginBottom: 3 },
  timelineBig: { fontSize: 13, fontWeight: 700, color: "#292524", lineHeight: 1.15 },
  timelineDate: { fontSize: 9, fontWeight: 600, color: "#57534e", marginBottom: 1 },
  timelineSub: { fontSize: 7.5, color: "#78716c", marginTop: 4, lineHeight: 1.4 },
  durationValue: { fontSize: 12, fontFamily: "Times-Bold", color: ACCENT_DARK },

  operatedNote: { fontSize: 7.5, color: ACCENT_NOTE, backgroundColor: "#fffbeb",
    borderTopWidth: 1, borderTopColor: "#fde68a", padding: 8 },

  fareTable: { marginBottom: 14 },
  fareHeaderRow: { flexDirection: "row", backgroundColor: "#fff7ed", paddingVertical: 7, paddingHorizontal: 10 },
  fareRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: "#f0f0f0", borderLeftWidth: 1, borderRightWidth: 1, borderColor: "#eee" },
  fareTotalRow: { flexDirection: "row", paddingVertical: 8, paddingHorizontal: 10,
    borderWidth: 1, borderColor: "#eee", backgroundColor: "#fff" },
  fareDescCol: { flex: 3, fontWeight: 700, fontSize: 8.5 },
  fareAmountCol: { flex: 1, textAlign: "right", fontWeight: 700, fontSize: 8.5 },
  fareDescVal: { flex: 3, fontSize: 9 },
  fareAmountVal: { flex: 1, textAlign: "right", fontSize: 9 },

  perforation: { borderTopWidth: 1, borderTopColor: "#d6d3d1", borderTopStyle: "dashed", marginVertical: 16 },
  perforationLabel: { textAlign: "center", fontSize: 7.5, color: "#78716c", marginTop: -20, backgroundColor: "#fff", alignSelf: "center", paddingHorizontal: 8 },

  notesBox: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#fecaca", borderRadius: 8, marginBottom: 14, overflow: "hidden" },
  notesHeading: { fontSize: 9.5, fontFamily: "Times-Bold", color: NOTES_RED, backgroundColor: "#fff1f2", padding: 9 },
  notesBody: { padding: 12 },
  noteItem: { fontSize: 8, color: "#57534e", marginBottom: 3 },

  footer: { fontSize: 10, fontFamily: "Times-Bold", color: ACCENT_DARK, textAlign: "center",
    backgroundColor: "#fff2e0", padding: 12, marginHorizontal: -24, marginBottom: -24, marginTop: 8 },
});

const CONFIRMED_STATUSES = new Set(["confirm", "confirmed", "tickted", "ticketed", "complete", "completed"]);

export interface TicketPassenger {
  name: string;
  type: string;
  ticketNo: string;
}
export interface TicketSegment {
  airlineCode: string;
  airlineName: string;
  airlineIconPath: string | null;
  flightNumber: string;
  depCityName: string;
  arrCityName: string;
  depAirportName: string;
  depTerminal: string;
  arrAirportName: string;
  arrTerminal: string;
  depDate: string;
  depTime: string;
  arrDate: string;
  arrTime: string;
  durationLabel: string;
}
export interface TicketLeg {
  originCity: string;
  destinationCity: string;
  pnr: string;
  baggage: string | null;
  segments: TicketSegment[];
}
export interface TicketProps {
  bookingRef: string;
  pnr: string;
  status: string;
  bookingDate: string;
  countryCode: string | null;
  phone: string | null;
  gstin: string | null;
  travelClass: string | null;
  fareType: string | null;
  tripType: string;
  passengers: TicketPassenger[];
  legs: TicketLeg[];
  totalFlightAmt: number;
  serviceFeeExGst: number;
  serviceFeeGst: number;
  convenienceFee: number;
  discount: number;
  totalPayableAmt: number;
}

function formatMoney(n: number): string {
  return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function TicketDocument(props: TicketProps) {
  const {
    bookingRef, pnr, status, bookingDate, countryCode, phone, gstin, passengers, legs,
    totalFlightAmt, serviceFeeExGst, serviceFeeGst, convenienceFee, discount, totalPayableAmt,
  } = props;

  const isConfirmed = CONFIRMED_STATUSES.has(status.trim().toLowerCase());

  return (
    <Document>
      <Page size="A4" style={styles.page}>
      <View style={styles.card}>
      <View style={styles.topBar} />
      <View style={styles.cardInner}>
        <View style={styles.headerRow}>
          <Text style={styles.logo}>Kalyanam</Text>
          <View>
            <Text style={styles.issuerName}>{ISSUER.name}</Text>
            <Text style={styles.issuerLine}>CIN: {ISSUER.cin}</Text>
            <Text style={styles.issuerLine}>GSTIN: {ISSUER.gstin}</Text>
            <Text style={styles.issuerLine}>{ISSUER.address}</Text>
            <Text style={styles.issuerLine}>Phone: {ISSUER.phone}</Text>
          </View>
        </View>

        <Text style={styles.notice}>
          Please carry a valid identity proof along with this e-ticket. We recommend you check in at least 2 hours prior to departure.
        </Text>

        <View style={styles.metaBar}>
          <View style={styles.metaRow}>
            <View style={styles.metaCellRef}>
              <Text style={styles.metaLabel}>Booking Ref</Text>
              <View style={styles.metaRefRow}>
                <Text style={styles.metaValue}>{bookingRef}</Text>
                {isConfirmed && <Text style={styles.confirmedBadge}>CONFIRMED</Text>}
              </View>
            </View>
            <View style={styles.metaCellPnr}>
              <Text style={styles.metaLabel}>PNR</Text>
              <Text style={styles.metaValueAccent}>{pnr || "—"}</Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Booking Date</Text>
              <Text style={styles.metaValue}>{bookingDate}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Phone</Text>
              <Text style={styles.metaValue}>{phone ? `+${countryCode ?? "91"} ${phone}` : "—"}</Text>
            </View>
            <View style={styles.metaCell}>
              <Text style={styles.metaLabel}>Guest GSTIN</Text>
              <Text style={styles.metaValue}>{gstin || "—"}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Passenger Details</Text>
        </View>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colSl}>Sr</Text>
            <Text style={styles.colName}>Name</Text>
            <Text style={styles.colType}>Type</Text>
            <Text style={styles.colTicket}>Ticket number</Text>
            <Text style={styles.colSeat}>Seat</Text>
            <Text style={styles.colBarcode}>Barcode / QR</Text>
          </View>
          {passengers.map((p, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colSl}>{i + 1}</Text>
              <Text style={styles.colName}>{p.name}</Text>
              <Text style={styles.colType}>{p.type}</Text>
              <Text style={styles.colTicket}>{p.ticketNo}</Text>
              <Text style={styles.colSeat}>—</Text>
              <View style={styles.colBarcode}>
                {p.ticketNo !== "-" && (
                  <>
                    <Image src={barcodeUrl(p.ticketNo)} style={styles.barcodeImg} />
                    <Text style={styles.barcodeText}>{p.ticketNo}</Text>
                  </>
                )}
              </View>
            </View>
          ))}
        </View>

        {legs.map((leg, li) => (
          <View key={li}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>Flight Itinerary — {leg.originCity} to {leg.destinationCity}</Text>
            </View>

            {leg.segments.map((seg, si) => (
              <View style={styles.legCard} key={si}>
                <View style={styles.legHead}>
                  <Text>
                    {seg.depCityName} — {seg.arrCityName}
                    {leg.segments.length > 1 && <Text style={styles.legHeadSegment}>  (Segment {si + 1})</Text>}
                  </Text>
                </View>

                <View style={styles.legBody}>
                  <View style={styles.airlineCol}>
                    {seg.airlineIconPath ? (
                      <Image src={seg.airlineIconPath} style={styles.airlineIcon} />
                    ) : (
                      <View style={styles.airlineBox}><Text style={styles.airlineBoxText}>✈</Text></View>
                    )}
                    <Text style={styles.airlineName}>{seg.airlineName}</Text>
                    <Text style={styles.flightCode}>{seg.airlineCode}-{seg.flightNumber}</Text>
                    <Text style={styles.baggageLine}>Baggage: <Text style={styles.baggageValue}>{leg.baggage || "As per airline"}</Text></Text>
                  </View>

                  <View style={styles.midCol}>
                    <View style={styles.timelineCol}>
                      <Text style={styles.timelineLabel}>Departure</Text>
                      <Text style={styles.timelineDate}>{formatDate(seg.depDate)}</Text>
                      <Text style={styles.timelineBig}>{seg.depTime}</Text>
                      <Text style={styles.timelineSub}>{seg.depCityName}</Text>
                      <Text style={styles.timelineSub}>{[seg.depAirportName, seg.depTerminal].filter(Boolean).join(" · ")}</Text>
                    </View>
                    <View style={styles.timelineColCenter}>
                      <Text style={styles.timelineLabel}>Duration</Text>
                      <Text style={styles.durationValue}>{seg.durationLabel}</Text>
                    </View>
                    <View style={[styles.timelineCol, { alignItems: "flex-end" }]}>
                      <Text style={styles.timelineLabel}>Arrival</Text>
                      <Text style={styles.timelineDate}>{formatDate(seg.arrDate)}</Text>
                      <Text style={styles.timelineBig}>{seg.arrTime}</Text>
                      <Text style={[styles.timelineSub, { textAlign: "right" }]}>{seg.arrCityName}</Text>
                      <Text style={[styles.timelineSub, { textAlign: "right" }]}>{[seg.arrAirportName, seg.arrTerminal].filter(Boolean).join(" · ")}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.operatedNote}>
                  Operated by {seg.airlineName}. Verify terminal &amp; baggage on airline website.
                </Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Fare Details</Text>
        </View>
        <View style={styles.fareTable}>
          <View style={styles.fareHeaderRow}>
            <Text style={styles.fareDescCol}>Description</Text>
            <Text style={styles.fareAmountCol}>Amount (Rs.)</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareDescVal}>Flight fare (incl. airline taxes &amp; fees)</Text>
            <Text style={styles.fareAmountVal}>{formatMoney(totalFlightAmt)}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareDescVal}>Service fee (excl. GST)</Text>
            <Text style={styles.fareAmountVal}>{formatMoney(serviceFeeExGst)}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareDescVal}>GST on service fee (agency)</Text>
            <Text style={styles.fareAmountVal}>{formatMoney(serviceFeeGst)}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareDescVal}>Convenience fee</Text>
            <Text style={styles.fareAmountVal}>{formatMoney(convenienceFee)}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareDescVal}>Discount / wallet</Text>
            <Text style={styles.fareAmountVal}>− {formatMoney(discount)}</Text>
          </View>
          <View style={styles.fareTotalRow}>
            <Text style={styles.fareDescCol}>Total paid</Text>
            <Text style={styles.fareAmountCol}>Rs. {formatMoney(totalPayableAmt)}</Text>
          </View>
        </View>

        <View style={styles.perforation} />
        <Text style={styles.perforationLabel}>✂ KEEP THIS SECTION FOR YOUR RECORDS ✂</Text>

        <View style={styles.notesBox}>
          <Text style={styles.notesHeading}>Important notes</Text>
          <View style={styles.notesBody}>
            <Text style={styles.noteItem}>• Date and time mentioned on the ticket are local to the respective airports.</Text>
            <Text style={styles.noteItem}>• Passenger names must match government-issued photo ID exactly.</Text>
            <Text style={styles.noteItem}>• Baggage and check-in rules are as per the operating airline.</Text>
            <Text style={styles.noteItem}>• Cancellation / modification charges depend on fare rules.</Text>
            <Text style={styles.noteItem}>• For support, contact {ISSUER.name} with your booking reference.</Text>
          </View>
        </View>

        <Text style={styles.footer}>Thank you for booking with {ISSUER.name}</Text>
      </View>
      </View>
      </Page>
    </Document>
  );
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
