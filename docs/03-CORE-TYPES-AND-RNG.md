# Step 03 — Core Types, Zod Schemas & Seeded RNG

## Depends On
Step 02 (library JSON exists to validate against).

## Master Spec References
- §9 Concept Graph (types)
- §15 Seeded Randomness
- §16 Working Game Model
- §17 Recipes (type)
- §26 Generated Game Spec (type)
- §29 Generation Trace (type)
- §5 Tech Stack (Zod, Vitest)

## Scope

1. Create `src/program/generator/types.ts` with all shared TypeScript
   types: `ConceptNode`, `ConceptEdge`, `ConceptMap`, `GameEntity`,
   `WorkingGame`, `Recipe`, `Predicate`, `Modification`, `GeneratedGameSpec`,
   `GenerationTrace`, `GenerationStage`, `Blackboard`.
2. Create Zod schemas mirroring each library JSON file's shape (verbs,
   micro-rhetorics, components, recipes, patches, parameter-ranges,
   templates). Load and `.parse()` every JSON file at module init in a small
   `library.ts` loader module so a malformed file fails loudly at import
   time.
3. Replace the throwaway `scripts/validate-library.ts` logic from Step 02
   with real Vitest tests that import the Zod-validated library and assert
   the same invariants (schema-valid, enabled verbs covered, no dangling
   component references). Delete the throwaway script once superseded.
4. Implement a seeded RNG utility (`createSeededRng(seed: number)`) — either
   wrap a small library or hand-roll one (e.g. mulberry32/xorshift). Expose
   at minimum:
   - `next(): number` (0–1 float)
   - `int(min, max): number`
   - `pick<T>(items: T[]): T`
   - `pickIndex(length: number): number`
5. Unit test the RNG in isolation: same seed → same sequence; different
   seeds → (overwhelmingly likely) different sequences.

## Out of Scope
- Concept graph UI (Step 04).
- Any actual generation pipeline logic (Steps 05+).

## Files Touched
- `src/program/generator/types.ts`
- `src/program/generator/library.ts` (Zod-validated loaders)
- `src/program/generator/rng.ts`
- `src/program/generator/*.test.ts` (Vitest)
- Removes `scripts/validate-library.ts`

## Automated Checks
- `npx vitest run` — all library-schema and RNG tests pass.

## Manual Test
1. In a scratch script or Vitest `it.only`, call `createSeededRng(42)` twice
   and log 5 `next()` values from each — confirm identical sequences.
2. Temporarily corrupt one JSON library file (e.g. invalid type for a field)
   and confirm `library.ts` throws a clear Zod validation error on import;
   revert the corruption.
3. Confirm `npx vitest run` is green.

## Done When
- [ ] All core types defined and exported.
- [ ] Every library JSON file is Zod-validated at load time.
- [ ] Seeded RNG is deterministic and unit-tested.
- [ ] Vitest suite passes.
