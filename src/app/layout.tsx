import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://snaparcade.id"),
  title: { default: "SnapArcade | Operasional Photobooth", template: "%s | SnapArcade" },
  description: "Platform untuk mengelola operasional photobooth, kiosk, dan sesi foto.",
  openGraph: { type: "website", locale: "id_ID", siteName: "SnapArcade", title: "SnapArcade | Operasional Photobooth", description: "Platform untuk mengelola operasional photobooth, kiosk, dan sesi foto." },
  twitter: { card: "summary_large_image", title: "SnapArcade | Operasional Photobooth", description: "Platform untuk mengelola operasional photobooth, kiosk, dan sesi foto." },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
