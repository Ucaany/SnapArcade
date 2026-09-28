import type { Metadata } from "next";
import { Inter, Archivo_Black, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter-loaded" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk-loaded" });
const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--font-archivo-black-loaded" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://snaparcade.id"),
  title: { default: "SnapArcade | Operasional Photobooth", template: "%s | SnapArcade" },
  description: "Platform untuk mengelola operasional photobooth, kiosk, dan sesi foto.",
  openGraph: { type: "website", locale: "id_ID", siteName: "SnapArcade", title: "SnapArcade | Operasional Photobooth", description: "Platform untuk mengelola operasional photobooth, kiosk, dan sesi foto." },
  twitter: { card: "summary_large_image", title: "SnapArcade | Operasional Photobooth", description: "Platform untuk mengelola operasional photobooth, kiosk, dan sesi foto." },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${inter.variable} ${spaceGrotesk.variable} ${archivoBlack.variable}`}>
      <body>{children}</body>
    </html>
  );
}
