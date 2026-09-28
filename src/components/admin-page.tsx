"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Activity, ArrowDownRight, ArrowUpRight, Bell, Check, ChevronRight, CircleHelp, CreditCard, Download, Ellipsis, MailPlus, MapPinned, Package, Plus, Search, Settings2, ShieldCheck, Users, Wallet } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminInvitations, adminKiosks, adminLogs, adminNotifications, adminOwners, adminPlans, adminSubscriptions, adminTransactions, adminUsers, formatRupiah } from "@/lib/admin-data";

type AdminPageKey = "overview" | "invitations" | "owners" | "owner-detail" | "plans" | "subscriptions" | "transactions" | "kiosks" | "users" | "logs" | "notifications" | "settings";

const titles: Record<AdminPageKey, { title: string; description: string }> = {
  overview: { title: "Ringkasan platform", description: "Pantau kondisi layanan dan aktivitas seluruh workspace." },
  invitations: { title: "Undangan", description: "Kelola akses Owner dan Staff melalui undangan terverifikasi." },
  owners: { title: "Owner", description: "Kelola workspace, paket, dan status akun Owner." },
  "owner-detail": { title: "Detail Owner", description: "Profil bisnis, langganan, mesin, dan transaksi workspace." },
  plans: { title: "Paket langganan", description: "Atur batas mesin, kuota sesi, dan harga paket platform." },
  subscriptions: { title: "Langganan", description: "Pantau periode, paket, dan status invoice Owner." },
  transactions: { title: "Transaksi", description: "Rekap pembayaran langganan dan agregat transaksi kiosk." },
  kiosks: { title: "Monitoring mesin", description: "Status koneksi kiosk lintas workspace dan lokasi." },
  users: { title: "Pengguna", description: "Daftar akun Owner, Staff, dan Superadmin platform." },
  logs: { title: "Log aktivitas", description: "Jejak audit untuk perubahan dan aktivitas sensitif." },
  notifications: { title: "Notifikasi", description: "Pemberitahuan operasional lintas workspace." },
  settings: { title: "Pengaturan sistem", description: "Preferensi umum dan kebijakan akses platform." },
};

const chartData = Array.from({ length: 30 }, (_, index) => ({
  day: `${index + 1} Sep`,
  revenue: Math.round(3.1 + Math.sin(index / 3.8) * 0.9 + Math.cos(index / 5) * 0.6 + (index > 21 ? 0.7 : 0)),
  owners: Math.round(3 + index * 0.12 + Math.sin(index / 4) * 0.5),
}));

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "border-emerald-200 bg-emerald-50 text-emerald-700",
    online: "border-emerald-200 bg-emerald-50 text-emerald-700",
    settlement: "border-emerald-200 bg-emerald-50 text-emerald-700",
    accepted: "border-emerald-200 bg-emerald-50 text-emerald-700",
    pending: "border-amber-200 bg-amber-50 text-amber-800",
    pairing: "border-amber-200 bg-amber-50 text-amber-800",
    expired: "border-slate-200 bg-slate-100 text-slate-700",
    suspended: "border-red-200 bg-red-50 text-red-700",
    offline: "border-red-200 bg-red-50 text-red-700",
    failed: "border-red-200 bg-red-50 text-red-700",
    maintenance: "border-blue-200 bg-blue-50 text-blue-700",
  };
  const labels: Record<string, string> = { active: "Aktif", online: "Online", settlement: "Berhasil", accepted: "Diterima", pending: "Menunggu", pairing: "Pairing", expired: "Kedaluwarsa", suspended: "Ditangguhkan", offline: "Offline", failed: "Gagal", maintenance: "Maintenance" };
  return <Badge variant="outline" className={styles[status] ?? ""}>{labels[status] ?? status}</Badge>;
}

function PageHeader({ page, action }: { page: AdminPageKey; action?: React.ReactNode }) {
  return <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-semibold tracking-tight">{titles[page].title}</h1><p className="mt-1 text-sm text-muted-foreground">{titles[page].description}</p></div>{action}</div>;
}

