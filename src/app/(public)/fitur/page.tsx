import { FeaturesPage } from "../public-pages";
import { createPageMetadata } from "@/lib/seo";
export const metadata = createPageMetadata("Fitur", "Kenali fitur analitik, perangkat, kustomisasi, dan alur kiosk SnapArcade.", "/fitur");
export default function Page() { return <FeaturesPage />; }
