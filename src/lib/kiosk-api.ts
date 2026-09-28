import { NextResponse } from "next/server";

export const NO_STORE = { "Cache-Control": "no-store" };

export function json(data: unknown, status = 200, headers: Record<string, string> = NO_STORE) {
  return NextResponse.json(data, { status, headers });
}

export function badRequest(error = "invalid_request") {
  return json({ error }, 400, NO_STORE);
}

export function unauthorized(error = "invalid_token") {
  return json({ error }, 401, NO_STORE);
}

export function notFound(error = "not_found") {
  return json({ error }, 404, NO_STORE);
}

export function conflict(error: string) {
  return json({ error }, 409, NO_STORE);
}

export function serverError() {
  return json({ error: "internal_error" }, 500, NO_STORE);
}
