"use client";

import { useState } from "react";
import { Camera, CheckCircle2, Plug, Unplug } from "lucide-react";
import { saveKiosk } from "@/app/crud-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { defaultCameraSettings, useCameraUSB, type CameraSettings } from "@/lib/camera-usb";
import { toast } from "sonner";

type KioskPayload = { ownerId?: string; name: string; location: string | null; sessionLimit: number; theme: Record<string, unknown> | null; printerSettings: Record<string, unknown> | null };
type Props = { kioskId: string; currentSettings: Partial<CameraSettings> | null; kiosk?: KioskPayload; canPersist?: boolean; compact?: boolean };

export function CameraCalibration({ kioskId, currentSettings, kiosk, canPersist = false, compact = false }: Props) {
  const [settings, setSettings] = useState<CameraSettings>({ ...defaultCameraSettings, ...currentSettings });
  const [saving, setSaving] = useState(false);
  const camera = useCameraUSB();
  const set = (key: keyof CameraSettings, value: string) => setSettings((current) => ({ ...current, [key]: key === "iso" ? Number(value) : value } as CameraSettings));
  const calibrate = async () => {
    if (!camera.transport && !(await camera.useWebcam())) return;
    const frame = await camera.capture(); if (!frame) return;
    if (!canPersist || !kiosk) { toast.success("Foto diagnostik berhasil diambil di perangkat ini."); return; }
    setSaving(true);
    const result = await saveKiosk(kioskId, { ...kiosk, cameraSettings: settings });
    setSaving(false);
    if (result.ok) toast.success("Pengaturan kamera tersimpan."); else toast.error(result.error === "unauthorized" ? "Akun staff tidak dapat menyimpan pengaturan kiosk." : "Pengaturan kamera gagal disimpan.");
  };
  return <Card size={compact ? "sm" : "default"}><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Camera className="size-4" />Kalibrasi kamera</CardTitle><CardDescription>Kalibrasi berlaku untuk browser dan perangkat yang sedang dibuka.</CardDescription></CardHeader><CardContent className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label className="grid gap-1.5 text-sm">ISO<Input type="number" min={50} max={12800} value={settings.iso} onChange={(event) => set("iso", event.target.value)} /></label>
      <label className="grid gap-1.5 text-sm">Shutter speed<Input value={settings.shutterSpeed} onChange={(event) => set("shutterSpeed", event.target.value)} /></label>
      <label className="grid gap-1.5 text-sm">Aperture<Input value={settings.aperture} onChange={(event) => set("aperture", event.target.value)} /></label>
      <label className="grid gap-1.5 text-sm">Resolusi<Select value={settings.resolution} onValueChange={(value) => value && set("resolution", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1920x1080">1920 x 1080</SelectItem><SelectItem value="1280x720">1280 x 720</SelectItem></SelectContent></Select></label>
      <label className="grid gap-1.5 text-sm">White balance<Select value={settings.whiteBalance} onValueChange={(value) => value && set("whiteBalance", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Auto</SelectItem><SelectItem value="daylight">Daylight</SelectItem><SelectItem value="incandescent">Incandescent</SelectItem></SelectContent></Select></label>
      <label className="grid gap-1.5 text-sm">Focus mode<Select value={settings.focusMode} onValueChange={(value) => value && set("focusMode", value as CameraSettings["focusMode"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="auto">Auto</SelectItem><SelectItem value="manual">Manual</SelectItem></SelectContent></Select></label>
    </div>
    <video ref={camera.videoRef} muted playsInline className={`aspect-video w-full rounded-lg bg-muted object-cover ${camera.transport === "webcam" ? "block" : "hidden"}`} aria-label="Preview webcam" />
    {camera.previewUrl && <img src={camera.previewUrl} alt="Foto diagnostik kamera" className="max-h-72 w-full rounded-lg object-contain ring-1 ring-border" />}
    <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void camera.connect()} disabled={camera.state === "requesting"}><Plug />Deteksi kamera</Button><Button variant="outline" onClick={() => void camera.useWebcam()} disabled={camera.state === "requesting"}><Camera />Gunakan webcam</Button><Button onClick={() => void calibrate()} disabled={saving || camera.state === "capturing"}><CheckCircle2 />{saving ? "Menyimpan..." : "Kalibrasi dan ambil foto"}</Button>{camera.transport && <Button variant="ghost" onClick={camera.disconnect}><Unplug />Putuskan</Button>}</div>
    <p className="text-xs text-muted-foreground">{camera.deviceLabel ? `${camera.deviceLabel} · ${camera.transport === "usb" ? "USB terdeteksi, capture USB memerlukan runtime PTP/gPhoto2." : "diagnostik webcam lokal"}` : "WebUSB memerlukan Chromium dan izin perangkat dari browser."}</p>
    {camera.error && <p role="alert" className="text-sm text-destructive">{camera.error}</p>}
  </CardContent></Card>;
}
