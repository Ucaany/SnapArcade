import { Archivo_Black, Inter, Space_Grotesk } from "next/font/google";
import Link from "next/link";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const archivoBlack = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--font-archivo-black" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const links = [
    ["Fitur", "/fitur"], ["Harga", "/harga"], ["Tentang", "/tentang"],
    ["Kontak", "/kontak"], ["FAQ", "/faq"],
  ];
  return (
    <div className={`public-theme ${spaceGrotesk.variable} ${archivoBlack.variable} ${inter.variable}`}>
      <header className="border-b-[3px] border-black bg-[#fffdf0]">
        <nav aria-label="Navigasi utama" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link className="font-[family-name:var(--font-space-grotesk)] text-2xl font-extrabold" href="/">SnapArcade<span className="text-[#b45309]">.</span></Link>
          <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-3 text-sm font-bold">
            {links.map(([label, href]) => <Link className="min-h-11 inline-flex items-center underline-offset-4 hover:underline" href={href} key={href}>{label}</Link>)}
            <Link className="nb-button" href="/masuk">Login</Link>
          </div>
        </nav>
      </header>
      {children}
      <footer className="border-t-[3px] border-black bg-[#fffdf0] px-5 py-8">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 text-sm font-semibold">
          <span>SnapArcade</span>
          <div className="flex flex-wrap gap-x-5 gap-y-3"><Link href="/fitur">Fitur</Link><Link href="/harga">Harga</Link><Link href="/tentang">Tentang</Link><Link href="/kontak">Kontak</Link><Link href="/faq">FAQ</Link><Link href="/syarat-ketentuan">Syarat & Ketentuan</Link><Link href="/kebijakan-privasi">Kebijakan Privasi</Link></div>
        </div>
      </footer>
    </div>
  );
}
