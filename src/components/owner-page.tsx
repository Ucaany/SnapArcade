"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Activity, Camera, Check, CreditCard, Download, Plus, Search, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { loadDashboardData } from "@/lib/dashboard-data";
import { generatePairingCode, markNotificationRead, savePaymentCredential, saveVoucher } from "@/app/crud-actions";
import { CameraCalibration } from "@/components/camera-calibration";
import { PrinterPanel } from "@/components/printer-panel";
import { useRouter } from "next/navigation";
import { SubscriptionPaymentButton } from "@/components/subscription-payment-button";

type Page = "overview" | "machines" | "machine-detail" | "sessions" | "transactions" | "vouchers" | "payment" | "customize" | "subscription" | "staff" | "notifications" | "settings";
type OwnerData = Extract<NonNullable<Awaited<ReturnType<typeof loadDashboardData>>>, { profile: unknown }>;
type Machine = OwnerData["kiosks"][number];

const formatMoney = (amount: number) => `Rp ${amount.toLocaleString("id-ID")}`;
const titles: Record<Page, { title: string; description: string }> = {
  overview: { title: "Ringkasan", description: "Ikhtisar pendapatan, sesi, dan kondisi mesin Anda." },
  machines: { title: "Manajemen mesin", description: "Pantau status kiosk dan kapasitas sesi setiap lokasi." },
  "machine-detail": { title: "Detail mesin", description: "Informasi perangkat." },
  sessions: { title: "Riwayat sesi", description: "Cari sesi foto, status pembayaran, dan detail pelanggan." },
  transactions: { title: "Transaksi & laporan", description: "Tinjau transaksi customer dan ekspor laporan." },
  vouchers: { title: "Manajemen voucher", description: "Lihat kode diskon, kuota, dan masa berlaku." },
  payment: { title: "Payment gateway", description: "Credential merchant." },
  customize: { title: "Kustomisasi kiosk", description: "Tampilan kiosk." },
  subscription: { title: "Langganan saya", description: "Paket aktif, kuota, dan riwayat invoice." },
  staff: { title: "Manajemen staff", description: "Daftar staff workspace." },
  notifications: { title: "Notifikasi", description: "Pemberitahuan operasional workspace Anda." },
  settings: { title: "Pengaturan akun", description: "Profil akun workspace." },
};

function Header({ page, action }: { page: Page; action?: React.ReactNode }) {
  return <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-semibold tracking-tight">{titles[page].title}</h1><p className="mt-1 text-sm text-muted-foreground">{titles[page].description}</p></div>{action}</div>;
}

function Status({ value }: { value: string }) {
  const good = ["online", "completed", "paid", "active", "settlement"].includes(value);
  const bad = ["offline", "failed", "expired", "cancelled"].includes(value);
  return <Badge variant="outline" className={good ? "border-emerald-200 bg-emerald-50 text-emerald-800" : bad ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"}>{value}</Badge>;
}

function SearchBox({ value, onChange, placeholder = "Cari data..." }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <div className="relative min-w-0 flex-1"><Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" /><Input aria-label="Cari data" className="pl-9" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} /></div>;
}

function Frame({ children, empty, columns }: { children: React.ReactNode; empty: boolean; columns: React.ReactNode }) {
  return <div className="rounded-xl border bg-card"><div className="overflow-x-auto"><Table><TableHeader>{columns}</TableHeader><TableBody>{children}</TableBody></Table></div>{empty && <p className="px-6 py-12 text-center text-sm text-muted-foreground">Tidak ada data.</p>}</div>;
}

function Overview({ data }: { data: OwnerData }) {
  const today = new Date();
  const paid = data.transactions.filter((transaction) => transaction.status === "settlement");
  const stats = [
    { title: "Pendapatan hari ini", value: formatMoney(paid.filter((item) => item.createdAt.toDateString() === today.toDateString()).reduce((sum, item) => sum + item.amount, 0)), icon: Wallet },
    { title: "Pendapatan bulan ini", value: formatMoney(paid.filter((item) => item.createdAt.getMonth() === today.getMonth() && item.createdAt.getFullYear() === today.getFullYear()).reduce((sum, item) => sum + item.amount, 0)), icon: CreditCard },
    { title: "Total sesi termuat", value: String(data.sessions.length), icon: Activity },
    { title: "Mesin online", value: `${data.kiosks.filter((item) => item.status === "online").length} / ${data.kiosks.length}`, icon: Camera },
  ];
  return <div className="space-y-6"><Header page="overview" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ title, value, icon: Icon }) => <Card key={title}><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle><Icon className="size-4 text-muted-foreground" /></CardHeader><CardContent><p className="text-2xl font-semibold tabular-nums">{value}</p></CardContent></Card>)}</div><Card><CardHeader><CardTitle>Mesin</CardTitle></CardHeader><CardContent><Frame empty={!data.kiosks.length} columns={<TableRow><TableHead>Nama</TableHead><TableHead>Lokasi</TableHead><TableHead>Status</TableHead><TableHead>Sesi hari ini</TableHead></TableRow>}>{data.kiosks.map((machine) => <TableRow key={machine.id}><TableCell>{machine.name}</TableCell><TableCell>{machine.location ?? "-"}</TableCell><TableCell><Status value={machine.status} /></TableCell><TableCell>{machine.sessionsToday}</TableCell></TableRow>)}</Frame></CardContent></Card></div>;
}

