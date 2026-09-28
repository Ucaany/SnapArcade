import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Login",
  description: "Akses SnapArcade tersedia untuk akun yang menerima undangan.",
  alternates: { canonical: "/masuk" },
};

export default function Page() {
  return <main className="mx-auto max-w-3xl px-5 py-20 sm:py-28"><section className="nb-card bg-[#ffd60a] p-7 sm:p-10"><p className="mb-4 font-bold uppercase tracking-[0.12em]">Akses akun</p><h1 className="font-[family-name:var(--font-space-grotesk)] text-5xl font-extrabold">Login melalui undangan.</h1><p className="mt-5 max-w-xl text-lg leading-8">Pendaftaran owner tertutup. Halaman autentikasi sedang disiapkan; akun SnapArcade hanya tersedia melalui undangan Superadmin.</p><Link className="nb-button mt-7 bg-white" href="/kontak">Hubungi tim SnapArcade</Link></section></main>;
}
