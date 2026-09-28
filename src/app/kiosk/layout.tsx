import "./kiosk.css";

export const metadata = { manifest: "/manifest.webmanifest" };

export default function KioskLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <main className="kiosk-shell">{children}</main>;
}
