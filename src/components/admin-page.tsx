"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Check, CreditCard, Download, MapPinned, Search, Users, Wallet } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { loadDashboardData } from "@/lib/dashboard-data";
import { inviteOwner } from "@/app/auth-actions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type DashboardResult = NonNullable<Awaited<ReturnType<typeof loadDashboardData>>>;
type SuperadminData = Extract<DashboardResult, { role: "superadmin" }>;
type AdminPageKey = "overview" | "invitations" | "owners" | "owner-detail" | "plans" | "subscriptions" | "transactions" | "kiosks" | "users" | "logs" | "notifications" | "settings";
const titles: Record<AdminPageKey, string> = { overview: "Ringkasan platform", invitations: "Undangan", owners: "Owner", "owner-detail": "Detail Owner", plans: "Paket langganan", subscriptions: "Langganan", transactions: "Transaksi", kiosks: "Monitoring mesin", users: "Pengguna", logs: "Log aktivitas", notifications: "Notifikasi", settings: "Pengaturan sistem" };
const money = (amount: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(amount);
const date = (value: Date | null) => value?.toLocaleString("id-ID") ?? "-";

function Header({ page }: { page: AdminPageKey }) { return <h1 className="text-2xl font-semibold tracking-tight">{titles[page]}</h1>; }
function Status({ value }: { value: string }) { return <Badge variant="outline">{value}</Badge>; }
function SearchBox({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <div className="relative"><Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" /><Input aria-label="Cari data" className="pl-9" placeholder="Cari data..." value={value} onChange={(event) => onChange(event.target.value)} /></div>; }
function DataTable({ children, empty }: { children: React.ReactNode; empty: boolean }) { return <div className="rounded-xl border bg-card"><div className="overflow-x-auto"><Table>{children}</Table></div>{empty && <p className="px-6 py-12 text-center text-sm text-muted-foreground">Tidak ada data yang cocok.</p>}</div>; }

function Overview({ data }: { data: SuperadminData }) {
  const stats = [{ label: "Total Owner", value: data.owners.length, Icon: Users }, { label: "Kiosk online", value: data.kiosks.filter((item) => item.status === "online").length, Icon: MapPinned }, { label: "Langganan aktif", value: data.subscriptions.filter((item) => item.status === "active").length, Icon: CreditCard }, { label: "Pembayaran sukses", value: money(data.invoices.filter((item) => item.status === "settlement").reduce((sum, item) => sum + item.amount, 0)), Icon: Wallet }];
  return <div className="space-y-6"><Header page="overview" /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, Icon }) => <Card key={label}><CardHeader className="flex-row items-center justify-between pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle><Icon className="size-4 text-muted-foreground" /></CardHeader><CardContent className="text-2xl font-semibold tabular-nums">{value}</CardContent></Card>)}</div><Card><CardHeader><CardTitle>Perlu perhatian</CardTitle><CardDescription>Status dari data platform.</CardDescription></CardHeader><CardContent className="space-y-2 text-sm"><p>{data.invoices.filter((item) => item.status === "pending").length} invoice menunggu pembayaran</p><p>{data.kiosks.filter((item) => item.status === "offline").length} kiosk offline</p></CardContent></Card><div className="grid gap-3 sm:grid-cols-2">{[["Owner", "/admin/owner"], ["Mesin", "/admin/mesin"], ["Transaksi", "/admin/transaksi"], ["Log aktivitas", "/admin/log-aktivitas"]].map(([label, href]) => <Link key={href} href={href} className="rounded-lg border p-3 text-sm">{label}</Link>)}</div></div>;
}

function Owners({ data }: { data: SuperadminData }) {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("Semua");
  const rows = data.owners.filter((item) => `${item.businessName} ${item.city ?? ""}`.toLowerCase().includes(query.toLowerCase()) && (status === "Semua" || item.status === status.toLowerCase()));
  return <div className="space-y-5"><Header page="owners" /><InviteOwnerForm /><Card><CardHeader><CardTitle>Daftar workspace</CardTitle></CardHeader><CardContent className="space-y-4"><SearchBox value={query} onChange={setQuery} /><Select value={status} onValueChange={(value) => setStatus(value ?? "Semua")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Semua">Semua status</SelectItem><SelectItem value="Aktif">Aktif</SelectItem><SelectItem value="Ditangguhkan">Ditangguhkan</SelectItem></SelectContent></Select><DataTable empty={!rows.length}><TableHeader><TableRow><TableHead>Bisnis</TableHead><TableHead>Paket aktif</TableHead><TableHead>Mesin</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader><TableBody>{rows.map((owner) => { const sub = data.subscriptions.find((item) => item.ownerId === owner.id && item.status === "active"); return <TableRow key={owner.id}><TableCell><div className="flex items-center gap-3"><Avatar><AvatarFallback>{owner.businessName.slice(0, 2)}</AvatarFallback></Avatar><div><p className="font-medium">{owner.businessName}</p><p className="text-xs text-muted-foreground">{data.ownerProfiles.find((profile) => profile.id === owner.userId)?.email ?? ""} · {owner.city ?? "Lokasi tidak tersedia"}</p></div></div></TableCell><TableCell>{data.plans.find((item) => item.id === sub?.planId)?.name ?? "-"}</TableCell><TableCell>{data.kiosks.filter((item) => item.ownerId === owner.id).length}</TableCell><TableCell><Status value={owner.status} /></TableCell><TableCell><Link className="text-primary hover:underline" href={`/admin/owner/${owner.id}`}>Detail</Link></TableCell></TableRow>; })}</TableBody></DataTable></CardContent></Card></div>;
}

function InviteOwnerForm() {
  const router = useRouter();
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const result = await inviteOwner(new FormData(form));
    if (result.error) toast.error(result.error);
    else { toast.success(result.success); form.reset(); router.refresh(); }
  };
  return <form onSubmit={submit} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_auto]"><Input name="email" type="email" required placeholder="Email owner" aria-label="Email owner" /><Input name="fullName" required minLength={2} placeholder="Nama kontak" aria-label="Nama kontak" /><Input name="businessName" required minLength={2} placeholder="Nama bisnis" aria-label="Nama bisnis" /><Button type="submit" className="w-full sm:w-auto">Undang owner</Button></form>;
}

