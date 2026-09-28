export function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL is required");
  const url = new URL(value);
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") throw new Error("DATABASE_URL must use postgres:// or postgresql://");
  if (url.hostname === "db.your-project.supabase.co" || (url.hostname === "localhost" && url.username === "placeholder")) throw new Error("Set DATABASE_URL to a real development database before connecting");
  return value;
}
