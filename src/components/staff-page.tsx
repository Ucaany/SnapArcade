"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Bell, Camera, Check, CircleHelp, Printer, RefreshCw, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { markNotificationRead } from "@/app/crud-actions";
import { toast } from "sonner";
import { CameraCalibration } from "@/components/camera-calibration";
import { PrinterPanel } from "@/components/printer-panel";
import type { PrinterSettings } from "@/lib/printer-settings";

type StaffPageKey = "overview" | "machine" | "sessions" | "hardware" | "notifications";
export type StaffData = {
  kiosks: { id: string; name: string; location: string | null; status: string; cameraSettings: { iso: number; shutterSpeed: string; aperture: string; resolution: string; whiteBalance: string; focusMode: "auto" | "manual" } | null; printerSettings: PrinterSettings | null; deviceInfo: { cameraConnected: boolean; printerConnected: boolean } | null; lastPingAt: Date | null }[];
  sessions: { id: string; kioskId: string; packageName: string | null; photoCount: number; status: string; startedAt: Date }[];
  notifications: { id: string; kioskId: string | null; title: string; message: string; createdAt: Date; isRead: boolean }[];
};

const dateTime = (value: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value));
const pingTime = (value: Date | null) => value ? `${Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))} menit lalu` : "belum pernah";
const sessionStatus: Record<string, string> = { completed: "Selesai", in_progress: "Berlangsung", failed: "Gagal", pending: "Menunggu", paid: "Dibayar", expired: "Kedaluwarsa" };

function Status({ value }: { value: string }) {
  const colors: Record<string, string> = { online: "border-emerald-200 bg-emerald-50 text-emerald-800", offline: "border-red-200 bg-red-50 text-red-800", maintenance: "border-amber-200 bg-amber-50 text-amber-900", pairing: "border-blue-200 bg-blue-50 text-blue-900", Terhubung: "border-emerald-200 bg-emerald-50 text-emerald-800", "Tidak terhubung": "border-red-200 bg-red-50 text-red-800", Selesai: "border-emerald-200 bg-emerald-50 text-emerald-800", Berlangsung: "border-blue-200 bg-blue-50 text-blue-900", Gagal: "border-red-200 bg-red-50 text-red-800" };
  const labels: Record<string, string> = { online: "Online", offline: "Offline", maintenance: "Pemeliharaan", pairing: "Menunggu pairing" };
  return <Badge variant="outline" className={colors[value] ?? ""}>{labels[value] ?? value}</Badge>;
}

function Header({ page, title, description, action }: { page: StaffPageKey; title?: string; description?: string; action?: React.ReactNode }) {
  const content: Record<StaffPageKey, { title: string; description: string }> = {
    overview: { title: "Ringkasan operasional", description: "Kiosk yang ditugaskan dan kondisi yang perlu ditangani." },
    machine: { title: title ?? "Detail kiosk", description: description ?? "Status perangkat dan tindakan pemeliharaan." },
    sessions: { title: "Riwayat sesi lokal", description: "Sesi yang tercatat pada kiosk dalam penugasan Anda." },
    hardware: { title: "Diagnostik hardware", description: "Status kamera dan printer pada kiosk yang ditugaskan." },
    notifications: { title: "Notifikasi staff", description: "Pemberitahuan untuk kiosk dalam penugasan Anda." },
  };
  return <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-semibold tracking-tight">{content[page].title}</h1><p className="mt-1 text-sm text-muted-foreground">{content[page].description}</p></div>{action}</div>;
}

function DataNotice() {
  return <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-950"><CircleHelp className="mt-0.5 size-4 shrink-0" /><span>Data perangkat berasal dari status tersimpan. Kontrol hardware belum tersedia.</span></div>;
}

function TableFrame({ children, empty }: { children: React.ReactNode; empty: boolean }) {
  return <div className="rounded-xl border bg-card"><div className="relative w-full overflow-x-auto">{children}</div>{empty && <p className="px-6 py-12 text-center text-sm text-muted-foreground">Tidak ada data yang cocok.</p>}</div>;
}