function DemoNotice() {
  return <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900"><CircleHelp className="mt-0.5 size-4 shrink-0" /><span>Data simulasi untuk pratinjau UI. Bukan metrik produksi dan tidak tersimpan ke server.</span></div>;
}

function SearchFilter({ search, onSearch, filter, onFilter, options }: { search: string; onSearch: (value: string) => void; filter: string; onFilter: (value: string) => void; options: string[] }) {
  return <div className="flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 flex-1"><Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" /><Input aria-label="Cari data" className="pl-9" placeholder="Cari data..." value={search} onChange={(event) => onSearch(event.target.value)} /></div><Select value={filter} onValueChange={(value) => onFilter(value ?? "Semua")}><SelectTrigger className="w-full sm:w-44" aria-label="Filter status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Semua">Semua status</SelectItem>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select></div>;
}

function TableFrame({ children, empty }: { children: React.ReactNode; empty: boolean }) {
  return <div className="rounded-xl border bg-card"><div className="overflow-x-auto"><Table>{children}</Table></div>{empty && <div className="px-6 py-12 text-center"><p className="font-medium">Tidak ada data yang cocok</p><p className="mt-1 text-sm text-muted-foreground">Ubah pencarian atau filter untuk melihat hasil lain.</p></div>}</div>;
}

function InvitationDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [business, setBusiness] = useState("");
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.includes("@") || !business.trim()) return;
    toast.success(`Simulasi undangan untuk ${email}`);
    setOpen(false);
    setEmail("");
    setBusiness("");
  };
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button><MailPlus />Buat undangan</Button>} /><DialogContent><DialogHeader><DialogTitle>Undang Owner baru</DialogTitle><DialogDescription>Pratinjau formulir undangan. Data belum dikirim ke email.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-4"><label className="grid gap-2 text-sm font-medium">Email bisnis<Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@bisnis.id" /></label><label className="grid gap-2 text-sm font-medium">Nama bisnis<Input required value={business} onChange={(event) => setBusiness(event.target.value)} placeholder="Studio Foto Ceria" /></label><DialogFooter><Button type="submit">Buat undangan simulasi</Button></DialogFooter></form></DialogContent></Dialog>;
}

function PlanDialog({ plan }: { plan?: (typeof adminPlans)[number] }) {
  const [open, setOpen] = useState(false);
  const submit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); toast.success("Perubahan paket dicatat sebagai simulasi."); setOpen(false); };
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={plan ? <Button variant="ghost" size="icon" aria-label={`Edit paket ${plan.name}`}><Ellipsis /></Button> : <Button><Plus />Tambah paket</Button>} /><DialogContent><DialogHeader><DialogTitle>{plan ? `Edit paket ${plan.name}` : "Tambah paket"}</DialogTitle><DialogDescription>Formulir hanya menampilkan alur UI simulasi.</DialogDescription></DialogHeader><form onSubmit={submit} className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Nama paket<Input required defaultValue={plan?.name} placeholder="Nama paket" /></label><label className="grid gap-2 text-sm font-medium">Limit mesin<Input type="number" required min="1" defaultValue={plan?.machines} /></label><label className="grid gap-2 text-sm font-medium">Kuota sesi bulanan<Input type="number" required min="0" defaultValue={plan?.sessions} /></label><label className="grid gap-2 text-sm font-medium">Harga per bulan<Input type="number" required min="0" defaultValue={plan?.price} /></label><label className="grid gap-2 text-sm font-medium sm:col-span-2">Harga add-on sesi<Input type="number" required min="0" defaultValue={plan?.addon} /></label><DialogFooter className="sm:col-span-2"><Button type="submit">Simpan simulasi</Button></DialogFooter></form></DialogContent></Dialog>;
}

