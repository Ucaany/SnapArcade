import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { databaseUrl } from "./env";
import * as schema from "./schema";

const client = postgres(databaseUrl(), { max: 5, prepare: false, password: process.env.DATABASE_URL ? undefined : "" });
export const db = drizzle(client, { schema });
