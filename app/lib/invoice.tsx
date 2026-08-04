import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// Fixed issuer / letterhead details for the invoicing entity.
const ISSUER = {
  name: "KALPVRIKSHA HOLIDAYS PVT LTD",
  cin: "U52291RJ2025PTC109844",
  gstin: "08AAMCK4210B1ZY",
  address: "961, Mookim House, Pano Ka Dariba, Jaipur, Rajasthan, 302001",
  phone: "8769924784",
};

const ORANGE = "#c9184a";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a2e" },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  logo: { fontSize: 20, fontFamily: "Helvetica-BoldOblique", color: ORANGE },
  issuerName: { fontSize: 12, fontWeight: 700, color: ORANGE, textAlign: "right" },
  issuerLine: { fontSize: 8, color: "#555", textAlign: "right", marginTop: 2 },

  metaBar: { flexDirection: "row", borderWidth: 1, borderColor: "#ddd", marginBottom: 14 },
  metaCell: { flex: 1, padding: 8, borderRightWidth: 1, borderRightColor: "#ddd" },
  metaCellLast: { flex: 1, padding: 8 },
  metaLabel: { fontWeight: 700 },

  title: { fontSize: 14, fontWeight: 700, marginBottom: 10 },

  infoBox: { flexDirection: "row", borderWidth: 1, borderColor: "#ddd", marginBottom: 14 },
  infoCol: { flex: 1, padding: 10, borderRightWidth: 1, borderRightColor: "#ddd" },
  infoColLast: { flex: 1, padding: 10 },
  infoHeading: { fontSize: 8, fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 },
  infoBold: { fontWeight: 700, marginBottom: 2 },

  sectionHeader: { backgroundColor: "#fbe9e7", padding: 6, marginBottom: 8 },
  sectionHeaderText: { fontSize: 9, fontWeight: 700, color: ORANGE, textTransform: "uppercase", letterSpacing: 0.5 },

  table: { marginBottom: 10 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#f7f3ef", paddingVertical: 6, paddingHorizontal: 4, fontWeight: 700, borderBottomWidth: 1, borderBottomColor: "#eee" },
  tableRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  colSl: { width: 24 },
  colTicket: { flex: 1.4 },
  colSector: { flex: 1 },
  colPax: { flex: 1.6 },
  colType: { flex: 0.9 },
  colClass: { flex: 1 },
  colFareType: { flex: 1.1 },

  note: { fontSize: 8, color: "#666", marginBottom: 14 },
  noteLabel: { fontWeight: 700 },

  totalsBox: { alignSelf: "flex-end", width: 240, marginBottom: 20 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalLabel: { color: "#666" },
  grandTotalRow: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: 6,
    paddingHorizontal: 6, marginTop: 4, backgroundColor: "#fbe9e7",
  },
  grandTotalText: { fontWeight: 700 },

  footer: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#eee", borderTopStyle: "dashed", fontSize: 9, color: ORANGE, textAlign: "center", fontWeight: 700 },
});

export interface InvoiceTicketRow {
  ticketNo: string;
  sector: string;
  paxName: string;
  type: string;
}

export interface InvoiceProps {
  invoiceNo: string;
  invoiceDate: string;
  pnr: string;
  billToName: string;
  billToPhone: string | null;
  billToCompanyName: string | null;
  billToGst: string | null;
  travelClass: string | null;
  fareType: string | null;
  tickets: InvoiceTicketRow[];
  totalFlightAmt: number;
  serviceFeeExGst: number;
  serviceFeeGst: number;
  convenienceFee: number;
  discount: number;
  totalPayableAmt: number;
}

function formatMoney(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvoiceDocument(props: InvoiceProps) {
  const {
    invoiceNo, invoiceDate, pnr, billToName, billToPhone, billToCompanyName, billToGst,
    travelClass, fareType, tickets,
    totalFlightAmt, serviceFeeExGst, serviceFeeGst, convenienceFee, discount, totalPayableAmt,
  } = props;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
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

        <View style={styles.metaBar}>
          <View style={styles.metaCell}>
            <Text><Text style={styles.metaLabel}>Invoice No: </Text>{invoiceNo}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text><Text style={styles.metaLabel}>Invoice Date: </Text>{invoiceDate}</Text>
          </View>
          <View style={styles.metaCellLast}>
            <Text><Text style={styles.metaLabel}>PNR: </Text>{pnr}</Text>
          </View>
        </View>

        <Text style={styles.title}>TAX INVOICE</Text>

        <View style={styles.infoBox}>
          <View style={styles.infoCol}>
            <Text style={styles.infoHeading}>Supplier (Kalpvriksha Holidays)</Text>
            <Text style={styles.infoBold}>{ISSUER.name}</Text>
            <Text>{ISSUER.address}</Text>
            <Text>GSTIN: {ISSUER.gstin}  |  CIN: {ISSUER.cin}</Text>
          </View>
          <View style={styles.infoColLast}>
            <Text style={styles.infoHeading}>Bill To</Text>
            <Text style={styles.infoBold}>{billToName}</Text>
            <Text>Phone: {billToPhone || "—"}</Text>
            {billToGst && (
              <>
                {billToCompanyName && <Text>Company Name: {billToCompanyName}</Text>}
                <Text>GSTIN: {billToGst}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Flight Details</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colSl}>SL</Text>
            <Text style={styles.colTicket}>Ticket No.</Text>
            <Text style={styles.colSector}>Sector</Text>
            <Text style={styles.colPax}>Pax Name</Text>
            <Text style={styles.colType}>Type</Text>
            <Text style={styles.colClass}>Class</Text>
            <Text style={styles.colFareType}>Fare Type</Text>
          </View>
          {tickets.map((t, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colSl}>{i + 1}</Text>
              <Text style={styles.colTicket}>{t.ticketNo}</Text>
              <Text style={styles.colSector}>{t.sector}</Text>
              <Text style={styles.colPax}>{t.paxName}</Text>
              <Text style={styles.colType}>{t.type}</Text>
              <Text style={styles.colClass}>{travelClass || "-"}</Text>
              <Text style={styles.colFareType}>{fareType || "-"}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          <Text style={styles.noteLabel}>Note: </Text>Violation and refund policy as per airline fare rules.
        </Text>

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Flight fare (incl. taxes & fees)</Text>
            <Text>{formatMoney(totalFlightAmt)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Service fee (excl. GST)</Text>
            <Text>{formatMoney(serviceFeeExGst)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST on service fee</Text>
            <Text>{formatMoney(serviceFeeGst)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Convenience fee</Text>
            <Text>{formatMoney(convenienceFee)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Discount</Text>
            <Text>− {formatMoney(discount)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalText}>Net Amount Payable</Text>
            <Text style={styles.grandTotalText}>{formatMoney(totalPayableAmt)}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>GST Summary (Agency Service)</Text>
        </View>

        <Text style={styles.footer}>Thank you for your business — {ISSUER.name}</Text>
      </Page>
    </Document>
  );
}
