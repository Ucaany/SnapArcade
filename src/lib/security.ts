import "server-only";
import DOMPurify from "isomorphic-dompurify";

type Limit = { count: number; resetAt: number };
const localLimits = new Map<string, Limit>();

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("cf-connecting-ip")?.trim() || "unknown";
}

export function sanitizeText(value: string): string {
  return DOMPurify.sanitize(value, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

export function providerIpAllowed(request: Request, envName: string): boolean {
  const configured = process.env[envName]?.split(",").map((ip) => ip.trim()).filter(Boolean);
  if (!configured?.length) return process.env.NODE_ENV !== "production";
  const source = clientIp(request);
  return configured.some((entry) => ipInRange(source, entry));
}

function ipInRange(ip: string, range: string): boolean {
  const [address, prefixText] = range.split("/");
  const parts = (value: string) => value.split(".").map(Number);
  const ipParts = parts(ip);
  const rangeParts = parts(address);
  if (ipParts.length !== 4 || rangeParts.length !== 4 || [...ipParts, ...rangeParts].some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  if (prefixText === undefined) return ip === address;
  const prefix = Number(prefixText);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const toNumber = (values: number[]) => values.reduce((result, part) => result * 256 + part, 0) >>> 0;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (toNumber(ipParts) & mask) === (toNumber(rangeParts) & mask);
}

export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; retryAfter: number }> {
  const now = Date.now();
  const resetAt = now + windowSeconds * 1000;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([["INCR", key], ["EXPIRE", key, windowSeconds]]),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Rate limiter unavailable");
    const result = await response.json() as Array<{ result?: number }>;
    const count = Number(result[0]?.result);
    return { allowed: count <= limit, retryAfter: windowSeconds };
  }
  if (process.env.NODE_ENV === "production") throw new Error("UPSTASH_REDIS_REST_URL/TOKEN are required");
  const current = localLimits.get(key);
  if (!current || current.resetAt <= now) localLimits.set(key, { count: 1, resetAt });
  else current.count += 1;
  const state = localLimits.get(key)!;
  return { allowed: state.count <= limit, retryAfter: Math.max(1, Math.ceil((state.resetAt - now) / 1000)) };
}

export function rateLimited(retryAfter: number) {
  return new Response(JSON.stringify({ error: "rate_limited" }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": String(retryAfter), "Cache-Control": "no-store" },
  });
}
