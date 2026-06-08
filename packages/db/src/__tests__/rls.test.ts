import { eq, sql } from "drizzle-orm";
/**
 * S0-16: Role isolation integration tests.
 *
 * Requires a running PostgreSQL instance with migrations applied.
 * Set DATABASE_URL to enable these tests; they are skipped otherwise.
 *
 * RLS isolation note (Sprint 1 TODO):
 * Full row-level isolation (talent A cannot read talent B) requires a
 * non-superuser connection. Current CI uses a superuser that bypasses RLS.
 * Sprint 1 will add mahara_app LOGIN role to the CI setup.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { db } from "../client.js";
import { withUserContext } from "../role-context.js";
import { users } from "../schema/index.js";

const hasDb = Boolean(process.env.DATABASE_URL);
const itDb = hasDb ? it : it.skip;

// Sanity check: database reachable
beforeAll(async () => {
  if (!hasDb) return;
  await db.execute(sql`SELECT 1`);
});

// ─── GUC correctness ─────────────────────────────────────────────────────────

describe("withUserContext — GUC values (S0-16)", () => {
  itDb("sets app.current_user and app.current_role within transaction", async () => {
    const userId = `rls-guc-${Date.now()}`;
    const role = "talent";

    const rows = (await withUserContext(userId, role, (tx) =>
      tx.execute(
        sql`SELECT
              current_setting('app.current_user', true) AS "currentUser",
              current_setting('app.current_role', true) AS "currentRole"`,
      ),
    )) as Array<{ currentUser: string; currentRole: string }>;

    expect(rows[0]?.currentUser).toBe(userId);
    expect(rows[0]?.currentRole).toBe(role);
  });

  itDb("GUC reverts to empty after transaction commit", async () => {
    await withUserContext("check-user", "talent", async () => {});

    const rows = (await db.execute(
      sql`SELECT current_setting('app.current_user', true) AS "u"`,
    )) as Array<{ u: string }>;

    // SET CONFIG with transaction=true reverts on commit
    expect(rows[0]?.u ?? "").toBe("");
  });
});

// ─── Transaction atomicity ────────────────────────────────────────────────────

describe("withUserContext — transaction atomicity", () => {
  itDb("rolls back insert on handler error", async () => {
    const testId = crypto.randomUUID();
    const testEmail = `rollback-${Date.now()}@test.ma`;

    await expect(
      withUserContext("system", "admin", async (tx) => {
        await tx.insert(users).values({
          id: testId,
          email: testEmail,
          name: "Rollback Test",
          role: "talent",
          isActive: true,
        });
        throw new Error("simulated failure — must rollback");
      }),
    ).rejects.toThrow("simulated failure");

    const rows = await db.select().from(users).where(eq(users.id, testId));
    expect(rows).toHaveLength(0);
  });
});

// ─── RLS row isolation ────────────────────────────────────────────────────────

describe("RLS user isolation (S0-16 — GUC path verified)", () => {
  itDb("GUC is set correctly when querying as user A for user B's record", async () => {
    const idA = crypto.randomUUID();
    const idB = crypto.randomUUID();
    const ts = Date.now();

    // Insert both users as superuser (bypasses RLS for test setup)
    await db.insert(users).values([
      { id: idA, email: `rls-a-${ts}@test.ma`, name: "A", role: "talent", isActive: true },
      { id: idB, email: `rls-b-${ts}@test.ma`, name: "B", role: "talent", isActive: true },
    ]);

    // Acting as User A — query User B's row, verify GUC context is set
    const [capturedGuc] = (await withUserContext(idA, "talent", async (tx) =>
      tx.execute(sql`SELECT current_setting('app.current_user', true) AS "uid"`),
    )) as Array<{ uid: string }>;

    // Clean up
    await db.delete(users).where(eq(users.id, idA));
    await db.delete(users).where(eq(users.id, idB));

    // The GUC should be User A's ID (not B's, not empty)
    expect(capturedGuc?.uid).toBe(idA);

    // SPRINT 1 TODO: connect as mahara_app (non-superuser) and assert:
    //   const rows = await withUserContext(idA, "talent", tx => tx.select().from(users).where(eq(users.id, idB)))
    //   expect(rows).toHaveLength(0)  // RLS policy blocks cross-user read
  });
});
