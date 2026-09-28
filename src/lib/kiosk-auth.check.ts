import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { PAIRING_CODE, KIOSK_TOKEN, generateKioskToken, hashToken, subscriptionActive, tokenMatches } from "./kiosk-auth";

// Token format checks
const token = generateKioskToken();
assert.match(token, KIOSK_TOKEN);
assert.equal(token.length, 64);
assert.match("123456", PAIRING_CODE);
assert.doesNotMatch("12345", PAIRING_CODE);
assert.doesNotMatch("1234567", PAIRING_CODE);
assert.doesNotMatch("abcdef", PAIRING_CODE);
assert.doesNotMatch(token, PAIRING_CODE);
assert.doesNotMatch("123456", KIOSK_TOKEN);

// Hashing is deterministic, differs from raw token, and verification is constant-time-safe
const hash = hashToken(token);
assert.notEqual(hash, token);
assert.equal(hash, createHash("sha256").update(token).digest("hex"));
assert.equal(hash.length, 64);
assert.equal(tokenMatches(token, hash), true);
assert.equal(tokenMatches(token, hashToken(generateKioskToken())), false);
assert.equal(tokenMatches(token, null), false);
assert.equal(tokenMatches(token, "not-a-hash"), false);
assert.equal(tokenMatches(token.toUpperCase(), hash), false);

// Subscription expiry logic
const base = {
  id: "sub", status: "active", machinesCount: 2, includedSessions: 100, addOnSessions: 50, sessionsUsed: 20, planMachineLimit: 3,
};
const future = new Date(Date.now() + 86_400_000);
const past = new Date(Date.now() - 86_400_000);
assert.equal(subscriptionActive({ ...base, expiresAt: future }), true);
assert.equal(subscriptionActive({ ...base, expiresAt: null }), true);
assert.equal(subscriptionActive({ ...base, expiresAt: past }), false);
assert.equal(subscriptionActive({ ...base, status: "pending", expiresAt: future }), false);
assert.equal(subscriptionActive({ ...base, status: "cancelled", expiresAt: null }), false);

console.info("Kiosk auth checks passed.");
