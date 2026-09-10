# Step 06 — Micro-Rhetoric Selection & Application (Pipeline Stages 2–5)

## Depends On
Step 05 (entities exist in `WorkingGame`).

## Master Spec References
- §10 Paper-Described Micro-Rhetorics Only (all 8 entries + `$subject`/`$predicate` param substitution)
- §12 Non-Terminals (store `_`-prefixed requests as-is, don't resolve yet)
- §13 Generation Pipeline (stages 2–5)
- §15 Seeded Randomness (selecting between multiple micro-rhetorics)
- §30 Trace Views → "Micro-Rhetorics" and "Partial Game" examples
- §34 `microRhetoric.ts` (`selectMicroRhetoric`, `applyMicroRhetoric`)

## Scope

1. Implement `program/generator/microRhetoric.ts`:
   - `selectMicroRhetoric(relationship, library, rng, trace)`: find all
     `status: "implemented"` micro-rhetorics matching the edge's verb; if
     more than one (only `obstructs` currently), use the seeded RNG to pick
     one and record candidates + choice in the trace exactly like §30's
     example; if exactly one, select it deterministically (no RNG call,
     still traced).
   - `applyMicroRhetoric(game, relationship, rhetoric, trace)`: apply each
     `assignment` from the JSON entry to the correct entity (`subject` or
     `predicate`, resolving `$subject`/`$predicate` param references),
     appending components/non-terminal-tags to that entity's `components`
     array. Record the resulting mutation in the trace (e.g. "Wall Street +=
     StopOnCollide(target=Occupier)").
2. Wire this into `generateGame`: loop over `conceptMap.edges`, call
   `selectMicroRhetoric` + `applyMicroRhetoric` for each, then capture a
   `partial-game` trace stage showing every entity and its current
   components (§30 "Partial Game" view).
3. Extend `GenerationTrace.tsx` to render the new `micro-rhetorics` stage
   (per-relationship candidate list + selection + mutation) and the
   `partial-game` stage (entity/component table).

## Out of Scope
- Recipes (Step 07–08), non-terminal resolution (Step 09), patches (Step 09).

## Files Touched
- `src/program/generator/microRhetoric.ts`
- `src/program/generator/index.ts` (pipeline wiring)
- `src/components/GenerationTrace.tsx` (new stage renderers)

## Automated Checks
- Vitest: Occupy template + fixed seed produces the exact partial game from
  master spec §33:
  ```text
  Police: _movesInAnyWay
  Occupier: _movesInAnyWay, StopOnCollide(target=Police), GrowOnCollide(target=WallStreet)
  WallStreet: StopOnCollide(target=Occupier)
  ```
  (Note: this assumes `arrests -> take custody`, `obstructs -> freeze`,
  `grows -> grow on collide` are selected — pick/document the seed that
  produces this, since `obstructs` has two candidates.)
- Vitest ("Obstructs Variation" per §38): across many seeds, both
  `obstructs-freeze` and `obstructs-redirect` get selected at least once.
- Vitest: determinism — same graph + seed → identical partial game and trace.

## Manual Test
1. Load Occupy template with the documented golden seed, click "Make Game".
2. In the trace panel, confirm each relationship shows its candidate
   micro-rhetorics, the seeded choice, and the resulting mutation, matching
   §30's format.
3. Confirm the Partial Game view lists all 4 entities with the exact
   components from §33.
4. Try a few different seeds and confirm `Occupier --obstructs--> Wall
   Street` sometimes resolves to `obstructs-redirect` instead of
   `obstructs-freeze`, and the trace reflects that.

## Done When
- [x] Selection + application logic matches all 7 documented micro-rhetorics
      (the library's actual entry count; see `micro-rhetorics.json`).
- [x] Partial Game trace matches the §33 golden values for the documented seed
      (seed `18372`, the toolbar's own default per §31).
- [x] Both `obstructs` variants are reachable via seed variation.
- [x] Determinism test passes.
