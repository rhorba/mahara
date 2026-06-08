import { sql } from "drizzle-orm";
import { db } from "./client";

/**
 * Wraps a DB operation in a transaction that sets RLS context vars.
 * Every protected query MUST go through this — role is set server-side only.
 */
export async function withUserContext<T>(
  userId: string,
  role: string,
  fn: (tx: typeof db) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT
        set_config('app.current_user', ${userId}, true),
        set_config('app.current_role', ${role}, true)`,
    );
    return fn(tx as unknown as typeof db);
  });
}
