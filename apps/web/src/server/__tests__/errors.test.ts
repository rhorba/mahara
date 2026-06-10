import { describe, expect, it } from "vitest";
import { ActionError, isActionError, toActionErrorMessage } from "../errors";

describe("ActionError", () => {
  it("stores status and message", () => {
    const err = new ActionError(404, "Not found");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not found");
    expect(err.name).toBe("ActionError");
  });

  it("is an instanceof Error", () => {
    expect(new ActionError(400, "Bad request")).toBeInstanceOf(Error);
  });

  it("stores any numeric status code", () => {
    expect(new ActionError(401, "Unauthorized").status).toBe(401);
    expect(new ActionError(403, "Forbidden").status).toBe(403);
    expect(new ActionError(500, "Server error").status).toBe(500);
  });
});

describe("isActionError", () => {
  it("returns true for ActionError instances", () => {
    expect(isActionError(new ActionError(400, "err"))).toBe(true);
  });

  it("returns false for plain Error", () => {
    expect(isActionError(new Error("plain"))).toBe(false);
  });

  it("returns false for strings", () => {
    expect(isActionError("error string")).toBe(false);
  });

  it("returns false for null/undefined", () => {
    expect(isActionError(null)).toBe(false);
    expect(isActionError(undefined)).toBe(false);
  });

  it("returns false for plain objects", () => {
    expect(isActionError({ status: 400, message: "fake" })).toBe(false);
  });
});

describe("toActionErrorMessage", () => {
  it("returns ActionError message for ActionError instances", () => {
    expect(toActionErrorMessage(new ActionError(400, "custom message"))).toBe("custom message");
  });

  it("returns Error message for plain Error instances", () => {
    expect(toActionErrorMessage(new Error("plain error"))).toBe("plain error");
  });

  it("returns fallback for unknown types", () => {
    expect(toActionErrorMessage("string")).toBe("An unexpected error occurred");
    expect(toActionErrorMessage(42)).toBe("An unexpected error occurred");
    expect(toActionErrorMessage(null)).toBe("An unexpected error occurred");
    expect(toActionErrorMessage(undefined)).toBe("An unexpected error occurred");
  });
});
