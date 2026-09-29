import { FaqPage } from "../public-pages";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata("FAQ", "Jawaban tentang undangan, paket, pembayaran, perangkat, dan penyimpanan SnapArcade.", "/faq");
export default function Page() { return <FaqPage />; }
