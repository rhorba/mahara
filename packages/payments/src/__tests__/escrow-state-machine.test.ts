import { beforeEach, describe, expect, it, vi } from "vitest";
import { EscrowStateMachine } from "../escrow.js";

// ── Minimal mock DB ───────────────────────────────────────────────────────────
// EscrowStateMachine is called with an optional `tx` parameter.
// Tests pass a mock tx directly, so db.transaction() is never called.

type MockEscrow = {
  id: string;
  status: string;
  grossAmount: number;
  platformFeeFromBusiness: number;
  platformFeeFromTalent: number;
  talentPayout: number;
  businessId: string;
  talentId: string;
  gigId: string;
  proposalId: string;
  fundedAt: Date | null;
  releasedAt: Date | null;
  createdAt: Date;
};

function makeEscrow(overrides: Partial<MockEscrow> = {}): MockEscrow {
  return {
    id: "escrow-1",
    status: "pending",
    grossAmount: 200000,
    platformFeeFromBusiness: 20000,
    platformFeeFromTalent: 10000,
    talentPayout: 190000,
    businessId: "biz-user-1",
    talentId: "talent-user-1",
    gigId: "gig-1",
    proposalId: "proposal-1",
    fundedAt: null,
    releasedAt: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeMockTx(escrow: MockEscrow) {
  const updatedEscrow = { ...escrow };

  const selectChain = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([escrow]),
  };

  const updateChain = {
    set: vi.fn((patch: Partial<MockEscrow>) => {
      Object.assign(updatedEscrow, patch);
      return updateChain;
    }),
    where: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => Promise.resolve([updatedEscrow])),
  };

  const insertValues = vi.fn().mockResolvedValue([]);

  return {
    tx: {
      select: vi.fn().mockReturnValue(selectChain),
      update: vi.fn().mockReturnValue(updateChain),
      insert: vi.fn().mockReturnValue({ values: insertValues }),
    },
    updatedEscrow,
    insertValues,
  };
}

// Dummy db — never used in tests (tx is always passed explicitly)
// biome-ignore lint/suspicious/noExplicitAny: test-only stub
const stubDb = {} as any;
const machine = new EscrowStateMachine(stubDb);

// ── Valid transitions ─────────────────────────────────────────────────────────

describe("EscrowStateMachine — valid transitions", () => {
  it("PENDING → FUNDED: fund()", async () => {
    const { tx, updatedEscrow } = makeMockTx(makeEscrow({ status: "pending" }));
    const result = await machine.fund("escrow-1", "actor-1", tx);
    expect(result.status).toBe("funded");
    expect(updatedEscrow.status).toBe("funded");
    expect(updatedEscrow.fundedAt).toBeInstanceOf(Date);
  });

  it("FUNDED → RELEASED: release()", async () => {
    const { tx, updatedEscrow } = makeMockTx(makeEscrow({ status: "funded" }));
    const result = await machine.release("escrow-1", "actor-1", tx);
    expect(result.status).toBe("released");
    expect(updatedEscrow.releasedAt).toBeInstanceOf(Date);
  });

  it("FUNDED → REFUNDED: refund()", async () => {
    const { tx, updatedEscrow } = makeMockTx(makeEscrow({ status: "funded" }));
    await machine.refund("escrow-1", "actor-1", tx);
    expect(updatedEscrow.status).toBe("refunded");
  });

  it("FUNDED → DISPUTED: openDispute()", async () => {
    const { tx, updatedEscrow } = makeMockTx(makeEscrow({ status: "funded" }));
    await machine.openDispute("escrow-1", "actor-1", tx);
    expect(updatedEscrow.status).toBe("disputed");
  });

  it("DISPUTED → RELEASED: resolveDispute('release')", async () => {
    const { tx, updatedEscrow } = makeMockTx(makeEscrow({ status: "disputed" }));
    await machine.resolveDispute("escrow-1", "admin-1", "release", tx);
    expect(updatedEscrow.status).toBe("released");
  });

  it("DISPUTED → REFUNDED: resolveDispute('refund')", async () => {
    const { tx, updatedEscrow } = makeMockTx(makeEscrow({ status: "disputed" }));
    await machine.resolveDispute("escrow-1", "admin-1", "refund", tx);
    expect(updatedEscrow.status).toBe("refunded");
  });
});

// ── Invalid transitions — no state skipping ───────────────────────────────────

