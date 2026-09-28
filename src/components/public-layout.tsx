"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const links = [["Fitur", "/fitur"], ["Harga", "/harga"], ["Tentang", "/tentang"], ["Kontak", "/kontak"], ["FAQ", "/faq"]];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return <header className="border-b-[3px] border-black bg-[#fffdf0]">
    <nav aria-label="Navigasi utama" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-3">
      <Link className="font-[family-name:var(--font-space-grotesk)] text-2xl font-extrabold" href="/">SnapArcade<span className="text-[#b45309]">.</span></Link>
      <button aria-expanded={open} aria-controls="public-navigation" aria-label={open ? "Tutup navigasi" : "Buka navigasi"} className="inline-flex size-11 items-center justify-center rounded-lg border-[3px] border-black bg-white md:hidden" onClick={() => setOpen(!open)}>{open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</button>
      <div id="public-navigation" className={`${open ? "flex" : "hidden"} w-full flex-col gap-2 pb-2 text-sm font-bold md:flex md:w-auto md:flex-row md:items-center md:gap-5 md:pb-0`}>
        {links.map(([label, href]) => <Link className="inline-flex min-h-11 items-center underline-offset-4 hover:underline" href={href} key={href} onClick={() => setOpen(false)}>{label}</Link>)}
        <Link className="nb-button min-h-11" href="/masuk" onClick={() => setOpen(false)}>Login</Link>
      </div>
    </nav>
  </header>;
}

export function PublicFooter() {
  return <footer className="border-t-[3px] border-black bg-[#fffdf0] px-5 py-8">
    <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 text-sm font-semibold">
      <span>SnapArcade</span>
      <nav aria-label="Navigasi footer" className="flex flex-wrap gap-x-5 gap-y-3">{[...links, ["Syarat & Ketentuan", "/syarat-ketentuan"], ["Kebijakan Privasi", "/kebijakan-privasi"]].map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</nav>
    </div>
  </footer>;
}
