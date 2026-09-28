import assert from "node:assert/strict";
import { generateSessionToken, MAX_DOWNLOADS, storagePath } from "./kiosk-session";

const token = generateSessionToken();
assert.match(token, /^[A-Za-z0-9_-]{43}$/);
assert.equal(storagePath("owner", "session", "photo", "jpg"), "owner/session/photo.jpg");
assert.equal(MAX_DOWNLOADS, 20);
console.log("kiosk session helpers: ok");