function Machines({ data, machineId }: { data: OwnerData; machineId?: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const rows = data.kiosks.filter((machine) => `${machine.name} ${machine.location ?? ""}`.toLowerCase().includes(query.toLowerCase()) && (filter === "all" || machine.status === filter));
  if (machineId) {
    const machine = data.kiosks.find((item) => item.id === machineId);
     return <div className="space-y-6"><Header page="machine-detail" />{machine ? <><Card><CardHeader><CardTitle>{machine.name}</CardTitle><CardDescription>{machine.location ?? "-"}</CardDescription></CardHeader><CardContent className="space-y-2"><p>Status: <Status value={machine.status} /></p><p>Sesi hari ini: {machine.sessionsToday} / {machine.sessionLimit}</p><p>Terakhir aktif: {machine.lastPingAt?.toLocaleString("id-ID") ?? "Belum ada ping"}</p></CardContent></Card><CameraCalibration kioskId={machine.id} currentSettings={machine.cameraSettings} canPersist kiosk={{ ownerId: machine.ownerId, name: machine.name, location: machine.location, sessionLimit: machine.sessionLimit, theme: machine.theme, printerSettings: machine.printerSettings }} /><PrinterPanel kioskId={machine.id} currentSettings={machine.printerSettings} canPersist kiosk={{ ownerId: machine.ownerId, name: machine.name, location: machine.location, sessionLimit: machine.sessionLimit, theme: machine.theme, cameraSettings: machine.cameraSettings }} /></> : <p>Mesin tidak ditemukan.</p>}</div>;
  }
  const pair = async (id: string) => { const result = await generatePairingCode(id); if (!result.ok) toast.error("Kode pairing gagal dibuat."); else toast.success(`Kode ${result.data?.pairingCode} berlaku 15 menit.`); };
  return <div className="space-y-6"><Header page="machines" action={<Button disabled title="Penambahan mesin belum tersedia"><Plus />Tambah mesin</Button>} /><Card><CardHeader><CardTitle>Semua mesin</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex flex-col gap-2 sm:flex-row"><SearchBox value={query} onChange={setQuery} /><Select value={filter} onValueChange={(value) => setFilter(value ?? "all")}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua status</SelectItem>{["online", "offline", "maintenance", "pairing"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><Frame empty={!rows.length} columns={<TableRow><TableHead>Nama mesin</TableHead><TableHead>Lokasi</TableHead><TableHead>Status</TableHead><TableHead>Sesi hari ini</TableHead><TableHead>Limit sesi</TableHead><TableHead /></TableRow>}>{rows.map((machine) => <TableRow key={machine.id}><TableCell>{machine.name}</TableCell><TableCell>{machine.location ?? "-"}</TableCell><TableCell><Status value={machine.status} /></TableCell><TableCell>{machine.sessionsToday}</TableCell><TableCell>{machine.sessionLimit}</TableCell><TableCell><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => void pair(machine.id)}>Pairing</Button><Button render={<Link href={`/dashboard/mesin/${machine.id}`} />} variant="ghost" size="sm">Detail</Button></div></TableCell></TableRow>)}</Frame></CardContent></Card></div>;
}

function Sessions({ data }: { data: OwnerData }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const machines = new Map(data.kiosks.map((machine) => [machine.id, machine.name]));
  const rows = data.sessions.filter((item) => `${item.id} ${item.customerName ?? ""} ${machines.get(item.kioskId) ?? ""}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || item.status === status));
  return <div className="space-y-6"><Header page="sessions" /><Card><CardHeader><CardTitle>Daftar sesi</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex gap-2"><SearchBox value={query} onChange={setQuery} placeholder="Cari ID, pelanggan, mesin..." /><Select value={status} onValueChange={(value) => setStatus(value ?? "all")}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua status</SelectItem>{["pending", "paid", "in_progress", "completed", "failed", "expired"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><Frame empty={!rows.length} columns={<TableRow><TableHead>ID sesi</TableHead><TableHead>Pelanggan / paket</TableHead><TableHead>Mesin</TableHead><TableHead>Status</TableHead><TableHead>Jumlah</TableHead><TableHead>Waktu</TableHead></TableRow>}>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-mono text-xs">{row.id}</TableCell><TableCell>{row.customerName ?? "Pelanggan"}<p className="text-xs text-muted-foreground">{row.packageName ?? `${row.photoCount} foto`}</p></TableCell><TableCell>{machines.get(row.kioskId) ?? "-"}</TableCell><TableCell><Status value={row.status} /></TableCell><TableCell>{formatMoney(row.amountPaid)}</TableCell><TableCell>{row.startedAt.toLocaleString("id-ID")}</TableCell></TableRow>)}</Frame></CardContent></Card></div>;
}

function Transactions({ data }: { data: OwnerData }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const sessions = new Map(data.sessions.map((item) => [item.id, item.customerName ?? "Pelanggan"]));
  const rows = data.transactions.map((item) => ({ ref: item.gatewayReference ?? item.gatewayTransactionId ?? item.id, customer: sessions.get(item.sessionId) ?? "Pelanggan", amount: item.amount, provider: `${item.provider} ${item.method}`, status: item.status, date: item.createdAt.toLocaleString("id-ID") })).filter((item) => `${item.ref} ${item.customer}`.toLowerCase().includes(query.toLowerCase()) && (filter === "all" || item.status === filter));
  const exportCsv = () => {
    const fields = ["ref", "customer", "amount", "provider", "status", "date"] as const;
    const csv = [fields.join(","), ...rows.map((row) => fields.map((field) => `"${String(row[field]).replaceAll('"', '""')}"`).join(","))].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "transaksi.csv"; anchor.click(); URL.revokeObjectURL(url);
  };
  return <div className="space-y-6"><Header page="transactions" action={<Button variant="outline" onClick={exportCsv}><Download />Export CSV</Button>} /><Card><CardHeader><CardTitle>Transaksi customer</CardTitle></CardHeader><CardContent className="space-y-4"><div className="flex flex-col gap-2 sm:flex-row"><SearchBox value={query} onChange={setQuery} /><Select value={filter} onValueChange={(value) => setFilter(value ?? "all")}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua status</SelectItem>{["settlement", "pending", "failed", "expired", "refunded"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><Frame empty={!rows.length} columns={<TableRow><TableHead>Referensi</TableHead><TableHead>Pelanggan</TableHead><TableHead>Jumlah</TableHead><TableHead>Gateway</TableHead><TableHead>Status</TableHead><TableHead>Waktu</TableHead></TableRow>}>{rows.map((row) => <TableRow key={row.ref}><TableCell>{row.ref}</TableCell><TableCell>{row.customer}</TableCell><TableCell>{formatMoney(row.amount)}</TableCell><TableCell>{row.provider}</TableCell><TableCell><Status value={row.status} /></TableCell><TableCell>{row.date}</TableCell></TableRow>)}</Frame></CardContent></Card></div>;
}

function Vouchers({ data }: { data: OwnerData }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const rows = data.vouchers.filter((item) => item.code.toLowerCase().includes(query.toLowerCase()));
  const addVoucher = async (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); const result = await saveVoucher(null, { code: String(values.get("code")).trim().toUpperCase(), type: values.get("type"), value: Number(values.get("value")), maxUses: Number(values.get("maxUses")), validUntil: values.get("validUntil") ? new Date(`${values.get("validUntil")}T23:59:59`) : null, isActive: true }); if (!result.ok) toast.error("Voucher gagal disimpan."); else { toast.success("Voucher disimpan."); form.reset(); router.refresh(); } };
  return <div className="space-y-6"><Header page="vouchers" /><form onSubmit={addVoucher} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-5"><Input name="code" required minLength={4} maxLength={50} placeholder="Kode" aria-label="Kode" /><Select name="type" defaultValue="percentage"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="percentage">Persentase</SelectItem><SelectItem value="fixed">Potongan tetap</SelectItem><SelectItem value="free_session">Sesi gratis</SelectItem></SelectContent></Select><Input name="value" type="number" min="0" required placeholder="Nilai" aria-label="Nilai" /><Input name="maxUses" type="number" min="0" required placeholder="Kuota" aria-label="Kuota" /><div className="flex gap-2"><Input name="validUntil" type="date" aria-label="Berlaku sampai" /><Button type="submit">Simpan</Button></div></form><Card><CardHeader><CardTitle>Daftar voucher</CardTitle></CardHeader><CardContent className="space-y-4"><SearchBox value={query} onChange={setQuery} placeholder="Cari kode voucher..." /><Frame empty={!rows.length} columns={<TableRow><TableHead>Kode</TableHead><TableHead>Tipe</TableHead><TableHead>Nilai</TableHead><TableHead>Pemakaian</TableHead><TableHead>Berlaku sampai</TableHead><TableHead>Status</TableHead></TableRow>}>{rows.map((item) => <TableRow key={item.id}><TableCell>{item.code}</TableCell><TableCell>{item.type}</TableCell><TableCell>{item.value}</TableCell><TableCell>{item.usedCount} / {item.maxUses}</TableCell><TableCell>{item.validUntil?.toLocaleDateString("id-ID") ?? "Tanpa batas"}</TableCell><TableCell><Status value={item.isActive ? "active" : "expired"} /></TableCell></TableRow>)}</Frame></CardContent></Card></div>;
}

function Subscription({ data }: { data: OwnerData }) {
  return <div className="space-y-6"><Header page="subscription" /><Card><CardHeader><CardTitle>Langganan</CardTitle></CardHeader><CardContent><Frame empty={!data.subscriptions.length} columns={<TableRow><TableHead>Status</TableHead><TableHead>Mesin</TableHead><TableHead>Kuota</TableHead><TableHead>Terpakai</TableHead><TableHead>Berakhir</TableHead><TableHead /></TableRow>}>{data.subscriptions.map((item) => <TableRow key={item.id}><TableCell><Status value={item.status} /></TableCell><TableCell>{item.machinesCount}</TableCell><TableCell>{item.includedSessions + item.addOnSessions}</TableCell><TableCell>{item.sessionsUsed}</TableCell><TableCell>{item.expiresAt?.toLocaleDateString("id-ID") ?? "-"}</TableCell><TableCell><SubscriptionPaymentButton subscriptionId={item.id} /></TableCell></TableRow>)}</Frame></CardContent></Card><Card><CardHeader><CardTitle>Invoice</CardTitle></CardHeader><CardContent><Frame empty={!data.invoices.length} columns={<TableRow><TableHead>Nomor invoice</TableHead><TableHead>Tanggal</TableHead><TableHead>Jumlah</TableHead><TableHead>Status</TableHead><TableHead /></TableRow>}>{data.invoices.map((item) => <TableRow key={item.id}><TableCell>{item.invoiceNumber}</TableCell><TableCell>{item.createdAt.toLocaleDateString("id-ID")}</TableCell><TableCell>{formatMoney(item.amount)}</TableCell><TableCell><Status value={item.status} /></TableCell><TableCell>{item.pakasirPaymentUrl && item.status === "pending" && <Link className="text-sm text-primary hover:underline" href={`/dashboard/langganan/bayar/${item.id}`}>Lanjut bayar</Link>}</TableCell></TableRow>)}</Frame></CardContent></Card></div>;
}

function Notifications({ data }: { data: OwnerData }) {
  const [read, setRead] = useState<string[]>([]);
  const unread = data.notifications.filter((item) => !item.isRead && !read.includes(item.id));
  const markRead = async (id: string) => {
    const result = await markNotificationRead(id);
    if (!result.ok) toast.error("Notifikasi gagal diperbarui.");
    else setRead((current) => [...current, id]);
  };
  return <div className="space-y-6"><Header page="notifications" action={<Button variant="outline" disabled={!unread.length} onClick={() => void Promise.all(unread.map((item) => markRead(item.id)))}><Check />Tandai semua dibaca</Button>} /><div className="space-y-3">{data.notifications.map((item) => { const isRead = item.isRead || read.includes(item.id); return <Card key={item.id}><CardContent className="flex flex-col gap-3 pt-5 sm:flex-row"><span className={`mt-1 size-2 shrink-0 rounded-full ${isRead ? "bg-muted" : "bg-primary"}`} /><div className="min-w-0 flex-1"><p className="font-medium">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.message}</p><p className="mt-2 text-xs text-muted-foreground">{item.createdAt.toLocaleString("id-ID")}</p></div>{item.link && <Link href={item.link} className="text-sm text-primary hover:underline">Buka terkait</Link>}{!isRead && <Button variant="ghost" size="sm" onClick={() => void markRead(item.id)}>Tandai dibaca</Button>}</CardContent></Card>; })}{!data.notifications.length && <p className="py-10 text-center text-sm text-muted-foreground">Belum ada notifikasi.</p>}</div></div>;
}

function Settings({ data }: { data: OwnerData }) {
  return <div className="space-y-6"><Header page="settings" /><Card><CardHeader><CardTitle>Profil akun</CardTitle><CardDescription>Data profil dari workspace.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Nama<Input value={data.profile?.fullName ?? ""} readOnly /></label><label className="grid gap-2 text-sm font-medium">Email<Input value={data.profile?.email ?? ""} readOnly /></label><p className="text-sm text-muted-foreground sm:col-span-2">Pengubahan profil belum tersedia.</p></CardContent></Card></div>;
}

function Payment({ data }: { data: OwnerData }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setPending(true);
    const form = event.currentTarget; const values = new FormData(form); const provider = String(values.get("provider")) as "midtrans" | "xendit" | "tripay";
    const config = Object.fromEntries([...values.entries()].filter(([key]) => key.startsWith("secret_")).map(([key, value]) => [key.slice(7), String(value)]));
    const result = await savePaymentCredential(null, { provider, label: `${provider} ${values.get("environment")}`, config, isActive: true, isSandbox: values.get("environment") === "sandbox" });
    setPending(false);
    if (!result.ok) toast.error("Credential gagal disimpan."); else { toast.success("Credential terenkripsi dan disimpan."); form.reset(); router.refresh(); }
  };
  return <div className="space-y-6"><Header page="payment" /><form onSubmit={submit} className="max-w-xl space-y-4 rounded-xl border bg-card p-5"><label className="grid gap-2 text-sm font-medium">Provider<Select name="provider" defaultValue="midtrans"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="midtrans">Midtrans</SelectItem><SelectItem value="xendit">Xendit</SelectItem><SelectItem value="tripay">Tripay</SelectItem></SelectContent></Select></label><label className="grid gap-2 text-sm font-medium">Environment<Select name="environment" defaultValue="sandbox"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sandbox">Sandbox</SelectItem><SelectItem value="production">Production</SelectItem></SelectContent></Select></label><label className="grid gap-2 text-sm font-medium">API secret<Input name="secret_apiKey" type="password" required autoComplete="new-password" /></label><Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Simpan credential terenkripsi"}</Button><div><h2 className="mb-2 font-medium">Credential tersimpan</h2>{data.credentials.map((item) => <p key={item.id} className="text-sm text-muted-foreground">{item.provider} · {item.label} · {item.isSandbox ? "Sandbox" : "Production"}</p>)}{!data.credentials.length && <p className="text-sm text-muted-foreground">Belum ada credential.</p>}</div></form></div>;
}

export function OwnerPage({ page, machineId, data }: { page: Page; machineId?: string; data: OwnerData }) {
  return useMemo(() => {
    switch (page) {
      case "overview": return <Overview data={data} />;
      case "machines": return <Machines data={data} />;
      case "machine-detail": return <Machines data={data} machineId={machineId} />;
      case "sessions": return <Sessions data={data} />;
      case "transactions": return <Transactions data={data} />;
      case "vouchers": return <Vouchers data={data} />;
      case "payment": return <Payment data={data} />;
      case "subscription": return <Subscription data={data} />;
      case "notifications": return <Notifications data={data} />;
      case "settings": return <Settings data={data} />;
      default: return <div className="space-y-6"><Header page={page} /><p className="text-sm text-muted-foreground">Fitur belum tersedia.</p></div>;
    }
  }, [page, machineId, data]);
}
