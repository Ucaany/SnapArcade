export type Role = "owner" | "staff" | "superadmin";

export function roleForPath(path: string): Role | null {
  if (path === "/dashboard" || path.startsWith("/dashboard/")) return "owner";
  if (path === "/staff" || path.startsWith("/staff/")) return "staff";
  if (path === "/admin" || path.startsWith("/admin/")) return "superadmin";
  return null;
}

export function landingForRole(role: Role) {
  return role === "owner" ? "/dashboard" : role === "staff" ? "/staff" : "/admin";
}
