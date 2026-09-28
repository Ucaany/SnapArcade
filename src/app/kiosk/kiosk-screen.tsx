"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const steps = ["/kiosk", "/kiosk/pair", "/kiosk/idle", "/kiosk/pilih-paket", "/kiosk/pembayaran", "/kiosk/voucher", "/kiosk/sesi", "/kiosk/editor", "/kiosk/preview-cetak", "/kiosk/mencetak", "/kiosk/hasil"];
const packages = [{ name: "Satu Strip", detail: "4 foto · 1 strip", price: 25000 }, { name: "Dua Strip", detail: "8 foto · 2 strip", price: 40000 }, { name: "Pesta Foto", detail: "8 foto · 3 strip", price: 55000 }];
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

  useEffect(() => {
    const saved = sessionStorage.getItem("snaparcade-kiosk");
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setSelected(state.selected === 1 ? 1 : 0); setShot(Number.isInteger(state.shot) ? Math.max(1, state.shot) : 1); setFilter(typeof state.filter === "string" ? state.filter : "Warna asli"); setCopies([1, 2, 3].includes(state.copies) ? state.copies : 1);
      } catch {
        sessionStorage.removeItem("snaparcade-kiosk");
      }
    }
  }, []);
  useEffect(() => { sessionStorage.setItem("snaparcade-kiosk", JSON.stringify({ selected, shot, filter, copies })); }, [selected, shot, filter, copies]);
  useEffect(() => {
    if (path !== "/kiosk/mencetak") return;
    setProgress(0);
    const timer = window.setInterval(() => setProgress((value) => value >= 100 ? 100 : value + 10), 350);
    return () => window.clearInterval(timer);
  }, [path]);
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

  const step = Math.max(0, steps.indexOf(path));
  const go = (to: string) => router.push(to);
  const button = (label: string, to: string, secondary = false) => <Link className="nb-button" style={secondary ? { background: "var(--nb-cyan)" } : undefined} href={to}>{label}</Link>;
  const packageInfo = packages[selected];
  let title = "SnapArcade";
  let content: React.ReactNode;

  switch (path) {
    case "/kiosk":
      title = "Mesin foto, siap?";
      content = <><p>Hubungkan kiosk ini dengan kode pairing dari dashboard. Mode demo tidak menghubungi server.</p><div className="kiosk-actions">{button("Masukkan kode pairing", "/kiosk/pair")}{button("Lanjut ke layar awal", "/kiosk/idle", true)}</div></>;
      break;
    case "/kiosk/pair":
      title = "Pairing arcade";
      content = <><p>Masukkan kode 6 digit dari dashboard. Aktivasi ditampilkan sebagai simulasi lokal.</p><form onSubmit={(event) => { event.preventDefault(); if (!/^\d{6}$/.test(pairCode)) { setNotice("Kode harus terdiri dari 6 angka."); return; } setNotice("Kode demo diterima. Kiosk siap digunakan."); window.setTimeout(() => go("/kiosk/idle"), 700); }}><label htmlFor="pair-code">Kode pairing</label><input id="pair-code" className="nb-input kiosk-input" inputMode="numeric" maxLength={6} value={pairCode} onChange={(event) => setPairCode(event.target.value.replace(/\D/g, ""))} placeholder="000000"/><p aria-live="polite">{notice}</p><div className="kiosk-actions"><button className="nb-button" type="submit">Aktifkan demo</button>{button("Kembali", "/kiosk")}</div></form></>;
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
      content = <><p>{packageInfo.name} · Rp{packageInfo.price.toLocaleString("id-ID")}</p><div className="kiosk-payment-layout"><div className="kiosk-qr" aria-label="QR pembayaran dummy, tidak dapat dipindai"><span>QRIS</span><small>SIMULASI</small></div><div><strong className="kiosk-timer" aria-live="polite">{String(Math.floor(paymentLeft / 60)).padStart(2, "0")}:{String(paymentLeft % 60).padStart(2, "0")}</strong><p aria-live="polite">{paymentLeft ? paymentState : "Transaksi demo kedaluwarsa. Tidak ada pembayaran diproses."}</p><small>Pemeriksaan status demo setiap 3 detik. QR ini tidak dapat dipindai.</small></div></div><div className="kiosk-actions"><button disabled={!paymentLeft} className="nb-button" onClick={() => { setPaymentState("Pembayaran berhasil (simulasi)"); go("/kiosk/sesi"); }}>Simulasikan pembayaran berhasil</button>{button("Gunakan voucher", "/kiosk/voucher", true)}{button("Ganti paket", "/kiosk/pilih-paket", true)}</div></>;
      break;
    case "/kiosk/voucher":
      title = "Punya kode voucher?";
      content = <><p>Masukkan kode untuk simulasi. Kode demo apa pun diterima, tanpa validasi server.</p><form onSubmit={(event) => { event.preventDefault(); if (!voucher.trim()) { setNotice("Isi kode voucher terlebih dahulu."); return; } setNotice("Voucher demo diterapkan."); window.setTimeout(() => go("/kiosk/sesi"), 700); }}><label htmlFor="voucher-code">Kode voucher</label><input id="voucher-code" className="nb-input kiosk-input" value={voucher} onChange={(event) => setVoucher(event.target.value)} placeholder="CONTOH"/><p aria-live="polite">{notice}</p><div className="kiosk-actions"><button className="nb-button" type="submit">Terapkan voucher demo</button>{button("Kembali ke paket", "/kiosk/pilih-paket", true)}</div></form></>;
      break;
    case "/kiosk/sesi":
      title = "Saatnya berpose!";
      content = <div className="kiosk-landscape"><div className="kiosk-photo kiosk-capture" style={{ transform: `scale(${zoom})` }}>{shot} / {selected === 2 ? 8 : selected === 1 ? 8 : 4}</div><div><p>Foto {shot} dari {selected === 2 || selected === 1 ? 8 : 4}. {retakes[shot] ?? 0}/2 pengambilan ulang.</p><p>Capture disimulasikan, kamera tidak digunakan.</p><div className="kiosk-actions"><button className="nb-button" onClick={() => setShot((value) => value >= (selected ? 8 : 4) ? 1 : value + 1)}>Ambil foto {shot === (selected ? 8 : 4) ? "lagi" : "berikutnya"}</button><button disabled={(retakes[shot] ?? 0) >= 2} className="nb-button" style={{ background: "var(--nb-cyan)" }} onClick={() => { setRetakes((value) => ({ ...value, [shot]: (value[shot] ?? 0) + 1 })); setNotice(`Foto ${shot} diulang (demo).`); }}>Ulangi foto</button><button className="nb-button" style={{ background: "var(--nb-pink)" }} onClick={() => setZoom((value) => value === 1 ? 1.25 : 1)}>Zoom {zoom > 1 ? "100%" : "125%"}</button></div><p aria-live="polite">{notice}</p><div className="kiosk-actions">{button("Lanjut ke editor", "/kiosk/editor")}</div></div></div>;
      break;
    case "/kiosk/editor":
      title = "Atur hasil fotomu";
      content = <><div className="kiosk-landscape"><div className={`kiosk-strip kiosk-frame-${frame}`} style={{ filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)` }}>{[0, 1, 2, 3].map((i) => <span key={i}>FOTO {i + 1}</span>)}<b>{frames[frame]}</b></div><div><label htmlFor="brightness">Kecerahan {brightness}%</label><input id="brightness" type="range" min="50" max="150" value={brightness} onChange={(e) => setBrightness(Number(e.target.value))}/><label htmlFor="contrast">Kontras {contrast}%</label><input id="contrast" type="range" min="50" max="150" value={contrast} onChange={(e) => setContrast(Number(e.target.value))}/><label htmlFor="saturation">Saturasi {saturation}%</label><input id="saturation" type="range" min="0" max="180" value={saturation} onChange={(e) => setSaturation(Number(e.target.value))}/><p>Pilih frame</p><div className="kiosk-frame-picker">{frames.map((name, index) => <button key={name} className="nb-button" aria-pressed={frame === index} style={{ background: ["var(--nb-primary)", "var(--nb-pink)", "var(--nb-cyan)", "white", "var(--nb-lime)"][index] }} onClick={() => setFrame(index)}>{name}</button>)}</div><p className="kiosk-note">Filter diterapkan sebagai pratinjau CSS; foto kamera belum tersedia.</p></div></div><div className="kiosk-actions">{button("Lihat preview cetak", "/kiosk/preview-cetak")}</div></>;
      break;
    case "/kiosk/preview-cetak":
      title = "Preview cetak";
      content = <><div className="kiosk-landscape"><div className="kiosk-strip"><span>SNAP</span><span>ARCADE</span><span>{filter}</span><span>FOTO</span></div><div><p>{packageInfo.detail}</p><label htmlFor="copies">Jumlah cetak</label><select id="copies" className="nb-input" value={copies} onChange={(event) => setCopies(Number(event.target.value))}>{[1, 2, 3].map((n) => <option key={n} value={n}>{n} copy</option>)}</select><p className="kiosk-note">Pratinjau layout demo. Printer belum terhubung.</p></div></div><div className="kiosk-actions">{button("Konfirmasi cetak", "/kiosk/mencetak")}{button("Edit lagi", "/kiosk/editor", true)}</div></>;
      break;
    case "/kiosk/mencetak":
      title = progress >= 100 ? "Cetak simulasi selesai" : "Menyiapkan cetakan";
      content = <><p aria-live="polite">{progress >= 100 ? "Tidak ada printer terhubung, ini hanya simulasi." : "Simulasi proses cetak, tidak ada perintah ke printer."}</p><div className="kiosk-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Progres simulasi cetak"><span style={{ width: `${progress}%` }}/></div><p>{progress}%</p><div className="kiosk-actions"><button className="nb-button" onClick={() => { setProgress(0); window.setTimeout(() => setProgress(100), 400); }}>Ulangi simulasi</button>{button("Lanjut", "/kiosk/hasil", true)}</div></>;
      break;
    case "/kiosk/hasil":
      title = "Hasil fotomu siap!";
      content = <><p>Terima kasih sudah berfoto bersama SnapArcade.</p><div className="kiosk-code">▦<br/>QR unduhan demo<br/><small>Tidak mengarah ke file foto</small></div><p>Cetak: {copies} copy · {packageInfo.detail}</p><div className="kiosk-actions">{button("Selesai, kembali ke awal", "/kiosk/idle")}{button("Foto lagi", "/kiosk/pilih-paket", true)}</div></>;
      break;
    default:
      title = "Halaman kiosk tidak ditemukan";
      content = <>{button("Kembali ke awal", "/kiosk")}</>;
  }

  return <div className="kiosk-screen"><header className="kiosk-top"><Link href="/kiosk/idle" className="kiosk-brand">SNAPARCADE</Link>{path !== "/kiosk" && <span className="kiosk-step">{Math.max(step - 2, 0)} / 9</span>}</header><section className="kiosk-stage" aria-labelledby="kiosk-title"><h1 id="kiosk-title">{title}</h1>{content}</section></div>;
}
