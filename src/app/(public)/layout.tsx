import { Archivo_Black, Inter, Space_Grotesk } from "next/font/google";
import { PublicFooter, PublicHeader } from "@/components/public-layout";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--font-archivo-black" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`public-theme ${spaceGrotesk.variable} ${archivoBlack.variable} ${inter.variable}`}>
      <PublicHeader />
      {children}
      <PublicFooter />
    </div>
  );
}
