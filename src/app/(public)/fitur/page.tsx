import type { Metadata } from "next";
import { FeaturesPage } from "../public-pages";
export const metadata: Metadata = { title: "Fitur", description: "Kenali fitur analitik, perangkat, kustomisasi, dan alur kiosk SnapArcade.", alternates: { canonical: "/fitur" } };
export default function Page() { return <FeaturesPage />; }