function Overview() {
  const stats = [
    { label: "Total Owner", value: "24", detail: "+3 bulan ini", icon: Users, trend: "up" },
    { label: "Kiosk aktif", value: "86 / 104", detail: "82,7% terhubung", icon: MapPinned, trend: "up" },
    { label: "Langganan berjalan", value: "21", detail: "2 perlu ditinjau", icon: CreditCard, trend: "down" },
    { label: "Revenue platform", value: "Rp 38,4 jt", detail: "Periode September", icon: Wallet, trend: "up" },
  ];
  return <div className="space-y-6"><PageHeader page="overview" action={<Button variant="outline" onClick={() => toast.message("Rentang laporan: September 2026")}>September 2026</Button>} /><DemoNotice /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, detail, icon: Icon, trend }) => <Card key={label}><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle><Icon className="size-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums">{value}</div><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">{trend === "up" ? <ArrowUpRight className="size-3 text-emerald-600" /> : <ArrowDownRight className="size-3 text-amber-600" />}{detail}</p></CardContent></Card>)}</div><Card><CardHeader className="flex-row flex-wrap items-start justify-between gap-3"><div><CardTitle>Aktivitas platform</CardTitle><CardDescription>Perkembangan pendapatan langganan dan Owner baru.</CardDescription></div><div className="flex gap-4 text-xs"><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-primary" />Pendapatan (juta)</span><span className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-500" />Owner baru</span></div></CardHeader><CardContent><div className="h-64 min-h-64 w-full" role="img" aria-label="Grafik simulasi aktivitas platform selama 30 hari"><ResponsiveContainer width="100%" height={256} minWidth={0}><AreaChart data={chartData} margin={{ left: -16, right: 8, top: 8 }}><defs><linearGradient id="adminRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} /><stop offset="100%" stopColor="var(--primary)" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="day" tickLine={false} axisLine={false} interval={4} tick={{ fontSize: 11 }} /><YAxis yAxisId="revenue" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} /><YAxis yAxisId="owners" orientation="right" hide /><Tooltip formatter={(value, name) => [name === "revenue" ? `${value} jt` : value, name === "revenue" ? "Pendapatan" : "Owner baru"]} /><Area yAxisId="revenue" type="monotone" dataKey="revenue" stroke="var(--primary)" fill="url(#adminRevenue)" strokeWidth={2} /><Area yAxisId="owners" type="monotone" dataKey="owners" stroke="#10b981" fill="transparent" strokeWidth={2} /></AreaChart></ResponsiveContainer></div></CardContent></Card><div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]"><Card><CardHeader><CardTitle>Owner terbaru</CardTitle><CardDescription>Workspace dengan aktivitas terbaru.</CardDescription></CardHeader><CardContent className="space-y-4">{adminOwners.slice(0, 4).map((owner) => <Link key={owner.id} href={`/admin/owner/${owner.id}`} className="flex min-h-12 items-center justify-between gap-3 rounded-md hover:bg-muted/50"><div className="min-w-0"><p className="truncate text-sm font-medium">{owner.name}</p><p className="text-xs text-muted-foreground">{owner.city} · Paket {owner.plan}</p></div><ChevronRight className="size-4 shrink-0 text-muted-foreground" /></Link>)}</CardContent></Card><Card><CardHeader><CardTitle>Perlu perhatian</CardTitle><CardDescription>Isu operasional lintas platform.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex gap-3"><span className="mt-0.5 size-2 rounded-full bg-red-500" /><div className="text-sm"><p className="font-medium">Kiosk offline</p><p className="text-muted-foreground">3 mesin perlu diperiksa</p></div></div><div className="flex gap-3"><span className="mt-0.5 size-2 rounded-full bg-amber-500" /><div className="text-sm"><p className="font-medium">Invoice tertunda</p><p className="text-muted-foreground">2 pembayaran menunggu konfirmasi</p></div></div><Link className="inline-block pt-1 text-sm font-medium text-primary underline-offset-4 hover:underline" href="/admin/notifikasi">Lihat notifikasi</Link></CardContent></Card></div></div>;
}

