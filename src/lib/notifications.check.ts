import assert from "node:assert/strict";
import { notificationWindows } from "./notification-policy";

const now = new Date("2026-09-28T12:00:00.000Z");
const windows = notificationWindows(now);
assert.equal(windows.offlineBefore.toISOString(), "2026-09-28T11:45:00.000Z");
assert.equal(windows.expiringFrom.toISOString(), "2026-10-04T12:00:00.000Z");
assert.equal(windows.expiringUntil.toISOString(), "2026-10-05T12:00:00.000Z");
