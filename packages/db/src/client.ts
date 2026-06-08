import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index.js";

// postgres.js opens connections lazily — no network call until first query.
// A fallback URL lets the module import safely during `next build` without DATABASE_URL.
const sql = postgres(process.env.DATABASE_URL ?? "postgresql://localhost:5432/mahara", {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false, // required for SET LOCAL (RLS context) + pgvector
});

export const db = drizzle(sql, { schema });
export type Database = typeof db;