function Invitations() {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("Semua");
  const rows = adminInvitations.filter((row) => `${row.email} ${row.business}`.toLowerCase().includes(query.toLowerCase()) && (status === "Semua" || row.status === status.toLowerCase()));
  return <div className="space-y-6"><PageHeader page="invitations" action={<InvitationDialog />} /><DemoNotice /><Card><CardHeader><CardTitle>Riwayat undangan</CardTitle><CardDescription>Undangan Owner dan Staff. Masa berlaku token mengikuti kebijakan 7 hari.</CardDescription></CardHeader><CardContent className="space-y-4"><SearchFilter search={query} onSearch={setQuery} filter={status} onFilter={setStatus} options={["Menunggu", "Diterima", "Kedaluwarsa"]} /><TableFrame empty={!rows.length}><TableHeader><TableRow><TableHead>Email dan bisnis</TableHead><TableHead>Peran</TableHead><TableHead>Status</TableHead><TableHead>Dikirim</TableHead><TableHead>Kedaluwarsa</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.email}><TableCell><p className="font-medium">{row.email}</p><p className="text-xs text-muted-foreground">{row.business}</p></TableCell><TableCell>{row.role}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell>{row.sent}</TableCell><TableCell>{row.expires}</TableCell><TableCell><Button variant="ghost" size="sm" onClick={() => toast.success(`Tautan simulasi disalin untuk ${row.email}`)}>Salin tautan</Button></TableCell></TableRow>)}</TableBody></TableFrame></CardContent></Card></div>;
}

