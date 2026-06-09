/**
 * Deterministic 384-dim skill embedding via character trigram hashing.
 *
 * Skills sharing trigrams get similar cosine distances (e.g. "React" and
 * "ReactJS"). Fully offline — no model download. Upgrade path: swap
 * embedSkills() for @huggingface/transformers pipeline.
 */

export const EMBED_DIMS = 384;

function trigramHash(trigram: string): number {
  // FNV-1a 32-bit
  let hash = 2166136261;
  for (let i = 0; i < trigram.length; i++) {
    hash ^= trigram.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

function skillToVec(skill: string): number[] {
  const vec: number[] = new Array<number>(EMBED_DIMS).fill(0);
  const s = `<${skill.toLowerCase().trim()}>`;
  for (let i = 0; i + 2 < s.length; i++) {
    const dim = trigramHash(s.slice(i, i + 3)) % EMBED_DIMS;
    vec[dim] = (vec[dim] ?? 0) + 1;
  }
  return vec;
}

/** Unit-normalise a number[] in-place; returns the array. */
function normalise(vec: number[]): number[] {
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += (vec[i] ?? 0) * (vec[i] ?? 0);
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) vec[i] = (vec[i] ?? 0) / norm;
  }
  return vec;
}

/**
 * Embed a list of skill strings into a single 384-dim unit vector.
 * Empty list → zero vector (stored as NULL in practice).
 */
export function embedSkills(skills: string[]): number[] {
  if (skills.length === 0) return new Array<number>(EMBED_DIMS).fill(0);

  const combined: number[] = new Array<number>(EMBED_DIMS).fill(0);
  for (const skill of skills) {
    const v = skillToVec(skill);
    for (let i = 0; i < EMBED_DIMS; i++) combined[i] = (combined[i] ?? 0) + (v[i] ?? 0);
  }

  return normalise(combined);
}

/**
 * Cosine similarity of two pre-normalised vectors; returns [-1, 1].
 * Assumes both arrays are unit vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += (a[i] ?? 0) * (b[i] ?? 0);
  return Math.max(-1, Math.min(1, dot));
}
