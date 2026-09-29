import { AboutPage } from "../public-pages";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata("Tentang", "Kenali tujuan SnapArcade untuk membantu operasional photobooth.", "/tentang");
export default function Page() { return <AboutPage />; }