function Owners() {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("Semua");
  const rows = adminOwners.filter((row) => `${row.name} ${row.email} ${row.city}`.toLowerCase().includes(query.toLowerCase()) && (status === "Semua" || row.status === status.toLowerCase()));
  return <div className="space-y-6"><PageHeader page="owners" action={<InvitationDialog />} /><DemoNotice /><Card><CardHeader><CardTitle>Daftar workspace</CardTitle><CardDescription>Ringkasan akun Owner dan performa bisnis pada data contoh.</CardDescription></CardHeader><CardContent className="space-y-4"><SearchFilter search={query} onSearch={setQuery} filter={status} onFilter={setStatus} options={["Aktif", "Ditangguhkan"]} /><TableFrame empty={!rows.length}><TableHeader><TableRow><TableHead>Bisnis</TableHead><TableHead>Paket</TableHead><TableHead>Mesin</TableHead><TableHead>Transaksi kiosk*</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>{rows.map((owner) => <TableRow key={owner.id}><TableCell><div className="flex items-center gap-3"><Avatar><AvatarFallback>{owner.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</AvatarFallback></Avatar><div><p className="font-medium">{owner.name}</p><p className="text-xs text-muted-foreground">{owner.contact} · {owner.city}</p></div></div></TableCell><TableCell>{owner.plan}</TableCell><TableCell>{owner.machines}</TableCell><TableCell>{formatRupiah(owner.revenue)}</TableCell><TableCell><StatusBadge status={owner.status} /></TableCell><TableCell><Link href={`/admin/owner/${owner.id}`} className="text-sm font-medium text-primary hover:underline">Detail</Link></TableCell></TableRow>)}</TableBody></TableFrame><p className="text-xs text-muted-foreground">* Agregat simulasi, bukan revenue platform.</p></CardContent></Card></div>;
}

function OwnerDetail({ id }: { id: string }) {
  const owner = adminOwners.find((item) => item.id === id) ?? adminOwners[0];
  return <div className="space-y-6"><PageHeader page="owner-detail" action={<Button variant="outline" onClick={() => toast.message("Status akun ditampilkan sebagai data simulasi.")}>Kelola akun</Button>} /><DemoNotice /><Card><CardContent className="flex flex-col gap-5 pt-6 sm:flex-row sm:items-center"><Avatar className="size-14"><AvatarFallback className="text-lg">{owner.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><h2 className="text-xl font-semibold">{owner.name}</h2><p className="text-sm text-muted-foreground">{owner.contact} · {owner.email}</p><p className="mt-1 text-sm text-muted-foreground">{owner.city}, Indonesia</p></div><StatusBadge status={owner.status} /></CardContent></Card><div className="grid gap-4 sm:grid-cols-3"><Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Paket aktif</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{owner.plan}</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Mesin terdaftar</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{owner.machines}</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Agregat transaksi kiosk</CardTitle></CardHeader><CardContent className="text-xl font-semibold tabular-nums">{formatRupiah(owner.revenue)}</CardContent></Card></div><Tabs defaultValue="subscriptions" className="gap-4"><TabsList className="w-full justify-start overflow-x-auto"><TabsTrigger value="subscriptions">Riwayat langganan</TabsTrigger><TabsTrigger value="transactions">Transaksi</TabsTrigger><TabsTrigger value="machines">Mesin</TabsTrigger></TabsList><TabsContent value="subscriptions"><Card><CardHeader><CardTitle>Riwayat langganan</CardTitle></CardHeader><CardContent><TableFrame empty={false}><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Paket</TableHead><TableHead>Jumlah</TableHead><TableHead>Status</TableHead><TableHead>Berakhir</TableHead></TableRow></TableHeader><TableBody>{adminSubscriptions.filter((row) => row.owner === owner.name).map((row) => <TableRow key={row.invoice}><TableCell>{row.invoice}</TableCell><TableCell>{row.plan}</TableCell><TableCell>{formatRupiah(row.amount)}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell>{row.expires}</TableCell></TableRow>)}</TableBody></TableFrame>{!adminSubscriptions.some((row) => row.owner === owner.name) && <p className="py-6 text-center text-sm text-muted-foreground">Belum ada riwayat langganan.</p>}</CardContent></Card></TabsContent><TabsContent value="transactions"><Card><CardHeader><CardTitle>Riwayat transaksi</CardTitle><CardDescription>Invoice Pakasir dan agregat kiosk.</CardDescription></CardHeader><CardContent><TableFrame empty={!adminTransactions.some((row) => row.owner === owner.name)}><TableHeader><TableRow><TableHead>Referensi</TableHead><TableHead>Jenis</TableHead><TableHead>Jumlah</TableHead><TableHead>Status</TableHead><TableHead>Tanggal</TableHead></TableRow></TableHeader><TableBody>{adminTransactions.filter((row) => row.owner === owner.name).map((row) => <TableRow key={row.invoice}><TableCell>{row.invoice}</TableCell><TableCell>{row.type}</TableCell><TableCell>{formatRupiah(row.amount)}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell>{row.date}</TableCell></TableRow>)}</TableBody></TableFrame></CardContent></Card></TabsContent><TabsContent value="machines"><div className="grid gap-3 sm:grid-cols-2">{adminKiosks.filter((kiosk) => kiosk.owner === owner.name).map((kiosk) => <Card key={kiosk.name}><CardHeader><CardTitle className="text-sm">{kiosk.name}</CardTitle><CardDescription>{kiosk.city}</CardDescription></CardHeader><CardContent className="flex items-center justify-between"><span>{kiosk.sessions} sesi hari ini</span><StatusBadge status={kiosk.status} /></CardContent></Card>)}</div></TabsContent></Tabs></div>;
}

function Plans() {
  return <div className="space-y-6"><PageHeader page="plans" action={<PlanDialog />} /><DemoNotice /><Card><CardHeader><CardTitle>Daftar paket</CardTitle><CardDescription>Harga dan batas layanan sesuai contoh paket pada PRD.</CardDescription></CardHeader><CardContent><TableFrame empty={false}><TableHeader><TableRow><TableHead>Nama paket</TableHead><TableHead>Limit mesin</TableHead><TableHead>Kuota sesi</TableHead><TableHead>Harga bulanan</TableHead><TableHead>Add-on / 500 sesi</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>{adminPlans.map((plan) => <TableRow key={plan.name}><TableCell className="font-medium">{plan.name}</TableCell><TableCell>{plan.machines}</TableCell><TableCell>{plan.sessions.toLocaleString("id-ID")}</TableCell><TableCell>{formatRupiah(plan.price)}</TableCell><TableCell>{formatRupiah(plan.addon)}</TableCell><TableCell><StatusBadge status="active" /></TableCell><TableCell><PlanDialog plan={plan} /></TableCell></TableRow>)}</TableBody></TableFrame></CardContent></Card></div>;
}

function Subscriptions() {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("Semua");
  const rows = adminSubscriptions.filter((row) => `${row.owner} ${row.invoice}`.toLowerCase().includes(query.toLowerCase()) && (status === "Semua" || row.status === status.toLowerCase()));
  return <div className="space-y-6"><PageHeader page="subscriptions" /><DemoNotice /><Card><CardHeader><CardTitle>Subscription Owner</CardTitle><CardDescription>Termasuk status periode dan referensi invoice Pakasir.</CardDescription></CardHeader><CardContent className="space-y-4"><SearchFilter search={query} onSearch={setQuery} filter={status} onFilter={setStatus} options={["Aktif", "Menunggu", "Kedaluwarsa"]} /><TableFrame empty={!rows.length}><TableHeader><TableRow><TableHead>Owner</TableHead><TableHead>Paket</TableHead><TableHead>Invoice terakhir</TableHead><TableHead>Jumlah</TableHead><TableHead>Status</TableHead><TableHead>Masa aktif sampai</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.invoice}><TableCell className="font-medium">{row.owner}</TableCell><TableCell>{row.plan}</TableCell><TableCell>{row.invoice}</TableCell><TableCell>{formatRupiah(row.amount)}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell>{row.expires}</TableCell></TableRow>)}</TableBody></TableFrame></CardContent></Card></div>;
}

