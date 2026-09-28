import type { Metadata } from "next";
import { FaqPage } from "../public-pages";
export const metadata: Metadata = { title: "FAQ", description: "Jawaban tentang undangan, paket, pembayaran, perangkat, dan penyimpanan SnapArcade.", alternates: { canonical: "/faq" } };
export default function Page() { return <FaqPage />; }
