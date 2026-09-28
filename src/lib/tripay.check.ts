import assert from "node:assert/strict";
import { signaturesMatch, tripayCallbackSignature, tripayCreateSignature, tripayStatus } from "./tripay-crypto";

const config = { merchantCode: "T0001", privateKey: "ytf6ooi2gmlNPfpchd94jDOk8hRWOu" };
assert.equal(tripayCreateSignature(config, "INV55567", 1500000), "9f167eba844d1fcb369404e2bda53702e2f78f7aa12e91da6715414e65b8c86a");
const body = '{"reference":"T0001000000000000006","merchant_ref":"INV55567","status":"PAID"}';
const signature = tripayCallbackSignature(body, config.privateKey);
assert(signaturesMatch(signature, signature));
assert(!signaturesMatch(signature, tripayCallbackSignature(`${body} `, config.privateKey)));
assert(!signaturesMatch(signature, null));
assert(!signaturesMatch(signature, undefined));
assert.equal(tripayStatus("PAID"), "settlement");
assert.equal(tripayStatus("EXPIRED"), "expired");
assert.equal(tripayStatus("FAILED"), "failed");
assert.equal(tripayStatus("REFUND"), "failed");
assert.equal(tripayStatus("UNPAID"), "pending");
assert.equal(tripayStatus(undefined), "pending");
