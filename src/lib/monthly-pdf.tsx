import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";

const styles = StyleSheet.create({ page: { padding: 32, fontSize: 10 }, title: { fontSize: 18, marginBottom: 16 }, row: { flexDirection: "row", borderBottom: "1px solid #ddd", paddingVertical: 6 }, cell: { flex: 1 }, muted: { color: "#555" } });
const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

export async function monthlyPdf(label: string, transactions: { id: string; gatewayReference: string | null; amount: number; createdAt: Date; status: string }[], sessionCount: number) {
  const settled = transactions.filter((row) => row.status === "settlement");
  return renderToBuffer(<Document><Page size="A4" style={styles.page}><Text style={styles.title}>Laporan bulanan SnapArcade, {label}</Text><Text style={styles.muted}>Pendapatan settlement: {money(settled.reduce((sum, row) => sum + row.amount, 0))}</Text><Text style={styles.muted}>Total transaksi: {transactions.length} | Total sesi: {sessionCount}</Text><View style={{ marginTop: 20 }}>{settled.slice(0, 100).map((row) => <View style={styles.row} key={row.id}><Text style={styles.cell}>{row.gatewayReference ?? row.id.slice(0, 8)}</Text><Text style={styles.cell}>{money(row.amount)}</Text><Text style={styles.cell}>{row.createdAt.toLocaleDateString("id-ID")}</Text></View>)}</View></Page></Document>);
}
