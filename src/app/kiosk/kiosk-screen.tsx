"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const steps = ["/kiosk", "/kiosk/pair", "/kiosk/idle", "/kiosk/pilih-paket", "/kiosk/pembayaran", "/kiosk/voucher", "/kiosk/sesi", "/kiosk/editor", "/kiosk/preview-cetak", "/kiosk/mencetak", "/kiosk/hasil"];
const packages = [{ name: "Satu Strip", detail: "4 foto · 1 strip", price: 25000 }, { name: "Dua Strip", detail: "8 foto · 2 strip", price: 40000 }];

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
      content = <><div className="kiosk-photo" aria-label="Contoh layar foto">SNAP!</div><p>Pilih paket, berpose, lalu bawa pulang hasil fotomu.</p><div className="kiosk-actions">{button("Mulai foto", "/kiosk/pilih-paket")}{button("Pengaturan kiosk", "/kiosk/pair", true)}</div></>;
      break;
    case "/kiosk/pilih-paket":
      title = "Pilih paket foto";
      content = <><div className="kiosk-grid">{packages.map((item, index) => <button key={item.name} type="button" className="nb-card kiosk-option" aria-pressed={selected === index} onClick={() => setSelected(index)}><strong>{item.name}</strong>{item.detail}<p><b>Rp{item.price.toLocaleString("id-ID")}</b></p></button>)}</div><div className="kiosk-actions"><button className="nb-button" onClick={() => go("/kiosk/pembayaran")}>Lanjut, {packageInfo.name}</button>{button("Pakai voucher", "/kiosk/voucher", true)}</div><p className="kiosk-note">Harga contoh untuk demo, bukan penawaran transaksi.</p></>;
      break;
    case "/kiosk/pembayaran":
      title = "Pembayaran demo";
      content = <><p>{packageInfo.name} · Rp{packageInfo.price.toLocaleString("id-ID")}</p><div className="kiosk-code">QRIS / E-Wallet<br/>Pratinjau saja, tidak dapat dipindai</div><p aria-live="polite">Menunggu pembayaran simulasi</p><div className="kiosk-actions"><button className="nb-button" onClick={() => go("/kiosk/sesi")}>Simulasikan pembayaran berhasil</button>{button("Gunakan voucher", "/kiosk/voucher", true)}{button("Ganti paket", "/kiosk/pilih-paket", true)}</div></>;
      break;
    case "/kiosk/voucher":
      title = "Punya kode voucher?";
      content = <><p>Masukkan kode untuk simulasi. Kode demo apa pun diterima, tanpa validasi server.</p><form onSubmit={(event) => { event.preventDefault(); if (!voucher.trim()) { setNotice("Isi kode voucher terlebih dahulu."); return; } setNotice("Voucher demo diterapkan."); window.setTimeout(() => go("/kiosk/sesi"), 700); }}><label htmlFor="voucher-code">Kode voucher</label><input id="voucher-code" className="nb-input kiosk-input" value={voucher} onChange={(event) => setVoucher(event.target.value)} placeholder="CONTOH"/><p aria-live="polite">{notice}</p><div className="kiosk-actions"><button className="nb-button" type="submit">Terapkan voucher demo</button>{button("Kembali ke paket", "/kiosk/pilih-paket", true)}</div></form></>;
      break;
    case "/kiosk/sesi":
      title = "Saatnya berpose!";
      content = <div className="kiosk-landscape"><div className="kiosk-photo">{shot} / {selected ? 8 : 4}</div><div><p>Foto {shot} dari {selected ? 8 : 4}</p><p>Ambil foto disimulasikan, kamera tidak digunakan.</p><div className="kiosk-actions"><button className="nb-button" onClick={() => setShot((value) => value >= (selected ? 8 : 4) ? 1 : value + 1)}>Ambil foto berikutnya</button><button className="nb-button" style={{ background: "var(--nb-cyan)" }} onClick={() => setNotice(`Foto ${shot} diulang (demo).`)}>Ulangi foto</button><button className="nb-button" style={{ background: "var(--nb-pink)" }} onClick={() => setFilter(filter === "Warna asli" ? "Hitam putih" : "Warna asli")}>Filter: {filter}</button></div><p aria-live="polite">{notice}</p><div className="kiosk-actions">{button("Lanjut ke editor", "/kiosk/editor")}</div></div></div>;
      break;
    case "/kiosk/editor":
      title = "Atur hasil fotomu";
      content = <><div className="kiosk-landscape"><div className="kiosk-strip"><span>SNAP</span><span>ARCADE</span><span>{filter}</span><span>FOTO</span></div><div><label htmlFor="brightness">Kecerahan</label><input id="brightness" type="range" min="50" max="150" defaultValue="100"/><p>Pilih tampilan foto</p><div className="kiosk-actions"><button className="nb-button" onClick={() => setFilter("Warna asli")}>Warna asli</button><button className="nb-button" style={{ background: "var(--nb-pink)" }} onClick={() => setFilter("Hitam putih")}>Hitam putih</button><button className="nb-button" style={{ background: "var(--nb-cyan)" }} onClick={() => setFilter("Hangat")}>Hangat</button></div></div></div><div className="kiosk-actions">{button("Lihat preview cetak", "/kiosk/preview-cetak")}</div></>;
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
