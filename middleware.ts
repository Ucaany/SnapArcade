import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { eq } from "drizzle-orm";
import { db } from "./src/db";
import { profiles } from "./src/db/schema";
import { landingForRole, roleForPath } from "./src/lib/auth-policy";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookies) => {
        cookies.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user) {
    if (roleForPath(path)) {
      const url = request.nextUrl.clone();
      url.pathname = "/masuk";
      url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    return response;
  }

  let profile;
  try {
    [profile] = await db.select({ role: profiles.role, status: profiles.status }).from(profiles).where(eq(profiles.id, user.id)).limit(1);
  } catch {
    profile = undefined;
  }
  if (!profile || profile.status !== "active") {
    if (roleForPath(path) || path === "/") {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/masuk";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return response;
  }
  const expectedRole = roleForPath(path);
  if (expectedRole && expectedRole !== profile.role) {
    const url = request.nextUrl.clone();
    url.pathname = landingForRole(profile.role);
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (path === "/" || path === "/masuk") {
    const url = request.nextUrl.clone();
    url.pathname = landingForRole(profile.role);
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ["/", "/masuk", "/dashboard/:path*", "/staff/:path*", "/admin/:path*"] };
