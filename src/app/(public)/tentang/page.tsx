import type { Metadata } from "next";
import { AboutPage } from "../public-pages";
export const metadata: Metadata = { title: "Tentang", description: "Kenali tujuan SnapArcade untuk membantu operasional photobooth.", alternates: { canonical: "/tentang" } };
export default function Page() { return <AboutPage />; }
