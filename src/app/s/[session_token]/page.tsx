import { notFound } from "next/navigation";
import { publicSession, signedPhotoUrls } from "@/lib/kiosk-session";

export const dynamic = "force-dynamic";
export default async function Gallery({ params }: { params: Promise<{ session_token: string }> }) {
  const session = await publicSession((await params).session_token);
  if (!session) notFound();
  const photos = await signedPhotoUrls(session.id, 60 * 60);
  return <main className="public-theme mx-auto min-h-screen max-w-4xl bg-[#FFFDF0] p-6 text-[#0A0A0A] sm:p-12"><h1 className="text-4xl font-black tracking-tight">Hasil foto SnapArcade</h1><p className="mt-3 text-lg">Foto tersedia untuk diunduh selama 7 hari.</p><a className="mt-6 inline-block border-4 border-[#0A0A0A] bg-[#FFD60A] px-5 py-4 font-bold shadow-[6px_6px_0_#0A0A0A]" href={`/api/s/${session.sessionToken}/download`}>Unduh semua foto</a><div className="mt-10 grid gap-5 sm:grid-cols-2">{photos.map((photo) => <figure key={photo.id} className="border-4 border-[#0A0A0A] bg-white p-3"><img src={photo.url} alt={`Foto ${photo.order_index + 1}`} className="w-full" /></figure>)}</div></main>;
}
