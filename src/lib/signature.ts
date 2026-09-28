import { timingSafeEqual } from "node:crypto";

export function signaturesMatch(expected: string | null | undefined, actual: string | null | undefined) { if (!expected || !actual) return false; const a = Buffer.from(expected, "utf8"); const b = Buffer.from(actual, "utf8"); return a.length === b.length && timingSafeEqual(a, b); }
