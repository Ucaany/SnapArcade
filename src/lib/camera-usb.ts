"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CameraSettings = {
  iso: number;
  shutterSpeed: string;
  aperture: string;
  resolution: string;
  whiteBalance: string;
  focusMode: "auto" | "manual";
};

export const defaultCameraSettings: CameraSettings = {
  iso: 100,
  shutterSpeed: "1/125",
  aperture: "f/2.8",
  resolution: "1920x1080",
  whiteBalance: "auto",
  focusMode: "auto",
};

type CameraState = "idle" | "requesting" | "connected" | "capturing" | "fallback" | "error";
type USBDeviceLike = { productName?: string; open: () => Promise<void>; close: () => Promise<void> };

const message = (error: unknown) => error instanceof DOMException && error.name === "NotAllowedError"
  ? "Izin kamera ditolak. Izinkan akses kamera lalu coba lagi."
  : error instanceof Error ? error.message : "Kamera tidak dapat digunakan.";

export function useCameraUSB() {
  const [state, setState] = useState<CameraState>("idle");
  const [transport, setTransport] = useState<"usb" | "webcam" | null>(null);
  const [deviceLabel, setDeviceLabel] = useState("");
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const deviceRef = useRef<USBDeviceLike | null>(null);

  const clearPreview = useCallback(() => setPreviewUrl((current) => { if (current) URL.revokeObjectURL(current); return null; }), []);
  const disconnect = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    void deviceRef.current?.close();
    deviceRef.current = null;
    clearPreview();
    setTransport(null); setDeviceLabel(""); setState("idle");
  }, [clearPreview]);

  useEffect(() => () => disconnect(), [disconnect]);

  const useWebcam = useCallback(async () => {
    setState("requesting"); setError("");
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("error"); setError("Browser ini tidak mendukung akses webcam."); return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream; setTransport("webcam"); setDeviceLabel("Webcam browser"); setState("fallback");
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      return true;
    } catch (cause) { setState("error"); setError(message(cause)); return false; }
  }, []);

  const connect = useCallback(async () => {
    setState("requesting"); setError("");
    const usb = typeof navigator !== "undefined" ? (navigator as Navigator & { usb?: { requestDevice: (options: unknown) => Promise<USBDeviceLike> } }).usb : undefined;
    if (!usb) { setState("error"); setError("WebUSB tidak tersedia di browser ini. Gunakan webcam sebagai diagnostik lokal."); return false; }
    try {
      const device = await usb.requestDevice({ filters: [{ classCode: 6 }] });
      await device.open(); deviceRef.current = device; setTransport("usb"); setDeviceLabel(device.productName || "Kamera USB"); setState("connected");
      return true;
    } catch (cause) { setState("error"); setError(message(cause)); return false; }
  }, []);

  const capture = useCallback(async () => {
    setState("capturing"); setError(""); clearPreview();
    if (transport === "usb") { setState("error"); setError("Capture USB belum tersedia tanpa runtime PTP/gPhoto2. Gunakan webcam untuk diagnostik."); return null; }
    const video = videoRef.current;
    if (!video || !video.videoWidth) { setState("error"); setError("Preview webcam belum siap."); return null; }
    const canvas = document.createElement("canvas"); canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) { setState("error"); setError("Frame kamera gagal diambil."); return null; }
    const url = URL.createObjectURL(blob); setPreviewUrl(url); setState(transport === "webcam" ? "fallback" : "connected"); return blob;
  }, [clearPreview, transport]);

  return { state, transport, deviceLabel, error, previewUrl, videoRef, connect, useWebcam, disconnect, capture, clearError: () => setError("") };
}
