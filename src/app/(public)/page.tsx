import type { Metadata } from "next";
import { HomePage } from "./public-pages";
import { createPageMetadata } from "@/lib/seo";

export const metadata: Metadata = createPageMetadata("Semua Booth, Satu Kendali", "Kelola operasional photobooth, pantau mesin, dan atur pengalaman kiosk dengan SnapArcade.", "/");

export default function Page() {
  return <HomePage />;
}
