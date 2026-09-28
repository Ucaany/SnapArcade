import { createHmac } from "node:crypto";

export type TripayStatus = "pending" | "settlement" | "expired" | "failed";

export function tripayStatus(status: string | undefined): TripayStatus { if (status === "PAID") return "settlement"; if (status === "EXPIRED") return "expired"; if (["FAILED", "REFUND", "REFUNDED"].includes(status ?? "")) return "failed"; return "pending"; }
export function tripayCreateSignature(config: { merchantCode: string; privateKey: string }, merchantRef: string, amount: number) { return createHmac("sha256", config.privateKey).update(`${config.merchantCode}${merchantRef}${amount}`).digest("hex"); }
export function tripayCallbackSignature(rawBody: string, privateKey: string) { return createHmac("sha256", privateKey).update(rawBody).digest("hex"); }
export { signaturesMatch } from "@/lib/signature";