function Transactions() {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("Semua");
  const rows = adminTransactions.filter((row) => `${row.owner} ${row.invoice}`.toLowerCase().includes(query.toLowerCase()) && (status === "Semua" || row.status === status.toLowerCase()));
  const exportCsv = () => { const csv = ["Referensi,Owner,Jenis,Jumlah,Metode,Status,Tanggal", ...rows.map((row) => [row.invoice, row.owner, row.type, row.amount, row.method, row.status, row.date].map((cell) => `"${cell}"`).join(","))].join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "transaksi-simulasi.csv"; anchor.click(); URL.revokeObjectURL(url); };
  return <div className="space-y-6"><PageHeader page="transactions" action={<Button variant="outline" onClick={exportCsv}><Download />Ekspor CSV</Button>} /><DemoNotice /><Card><CardHeader><CardTitle>Transaksi global</CardTitle><CardDescription>Langganan Pakasir dan angka agregat dari gateway milik Owner.</CardDescription></CardHeader><CardContent className="space-y-4"><SearchFilter search={query} onSearch={setQuery} filter={status} onFilter={setStatus} options={["Berhasil", "Menunggu", "Gagal"]} /><TableFrame empty={!rows.length}><TableHeader><TableRow><TableHead>Referensi</TableHead><TableHead>Owner / jenis</TableHead><TableHead>Jumlah</TableHead><TableHead>Metode</TableHead><TableHead>Status</TableHead><TableHead>Tanggal</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.invoice}><TableCell className="font-medium">{row.invoice}</TableCell><TableCell><p>{row.owner}</p><p className="text-xs text-muted-foreground">{row.type}</p></TableCell><TableCell>{formatRupiah(row.amount)}</TableCell><TableCell>{row.method}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell>{row.date}</TableCell></TableRow>)}</TableBody></TableFrame></CardContent></Card></div>;
}

