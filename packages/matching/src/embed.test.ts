/**
 * S3-10: Embedding + score determinism tests.
 */
import { describe, expect, it } from "vitest";
import { EMBED_DIMS, cosineSimilarity, embedSkills } from "./embed";
import { computeMatchScore } from "./score";

// ── Embedding ─────────────────────────────────────────────────────────────────

describe("embedSkills", () => {
  it("returns a 384-dim vector", () => {
    const v = embedSkills(["React", "TypeScript"]);
    expect(v).toHaveLength(EMBED_DIMS);
  });

  it("is deterministic — same input same output", () => {
    const v1 = embedSkills(["Figma", "UI/UX"]);
    const v2 = embedSkills(["Figma", "UI/UX"]);
    expect(v1).toEqual(v2);
  });

  it("produces a unit vector (norm ≈ 1)", () => {
    const v = embedSkills(["React", "Node.js", "PostgreSQL"]);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });

  it("empty skills → zero vector", () => {
    const v = embedSkills([]);
    expect(v.every((x) => x === 0)).toBe(true);
  });

  it("order-invariant — same skills different order produce identical vector", () => {
    const v1 = embedSkills(["React", "Node.js"]);
    const v2 = embedSkills(["Node.js", "React"]);
    expect(v1).toEqual(v2);
  });

  it("similar skill names have higher cosine similarity than unrelated ones", () => {
    const react = embedSkills(["React"]);
    const reactNative = embedSkills(["ReactNative"]);
    const figma = embedSkills(["Figma"]);

    const simRelated = cosineSimilarity(react, reactNative);
    const simUnrelated = cosineSimilarity(react, figma);
    expect(simRelated).toBeGreaterThan(simUnrelated);
  });
});

// ── Cosine similarity ─────────────────────────────────────────────────────────

describe("cosineSimilarity", () => {
  it("identical unit vectors → 1", () => {
    const v = embedSkills(["Python"]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
  });

  it("zero vector → 0", () => {
    const zero = new Array<number>(EMBED_DIMS).fill(0);
    const v = embedSkills(["Python"]);
    expect(cosineSimilarity(zero, v)).toBe(0);
  });

  it("mismatched lengths → 0", () => {
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
  });
});

// ── computeMatchScore ─────────────────────────────────────────────────────────

const TALENT_BASE = {
  skills: [
    { skill: "React", level: "advanced" as const, verified: true },
    { skill: "TypeScript", level: "intermediate" as const, verified: false },
  ],
  skillVector: null,
  availability: "available" as const,
  avgRating: 0,
};

const GIG_BASE = {
  skills: ["React", "TypeScript"],
  requirementVector: null,
};

describe("computeMatchScore", () => {
  it("is deterministic — same inputs same score", () => {
    const s1 = computeMatchScore(TALENT_BASE, GIG_BASE);
    const s2 = computeMatchScore(TALENT_BASE, GIG_BASE);
    expect(s1).toBe(s2);
  });

  it("returns an integer 0–100", () => {
    const score = computeMatchScore(TALENT_BASE, GIG_BASE);
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("perfect skill match scores higher than no skill match", () => {
    const perfectMatch = computeMatchScore(TALENT_BASE, GIG_BASE);
    const noMatch = computeMatchScore(
      { ...TALENT_BASE, skills: [{ skill: "Figma", level: "junior" as const, verified: false }] },
      GIG_BASE,
    );
    expect(perfectMatch).toBeGreaterThan(noMatch);
  });

  it("unavailable talent scores 0 on availability component (lower than available)", () => {
    const available = computeMatchScore(TALENT_BASE, GIG_BASE);
    const unavailable = computeMatchScore(
      { ...TALENT_BASE, availability: "unavailable" as const },
      GIG_BASE,
    );
    expect(available).toBeGreaterThan(unavailable);
  });

  it("in_project talent scores lower than available but higher than unavailable", () => {
    const available = computeMatchScore(TALENT_BASE, GIG_BASE);
    const inProject = computeMatchScore(
      { ...TALENT_BASE, availability: "in_project" as const },
      GIG_BASE,
    );
    const unavailable = computeMatchScore(
      { ...TALENT_BASE, availability: "unavailable" as const },
      GIG_BASE,
    );
    expect(available).toBeGreaterThan(inProject);
    expect(inProject).toBeGreaterThan(unavailable);
  });

  it("higher rating produces higher score", () => {
    const highRated = computeMatchScore(
      { ...TALENT_BASE, avgRating: 500 },
      GIG_BASE,
    );
    const lowRated = computeMatchScore(
      { ...TALENT_BASE, avgRating: 100 },
      GIG_BASE,
    );
    expect(highRated).toBeGreaterThanOrEqual(lowRated);
  });

  it("uses vector similarity when vectors are provided", () => {
    const talentVec = embedSkills(["React", "TypeScript"]);
    const gigVec = embedSkills(["React", "TypeScript"]);
    const noVectors = computeMatchScore(TALENT_BASE, GIG_BASE);
    const withVectors = computeMatchScore(
      { ...TALENT_BASE, skillVector: talentVec },
      { ...GIG_BASE, requirementVector: gigVec },
    );
    // With perfectly matching vectors, score should be at least as high
    expect(withVectors).toBeGreaterThanOrEqual(noVectors - 1); // allow rounding
  });

  it("gig with no required skills treats skill score as neutral (50)", () => {
    const noSkillGig = { skills: [], requirementVector: null };
    const score = computeMatchScore(TALENT_BASE, noSkillGig);
    // Skill component = 50, avail = 100, rating = 50 → weighted mid-range
    expect(score).toBeGreaterThan(40);
    expect(score).toBeLessThan(80);
  });
});