function OwnerDetail({ id, data }: { id: string; data: SuperadminData }) {
  const owner = data.owners.find((item) => item.id === id);
  if (!owner) return <div className="space-y-5"><Header page="owner-detail" /><p className="rounded-lg border p-6 text-center text-muted-foreground">Owner tidak ditemukan.</p></div>;
  const subscriptionRows = data.subscriptions.filter((item) => item.ownerId === owner.id);
  const kioskRows = data.kiosks.filter((item) => item.ownerId === owner.id);
  const transactions = data.transactions.filter((item) => item.ownerId === owner.id);
  return <div className="space-y-5"><Header page="owner-detail" /><Card><CardContent className="flex items-center gap-4 pt-6"><Avatar><AvatarFallback>{owner.businessName.slice(0, 2)}</AvatarFallback></Avatar><div className="flex-1"><h2 className="font-semibold">{owner.businessName}</h2><p className="text-sm text-muted-foreground">{data.ownerProfiles.find((profile) => profile.id === owner.userId)?.email ?? "Kontak tidak tersedia"} · {owner.city ?? "Lokasi tidak tersedia"}</p></div><Status value={owner.status} /></CardContent></Card><div className="grid gap-4 sm:grid-cols-3"><Card><CardHeader><CardTitle className="text-sm">Mesin</CardTitle></CardHeader><CardContent>{kioskRows.length}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Transaksi tercatat</CardTitle></CardHeader><CardContent>{money(transactions.reduce((sum, item) => sum + item.amount, 0))}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Langganan</CardTitle></CardHeader><CardContent>{subscriptionRows.length}</CardContent></Card></div><Card><CardHeader><CardTitle>Mesin workspace</CardTitle></CardHeader><CardContent>{kioskRows.map((item) => <p key={item.id} className="border-b py-2 text-sm">{item.name} · {item.status}</p>)}{!kioskRows.length && <p className="text-sm text-muted-foreground">Tidak ada mesin.</p>}</CardContent></Card></div>;
}

function Plans({ data }: { data: SuperadminData }) { return <div className="space-y-5"><Header page="plans" /><Button disabled title="Pengubahan paket belum didukung">Tambah paket</Button><DataTable empty={!data.plans.length}><TableHeader><TableRow><TableHead>Paket</TableHead><TableHead>Limit mesin</TableHead><TableHead>Kuota sesi</TableHead><TableHead>Harga bulanan</TableHead><TableHead>Add-on</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{data.plans.map((item) => <TableRow key={item.id}><TableCell>{item.name}</TableCell><TableCell>{item.machineLimit}</TableCell><TableCell>{item.includedSessions.toLocaleString("id-ID")}</TableCell><TableCell>{money(item.monthlyPriceIdr)}</TableCell><TableCell>{money(item.extraSessionPriceIdr ?? 0)}</TableCell><TableCell><Status value={item.isActive ? "Aktif" : "Nonaktif"} /></TableCell></TableRow>)}</TableBody></DataTable></div>; }