function Kiosks() {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("Semua");
  const rows = adminKiosks.filter((row) => `${row.name} ${row.owner} ${row.city}`.toLowerCase().includes(query.toLowerCase()) && (status === "Semua" || row.status === status.toLowerCase()));
  return <div className="space-y-6"><PageHeader page="kiosks" action={<Button variant="outline" onClick={() => toast.message("Penyegaran status simulasi selesai.")}><Activity />Segarkan status</Button>} /><DemoNotice /><div className="grid gap-4 sm:grid-cols-3"><Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Online</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">68</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Offline</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">11</CardContent></Card><Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Maintenance</CardTitle></CardHeader><CardContent className="text-2xl font-semibold">7</CardContent></Card></div><Card><CardHeader><CardTitle>Lokasi kiosk</CardTitle><CardDescription>Peta visual belum terhubung; daftar mencakup lokasi dan ping terakhir simulasi.</CardDescription></CardHeader><CardContent className="space-y-4"><SearchFilter search={query} onSearch={setQuery} filter={status} onFilter={setStatus} options={["Online", "Offline", "Maintenance"]} /><TableFrame empty={!rows.length}><TableHeader><TableRow><TableHead>Mesin dan lokasi</TableHead><TableHead>Owner</TableHead><TableHead>Status</TableHead><TableHead>Sesi hari ini</TableHead><TableHead>Heartbeat</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.name}><TableCell><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.city}</p></TableCell><TableCell>{row.owner}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell>{row.sessions}</TableCell><TableCell>{row.ping}</TableCell></TableRow>)}</TableBody></TableFrame></CardContent></Card></div>;
}

function UsersPage() {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("Semua");
  const rows = adminUsers.filter((row) => `${row.name} ${row.email} ${row.business}`.toLowerCase().includes(query.toLowerCase()) && (status === "Semua" || row.role === status));
  return <div className="space-y-6"><PageHeader page="users" /><DemoNotice /><Card><CardHeader><CardTitle>Akun platform</CardTitle><CardDescription>Akses berbasis peran untuk Superadmin, Owner, dan Staff.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" /><Input aria-label="Cari pengguna" className="pl-9" placeholder="Cari nama atau email..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><Select value={status} onValueChange={(value) => setStatus(value ?? "Semua")}><SelectTrigger className="w-full sm:w-44" aria-label="Filter peran"><SelectValue /></SelectTrigger><SelectContent>{["Semua", "Owner", "Staff", "Superadmin"].map((role) => <SelectItem key={role} value={role}>{role === "Semua" ? "Semua peran" : role}</SelectItem>)}</SelectContent></Select></div><TableFrame empty={!rows.length}><TableHeader><TableRow><TableHead>Pengguna</TableHead><TableHead>Peran</TableHead><TableHead>Workspace</TableHead><TableHead>Status</TableHead><TableHead>Login terakhir</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.email}><TableCell><p className="font-medium">{row.name}</p><p className="text-xs text-muted-foreground">{row.email}</p></TableCell><TableCell>{row.role}</TableCell><TableCell>{row.business}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell>{row.login}</TableCell></TableRow>)}</TableBody></TableFrame></CardContent></Card></div>;
}

