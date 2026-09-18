// Deterministic per-noun color assignment, shared between the concept-map
// editor (ConceptNodeCard) and the game runtime canvas (renderer.ts), so the
// same noun (e.g. "Occupier") reads as the same color in both places without
// any template authoring. Generic across every template: colors are derived
// from the entity's id/noun, never hardcoded to a specific noun name.
//
// Lives at this level (not inside generator/ or runtime/) because the
// runtime is documented to never import generator implementation modules
// (see runtime/types.ts) — this file has no dependents in either direction,
// so both sides can import it without crossing that boundary.

// A qualitative palette (Okabe-Ito inspired), chosen for mutual
// distinguishability against the dark game canvas background (#111318) and
// the editor's dark node cards. The player's own color is intentionally
// excluded from this palette (see PLAYER_COLOR in runtime/renderer.ts) so a
// non-player entity can never coincide with the player's color.
const PALETTE = [
  "#e8a13a", // amber (existing default ENTITY_COLOR, kept first for stability)
  "#7be08a", // green
  "#f2617a", // red/pink
  "#d8a6ff", // purple
  "#f5d76e", // yellow
  "#4dd0c8", // teal
  "#ff9f68", // orange
  "#a3c9f9", // light blue
] as const;

function hashUnitIndex(key: string, modulus: number): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % modulus;
}

// `key` should be a stable identifier for the noun/entity type — the
// ConceptNode/GameEntity id (not the display label, which the user can
// rename) so a renamed noun keeps its color across edits.
export function colorForEntityKey(key: string): string {
  return PALETTE[hashUnitIndex(key, PALETTE.length)];
}
