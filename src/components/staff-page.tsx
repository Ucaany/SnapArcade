"use client";

import Link from "next/link";
import { useState } from "react";
import { Activity, AlertTriangle, Bell, Camera, Check, CircleHelp, Printer, RefreshCw, RotateCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type StaffPageKey = "overview" | "machine" | "sessions" | "hardware" | "notifications";

const machines = [
  { id: "wedding-andini-bagas", name: "Kiosk Wedding Andini & Bagas", location: "Bandung", status: "online", camera: "Terhubung", printer: "Perlu diperiksa", ping: "1 menit lalu" },
  { id: "cfd-sudirman", name: "Kiosk CFD Sudirman Minggu Pagi", location: "Jakarta Selatan", status: "offline", camera: "Tidak terhubung", printer: "Tidak terhubung", ping: "42 menit lalu" },
];
const sessions = [
  { id: "SES-0928-024", machine: machines[0].name, package: "2 Strip, 8 Foto", status: "Selesai", time: "28 Sep 2026, 14:32 WIB" },
  { id: "SES-0928-023", machine: machines[0].name, package: "1 Strip, 4 Foto", status: "Berlangsung", time: "28 Sep 2026, 14:16 WIB" },
  { id: "SES-0928-022", machine: machines[1].name, package: "2 Strip, 8 Foto", status: "Gagal", time: "28 Sep 2026, 12:48 WIB" },
];
const notices = [
  { title: "Printer perlu diperiksa", detail: "Kiosk Wedding Andini & Bagas · koneksi printer tidak stabil.", time: "28 Sep 2026, 14:20 WIB", machine: machines[0].id },
  { title: "Kiosk tidak terhubung", detail: "Kiosk CFD Sudirman Minggu Pagi · heartbeat terakhir 42 menit lalu.", time: "28 Sep 2026, 13:30 WIB", machine: machines[1].id },
];

function Status({ value }: { value: string }) {
  const colors: Record<string, string> = { online: "border-emerald-200 bg-emerald-50 text-emerald-800", offline: "border-red-200 bg-red-50 text-red-800", Terhubung: "border-emerald-200 bg-emerald-50 text-emerald-800", "Perlu diperiksa": "border-amber-200 bg-amber-50 text-amber-900", "Tidak terhubung": "border-red-200 bg-red-50 text-red-800", "Simulasi terdeteksi": "border-blue-200 bg-blue-50 text-blue-900", Selesai: "border-emerald-200 bg-emerald-50 text-emerald-800", Berlangsung: "border-blue-200 bg-blue-50 text-blue-900", Gagal: "border-red-200 bg-red-50 text-red-800" };
  const labels: Record<string, string> = { online: "Online", offline: "Offline" };
  return <Badge variant="outline" className={colors[value] ?? ""}>{labels[value] ?? value}</Badge>;
}

function Header({ page, title, description, action }: { page: StaffPageKey; title?: string; description?: string; action?: React.ReactNode }) {
  const content: Record<StaffPageKey, { title: string; description: string }> = {
    overview: { title: "Ringkasan operasional", description: "Kiosk yang ditugaskan dan kondisi yang perlu ditangani." },
    machine: { title: title ?? "Detail kiosk", description: description ?? "Status perangkat dan tindakan pemeliharaan." },
    sessions: { title: "Riwayat sesi lokal", description: "Sesi yang tercatat pada kiosk dalam penugasan Anda." },
    hardware: { title: "Diagnostik hardware", description: "Panel pratinjau deteksi kamera dan printer USB." },
    notifications: { title: "Notifikasi staff", description: "Pemberitahuan hanya untuk kiosk dalam penugasan Anda." },
  };
  return <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-semibold tracking-tight">{content[page].title}</h1><p className="mt-1 text-sm text-muted-foreground">{content[page].description}</p></div>{action}</div>;
}

function DemoNotice() {
  return <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-950"><CircleHelp className="mt-0.5 size-4 shrink-0" /><span>Data dan tindakan merupakan simulasi pratinjau. Tidak ada perangkat yang diakses atau diubah.</span></div>;
}

function TableFrame({ children, empty }: { children: React.ReactNode; empty: boolean }) {
  return <div className="rounded-xl border bg-card"><div className="overflow-x-auto"><Table>{children}</Table></div>{empty && <p className="px-6 py-12 text-center text-sm text-muted-foreground">Tidak ada data yang cocok.</p>}</div>;
}

function Overview() {
  const alerts = machines.filter((machine) => machine.status !== "online" || machine.camera !== "Terhubung" || machine.printer !== "Terhubung");
  return <div className="space-y-6"><Header page="overview" /><DemoNotice /><section aria-label="Kiosk ditugaskan" className="space-y-3"><div className="flex items-center gap-2"><Camera className="size-4" /><h2 className="font-semibold">Kiosk yang ditugaskan</h2></div>{machines.length ? <div className="space-y-3">{machines.map((machine) => <Card key={machine.id}><CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium">{machine.name}</h3><Status value={machine.status} /></div><p className="mt-1 text-sm text-muted-foreground">{machine.location} · heartbeat {machine.ping}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm"><span className="inline-flex items-center gap-2"><Camera className="size-4" />Kamera <Status value={machine.camera} /></span><span className="inline-flex items-center gap-2"><Printer className="size-4" />Printer <Status value={machine.printer} /></span></div></div><Button render={<Link href={`/staff/mesin/${machine.id}`} />} variant="outline">Periksa kiosk</Button></CardContent></Card>)}</div> : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Belum ada kiosk yang ditugaskan.</CardContent></Card>}</section><section className="space-y-3"><div className="flex items-center gap-2"><AlertTriangle className="size-4 text-amber-700" /><h2 className="font-semibold">Perlu ditangani</h2></div>{alerts.length ? <div className="divide-y rounded-lg border bg-card">{alerts.map((machine) => <div key={machine.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><p className="font-medium">{machine.name}</p><p className="text-sm text-muted-foreground">{machine.status !== "online" ? `Kiosk ${machine.status}.` : `Kondisi perangkat: kamera ${machine.camera.toLowerCase()}, printer ${machine.printer.toLowerCase()}.`}</p></div><Link href={`/staff/mesin/${machine.id}`} className="inline-flex min-h-11 items-center self-start rounded-md px-3 text-sm font-medium text-primary hover:underline sm:self-auto">Lihat detail</Link></div>)}</div> : <Card><CardContent className="py-8 text-sm text-muted-foreground">Tidak ada alert aktif.</CardContent></Card>}</section></div>;
}

function MachineDetail({ id }: { id: string }) {
  const machine = machines.find((item) => item.id === id) ?? machines[0];
  const [restarting, setRestarting] = useState(false);
  const action = (label: string) => toast.message(`${label} hanya simulasi. Perangkat tidak berubah.`);
  return <div className="space-y-6"><Header page="machine" title={machine.name} description={`${machine.location} · heartbeat ${machine.ping}`} action={<Status value={machine.status} />} /><DemoNotice /><div className="grid gap-4 md:grid-cols-2">{[{ label: "Kamera", value: machine.camera, icon: Camera, detail: "Deteksi koneksi kamera terakhir" }, { label: "Printer", value: machine.printer, icon: Printer, detail: "Status koneksi dan kesiapan cetak" }].map(({ label, value, icon: Icon, detail }) => <Card key={label}><CardHeader className="flex-row items-center justify-between"><div><CardTitle className="text-base">{label}</CardTitle><CardDescription>{detail}</CardDescription></div><Icon className="size-5 text-muted-foreground" /></CardHeader><CardContent><Status value={value} /></CardContent></Card>)}</div><Card><CardHeader><CardTitle>Tindakan kiosk</CardTitle><CardDescription>Kontrol perangkat tampil sebagai simulasi sampai integrasi kiosk aktif.</CardDescription></CardHeader><CardContent className="flex flex-wrap gap-3"><Button onClick={() => action("Test print")}><Printer />Test print</Button><Button variant="outline" disabled={restarting} onClick={() => { setRestarting(true); toast.message("Restart remote disimulasikan. Kiosk tidak direstart."); window.setTimeout(() => setRestarting(false), 900); }}><RotateCw />{restarting ? "Memproses simulasi..." : "Restart kiosk"}</Button><Button variant="outline" onClick={() => action("Penyegaran status")}><RefreshCw />Segarkan status</Button></CardContent></Card><Card><CardHeader><CardTitle>Log error terbaru</CardTitle><CardDescription>Catatan contoh untuk penelusuran operasional.</CardDescription></CardHeader><CardContent><div className="space-y-4">{[{ time: "28 Sep 2026, 14:20 WIB", device: "Printer USB", message: "Perangkat tidak merespons permintaan status." }, { time: "28 Sep 2026, 13:58 WIB", device: "Layanan cetak", message: "Percobaan cetak dibatalkan karena printer tidak siap." }].map((log) => <div key={log.time} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0 sm:flex-row sm:gap-6"><time className="shrink-0 text-xs text-muted-foreground">{log.time}</time><div><p className="text-sm font-medium">{log.device}</p><p className="text-sm text-muted-foreground">{log.message}</p></div></div>)}</div></CardContent></Card></div>;
}

function Sessions() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const rows = sessions.filter((session) => `${session.id} ${session.machine}`.toLowerCase().includes(query.toLowerCase()) && (status === "all" || session.status === status));
  return <div className="space-y-6"><Header page="sessions" /><DemoNotice /><Card><CardHeader><CardTitle>Sesi kiosk ditugaskan</CardTitle><CardDescription>Data contoh sesi lokal, tidak mencakup kiosk lain.</CardDescription></CardHeader><CardContent className="space-y-4"><div className="flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 flex-1"><Search className="absolute top-2.5 left-3 size-4 text-muted-foreground" /><Input aria-label="Cari sesi" className="pl-9" placeholder="Cari ID sesi atau kiosk..." value={query} onChange={(event) => setQuery(event.target.value)} /></div><Select value={status} onValueChange={(value) => setStatus(value ?? "all")}><SelectTrigger className="w-full sm:w-44" aria-label="Filter status sesi"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Semua status</SelectItem>{["Selesai", "Berlangsung", "Gagal"].map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></div><TableFrame empty={!rows.length}><Table><TableHeader><TableRow><TableHead>ID sesi</TableHead><TableHead>Kiosk</TableHead><TableHead>Paket</TableHead><TableHead>Status</TableHead><TableHead>Waktu</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-mono text-xs">{row.id}</TableCell><TableCell>{row.machine}</TableCell><TableCell>{row.package}</TableCell><TableCell><Status value={row.status} /></TableCell><TableCell>{row.time}</TableCell></TableRow>)}</TableBody></Table></TableFrame></CardContent></Card></div>;
}

function Hardware() {
  const [detected, setDetected] = useState(false);
  const scan = () => { setDetected(true); toast.message("Hasil deteksi USB simulasi diperbarui; tidak meminta akses perangkat."); };
  return <div className="space-y-6"><Header page="hardware" action={<Button onClick={scan}><Activity />Deteksi perangkat</Button>} /><DemoNotice /><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">{[{ name: "Kamera USB", icon: Camera, device: "Canon EOS 200D", machine: machines[0].name }, { name: "Printer USB", icon: Printer, device: "DNP DS-RX1", machine: machines[0].name }].map(({ name, icon: Icon, device, machine }) => <Card key={name}><CardHeader className="flex-row items-start justify-between"><div><CardTitle className="text-base">{name}</CardTitle><CardDescription>{machine}</CardDescription></div><Icon className="size-5 text-muted-foreground" /></CardHeader><CardContent className="space-y-4"><div><p className="font-medium">{device}</p><p className="text-sm text-muted-foreground">{detected ? "Status simulasi" : "Hasil panel contoh"}</p></div><Status value={detected ? (name === "Printer USB" ? "Perlu diperiksa" : "Terhubung") : "Simulasi terdeteksi"} /><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => toast.message(`${name}: reconnect disimulasikan.`)}><RefreshCw />Reconnect</Button>{name === "Printer USB" && <Button variant="outline" onClick={() => toast.message("Test print simulasi. Tidak ada pekerjaan cetak dikirim.")}><Printer />Test print</Button>}</div></CardContent></Card>)}</div><Card><CardHeader><CardTitle>Catatan kompatibilitas</CardTitle><CardDescription>Deteksi USB sungguhan belum tersedia pada Task 1.7.</CardDescription></CardHeader><CardContent className="text-sm text-muted-foreground">Akses perangkat memerlukan izin browser dan integrasi hardware bridge pada tahap berikutnya. Tombol di halaman ini hanya memperagakan alur UI.</CardContent></Card></div>;
}

function Notifications() {
  const [read, setRead] = useState<string[]>([]);
  return <div className="space-y-6"><Header page="notifications" action={<Button variant="outline" onClick={() => setRead(notices.map((notice) => notice.title))}><Check />Tandai semua dibaca</Button>} /><DemoNotice /><div className="space-y-3">{notices.length ? notices.map((notice) => <Card key={notice.title}><CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-start"><span aria-label={read.includes(notice.title) ? "Sudah dibaca" : "Belum dibaca"} className={`mt-1 size-2 shrink-0 rounded-full ${read.includes(notice.title) ? "bg-muted" : "bg-primary"}`} /><div className="min-w-0 flex-1"><p className="font-medium">{notice.title}</p><p className="mt-1 text-sm text-muted-foreground">{notice.detail}</p><p className="mt-2 text-xs text-muted-foreground">{notice.time}</p></div><div className="flex flex-wrap gap-2"><Button render={<Link href={`/staff/mesin/${notice.machine}`} />} variant="ghost" size="sm"><Bell />Buka kiosk</Button>{!read.includes(notice.title) && <Button variant="outline" size="sm" onClick={() => setRead((current) => [...current, notice.title])}>Tandai dibaca</Button>}</div></CardContent></Card>) : <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Belum ada notifikasi untuk kiosk yang ditugaskan.</CardContent></Card>}</div></div>;
}

export function StaffPage({ page, machineId }: { page: StaffPageKey; machineId?: string }) {
  switch (page) {
    case "overview": return <Overview />;
    case "machine": return <MachineDetail id={machineId ?? ""} />;
    case "sessions": return <Sessions />;
    case "hardware": return <Hardware />;
    case "notifications": return <Notifications />;
  }
}
