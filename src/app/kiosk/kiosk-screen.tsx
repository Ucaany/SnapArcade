"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCameraUSB } from "@/lib/camera-usb";
import { usePrinterUSB } from "@/lib/printer-usb";
import { defaultPrinterSettings } from "@/lib/printer-settings";

const steps = ["/kiosk", "/kiosk/pair", "/kiosk/idle", "/kiosk/pilih-paket", "/kiosk/pembayaran", "/kiosk/voucher", "/kiosk/sesi", "/kiosk/editor", "/kiosk/preview-cetak", "/kiosk/mencetak", "/kiosk/hasil"];
const defaultPackages = [{ id: "", name: "Paket belum dimuat", detail: "Pairing kiosk diperlukan", price: 0, photoCount: 4 }];
const frames = ["Pop Art", "Retro 90s", "Pesta", "Klasik", "Warna-warni"];

export default function KioskScreen() {
  const path = usePathname();
  const router = useRouter();
  const [pairCode, setPairCode] = useState("");
  const [voucher, setVoucher] = useState("");
  const [selected, setSelected] = useState(0);
  const [shot, setShot] = useState(1);
  const [filter, setFilter] = useState("Warna asli");
  const [copies, setCopies] = useState(1);
  const [notice, setNotice] = useState("");
  const [progress, setProgress] = useState(0);
  const [paymentLeft, setPaymentLeft] = useState(300);
  const [paymentState, setPaymentState] = useState("Menunggu pembayaran simulasi");
  const [retakes, setRetakes] = useState<Record<number, number>>({});
  const [zoom, setZoom] = useState(1);
  const [frame, setFrame] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [slide, setSlide] = useState(0);
  const [kioskToken, setKioskToken] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [packages, setPackages] = useState(defaultPackages);
  const [qrUrl, setQrUrl] = useState("");
  const [apiBusy, setApiBusy] = useState(false);
  const [photos, setPhotos] = useState<Record<number, Blob>>({});
  const [finalStrip, setFinalStrip] = useState<Blob | null>(null);
  const [finalStripUrl, setFinalStripUrl] = useState<string | null>(null);
  const camera = useCameraUSB();
  const printer = usePrinterUSB();
  const stripCanvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!finalStrip) { setFinalStripUrl(null); return; }
    const url = URL.createObjectURL(finalStrip);
    setFinalStripUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [finalStrip]);

  useEffect(() => {
    const saved = sessionStorage.getItem("snaparcade-kiosk-v2");
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setSelected(Number.isInteger(state.selected) ? state.selected : 0); setShot(Number.isInteger(state.shot) ? Math.max(1, state.shot) : 1); setFilter(typeof state.filter === "string" ? state.filter : "Warna asli"); setCopies([1, 2, 3].includes(state.copies) ? state.copies : 1); setKioskToken(typeof state.kioskToken === "string" ? state.kioskToken : ""); setSessionId(typeof state.sessionId === "string" ? state.sessionId : "");
      } catch {
        sessionStorage.removeItem("snaparcade-kiosk");
      }
    }
  }, []);
  useEffect(() => { sessionStorage.setItem("snaparcade-kiosk-v2", JSON.stringify({ selected, shot, filter, copies, kioskToken, sessionId })); }, [selected, shot, filter, copies, kioskToken, sessionId]);
  const api = async (url: string, init: RequestInit = {}) => fetch(url, { ...init, headers: { ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(kioskToken ? { "X-Kiosk-Token": kioskToken } : {}), ...init.headers } });
  useEffect(() => { if (!kioskToken) return; void api("/api/kiosk/packages").then(async (response) => { if (response.ok) { const data = await response.json(); setPackages(data.packages.map((item: { id: string; name: string; description: string | null; photoCount: number; priceIdr: number }) => ({ id: item.id, name: item.name, detail: item.description ?? `${item.photoCount} foto`, photoCount: item.photoCount, price: item.priceIdr }))); } }); }, [kioskToken]);
  useEffect(() => {
    if (path !== "/kiosk/mencetak" || !finalStrip) return;
    let cancelled = false;
    setProgress(0);
    void (async () => {
      const started = performance.now();
      const connected = printer.supported && await printer.connect();
      if (connected) {
        let result: "success" | "failed" | "cancelled" = "success";
        for (let copy = 0; copy < copies; copy += 1) {
          const printed = await printer.print(finalStrip, defaultPrinterSettings);
          result = printed.result; if (printed.result !== "success") break;
          if (!cancelled) setProgress(Math.round(((copy + 1) / copies) * 100));
        }
        await api("/api/kiosk/printer/report", { method: "POST", body: JSON.stringify({ result, jobType: "print", elapsedMs: Math.round(performance.now() - started), progress: printer.progress, device: { product: printer.deviceLabel } }) }).catch(() => undefined);
        if (!cancelled && result !== "success") setNotice(printer.error || "Cetak USB gagal.");
      } else {
        const timer = window.setInterval(() => setProgress((value) => value >= 100 ? 100 : value + 10), 350);
        window.setTimeout(() => window.clearInterval(timer), 3800);
        setNotice("Printer WebUSB tidak tersedia. Ini simulasi lokal, tidak ada perintah USB.");
      }
    })();
    return () => { cancelled = true; printer.cancel(); };
  }, [path, finalStrip, copies, printer.supported, printer.connect, printer.print, printer.cancel, printer.error, printer.progress, printer.deviceLabel]);
  useEffect(() => {
    if (path !== "/kiosk/pembayaran" || paymentLeft <= 0 || paymentState === "Pembayaran berhasil (simulasi)") return;
    const timer = window.setInterval(() => setPaymentLeft((left) => Math.max(0, left - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [path, paymentLeft, paymentState]);
  useEffect(() => {
    if (path !== "/kiosk/pembayaran" || paymentLeft === 0 || paymentState === "Pembayaran berhasil (simulasi)") return;
    const poll = window.setInterval(() => setPaymentState("Memeriksa status demo..."), 3000);
    return () => window.clearInterval(poll);
  }, [path, paymentLeft, paymentState]);
  useEffect(() => {
    if (path !== "/kiosk/idle") return;
    const timer = window.setInterval(() => setSlide((value) => (value + 1) % frames.length), 2800);
    return () => window.clearInterval(timer);
  }, [path]);
  useEffect(() => {
    if (path !== "/kiosk/hasil" || !sessionId || !kioskToken) return;
    void (async () => {
      await api(`/api/kiosk/session/${sessionId}/complete`, { method: "POST", body: JSON.stringify({ skip_print: true }) });
      const response = await api(`/api/kiosk/session/${sessionId}/qr`);
      if (response.ok) setQrUrl((await response.json()).qr_url);
    })();
  }, [path, sessionId, kioskToken]);

  const step = Math.max(0, steps.indexOf(path));
  const go = (to: string) => router.push(to);
  const button = (label: string, to: string, secondary = false) => <Link className="nb-button" style={secondary ? { background: "var(--nb-cyan)" } : undefined} href={to}>{label}</Link>;
  const packageInfo = packages[selected] ?? packages[0];
  const uploadBlob = async (blob: Blob, index: number) => { if (!sessionId) return false; const body = new FormData(); body.set("file", blob, "photo.jpg"); body.set("order_index", String(index)); const response = await api("/api/kiosk/session/" + sessionId + "/photos", { method: "POST", body }); return response.ok; };
  const capturePhoto = async () => { const blob = await camera.capture(); if (!blob) return; setPhotos((value) => ({ ...value, [shot - 1]: blob })); await uploadBlob(blob, shot - 1); setNotice("Foto " + shot + " tersimpan dari " + (camera.transport === "webcam" ? "webcam" : "kamera USB") + "."); };
  const composeStrip = async () => {
    const canvas = document.createElement("canvas"); canvas.width = 900; canvas.height = 1200;
    const context = canvas.getContext("2d"); if (!context || !sessionId) return false;
    const palette = ["#111827", "#ec4899", "#22d3ee", "#ffffff", "#a3e635"];
    context.fillStyle = palette[frame]; context.fillRect(0, 0, canvas.width, canvas.height);
    context.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    const images = await Promise.all(Array.from({ length: packageInfo.photoCount }, async (_, index) => {
      const blob = photos[index]; if (!blob) return null;
      const image = new Image(); image.src = URL.createObjectURL(blob); await image.decode(); URL.revokeObjectURL(image.src); return image;
    }));
    images.forEach((image, index) => {
      if (!image) return;
      const box = { x: 60, y: 35 + index * 270, width: 780, height: 230 };
      const scale = Math.max(box.width / image.naturalWidth, box.height / image.naturalHeight);
      const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
      context.drawImage(image, box.x + (box.width - width) / 2, box.y + (box.height - height) / 2, width, height);
    });
    context.filter = "none";
    context.fillStyle = frame === 3 ? "#111827" : "#ffffff"; context.font = "bold 30px sans-serif";
    context.fillText(`SNAPARCADE · ${frames[frame]}`, 60, 1165);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return false; setFinalStrip(blob);
    const body = new FormData(); body.set("file", blob, "strip.jpg"); body.set("order_index", "999"); body.set("is_final_strip", "true"); body.set("frame_id", frames[frame]); body.set("filter_applied", JSON.stringify({ brightness, contrast, saturation }));
    const response = await api("/api/kiosk/session/" + sessionId + "/photos", { method: "POST", body });
    setNotice(response.ok ? "Strip final tersimpan." : "Strip gagal disimpan."); return response.ok;
  };
  const createSession = async (paymentState: "paid" | "voucher") => { if (!packageInfo.id || apiBusy) return false; setApiBusy(true); try { let voucherId: string | undefined; if (paymentState === "voucher") { const voucherResponse = await api("/api/kiosk/voucher/validate", { method: "POST", body: JSON.stringify({ code: voucher.trim() }) }); if (!voucherResponse.ok) return false; const voucherResult = await voucherResponse.json(); if (!voucherResult.valid) return false; voucherId = voucherResult.voucher_id; } const response = await api("/api/kiosk/session/create", { method: "POST", body: JSON.stringify({ package_id: packageInfo.id, amount_paid: paymentState === "voucher" ? 0 : packageInfo.price, payment_state: paymentState, voucher_id: voucherId }) }); if (!response.ok) { setNotice("Sesi gagal dibuat. Periksa koneksi kiosk."); return false; } const data = await response.json(); setSessionId(data.session_id); return true; } finally { setApiBusy(false); } };
  let title = "SnapArcade";
  let content: React.ReactNode;

  switch (path) {
    case "/kiosk":
      title = "Mesin foto, siap?";
      content = <><p>Hubungkan kiosk ini dengan kode pairing dari dashboard. Mode demo tidak menghubungi server.</p><div className="kiosk-actions">{button("Masukkan kode pairing", "/kiosk/pair")}{button("Lanjut ke layar awal", "/kiosk/idle", true)}</div></>;
      break;
    case "/kiosk/pair":
      title = "Pairing arcade";
      content = <><p>Masukkan kode 6 digit dari dashboard.</p><form onSubmit={async (event) => { event.preventDefault(); if (!/^\d{6}$/.test(pairCode)) { setNotice("Kode harus terdiri dari 6 angka."); return; } setApiBusy(true); const response = await fetch("/api/kiosk/pair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pairing_code: pairCode }) }); setApiBusy(false); if (!response.ok) { setNotice("Kode pairing tidak valid atau kedaluwarsa."); return; } const data = await response.json(); setKioskToken(data.pairing_token); setNotice("Kiosk berhasil diaktifkan."); window.setTimeout(() => go("/kiosk/idle"), 500); }}><label htmlFor="pair-code">Kode pairing</label><input id="pair-code" className="nb-input kiosk-input" inputMode="numeric" maxLength={6} value={pairCode} onChange={(event) => setPairCode(event.target.value.replace(/\D/g, ""))} placeholder="000000"/><p aria-live="polite">{notice}</p><div className="kiosk-actions"><button disabled={apiBusy} className="nb-button" type="submit">Aktifkan kiosk</button>{button("Kembali", "/kiosk")}</div></form></>;
      break;
    case "/kiosk/idle":
      title = "Yuk, bikin foto seru!";
      content = <><div className={`kiosk-photo kiosk-slide kiosk-slide-${slide}`} aria-label={`Contoh slideshow foto: ${frames[slide]}`}><span>{frames[slide]}</span></div><div className="kiosk-dots" aria-label={`Slide ${slide + 1} dari ${frames.length}`}>{frames.map((item, index) => <span key={item} className={index === slide ? "is-active" : ""}/>)}</div><p>Pilih paket, berpose, lalu bawa pulang hasil fotomu.</p><div className="kiosk-actions">{button("Mulai foto", "/kiosk/pilih-paket")}{button("Pengaturan kiosk", "/kiosk/pair", true)}</div></>;
      break;
    case "/kiosk/pilih-paket":
      title = "Pilih paket foto";
      content = <><div className="kiosk-grid">{packages.map((item, index) => <button key={item.name} type="button" className="nb-card kiosk-option" aria-pressed={selected === index} onClick={() => setSelected(index)}><strong>{item.name}</strong>{item.detail}<p><b>Rp{item.price.toLocaleString("id-ID")}</b></p></button>)}</div><div className="kiosk-actions"><button className="nb-button" onClick={() => go("/kiosk/pembayaran")}>Lanjut, {packageInfo.name}</button>{button("Pakai voucher", "/kiosk/voucher", true)}</div><p className="kiosk-note">Harga contoh untuk demo, bukan penawaran transaksi.</p></>;
      break;
    case "/kiosk/pembayaran":
      title = "Pembayaran demo";
      title = paymentLeft ? "Pindai untuk membayar" : "Waktu pembayaran habis";
      content = <><p>{packageInfo.name} · Rp{packageInfo.price.toLocaleString("id-ID")}</p><div className="kiosk-payment-layout"><div className="kiosk-qr" aria-label="QR pembayaran menunggu gateway"><span>QRIS</span><small>MENUNGGU</small></div><div><strong className="kiosk-timer" aria-live="polite">{String(Math.floor(paymentLeft / 60)).padStart(2, "0")}:{String(paymentLeft % 60).padStart(2, "0")}</strong><p aria-live="polite">{paymentLeft ? paymentState : "Waktu pembayaran habis."}</p><small>Payment gateway diaktifkan pada tahap berikutnya.</small></div></div><div className="kiosk-actions"><button disabled={!paymentLeft || apiBusy} className="nb-button" onClick={async () => { if (await createSession("paid")) go("/kiosk/sesi"); }}>Lanjut setelah pembayaran</button>{button("Gunakan voucher", "/kiosk/voucher", true)}{button("Ganti paket", "/kiosk/pilih-paket", true)}</div></>;
      break;
    case "/kiosk/voucher":
      title = "Punya kode voucher?";
      content = <><p>Masukkan kode voucher yang diberikan pemilik kiosk.</p><form onSubmit={async (event) => { event.preventDefault(); if (!voucher.trim()) { setNotice("Isi kode voucher terlebih dahulu."); return; } if (await createSession("voucher")) go("/kiosk/sesi"); else setNotice("Voucher atau sesi tidak dapat diproses."); }}><label htmlFor="voucher-code">Kode voucher</label><input id="voucher-code" className="nb-input kiosk-input" value={voucher} onChange={(event) => setVoucher(event.target.value)} placeholder="KODE VOUCHER"/><p aria-live="polite">{notice}</p><div className="kiosk-actions"><button disabled={apiBusy} className="nb-button" type="submit">Terapkan voucher</button>{button("Kembali ke paket", "/kiosk/pilih-paket", true)}</div></form></>;
      break;
    case "/kiosk/sesi":
      title = "Saatnya berpose!";
       content = <div className="kiosk-landscape"><div className="kiosk-photo kiosk-capture" style={{ transform: `scale(${zoom})` }}>{camera.previewUrl ? <img src={camera.previewUrl} alt={`Pratinjau foto ${shot}`} /> : <video ref={camera.videoRef} autoPlay muted playsInline aria-label="Pratinjau kamera" />}</div><div><p>Foto {shot} dari {packageInfo.photoCount}. {retakes[shot] ?? 0}/2 pengambilan ulang.</p><button className="nb-button" onClick={() => void (camera.transport ? capturePhoto() : camera.useWebcam())}>{camera.transport ? "Ambil foto" : "Mulai kamera"}</button>{camera.transport === "webcam" && <button className="nb-button" style={{ background: "var(--nb-cyan)" }} onClick={() => void capturePhoto()}>Simpan frame</button>}<label htmlFor="photo-file">Pilih file manual</label><input id="photo-file" type="file" accept="image/jpeg,image/png" className="nb-input" onChange={async (event) => { const file = event.target.files?.[0]; if (!file || !sessionId) return; setPhotos((value) => ({ ...value, [shot - 1]: file })); const body = new FormData(); body.set("file", file); body.set("order_index", String(shot - 1)); const response = await api(`/api/kiosk/session/${sessionId}/photos`, { method: "POST", body }); setNotice(response.ok ? `Foto ${shot} tersimpan.` : "Upload foto gagal, coba lagi."); }} /><div className="kiosk-actions"><button className="nb-button" onClick={() => setShot((value) => value >= packageInfo.photoCount ? 1 : value + 1)}>Foto berikutnya</button><button disabled={(retakes[shot] ?? 0) >= 2} className="nb-button" style={{ background: "var(--nb-cyan)" }} onClick={() => { setRetakes((value) => ({ ...value, [shot]: (value[shot] ?? 0) + 1 })); setNotice(`Foto ${shot} diulang.`); }}>Ulangi foto</button><button className="nb-button" style={{ background: "var(--nb-pink)" }} onClick={() => setZoom((value) => value === 1 ? 1.25 : 1)}>Zoom {zoom > 1 ? "100%" : "125%"}</button></div><p aria-live="polite">{camera.error || notice}</p><div className="kiosk-actions">{button("Lanjut ke editor", "/kiosk/editor")}</div></div></div>;
      break;
    case "/kiosk/editor":
      title = "Atur hasil fotomu";
       content = <><div className="kiosk-landscape"><div className={`kiosk-strip kiosk-frame-${frame}`} style={{ filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`, backgroundImage: finalStripUrl ? `url(${finalStripUrl})` : undefined }}>{!finalStrip && [0, 1, 2, 3].map((i) => <span key={i}>FOTO {i + 1}</span>)}{!finalStrip && <b>{frames[frame]}</b>}</div><div><label htmlFor="brightness">Kecerahan {brightness}%</label><input id="brightness" type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))}/><label htmlFor="contrast">Kontras {contrast}%</label><input id="contrast" type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(Number(e.target.value))}/><label htmlFor="saturation">Saturasi {saturation}%</label><input id="saturation" type="range" min="0" max="180" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))}/><p>Pilih frame</p><div className="kiosk-frame-picker">{frames.map((name, index) => <button key={name} className="nb-button" aria-pressed={frame === index} style={{ background: ["var(--nb-primary)", "var(--nb-pink)", "var(--nb-cyan)", "white", "var(--nb-lime)"][index] }} onClick={() => setFrame(index)}>{name}</button>)}</div><p className="kiosk-note">Filter dan frame diterapkan ke strip canvas saat disimpan.</p></div></div><div className="kiosk-actions"><button className="nb-button" onClick={() => void composeStrip()}>Simpan strip</button>{button("Lihat preview cetak", "/kiosk/preview-cetak")}</div></>;
      break;
    case "/kiosk/preview-cetak":
      title = "Preview cetak";
       content = <><div className="kiosk-landscape"><div className="kiosk-strip" style={finalStripUrl ? { backgroundImage: `url(${finalStripUrl})` } : undefined}>{!finalStrip && <><span>SNAP</span><span>ARCADE</span><span>{filter}</span><span>FOTO</span></>}</div><div><p>{packageInfo.detail}</p><label htmlFor="copies">Jumlah cetak</label><select id="copies" className="nb-input" value={copies} onChange={(event) => setCopies(Number(event.target.value))}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n} copy</option>)}</select><p className="kiosk-note">Strip akhir siap dikirim ke printer WebUSB, atau simulasi lokal jika printer tidak tersedia.</p></div></div><div className="kiosk-actions">{button("Konfirmasi cetak", "/kiosk/mencetak")}{button("Edit lagi", "/kiosk/editor", true)}</div></>;
      break;
    case "/kiosk/mencetak":
      title = progress >= 100 ? "Cetak selesai" : "Menyiapkan cetakan";
      content = <><p aria-live="polite">{progress >= 100 ? "Printer tidak terhubung. Simulasi lokal, tidak ada perintah USB." : "Memproses cetakan lokal. Hubungkan printer WebUSB untuk cetak nyata."}</p><div className="kiosk-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progres simulasi cetak"><span style={{ width: `${progress}%` }}/></div><p>{progress}%</p><div className="kiosk-actions"><button className="nb-button" onClick={() => { setProgress(0); window.setTimeout(() => setProgress(100), 400); }}>Ulangi simulasi</button>{button("Lanjut", "/kiosk/hasil", true)}</div></>;
      break;
    case "/kiosk/hasil":
      title = "Hasil fotomu siap!";
      content = <><p>Terima kasih sudah berfoto bersama SnapArcade.</p><div className="kiosk-code"><strong>QR hasil foto</strong><br/>{qrUrl || "QR sedang dimuat"}<br/><small>Scan untuk membuka gallery.</small></div><p>Cetak: {copies} copy · {packageInfo.detail}</p><div className="kiosk-actions">{button("Selesai, kembali ke awal", "/kiosk/idle")}{button("Foto lagi", "/kiosk/pilih-paket", true)}</div></>;
      break;
    default:
      title = "Halaman kiosk tidak ditemukan";
      content = <>{button("Kembali ke awal", "/kiosk")}</>;
  }

  return <div className="kiosk-screen"><header className="kiosk-top"><Link href="/kiosk/idle" className="kiosk-brand">SNAPARCADE</Link>{path !== "/kiosk" && <span className="kiosk-step">{Math.max(step - 2, 0)} / 9</span>}</header><section className="kiosk-stage" aria-labelledby="kiosk-title"><h1 id="kiosk-title">{title}</h1>{content}</section></div>;
}
