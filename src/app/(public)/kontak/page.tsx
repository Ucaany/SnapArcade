import { ContactPage } from "../public-pages";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata("Kontak", "Hubungi tim SnapArcade tentang paket dan kebutuhan photobooth.", "/kontak");
export default function Page() { return <ContactPage />; }
