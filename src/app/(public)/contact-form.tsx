"use client";

import { useState } from "react";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  return <form className="nb-card bg-[#22d3ee] p-6 sm:p-8" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
    <label className="mb-5 block font-bold">Nama<input autoComplete="name" className="nb-input mt-2" name="name" onChange={() => setSubmitted(false)} placeholder="Nama kamu" required /></label>
    <label className="mb-5 block font-bold">Email<input autoComplete="email" className="nb-input mt-2" name="email" onChange={() => setSubmitted(false)} placeholder="nama@email.com" required type="email" /></label>
    <label className="mb-5 block font-bold">Yang ingin ditanyakan<textarea className="nb-input mt-2 min-h-32 resize-y" name="message" onChange={() => setSubmitted(false)} placeholder="Ceritakan kebutuhan booth kamu" required /></label>
    <button className="nb-button min-h-11 bg-[#ffd60a]" type="submit">Tampilkan status demo</button>
    <p aria-live="polite" className="mt-4 text-sm font-bold">{submitted ? "Demo berhasil. Pesan tidak dikirim atau disimpan." : "Form demo. Jangan masukkan informasi sensitif."}</p>
  </form>;
}
