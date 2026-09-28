import type { Metadata } from "next";
import { TermsPage } from "../public-pages";
export const metadata: Metadata = { title: "Syarat & Ketentuan", description: "Ringkasan syarat penggunaan prototipe SnapArcade.", alternates: { canonical: "/syarat-ketentuan" } };
export default function Page() { return <TermsPage />; }
