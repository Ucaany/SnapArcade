import assert from "node:assert/strict";
import { encryptCredential, decryptCredential } from "./payment-crypto";

process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
const value = { apiKey: "test-only-value" };
const first = encryptCredential(value);
const second = encryptCredential(value);
assert.notEqual(first, second);
assert.deepEqual(decryptCredential(first), value);
const [version, nonce, ciphertext, tag] = first.split(".");
assert.throws(() => decryptCredential(`${version}.${nonce}.${ciphertext}.${tag.slice(0, -1)}${tag.endsWith("A") ? "B" : "A"}`));
process.env.ENCRYPTION_KEY = "invalid";
assert.throws(() => encryptCredential(value));
