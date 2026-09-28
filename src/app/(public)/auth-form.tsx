"use client";

import { useActionState } from "react";
import { acceptInvitation, signIn } from "@/app/auth-actions";

const initial = { error: "" };

export function AuthForm({ mode, token }: { mode: "login" | "invite"; token?: string }) {
  const invite = mode === "invite";
  const [state, action, pending] = useActionState(invite ? acceptInvitation : signIn, initial);
  return <form action={action} className="nb-card w-full bg-white p-6 sm:p-8">
    <h2 className="font-[family-name:var(--font-space-grotesk)] text-3xl font-extrabold">{invite ? "Aktifkan akun" : "Masuk"}</h2>
    <p className="mt-2 text-sm leading-6">{invite ? "Buat password dan lengkapi nama usaha kamu." : "Gunakan email dan password akun terdaftar."}</p>
    <div className="mt-6 space-y-5">
      {invite ? <><input type="hidden" name="token" value={token ?? ""} /><Field label="Nama bisnis" name="businessName" placeholder="Contoh: Studio Senyum Abadi" maxLength={200} /></> : <Field label="Email" name="email" type="email" placeholder="nama@bisnis.id" autoComplete="email" />}
      <Field label="Password" name="password" type="password" placeholder={invite ? "Minimal 8 karakter" : "Masukkan password"} autoComplete={invite ? "new-password" : "current-password"} minLength={8} maxLength={128} />
    </div>
    {state.error && <p aria-live="polite" className="mt-5 border-[2px] border-black bg-[#fca5a5] p-3 text-sm font-semibold" role="alert">{state.error}</p>}
    <button className="nb-button mt-6 w-full disabled:cursor-wait disabled:opacity-70" disabled={pending} type="submit">{pending ? "Memproses..." : invite ? "Aktifkan akun" : "Masuk ke SnapArcade"}</button>
  </form>;
}

function Field({ label, name, type = "text", placeholder, autoComplete, minLength, maxLength }: { label: string; name: string; type?: string; placeholder: string; autoComplete?: string; minLength?: number; maxLength?: number }) {
  return <div className="space-y-2"><label className="block font-bold" htmlFor={name}>{label}</label><input className="nb-input" id={name} name={name} type={type} placeholder={placeholder} autoComplete={autoComplete} minLength={minLength} maxLength={maxLength} required /></div>;
}