function Subscriptions({ data }: { data: SuperadminData }) { const [query, setQuery] = useState(""); const rows = data.subscriptions.filter((item) => `${item.ownerId} ${item.id}`.toLowerCase().includes(query.toLowerCase())); return <div className="space-y-5"><Header page="subscriptions" /><SearchBox value={query} onChange={setQuery} /><DataTable empty={!rows.length}><TableHeader><TableRow><TableHead>Owner</TableHead><TableHead>Paket</TableHead><TableHead>Status</TableHead><TableHead>Mulai</TableHead><TableHead>Berakhir</TableHead></TableRow></TableHeader><TableBody>{rows.map((item) => <TableRow key={item.id}><TableCell>{data.owners.find((owner) => owner.id === item.ownerId)?.businessName ?? item.ownerId}</TableCell><TableCell>{data.plans.find((plan) => plan.id === item.planId)?.name ?? "-"}</TableCell><TableCell><Status value={item.status} /></TableCell><TableCell>{date(item.startedAt)}</TableCell><TableCell>{date(item.expiresAt)}</TableCell></TableRow>)}</TableBody></DataTable></div>; }

function Transactions({ data }: { data: SuperadminData }) { const [query, setQuery] = useState(""); const rows = data.transactions.filter((item) => `${item.gatewayReference ?? ""} ${item.ownerId}`.toLowerCase().includes(query.toLowerCase())); const exportCsv = () => { const csv = ["Referensi,Owner,Jumlah,Metode,Status,Tanggal", ...rows.map((item) => [item.gatewayReference ?? item.id, data.owners.find((owner) => owner.id === item.ownerId)?.businessName ?? item.ownerId, item.amount, item.method, item.status, item.createdAt.toISOString()].map((value) => `"${value}"`).join(","))].join("\n"); const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "transaksi.csv"; anchor.click(); URL.revokeObjectURL(url); }; return <div className="space-y-5"><Header page="transactions" /><Button variant="outline" onClick={exportCsv}><Download /> Ekspor CSV</Button><SearchBox value={query} onChange={setQuery} /><DataTable empty={!rows.length}><TableHeader><TableRow><TableHead>Referensi</TableHead><TableHead>Owner</TableHead><TableHead>Jumlah</TableHead><TableHead>Metode</TableHead><TableHead>Status</TableHead><TableHead>Tanggal</TableHead></TableRow></TableHeader><TableBody>{rows.map((item) => <TableRow key={item.id}><TableCell>{item.gatewayReference ?? item.id}</TableCell><TableCell>{data.owners.find((owner) => owner.id === item.ownerId)?.businessName ?? item.ownerId}</TableCell><TableCell>{money(item.amount)}</TableCell><TableCell>{item.provider} · {item.method}</TableCell><TableCell><Status value={item.status} /></TableCell><TableCell>{date(item.createdAt)}</TableCell></TableRow>)}</TableBody></DataTable></div>; }

function Kiosks({ data }: { data: SuperadminData }) { const [query, setQuery] = useState(""); const rows = data.kiosks.filter((item) => `${item.name} ${item.location ?? ""}`.toLowerCase().includes(query.toLowerCase())); return <div className="space-y-5"><Header page="kiosks" /><SearchBox value={query} onChange={setQuery} /><DataTable empty={!rows.length}><TableHeader><TableRow><TableHead>Mesin dan lokasi</TableHead><TableHead>Owner</TableHead><TableHead>Status</TableHead><TableHead>Sesi hari ini</TableHead><TableHead>Heartbeat</TableHead></TableRow></TableHeader><TableBody>{rows.map((item) => <TableRow key={item.id}><TableCell>{item.name}<p className="text-xs text-muted-foreground">{item.location ?? "Lokasi tidak tersedia"}</p></TableCell><TableCell>{data.owners.find((owner) => owner.id === item.ownerId)?.businessName ?? item.ownerId}</TableCell><TableCell><Status value={item.status} /></TableCell><TableCell>{item.sessionsToday}</TableCell><TableCell>{date(item.lastPingAt)}</TableCell></TableRow>)}</TableBody></DataTable></div>; }

