import { PricingPage } from "../public-pages";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata("Harga", "Lihat paket Starter, Growth, dan Enterprise SnapArcade.", "/harga");
export default function Page() { return <PricingPage />; }
