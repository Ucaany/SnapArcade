"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

const plans = [
  { id: "starter", name: "Starter", detail: "2 mesin · Rp 500.000/bulan" },
  { id: "growth", name: "Growth", detail: "5 mesin · Rp 1.200.000/bulan" },
  { id: "enterprise", name: "Enterprise", detail: "Kebutuhan khusus · diskusikan" },
];

export function AuthForm({ mode, token }: { mode: "login" | "invite"; token?: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">("idle");
  const isInvite = mode === "invite";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    window.setTimeout(() => {
      setStatus(token === "demo-error" ? "error" : "success");
    }, 650);
  }

  const message = status === "error"
    ? "Simulasi gagal. Tautan undangan tidak dapat digunakan. Minta Superadmin mengirim undangan baru."
    : status === "success"
      ? isInvite ? "Simulasi aktivasi berhasil. Akun belum dibuat karena layanan autentikasi belum terhubung." : "Simulasi masuk berhasil. Akun belum diverifikasi karena layanan autentikasi belum terhubung."
      : "";

  return <form className="nb-card w-full bg-white p-6 sm:p-8" onSubmit={submit}>
    <h2 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-extrabold">{isInvite ? "Aktifkan akun" : "Masuk"}</h2>
    <p className="mt-2 text-sm leading-6">{isInvite ? "Isi informasi usaha dan akses akun kamu." : "Gunakan email dan password akun terdaftar."}</p>
    <div className="mt-6 space-y-5">
      {isInvite && <Field label="Nama bisnis" name="business" placeholder="Contoh: Studio Senyum Abadi" minLength={2} maxLength={200} />}
      <Field label="Email" name="email" type="email" placeholder="nama@bisnis.id" autoComplete="email" />
      <Field label="Password" name="password" type="password" placeholder={isInvite ? "Minimal 8 karakter" : "Masukkan password"} autoComplete={isInvite ? "new-password" : "current-password"} minLength={isInvite ? 8 : undefined} />
      {isInvite && <fieldset>
        <legend className="mb-2 font-bold">Paket awal</legend>
        <div className="space-y-2">
          {plans.map((plan, index) => <label className="flex min-h-14 cursor-pointer items-start gap-3 border-[2px] border-black p-3 has-[:checked]:bg-[#fff4b3]" key={plan.id}>
            <input className="mt-1 size-4 accent-black" type="radio" name="plan" value={plan.id} required defaultChecked={index === 0} />
            <span><span className="block font-bold">{plan.name}</span><span className="block text-sm">{plan.detail}</span></span>
          </label>)}
        </div>
        <p className="mt-2 text-xs leading-5">Harga Starter dan Growth mengikuti contoh dalam PRD, konfirmasi ketentuan sebelum berlangganan.</p>
      </fieldset>}
    </div>
    {message && <p aria-live="polite" className={`mt-5 border-[2px] border-black p-3 text-sm font-semibold ${status === "error" ? "bg-[#fca5a5]" : "bg-[#a3e635]"}`} role={status === "error" ? "alert" : "status"}>{message}</p>}
    <button className="nb-button mt-6 w-full disabled:cursor-wait disabled:opacity-70" disabled={status === "loading"} type="submit">
      {status === "loading" ? "Memproses..." : isInvite ? "Aktifkan akun" : "Masuk ke SnapArcade"}
    </button>
    {!isInvite && <p className="mt-5 text-center text-sm">Belum punya undangan? <Link className="font-bold underline underline-offset-4" href="/kontak">Hubungi tim SnapArcade</Link></p>}
  </form>;
}

function Field({ label, name, type = "text", placeholder, autoComplete, minLength, maxLength }: { label: string; name: string; type?: string; placeholder: string; autoComplete?: string; minLength?: number; maxLength?: number }) {
  return <div className="space-y-2">
    <label className="block font-bold" htmlFor={name}>{label}</label>
    <input className="nb-input" id={name} name={name} type={type} placeholder={placeholder} autoComplete={autoComplete} minLength={minLength} maxLength={maxLength} required />
  </div>;
}