function UsersPage({ data }: { data: SuperadminData }) { const [query, setQuery] = useState(""); const rows = data.users.filter((item) => `${item.fullName} ${item.email}`.toLowerCase().includes(query.toLowerCase())); return <div className="space-y-5"><Header page="users" /><SearchBox value={query} onChange={setQuery} /><DataTable empty={!rows.length}><TableHeader><TableRow><TableHead>Pengguna</TableHead><TableHead>Peran</TableHead><TableHead>Workspace</TableHead><TableHead>Status</TableHead><TableHead>Login terakhir</TableHead></TableRow></TableHeader><TableBody>{rows.map((item) => <TableRow key={item.id}><TableCell>{item.fullName}<p className="text-xs text-muted-foreground">{item.email}</p></TableCell><TableCell>{item.role}</TableCell><TableCell>{data.owners.find((owner) => owner.id === item.ownerId)?.businessName ?? "-"}</TableCell><TableCell><Status value={item.status} /></TableCell><TableCell>{date(item.lastLoginAt)}</TableCell></TableRow>)}</TableBody></DataTable></div>; }

function Logs({ data }: { data: SuperadminData }) { const [query, setQuery] = useState(""); const rows = data.logs.filter((item) => item.action.toLowerCase().includes(query.toLowerCase())); return <div className="space-y-5"><Header page="logs" /><SearchBox value={query} onChange={setQuery} /><DataTable empty={!rows.length}><TableHeader><TableRow><TableHead>Waktu</TableHead><TableHead>Pelaku</TableHead><TableHead>Aksi</TableHead><TableHead>Owner</TableHead><TableHead>IP</TableHead></TableRow></TableHeader><TableBody>{rows.map((item) => <TableRow key={item.id}><TableCell>{date(item.createdAt)}</TableCell><TableCell>{data.users.find((user) => user.id === item.userId)?.email ?? "-"}</TableCell><TableCell><code>{item.action}</code></TableCell><TableCell>{data.owners.find((owner) => owner.id === item.ownerId)?.businessName ?? "-"}</TableCell><TableCell>{item.ipAddress ?? "-"}</TableCell></TableRow>)}</TableBody></DataTable></div>; }

function Notifications({ data }: { data: SuperadminData }) { return <div className="space-y-5"><Header page="notifications" /><Button disabled title="Pembaruan notifikasi belum didukung"><Check /> Tandai semua dibaca</Button>{data.notifications.map((item) => <Card key={item.id} className={!item.isRead ? "border-primary/40" : ""}><CardContent className="flex gap-3 pt-5"><Bell className="size-4" /><div><p className="font-medium">{item.title}</p><p className="text-sm text-muted-foreground">{item.message}</p><p className="mt-2 text-xs text-muted-foreground">{date(item.createdAt)}</p></div></CardContent></Card>)}</div>; }
function Invitations({ data }: { data: SuperadminData }) { const rows = data.invitations; return <div className="space-y-5"><Header page="invitations" /><InviteOwnerForm /><DataTable empty={!rows.length}><TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Bisnis</TableHead><TableHead>Status</TableHead><TableHead>Dibuat</TableHead><TableHead>Kedaluwarsa</TableHead></TableRow></TableHeader><TableBody>{rows.map((item: SuperadminData["invitations"][number]) => <TableRow key={item.id}><TableCell>{item.email}</TableCell><TableCell>{item.businessName ?? item.fullName}</TableCell><TableCell><Status value={item.status} /></TableCell><TableCell>{date(item.createdAt)}</TableCell><TableCell>{date(item.expiresAt)}</TableCell></TableRow>)}</TableBody></DataTable></div>; }
function Unsupported({ page }: { page: "settings" }) { return <div className="space-y-5"><Header page={page} /><p className="rounded-lg border p-5 text-sm text-muted-foreground">Pengaturan sistem belum memiliki persistence.</p></div>; }

export function AdminPage({ page, ownerId, data }: { page: AdminPageKey; ownerId?: string; data: SuperadminData }) {
  switch (page) {
    case "overview": return <Overview data={data} />;
    case "owners": return <Owners data={data} />;
    case "owner-detail": return <OwnerDetail id={ownerId ?? ""} data={data} />;
    case "plans": return <Plans data={data} />;
    case "subscriptions": return <Subscriptions data={data} />;
    case "transactions": return <Transactions data={data} />;
    case "kiosks": return <Kiosks data={data} />;
    case "users": return <UsersPage data={data} />;
    case "logs": return <Logs data={data} />;
    case "notifications": return <Notifications data={data} />;
    case "invitations": return <Invitations data={data} />;
    case "settings": return <Unsupported page="settings" />;
  }
}
