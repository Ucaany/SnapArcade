import type { Metadata } from "next";
import { Inter, Archivo_Black, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { defaultDescription, ogImage, siteName, siteUrl } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter-loaded" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk-loaded" });
const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--font-archivo-black-loaded" });

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${siteName} | Operasional Photobooth`, template: `%s | ${siteName}` },
  description: defaultDescription,
  openGraph: { type: "website", locale: "id_ID", siteName, title: `${siteName} | Operasional Photobooth`, description: defaultDescription, images: [{ url: ogImage, width: 1200, height: 630, alt: `${siteName}, operasional photobooth` }] },
  twitter: { card: "summary_large_image", title: `${siteName} | Operasional Photobooth`, description: defaultDescription, images: [ogImage] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${inter.variable} ${spaceGrotesk.variable} ${archivoBlack.variable}`}>
      <body>{children}</body>
    </html>
  );
}
