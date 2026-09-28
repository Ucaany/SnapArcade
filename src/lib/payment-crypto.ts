import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function key() {
  const encoded = process.env.ENCRYPTION_KEY ?? "";
  const decoded = Buffer.from(encoded, "base64");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || decoded.length !== 32 || decoded.toString("base64").replace(/=+$/, "") !== encoded.replace(/=+$/, "")) throw new Error("ENCRYPTION_KEY must be a base64-encoded 32-byte key");
  return decoded;
}

export function encryptCredential(value: unknown): string {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), nonce);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
  return `v1.${nonce.toString("base64url")}.${ciphertext.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}

export function decryptCredential(serialized: string): unknown {
  const [version, nonce, ciphertext, tag, extra] = serialized.split(".");
  if (version !== "v1" || !nonce || ciphertext === undefined || !tag || extra !== undefined) throw new Error("Invalid encrypted credential format");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(nonce, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8"));
}