function Logs() {
  const [query, setQuery] = useState(""); const rows = adminLogs.filter((row) => `${row.actor} ${row.action} ${row.target}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-6"><PageHeader page="logs" action={<Button variant="outline" onClick={() => toast.message("Rentang audit: 30 hari terakhir")}>30 hari terakhir</Button>} /><DemoNotice /><Card><CardHeader><CardTitle>Aktivitas sensitif</CardTitle><CardDescription>Log audit simulasi menampilkan pelaku, aksi, target, dan IP.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="relative"><Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" /><Input aria-label="Cari log" className="pl-9" placeholder="Cari aksi atau target..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><TableFrame empty={!rows.length}><TableHeader><TableRow><TableHead>Waktu</TableHead><TableHead>Pelaku</TableHead><TableHead>Aksi</TableHead><TableHead>Target</TableHead><TableHead>Alamat IP</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={`${row.action}${row.date}`}><TableCell>{row.date}</TableCell><TableCell>{row.actor}</TableCell><TableCell><code className="text-xs">{row.action}</code></TableCell><TableCell>{row.target}</TableCell><TableCell>{row.ip}</TableCell></TableRow>)}</TableBody></TableFrame></CardContent></Card></div>;
}

function Notifications() {
  const [read, setRead] = useState<string[]>([]);
  return <div className="space-y-6"><PageHeader page="notifications" action={<Button variant="outline" onClick={() => setRead(adminNotifications.map((item) => item.title))}><Check />Tandai semua dibaca</Button>} /><DemoNotice /><div className="space-y-3">{adminNotifications.map((item) => <Card key={item.title} className={item.unread && !read.includes(item.title) ? "border-primary/40" : ""}><CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-start"><span className={`mt-1 size-2 shrink-0 rounded-full ${item.unread && !read.includes(item.title) ? "bg-primary" : "bg-muted"}`} /><div className="min-w-0 flex-1"><p className="font-medium">{item.title}</p><p className="mt-1 text-sm text-muted-foreground">{item.detail}</p><p className="mt-2 text-xs text-muted-foreground">{item.time}</p></div>{item.unread && !read.includes(item.title) && <Button variant="ghost" size="sm" onClick={() => setRead((current) => [...current, item.title])}>Tandai dibaca</Button>}</CardContent></Card>)}</div></div>;
}

function SettingsPage() {
  const [saved, setSaved] = useState(false);
  return <div className="space-y-6"><PageHeader page="settings" /><DemoNotice /><form onSubmit={(event) => { event.preventDefault(); setSaved(true); toast.success("Preferensi simulasi disimpan pada tampilan ini."); }} className="grid gap-6 lg:grid-cols-[1fr_20rem]"><div className="space-y-6"><Card><CardHeader><CardTitle>Profil platform</CardTitle><CardDescription>Identitas dasar yang ditampilkan pada dashboard.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Nama platform<Input defaultValue="SnapArcade" /></label><label className="grid gap-2 text-sm font-medium">Email dukungan<Input type="email" defaultValue="support@snaparcade.id" /></label><label className="grid gap-2 text-sm font-medium sm:col-span-2">Zona waktu<Select defaultValue="Asia/Jakarta"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Asia/Jakarta">WIB · Asia/Jakarta</SelectItem><SelectItem value="Asia/Makassar">WITA · Asia/Makassar</SelectItem><SelectItem value="Asia/Jayapura">WIT · Asia/Jayapura</SelectItem></SelectContent></Select></label></CardContent></Card><Card><CardHeader><CardTitle>Kebijakan undangan</CardTitle><CardDescription>Nilai berikut berasal dari spesifikasi PRD.</CardDescription></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Masa berlaku undangan (hari)<Input type="number" min="1" defaultValue="7" /></label><label className="grid gap-2 text-sm font-medium">Masa berlaku sesi kiosk (menit)<Input type="number" min="1" defaultValue="5" /></label></CardContent></Card><Button type="submit"><Settings2 />Simpan pengaturan</Button>{saved && <p className="text-sm text-emerald-700">Preferensi simulasi berhasil disimpan.</p>}</div><Card className="h-fit"><CardHeader><CardTitle>Status layanan</CardTitle><CardDescription>Panel status pratinjau.</CardDescription></CardHeader><CardContent className="space-y-4 text-sm"><div className="flex items-center justify-between"><span>Supabase</span><Badge variant="outline">Belum terhubung</Badge></div><div className="flex items-center justify-between"><span>Pakasir</span><Badge variant="outline">Belum terhubung</Badge></div><div className="flex items-center justify-between"><span>Mode data</span><Badge variant="outline">Simulasi</Badge></div></CardContent></Card></form></div>;
}

export function AdminPage({ page, ownerId }: { page: AdminPageKey; ownerId?: string }) {
  const component = useMemo(() => {
    switch (page) {
      case "overview": return <Overview />;
      case "invitations": return <Invitations />;
      case "owners": return <Owners />;
      case "owner-detail": return <OwnerDetail id={ownerId ?? ""} />;
      case "plans": return <Plans />;
      case "subscriptions": return <Subscriptions />;
      case "transactions": return <Transactions />;
      case "kiosks": return <Kiosks />;
      case "users": return <UsersPage />;
      case "logs": return <Logs />;
      case "notifications": return <Notifications />;
      case "settings": return <SettingsPage />;
    }
  }, [page, ownerId]);
  return component;
}
