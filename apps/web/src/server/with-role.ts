import { auth } from "@/lib/auth";
import type { Role } from "@mahara/core";
import { type db, withUserContext } from "@mahara/db";
import type { ZodSchema, ZodTypeDef } from "zod";
import { ActionError } from "./errors";

type Db = typeof db;

export type ActionCtx<I> = {
  /** Drizzle transaction with RLS context (app.current_user + app.current_role set). */
  tx: Db;
  userId: string;
  role: Role;
  input: I;
};

/**
 * Server action factory.
 * Pipeline: auth() → role check → Zod.parse → withUserContext (RLS) → handler.
 *
 * Role is ALWAYS read from the server session — never from client input.
 * All handler DB calls run inside withUserContext so RLS policies are active.
 */
export function withRole<I, O>(
  allowedRoles: Role[],
  schema: ZodSchema<I, ZodTypeDef, unknown>,
  fn: (ctx: ActionCtx<I>) => Promise<O>,
): (raw: unknown) => Promise<O> {
  return async (raw: unknown): Promise<O> => {
    const session = await auth();

    if (!session?.user?.id) throw new ActionError(401, "Unauthenticated");

    const userId = session.user.id;
    const role = session.user.role;

    if (!role) throw new ActionError(401, "Session missing role");
    if (!allowedRoles.includes(role)) throw new ActionError(403, "Forbidden");

    const input = schema.parse(raw);

    return withUserContext(userId, role, (tx) => fn({ tx: tx as Db, userId, role, input }));
  };
}

/**
 * Like withRole but skips Zod parsing — for actions with no input body
 * (e.g., "mark notification read", "delete my account").
 */
export function withRoleNoInput<O>(
  allowedRoles: Role[],
  fn: (ctx: Omit<ActionCtx<void>, "input">) => Promise<O>,
): () => Promise<O> {
  return async (): Promise<O> => {
    const session = await auth();

    if (!session?.user?.id) throw new ActionError(401, "Unauthenticated");

    const userId = session.user.id;
    const role = session.user.role;

    if (!role) throw new ActionError(401, "Session missing role");
    if (!allowedRoles.includes(role)) throw new ActionError(403, "Forbidden");

    return withUserContext(userId, role, (tx) => fn({ tx: tx as Db, userId, role }));
  };
}
