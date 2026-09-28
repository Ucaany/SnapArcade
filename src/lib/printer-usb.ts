"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PrinterSettings } from "@/lib/printer-settings";

type USBEndpoint = { direction: string; endpointNumber: number; type: string };
type USBInterface = { interfaceNumber: number; alternate: { endpoints: USBEndpoint[] } };
type USBDeviceLike = { productName?: string; manufacturerName?: string; serialNumber?: string; configuration?: { interfaces: USBInterface[] }; open(): Promise<void>; close(): Promise<void>; selectConfiguration?(n: number): Promise<void>; claimInterface(n: number): Promise<void>; releaseInterface?(n: number): Promise<void>; transferOut(endpoint: number, data: BufferSource): Promise<{ bytesWritten: number }> };

const sizes: Record<PrinterSettings["paperSize"], [number, number]> = { "4R": [1200, 1800], "2x6": [1200, 1800], "5R": [1500, 2100] };
const esc = (...bytes: number[]) => new Uint8Array(bytes);
const toBytes = (value: Blob | Uint8Array) => value instanceof Uint8Array ? Promise.resolve(value) : value.arrayBuffer().then((buffer) => new Uint8Array(buffer));

export function frameEscPosRaster(mono: Uint8Array, width: number, height: number) {
  const rowBytes = Math.ceil(width / 8);
  if (mono.length !== rowBytes * height || width < 1 || height < 1) throw new Error("Raster printer tidak valid.");
  return new Uint8Array([...esc(0x1b, 0x40), ...esc(0x1b, 0x61, 0x00), ...esc(0x1d, 0x76, 0x30, 0x00, rowBytes & 255, rowBytes >> 8, height & 255, height >> 8), ...mono, ...esc(0x1d, 0x56, 0x00)]);
}

function raster(source: Uint8Array, width: number, height: number) {
  const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
  const context = canvas.getContext("2d"); if (!context) throw new Error("Canvas tidak tersedia.");
  const image = new ImageData(width, height); const digest = source.reduce((sum, byte) => sum + byte, 0) / Math.max(1, source.length);
  for (let i = 0; i < image.data.length; i += 4) { const value = ((i / 4 + digest) % 32) < 16 ? 0 : 255; image.data[i] = value; image.data[i + 1] = value; image.data[i + 2] = value; image.data[i + 3] = 255; }
  context.putImageData(image, 0, 0);
  const mono = new Uint8Array(Math.ceil(width / 8) * height); const pixels = context.getImageData(0, 0, width, height).data; const rowBytes = Math.ceil(width / 8);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4] < 128) mono[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
  return frameEscPosRaster(mono, width, height);
}

export function usePrinterUSB() {
  const [state, setState] = useState<"idle" | "requesting" | "connected" | "printing" | "error">("idle");
  const [progress, setProgress] = useState(0); const [error, setError] = useState(""); const [deviceLabel, setDeviceLabel] = useState("");
  const deviceRef = useRef<USBDeviceLike | null>(null); const cancelled = useRef(false);
  const disconnect = useCallback(async () => { const device = deviceRef.current; deviceRef.current = null; if (device) { try { if (device.configuration) await device.releaseInterface?.(device.configuration.interfaces[0]?.interfaceNumber ?? 0); await device.close(); } catch { /* cleanup is best effort */ } } setDeviceLabel(""); setState("idle"); setProgress(0); }, []);
  const connect = useCallback(async () => { setState("requesting"); setError(""); const usb = typeof navigator !== "undefined" ? (navigator as Navigator & { usb?: { requestDevice(options: unknown): Promise<USBDeviceLike> } }).usb : undefined; if (!usb) { setState("error"); setError("WebUSB tidak tersedia. Gunakan Chromium pada perangkat dengan printer USB."); return false; } try { const device = await usb.requestDevice({ filters: [{ classCode: 7 }] }); await device.open(); if (!device.configuration && device.selectConfiguration) await device.selectConfiguration(1); const iface = device.configuration?.interfaces.find((item) => item.alternate.endpoints.some((endpoint) => endpoint.direction === "out" && endpoint.type === "bulk")); if (!iface) throw new Error("Printer tidak memiliki endpoint USB bulk OUT."); await device.claimInterface(iface.interfaceNumber); deviceRef.current = device; setDeviceLabel(device.productName || device.manufacturerName || "Printer USB"); setState("connected"); return true; } catch (cause) { setState("error"); setError(cause instanceof DOMException && cause.name === "NotAllowedError" ? "Izin printer ditolak." : cause instanceof Error ? cause.message : "Printer tidak dapat digunakan."); return false; } }, []);
  const print = useCallback(async (source: Blob | Uint8Array, settings: PrinterSettings) => { const device = deviceRef.current; if (!device) { setError("Hubungkan printer terlebih dahulu."); return { ok: false as const, result: "failed" as const }; } cancelled.current = false; setState("printing"); setProgress(0); try { const [width, height] = sizes[settings.paperSize]; const data = raster(await toBytes(source), settings.orientation === "portrait" ? width : height, settings.orientation === "portrait" ? height : width); const endpoint = device.configuration?.interfaces.flatMap((item) => item.alternate.endpoints).find((item) => item.direction === "out" && item.type === "bulk")?.endpointNumber; if (endpoint == null) throw new Error("Endpoint printer tidak tersedia."); for (let offset = 0; offset < data.length; offset += 16384) { if (cancelled.current) { setState("connected"); return { ok: false as const, result: "cancelled" as const }; } const chunk = data.slice(offset, Math.min(offset + 16384, data.length)); await device.transferOut(endpoint, chunk); setProgress(Math.round((Math.min(offset + chunk.length, data.length) / data.length) * 100)); } setState("connected"); return { ok: true as const, result: "success" as const }; } catch (cause) { setState("error"); setError(cause instanceof Error ? cause.message : "Transfer printer gagal."); return { ok: false as const, result: "failed" as const }; } }, []);
  const cancel = useCallback(() => { cancelled.current = true; }, []);
  useEffect(() => () => { void disconnect(); }, [disconnect]);
  return { supported: typeof navigator !== "undefined" && "usb" in navigator, state, progress, error, deviceLabel, connect, disconnect, print, cancel };
}