function Overview({ machines }: { machines: StaffData["kiosks"] }) {
  const alerts = machines.filter((machine) => machine.status !== "online" || !machine.deviceInfo?.cameraConnected || !machine.deviceInfo?.printerConnected);
  return <div className="space-y-6"><Header page="overview" /><section aria-label="Kiosk ditugaskan" className="space-y-3"><div className="flex items-center gap-2"><Camera className="size-4" /><h2 className="font-semibold">Kiosk yang ditugaskan</h2></div>{machines.length ? <div className="space-y-3">{machines.map((machine) => <Card key={machine.id}><CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{machine.name}</h3><Status value={machine.status} /></div><p className="mt-1 text-sm text-muted-foreground">{machine.location || "Lokasi tidak dicantumkan"} · heartbeat {pingTime(machine.lastPingAt)}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"><span className="inline-flex items-center gap-2"><Camera className="size-4" />Kamera <Status value={machine.deviceInfo?.cameraConnected ? "Terhubung" : "Tidak terhubung"} /></span><span className="inline-flex items-center gap-2"><Printer className="size-4" />Printer <Status value={machine.deviceInfo?.printerConnected ? "Terhubung" : "Tidak terhubung"} /></span></div></div><Button render={<Link href={`/staff/mesin/${machine.id}`} />} variant="outline">Periksa kiosk</Button></CardContent></Card>)}</div> : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Belum ada kiosk yang ditugaskan.</CardContent></Card>}</section><section className="space-y-3"><div className="flex items-center gap-2"><AlertTriangle className="size-4 text-amber-700" /><h2 className="font-semibold">Perlu ditangani</h2></div>{alerts.length ? <div className="divide-y rounded-lg border bg-card">{alerts.map((machine) => <div key={machine.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="font-medium">{machine.name}</p><p className="text-sm text-muted-foreground">Kiosk {machine.status}; kamera {machine.deviceInfo?.cameraConnected ? "terhubung" : "tidak terhubung"}, printer {machine.deviceInfo?.printerConnected ? "terhubung" : "tidak terhubung"}.</p></div><Link className="text-sm font-medium underline underline-offset-4" href={`/staff/mesin/${machine.id}`}>Buka detail</Link></div>)}</div> : <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Semua kiosk beroperasi normal.</CardContent></Card>}</section></div>;
}

function MachineDetail({ id, data }: { id: string; data: StaffData }) {
  const machine = data.kiosks.find((item) => item.id === id);
  if (!machine) return <div className="space-y-6"><Header page="machine" /><Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Kiosk tidak ditemukan atau tidak ditugaskan kepada Anda.</CardContent></Card></div>;
  return <div className="space-y-6"><Header page="machine" title={machine.name} description={`${machine.location || "Lokasi tidak dicantumkan"} · heartbeat ${pingTime(machine.lastPingAt)}`} action={<Status value={machine.status} />} /><DataNotice /><div className="grid gap-4 md:grid-cols-2">{[{ label: "Kamera", value: machine.deviceInfo?.cameraConnected ? "Terhubung" : "Tidak terhubung", icon: Camera, detail: "Status koneksi terakhir tersimpan" }, { label: "Printer", value: machine.deviceInfo?.printerConnected ? "Terhubung" : "Tidak terhubung", icon: Printer, detail: "Status koneksi terakhir tersimpan" }].map(({ label, value, icon: Icon, detail }) => <Card key={label}><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="text-base">{label}</CardTitle><CardDescription>{detail}</CardDescription></div><Icon className="size-5 text-muted-foreground" /></CardHeader><CardContent><Status value={value} /></CardContent></Card>)}</div><CameraCalibration kioskId={machine.id} currentSettings={machine.cameraSettings} compact /><Card><CardHeader><CardTitle>Tindakan kiosk</CardTitle><CardDescription>Kontrol jarak jauh belum didukung.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3"><Button disabled><Printer />Test print</Button><Button variant="outline" disabled><RefreshCw />Restart kiosk</Button><Button variant="outline" disabled><RefreshCw />Segarkan status</Button></CardContent></Card></div>;
}

function Sessions({ data }: { data: StaffData }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const kiosks = new Map(data.kiosks.map((item) => [item.id, item.name]));
  const rows = data.sessions.filter((session) => `${session.id} ${kiosks.get(session.kioskId) ?? ""}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || sessionStatus[session.status] === status));
  return <div className="space-y-6"><Header page="sessions" /><Card><CardHeader><CardTitle>Sesi kiosk ditugaskan</CardTitle><CardDescription>Sesi pada kiosk dalam penugasan Anda.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 flex-1"><Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" /><Input aria-label="Cari sesi" className="pl-9" placeholder="Cari ID sesi atau kiosk..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><Select value={status} onValueChange={(value) => setStatus(value ?? "all")}><SelectTrigger className="w-full sm:w-44" aria-label="Filter status sesi"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua status</SelectItem>{Object.values(sessionStatus).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><TableFrame empty={!rows.length}><table className="w-full caption-bottom text-sm"><TableHeader><TableRow><TableHead>ID sesi</TableHead><TableHead>Kiosk</TableHead><TableHead>Paket</TableHead><TableHead>Status</TableHead><TableHead>Waktu</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-mono text-xs">{row.id}</TableCell><TableCell>{kiosks.get(row.kioskId)}</TableCell><TableCell>{row.packageName ?? `${row.photoCount} foto`}</TableCell><TableCell><Status value={sessionStatus[row.status] ?? row.status} /></TableCell><TableCell>{dateTime(row.startedAt)}</TableCell></TableRow>)}</TableBody></table></TableFrame></CardContent></Card></div>;
}

function Hardware({ machines }: { machines: StaffData["kiosks"] }) {
  return <div className="space-y-6"><Header page="hardware" /><DataNotice /><div className="grid gap-4">{machines.map((machine) => <CameraCalibration key={machine.id} kioskId={machine.id} currentSettings={machine.cameraSettings} compact />)}</div>{!machines.length && <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Belum ada kiosk yang ditugaskan.</CardContent></Card>}</div>;
}

function Notifications({ data }: { data: StaffData }) {
  const [read, setRead] = useState<string[]>([]);
  const notices = data.notifications;
  const markRead = async (id: string) => { const result = await markNotificationRead(id); if (!result.ok) toast.error("Notifikasi gagal diperbarui."); else setRead((current) => [...current, id]); };
  const unread = notices.filter((notice) => !notice.isRead && !read.includes(notice.id));
  return <div className="space-y-6"><Header page="notifications" action={<Button variant="outline" disabled={!unread.length} onClick={() => void Promise.all(unread.map((notice) => markRead(notice.id)))}><Check />Tandai semua dibaca</Button>} /><div className="space-y-3">{notices.length ? notices.map((notice) => { const isRead = notice.isRead || read.includes(notice.id); return <Card key={notice.id}><CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-start"><span aria-label={isRead ? "Sudah dibaca" : "Belum dibaca"} className={`mt-1 size-2 shrink-0 rounded-full ${isRead ? "bg-muted" : "bg-primary"}`} /><div className="min-w-0 flex-1"><p className="font-medium">{notice.title}</p><p className="mt-1 text-sm text-muted-foreground">{notice.message}</p><p className="mt-2 text-xs text-muted-foreground">{dateTime(notice.createdAt)}</p></div><div className="flex flex-wrap gap-2">{notice.kioskId && data.kiosks.some((machine) => machine.id === notice.kioskId) && <Button render={<Link href={`/staff/mesin/${notice.kioskId}`} />} variant="ghost" size="sm"><Bell />Buka kiosk</Button>}{!isRead && <Button variant="outline" size="sm" onClick={() => void markRead(notice.id)}>Tandai dibaca</Button>}</div></CardContent></Card>; }) : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Belum ada notifikasi.</CardContent></Card>}</div></div>;
}

export function StaffPage({ page, machineId, data }: { page: StaffPageKey; machineId?: string; data: StaffData }) {
  switch (page) {
    case "overview": return <Overview machines={data.kiosks} />;
    case "machine": return <MachineDetail id={machineId ?? ""} data={data} />;
    case "sessions": return <Sessions data={data} />;
    case "hardware": return <Hardware machines={data.kiosks} />;
    case "notifications": return <Notifications data={data} />;
  }
}
