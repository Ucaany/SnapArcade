import type { Metadata } from "next";
import { PricingPage } from "../public-pages";
export const metadata: Metadata = { title: "Harga", description: "Lihat paket Starter, Growth, dan Enterprise SnapArcade.", alternates: { canonical: "/harga" } };
export default function Page() { return <PricingPage />; }