describe("EscrowStateMachine — invalid transitions throw", () => {
  it("PENDING → RELEASED throws (cannot skip FUNDED)", async () => {
    const { tx } = makeMockTx(makeEscrow({ status: "pending" }));
    await expect(machine.release("escrow-1", "actor-1", tx)).rejects.toThrow(
      "Invalid escrow transition",
    );
  });

  it("PENDING → REFUNDED throws", async () => {
    const { tx } = makeMockTx(makeEscrow({ status: "pending" }));
    await expect(machine.refund("escrow-1", "actor-1", tx)).rejects.toThrow(
      "Invalid escrow transition",
    );
  });

  it("PENDING → DISPUTED throws", async () => {
    const { tx } = makeMockTx(makeEscrow({ status: "pending" }));
    await expect(machine.openDispute("escrow-1", "actor-1", tx)).rejects.toThrow(
      "Invalid escrow transition",
    );
  });

  it("RELEASED → RELEASED throws (double-payout impossible)", async () => {
    const { tx } = makeMockTx(makeEscrow({ status: "released" }));
    await expect(machine.release("escrow-1", "actor-1", tx)).rejects.toThrow(
      "Invalid escrow transition",
    );
  });

  it("RELEASED → FUNDED throws (no rollback)", async () => {
    const { tx } = makeMockTx(makeEscrow({ status: "released" }));
    await expect(machine.fund("escrow-1", "actor-1", tx)).rejects.toThrow(
      "Invalid escrow transition",
    );
  });

  it("REFUNDED → RELEASED throws", async () => {
    const { tx } = makeMockTx(makeEscrow({ status: "refunded" }));
    await expect(machine.release("escrow-1", "actor-1", tx)).rejects.toThrow(
      "Invalid escrow transition",
    );
  });

  it("FUNDED → FUNDED throws (no double-fund)", async () => {
    const { tx } = makeMockTx(makeEscrow({ status: "funded" }));
    await expect(machine.fund("escrow-1", "actor-1", tx)).rejects.toThrow(
      "Invalid escrow transition",
    );
  });
});

// ── Audit log is written on every transition ──────────────────────────────────

describe("EscrowStateMachine — audit log", () => {
  it("writes audit log on fund()", async () => {
    const { tx, insertValues } = makeMockTx(makeEscrow({ status: "pending" }));
    await machine.fund("escrow-1", "actor-1", tx);
    expect(insertValues).toHaveBeenCalledOnce();
    const auditPayload = insertValues.mock.calls[0]?.[0];
    expect(auditPayload).toMatchObject({
      actorUserId: "actor-1",
      entity: "escrow",
      entityId: "escrow-1",
      action: "fund",
    });
  });

  it("writes audit log on release()", async () => {
    const { tx, insertValues } = makeMockTx(makeEscrow({ status: "funded" }));
    await machine.release("escrow-1", "actor-1", tx);
    const auditPayload = insertValues.mock.calls[0]?.[0];
    expect(auditPayload).toMatchObject({ action: "release" });
  });

  it("writes audit log on refund()", async () => {
    const { tx, insertValues } = makeMockTx(makeEscrow({ status: "funded" }));
    await machine.refund("escrow-1", "actor-1", tx);
    const auditPayload = insertValues.mock.calls[0]?.[0];
    expect(auditPayload).toMatchObject({ action: "refund" });
  });

  it("writes audit log on openDispute()", async () => {
    const { tx, insertValues } = makeMockTx(makeEscrow({ status: "funded" }));
    await machine.openDispute("escrow-1", "actor-1", tx);
    const auditPayload = insertValues.mock.calls[0]?.[0];
    expect(auditPayload).toMatchObject({ action: "dispute" });
  });

  it("writes before/after data on every transition", async () => {
    const { tx, insertValues } = makeMockTx(makeEscrow({ status: "pending" }));
    await machine.fund("escrow-1", "actor-1", tx);
    const auditPayload = insertValues.mock.calls[0]?.[0];
    expect(auditPayload.beforeData).toEqual({ status: "pending" });
    expect(auditPayload.afterData).toMatchObject({ status: "funded" });
  });
});

// ── Not-found guard ───────────────────────────────────────────────────────────

describe("EscrowStateMachine — not-found guard", () => {
  it("throws if escrow does not exist", async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]), // empty — not found
    };
    // biome-ignore lint/suspicious/noExplicitAny: test-only mock
    const tx: any = { select: vi.fn().mockReturnValue(selectChain) };
    await expect(machine.fund("nonexistent", "actor-1", tx)).rejects.toThrow("Escrow not found");
  });
});
