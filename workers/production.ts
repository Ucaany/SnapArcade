export interface Env {
  APP_ORIGIN: string;
  CRON_SECRET: string;
}

interface ScheduledController {
  scheduledTime: number;
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

const providers = new Set(["pakasir", "midtrans", "xendit", "tripay"]);

function origin(env: Env) {
  return env.APP_ORIGIN.replace(/\/$/, "");
}

async function forwardWebhook(request: Request, provider: string, env: Env) {
  const target = `${origin(env)}/api/webhook/${provider}`;
  return fetch(target, new Request(request, { method: "POST" }));
}

async function runJob(env: Env, path: string) {
  return fetch(`${origin(env)}${path}`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.CRON_SECRET}` },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/webhooks\/([^/]+)$/);
    if (!match || request.method !== "POST" || !providers.has(match[1])) {
      return new Response("Not found", { status: 404 });
    }
    return forwardWebhook(request, match[1], env);
  },

  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(Promise.all([
      runJob(env, "/api/internal/notifications/sweep"),
      runJob(env, "/api/internal/analytics/refresh"),
    ]));
  },
};
