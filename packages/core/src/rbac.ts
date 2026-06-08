import type { Role, Session } from "./types.js";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Assert that a session exists and has the required role(s). */
export function requireRole(session: Session | null, ...roles: Role[]): asserts session is Session {
  if (!session) throw new UnauthorizedError();
  if (!roles.includes(session.role)) {
    throw new ForbiddenError(
      `Role '${session.role}' is not allowed. Required: ${roles.join(", ")}`,
    );
  }
}

/** Check role without throwing. */
export function hasRole(session: Session | null, ...roles: Role[]): boolean {
  if (!session) return false;
  return roles.includes(session.role);
}

/** Confirm that the actor owns the resource (or is admin). */
export function requireOwnerOrAdmin(session: Session, resourceOwnerId: string): void {
  if (session.role === "admin") return;
  if (session.userId !== resourceOwnerId) {
    throw new ForbiddenError("You do not own this resource");
  }
}
