import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.clone();
  const code = url.searchParams.get("code");
  const token = url.searchParams.get("token");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    url.pathname = error || !token ? "/masuk" : `/undangan/${encodeURIComponent(token)}`;
    url.search = "";
    return NextResponse.redirect(url);
  }
  url.pathname = "/masuk";
  url.search = "";
  return NextResponse.redirect(url);
}
