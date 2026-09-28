import type { Metadata } from "next";
import { HomePage } from "./public-pages";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SnapArcade",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "Platform untuk mengelola operasional photobooth, kiosk, dan sesi foto.",
  offers: [
    { "@type": "Offer", name: "Starter", price: "500000", priceCurrency: "IDR" },
    { "@type": "Offer", name: "Growth", price: "1200000", priceCurrency: "IDR" },
  ],
};

export const metadata: Metadata = {
  title: "Semua Booth, Satu Kendali",
  description: "Kelola operasional photobooth, pantau mesin, dan atur pengalaman kiosk dengan SnapArcade.",
  alternates: { canonical: "/" },
};

export default function Page() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /><HomePage /></>;
}
