"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  return <Card className="rounded-xl border-[3px] border-black bg-[#22d3ee] p-6 shadow-[4px_4px_0_0_#0a0a0a] sm:p-8"><form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
    <label className="mb-5 block font-bold" htmlFor="contact-name">Nama<Input autoComplete="name" className="mt-2 border-[3px] border-black bg-white text-black shadow-[4px_4px_0_0_#0a0a0a]" id="contact-name" name="name" onChange={() => setSubmitted(false)} placeholder="Nama kamu" required /></label>
    <label className="mb-5 block font-bold" htmlFor="contact-email">Email<Input autoComplete="email" className="mt-2 border-[3px] border-black bg-white text-black shadow-[4px_4px_0_0_#0a0a0a]" id="contact-email" name="email" onChange={() => setSubmitted(false)} placeholder="nama@email.com" required type="email" /></label>
    <label className="mb-5 block font-bold" htmlFor="contact-message">Yang ingin ditanyakan<textarea className="mt-2 min-h-32 w-full resize-y rounded-lg border-[3px] border-black bg-white p-3 text-black shadow-[4px_4px_0_0_#0a0a0a] outline-none focus-visible:ring-3 focus-visible:ring-black" id="contact-message" name="message" onChange={() => setSubmitted(false)} placeholder="Ceritakan kebutuhan booth kamu" required /></label>
    <Button type="submit" variant="public">Tampilkan status demo</Button>
    <p aria-live="polite" className="mt-4 text-sm font-bold">{submitted ? "Demo berhasil. Pesan tidak dikirim atau disimpan." : "Form demo. Jangan masukkan informasi sensitif."}</p>
  </form></Card>;
}
