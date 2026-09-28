import type { Metadata } from "next";
import { AuthForm } from "../../auth-form";

export const metadata: Metadata = {
  title: "Aktivasi Undangan",
  description: "Aktifkan akun Owner SnapArcade melalui undangan.",
  robots: { index: false, follow: false },
};

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <main className="mx-auto grid min-h-[70vh] max-w-7xl items-center gap-10 px-5 py-12 md:grid-cols-[0.8fr_1.2fr] md:py-20">
    <section className="max-w-xl">
      <p className="mb-4 font-bold uppercase tracking-[0.12em]">Undangan SnapArcade</p>
      <h1 className="font-[family-name:var(--font-space-grotesk)] text-5xl font-extrabold leading-[1.02] sm:text-6xl">Mulai kelola booth kamu.</h1>
      <p className="mt-5 text-lg leading-8">Lengkapi profil usaha dan buat password untuk akun Owner.</p>
      <p className="mt-5 border-t-[3px] border-black pt-4 text-sm leading-6">Gunakan tautan aktivasi dari email undangan yang terdaftar.</p>
    </section>
    <AuthForm mode="invite" token={token} />
  </main>;
}
