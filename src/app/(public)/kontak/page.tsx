import type { Metadata } from "next";
import { ContactPage } from "../public-pages";
export const metadata: Metadata = { title: "Kontak", description: "Hubungi tim SnapArcade tentang paket dan kebutuhan photobooth.", alternates: { canonical: "/kontak" } };
export default function Page() { return <ContactPage />; }
