import { createHmac, timingSafeEqual } from "node:crypto";

const baseUrl = process.env.PAKASIR_BASE_URL ?? "https://app.pakasir.com";

export function verifyPakasirSignature(rawBody: string, signature: string | null) {
  const secret = process.env.PAKASIR_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const actual = signature.replace(/^sha256=/, "").trim();
  const expectedBuffer = Buffer.from(expected, "hex");
  const actualBuffer = Buffer.from(actual, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function createPakasirTransaction(orderId: string, amount: number, method = "qris") {
  const project = process.env.PAKASIR_PROJECT;
  const apiKey = process.env.PAKASIR_API_KEY;
  if (!project || !apiKey) throw new Error("Pakasir belum dikonfigurasi");
  const response = await fetch(`${baseUrl}/api/transactioncreate/${encodeURIComponent(method)}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ project, amount, order_id: orderId, api_key: apiKey }), cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as Record<string, any> | null;
  if (!response.ok || !payload) throw new Error("Pakasir gagal membuat transaksi");
  return payload;
}
