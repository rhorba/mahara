import { describe, expect, it } from "vitest";
import {
  ForbiddenError,
  UnauthorizedError,
  hasRole,
  requireOwnerOrAdmin,
  requireRole,
} from "../rbac.js";
import type { Session } from "../types.js";

const talentSession: Session = {
  userId: "user-talent-1",
  role: "talent",
  email: "yasmine@demo.mahara.ma",
  name: "Yasmine",
};

const businessSession: Session = {
  userId: "user-biz-1",
  role: "business",
  email: "hassan@demo.mahara.ma",
  name: "Hassan",
};

const adminSession: Session = {
  userId: "user-admin-1",
  role: "admin",
  email: "admin@mahara.ma",
  name: "Admin",
};

describe("requireRole()", () => {
  it("throws UnauthorizedError when session is null", () => {
    expect(() => requireRole(null, "talent")).toThrow(UnauthorizedError);
  });

  it("throws ForbiddenError when role does not match", () => {
    expect(() => requireRole(talentSession, "business")).toThrow(ForbiddenError);
    expect(() => requireRole(businessSession, "talent")).toThrow(ForbiddenError);
    expect(() => requireRole(talentSession, "admin")).toThrow(ForbiddenError);
  });

  it("passes when role matches (single)", () => {
    expect(() => requireRole(talentSession, "talent")).not.toThrow();
    expect(() => requireRole(businessSession, "business")).not.toThrow();
    expect(() => requireRole(adminSession, "admin")).not.toThrow();
  });

  it("passes when role is in the allowed list", () => {
    expect(() => requireRole(talentSession, "talent", "business")).not.toThrow();
    expect(() => requireRole(adminSession, "talent", "admin")).not.toThrow();
  });

  it("talent cannot perform business-only actions", () => {
    expect(() => requireRole(talentSession, "business")).toThrow(ForbiddenError);
  });

  it("business cannot perform talent-only actions", () => {
    expect(() => requireRole(businessSession, "talent")).toThrow(ForbiddenError);
  });
});

describe("hasRole()", () => {
  it("returns false for null session", () => {
    expect(hasRole(null, "talent")).toBe(false);
  });

  it("returns true when role matches", () => {
    expect(hasRole(talentSession, "talent")).toBe(true);
    expect(hasRole(businessSession, "business")).toBe(true);
  });

  it("returns false when role does not match", () => {
    expect(hasRole(talentSession, "business")).toBe(false);
    expect(hasRole(talentSession, "admin")).toBe(false);
  });
});

describe("requireOwnerOrAdmin()", () => {
  it("passes when userId matches resource owner", () => {
    expect(() => requireOwnerOrAdmin(talentSession, talentSession.userId)).not.toThrow();
  });

  it("passes for admin regardless of resource owner", () => {
    expect(() => requireOwnerOrAdmin(adminSession, "anyone-else")).not.toThrow();
  });

  it("throws ForbiddenError when not the owner and not admin", () => {
    expect(() => requireOwnerOrAdmin(talentSession, "someone-else-id")).toThrow(ForbiddenError);
    expect(() => requireOwnerOrAdmin(businessSession, "other-business-id")).toThrow(ForbiddenError);
  });
});
