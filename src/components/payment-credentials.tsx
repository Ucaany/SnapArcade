"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deletePaymentCredential, savePaymentCredential, testPaymentCredentialInput, verifyPaymentCredential } from "@/app/crud-actions";

type Provider = "midtrans" | "xendit" | "tripay";
type Credential = { id: string; provider: Provider; label: string; isActive: boolean; isSandbox: boolean; lastVerifiedAt: Date | null; createdAt: Date };
type Field = { key: string; label: string; placeholder: string };
const providers: Record<Provider, { title: string; description: string; fields: Field[] }> = {
  midtrans: { title: "Midtrans", description: "Server key untuk Core API.", fields: [{ key: "serverKey", label: "Server key", placeholder: "SB-Mid-server-..." }] },
  xendit: { title: "Xendit", description: "Secret key untuk Invoice API.", fields: [{ key: "secretKey", label: "Secret key", placeholder: "xnd_development_..." }] },
  tripay: { title: "Tripay", description: "Credential merchant untuk API Tripay.", fields: [{ key: "apiKey", label: "API key", placeholder: "API key" }, { key: "privateKey", label: "Private key", placeholder: "Private key" }, { key: "merchantCode", label: "Merchant code", placeholder: "T..." }] },
};

function StatusBadge({ verified }: { verified: boolean }) {
  return <Badge variant="outline" className={verified ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}>{verified ? <><ShieldCheck />Verified</> : <><ShieldAlert />Not Verified</>}</Badge>;
}

function CredentialForm({ provider, onComplete }: { provider: Provider; onComplete: () => void }) {
  const spec = providers[provider];
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [label, setLabel] = useState(`${spec.title} Sandbox`);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"test" | "save" | null>(null);
  const [feedback, setFeedback] = useState<{ verified: boolean; message: string; latencyMs: number } | null>(null);
  const runTest = async () => { setBusy("test"); const result = await testPaymentCredentialInput({ provider, config, isSandbox: environment === "sandbox" }); setBusy(null); if (!result.ok) { toast.error("Credential tidak valid."); return; } setFeedback(result.data ?? null); result.data?.verified ? toast.success("Koneksi berhasil diverifikasi.") : toast.error(result.data?.message ?? "Koneksi gagal."); };
  const save = async (event: React.FormEvent) => { event.preventDefault(); setBusy("save"); const result = await savePaymentCredential(null, { provider, label: label.trim(), config, isActive: true, isSandbox: environment === "sandbox" }); setBusy(null); if (!result.ok) toast.error("Credential gagal disimpan."); else { toast.success("Credential terenkripsi dan disimpan."); setConfig({}); setFeedback(null); onComplete(); } };
  return <Card><CardHeader><CardTitle>{spec.title}</CardTitle><CardDescription>{spec.description}</CardDescription></CardHeader><CardContent><form onSubmit={save} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Label<Input value={label} maxLength={100} onChange={(event) => setLabel(event.target.value)} required /></label><label className="grid gap-2 text-sm font-medium">Environment<Select value={environment} onValueChange={(value) => setEnvironment((value ?? "sandbox") as "sandbox" | "production")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sandbox">Sandbox</SelectItem><SelectItem value="production">Production</SelectItem></SelectContent></Select></label></div>{spec.fields.map((field) => <label key={field.key} className="grid gap-2 text-sm font-medium">{field.label}<Input type="password" autoComplete="new-password" placeholder={field.placeholder} value={config[field.key] ?? ""} onChange={(event) => setConfig((current) => ({ ...current, [field.key]: event.target.value }))} required /></label>)}{feedback && <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm"><CheckCircle2 className={feedback.verified ? "mt-0.5 size-4 text-emerald-600" : "mt-0.5 size-4 text-amber-600"} /><span>{feedback.message} <span className="text-muted-foreground">({feedback.latencyMs} ms)</span></span></div>}<div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => void runTest()} disabled={busy !== null}>{busy === "test" && <Loader2 className="animate-spin" />}Test Connection</Button><Button type="submit" disabled={busy !== null || !label.trim()}>{busy === "save" && <Loader2 className="animate-spin" />}Simpan credential</Button></div></form></CardContent></Card>;
}

export function PaymentCredentials({ credentials }: { credentials: Credential[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const refresh = () => router.refresh();
  const verify = async (id: string) => { setBusyId(id); const result = await verifyPaymentCredential(id); setBusyId(null); if (!result.ok) toast.error("Verifikasi gagal."); else { result.data?.verified ? toast.success("Credential terverifikasi.") : toast.error(result.data?.message ?? "Credential tidak terverifikasi."); refresh(); } };
  const remove = async (id: string) => { if (!window.confirm("Hapus credential ini?")) return; setBusyId(id); const result = await deletePaymentCredential(id); setBusyId(null); result.ok ? (toast.success("Credential dihapus."), refresh()) : toast.error("Credential gagal dihapus."); };
  return <div className="space-y-6"><div className="grid gap-4 xl:grid-cols-3">{(Object.keys(providers) as Provider[]).map((provider) => <CredentialForm key={provider} provider={provider} onComplete={refresh} />)}</div><Card><CardHeader><CardTitle>Credential tersimpan</CardTitle><CardDescription>Secret tersimpan terenkripsi AES-256-GCM dan tidak pernah ditampilkan kembali.</CardDescription></CardHeader><CardContent>{credentials.length ? <div className="divide-y rounded-lg border">{credentials.map((credential) => <div key={credential.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{credential.label}</p><Badge variant="outline">{providers[credential.provider].title}</Badge><Badge variant="secondary">{credential.isSandbox ? "Sandbox" : "Production"}</Badge><StatusBadge verified={Boolean(credential.lastVerifiedAt)} /></div><p className="mt-1 text-xs text-muted-foreground">{credential.lastVerifiedAt ? `Verified ${credential.lastVerifiedAt.toLocaleString("id-ID")}` : "Belum pernah diverifikasi"}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void verify(credential.id)} disabled={busyId !== null}>{busyId === credential.id && <Loader2 className="animate-spin" />}Test Connection</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => void remove(credential.id)} disabled={busyId !== null} aria-label={`Hapus ${credential.label}`}><Trash2 /></Button></div></div>)}</div> : <p className="text-sm text-muted-foreground">Belum ada credential tersimpan.</p>}</CardContent></Card></div>;
}
