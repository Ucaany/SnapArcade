import { createHmac } from "node:crypto";
import { verifyPakasirSignature } from "./pakasir";

const body = JSON.stringify({ order_id: "INV-1", amount: 50000, status: "completed" });
const secret = "check-secret";
process.env.PAKASIR_WEBHOOK_SECRET = secret;
const signature = createHmac("sha256", secret).update(body).digest("hex");
if (!verifyPakasirSignature(body, signature) || verifyPakasirSignature(body, `${signature.slice(0, -1)}0`)) throw new Error("Pakasir HMAC check failed");
console.log("Pakasir HMAC check passed");
