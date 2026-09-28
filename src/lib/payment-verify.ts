import "server-only";

export type PaymentProvider = "midtrans" | "xendit" | "tripay";
export type PaymentConfig = Record<string, string>;
export type VerificationResult = { verified: boolean; message: string; latencyMs: number };

const timeoutMs = 10_000;

function value(config: PaymentConfig, ...keys: string[]) {
  return keys.map((key) => config[key]).find((item) => typeof item === "string" && item.trim().length > 0)?.trim();
}

function required(provider: PaymentProvider, config: PaymentConfig) {
  if (provider === "midtrans" && !value(config, "serverKey", "server_key", "apiKey")) return "Server key Midtrans wajib diisi.";
  if (provider === "xendit" && !value(config, "secretKey", "secret_key", "apiKey")) return "Secret key Xendit wajib diisi.";
  if (provider === "tripay" && (!value(config, "apiKey", "api_key") || !value(config, "privateKey", "private_key") || !value(config, "merchantCode", "merchant_code"))) return "API key, private key, dan merchant code Tripay wajib diisi.";
  return null;
}

async function request(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try { return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" }); }
  finally { clearTimeout(timer); }
}

async function result(response: Response, accepted: number[]) {
  if (accepted.includes(response.status)) return { verified: true, message: "Koneksi credential berhasil diverifikasi." };
  const body = await response.json().catch(() => null) as { message?: string; status_message?: string } | null;
  if (response.status === 401 || response.status === 403) return { verified: false, message: "Credential ditolak oleh provider." };
  return { verified: false, message: body?.message ?? body?.status_message ?? `Provider mengembalikan HTTP ${response.status}.` };
}

export async function verifyPaymentCredential(provider: PaymentProvider, config: PaymentConfig, sandbox: boolean): Promise<VerificationResult> {
  const missing = required(provider, config);
  if (missing) return { verified: false, message: missing, latencyMs: 0 };
  const started = Date.now();
  try {
    let response: Response;
    if (provider === "midtrans") {
      const serverKey = value(config, "serverKey", "server_key", "apiKey")!;
      const base = sandbox ? "https://api.sandbox.midtrans.com" : "https://api.midtrans.com";
      response = await request(`${base}/v2/SNAPARCADE-CONNECTION-CHECK/status`, { headers: { Accept: "application/json", Authorization: `Basic ${Buffer.from(`${serverKey}:`).toString("base64")}` } });
      const checked = await result(response, [200, 404]);
      return { ...checked, latencyMs: Date.now() - started };
    }
    if (provider === "xendit") {
      const secretKey = value(config, "secretKey", "secret_key", "apiKey")!;
      response = await request("https://api.xendit.co/v2/invoices/SNAPARCADE-CONNECTION-CHECK", { headers: { Accept: "application/json", Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}` } });
      const checked = await result(response, [200, 404]);
      return { ...checked, latencyMs: Date.now() - started };
    }
    const apiKey = value(config, "apiKey", "api_key")!;
    const base = sandbox ? "https://tripay.co.id/api-sandbox" : "https://tripay.co.id/api";
    response = await request(`${base}/merchant/payment-channel`, { headers: { Accept: "application/json", Authorization: `Bearer ${apiKey}` } });
    const body = await response.json().catch(() => null) as { success?: boolean; message?: string } | null;
    return { verified: response.ok && body?.success === true, message: response.ok && body?.success === true ? "Koneksi credential berhasil diverifikasi." : body?.message ?? `Provider mengembalikan HTTP ${response.status}.`, latencyMs: Date.now() - started };
  } catch (error) {
    return { verified: false, message: error instanceof Error && error.name === "AbortError" ? "Provider tidak merespons dalam 10 detik." : "Koneksi ke provider gagal.", latencyMs: Date.now() - started };
  }
}
