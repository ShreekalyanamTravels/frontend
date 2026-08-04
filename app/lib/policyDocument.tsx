import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const ISSUER = {
  name: "KALPVRIKSHA HOLIDAYS PVT LTD",
  cin: "U52291RJ2025PTC109844",
  gstin: "08AAMCK4210B1ZY",
  address: "961, Mookim House, Pano Ka Dariba, Jaipur, Rajasthan, 302001",
  phone: "8769924784",
};

const BLUE = "#154690";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a2e" },

  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  logo: { fontSize: 20, fontFamily: "Helvetica-BoldOblique", color: BLUE },
  issuerName: { fontSize: 12, fontWeight: 700, color: BLUE, textAlign: "right" },
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

  sectionHeader: { backgroundColor: "#e8eef7", padding: 6, marginBottom: 8 },
  sectionHeaderText: { fontSize: 9, fontWeight: 700, color: BLUE, textTransform: "uppercase", letterSpacing: 0.5 },

  table: { marginBottom: 10 },
  tableHeaderRow: { flexDirection: "row", backgroundColor: "#f7f3ef", paddingVertical: 6, paddingHorizontal: 4, fontWeight: 700, borderBottomWidth: 1, borderBottomColor: "#eee" },
  tableRow: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  colSl: { width: 24 },
  colName: { flex: 1.8 },
  colType: { flex: 0.9 },
  colDob: { flex: 1 },
  colPassport: { flex: 1.2 },
  colLead: { flex: 0.8 },

  note: { fontSize: 8, color: "#666", marginBottom: 14 },
  noteLabel: { fontWeight: 700 },

  totalsBox: { alignSelf: "flex-end", width: 240, marginBottom: 20 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalLabel: { color: "#666" },
  grandTotalRow: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: 6,
    paddingHorizontal: 6, marginTop: 4, backgroundColor: "#e8eef7",
  },
  grandTotalText: { fontWeight: 700 },

  footer: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#eee", borderTopStyle: "dashed", fontSize: 9, color: BLUE, textAlign: "center", fontWeight: 700 },
});

export interface PolicyTravellerRow {
  name: string;
  type: string;
  dob: string;
  passportNo: string;
  isLead: boolean;
}

export interface PolicyDocumentProps {
  policyNumber: string;
  issueDate: string;
  supplier: string;
  planName: string;
  coverageArea: string;
  policyStartDate: string;
  policyEndDate: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  travellers: PolicyTravellerRow[];
  premiumPerPax: number;
  gstPercent: number;
  totalPaid: number;
}

function formatMoney(n: number): string {
  return `Rs. ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function PolicyDocument(props: PolicyDocumentProps) {
  const {
    policyNumber, issueDate, supplier, planName, coverageArea, policyStartDate, policyEndDate,
    clientName, clientPhone, clientEmail, travellers, premiumPerPax, gstPercent, totalPaid,
  } = props;

  const baseTotal = premiumPerPax * Math.max(1, travellers.length);
  const gstAmt = totalPaid - baseTotal;

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
            <Text><Text style={styles.metaLabel}>Policy No: </Text>{policyNumber}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text><Text style={styles.metaLabel}>Issued On: </Text>{issueDate}</Text>
          </View>
          <View style={styles.metaCellLast}>
            <Text><Text style={styles.metaLabel}>Insurer: </Text>{supplier}</Text>
          </View>
        </View>

        <Text style={styles.title}>TRAVEL INSURANCE POLICY CERTIFICATE</Text>

        <View style={styles.infoBox}>
          <View style={styles.infoCol}>
            <Text style={styles.infoHeading}>Policy</Text>
            <Text style={styles.infoBold}>{planName}</Text>
            <Text>Coverage Area: {coverageArea}</Text>
            <Text>Travel Period: {policyStartDate} to {policyEndDate}</Text>
          </View>
          <View style={styles.infoColLast}>
            <Text style={styles.infoHeading}>Proposer</Text>
            <Text style={styles.infoBold}>{clientName}</Text>
            <Text>Phone: {clientPhone || "—"}</Text>
            <Text>Email: {clientEmail || "—"}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Insured Travellers</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.colSl}>SL</Text>
            <Text style={styles.colName}>Name</Text>
            <Text style={styles.colType}>Type</Text>
            <Text style={styles.colDob}>DOB</Text>
            <Text style={styles.colPassport}>Passport No.</Text>
            <Text style={styles.colLead}>Lead</Text>
          </View>
          {travellers.map((t, i) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.colSl}>{i + 1}</Text>
              <Text style={styles.colName}>{t.name}</Text>
              <Text style={styles.colType}>{t.type}</Text>
              <Text style={styles.colDob}>{t.dob || "-"}</Text>
              <Text style={styles.colPassport}>{t.passportNo || "-"}</Text>
              <Text style={styles.colLead}>{t.isLead ? "Yes" : "-"}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          <Text style={styles.noteLabel}>Note: </Text>This policy does not cover any pre-existing medical
          condition/injury/illness/deformity and complications arising from them, whether declared or undeclared.
        </Text>

        <View style={styles.totalsBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Base Premium</Text>
            <Text>{formatMoney(baseTotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>GST ({gstPercent}%)</Text>
            <Text>{formatMoney(gstAmt)}</Text>
          </View>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalText}>Total Premium Paid</Text>
            <Text style={styles.grandTotalText}>{formatMoney(totalPaid)}</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>Emergency Assistance</Text>
        </View>
        <Text style={styles.note}>
          India Toll-Free: 1800-XXX-XXXX  |  International: +91-XX-XXXX-XXXX  |  Claims: claims@kalyanam.in
        </Text>

        <Text style={styles.footer}>Thank you for insuring your journey with us — {ISSUER.name}</Text>
      </Page>
    </Document>
  );
}
