import assert from "node:assert/strict";
import { landingForRole, roleForPath } from "./auth-policy";

assert.equal(roleForPath("/dashboard"), "owner");
assert.equal(roleForPath("/dashboard/mesin"), "owner");
assert.equal(roleForPath("/staff"), "staff");
assert.equal(roleForPath("/admin/owner"), "superadmin");
assert.equal(roleForPath("/"), null);
assert.equal(landingForRole("owner"), "/dashboard");
assert.equal(landingForRole("staff"), "/staff");
assert.equal(landingForRole("superadmin"), "/admin");
console.info("Auth path policy checks passed.");
