import type { Metadata } from "next";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke SnapArcade dengan akun yang sudah diundang.",
  alternates: { canonical: "/masuk" },
};

export default function Page() {
  return <main className="mx-auto grid min-h-[70vh] max-w-7xl items-center gap-10 px-5 py-12 md:grid-cols-[0.8fr_1.2fr] md:py-20">
    <section className="max-w-xl">
      <p className="mb-4 font-bold uppercase tracking-[0.12em]">Akses akun SnapArcade</p>
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-5xl font-extrabold leading-[1.02] sm:text-6xl">Booth kamu, siap dikendalikan.</h1>
      <p className="mt-5 text-lg leading-8">Masuk untuk mengelola operasional photobooth. Akun hanya tersedia melalui undangan Superadmin.</p>
      <p className="mt-5 border-t-[3px] border-black pt-4 text-sm leading-6">Form ini simulasi. Autentikasi belum terhubung dan data yang dimasukkan tidak dikirim atau disimpan.</p>
    </section>
    <AuthForm mode="login" />
  </main>;
}
