import type { Metadata } from "next";
import { PrivacyPage } from "../public-pages";
export const metadata: Metadata = { title: "Kebijakan Privasi", description: "Ringkasan privasi prototipe SnapArcade dan data layanan yang dirancang.", alternates: { canonical: "/kebijakan-privasi" } };
export default function Page() { return <PrivacyPage />; }
