# Step 05 — Entity Creation (Pipeline Stage 1) & Minimal Trace Panel

## Depends On
Step 03 (types, RNG), Step 04 (concept graph produces a valid `ConceptMap`).

## Master Spec References
- §13 Generation Pipeline (stage 1–2: validate, create entities)
- §16 Working Game Model (`GameEntity`, `WorkingGame`)
- §29 Generation Trace (type)
- §30 Trace Views → "Entities" example

## Scope

1. Implement `program/generator/index.ts` with a minimal
   `generateGame({ conceptMap, seed })` that currently only performs:
   - re-run the §36 validation (reuse or share logic with Step 04's checks,
     but this is now the generator's authoritative validation);
   - create a `WorkingGame` with one `GameEntity` per noun plus a `WORLD`
     entity, each starting with empty `components: []`;
   - capture a trace stage named `entities` matching the §30 example format
     (checklist of created entities).
2. Implement `program/generator/trace.ts` with `createTrace(seed)` /
   `trace.capture(stageId, data)` / `trace.finish()` helpers producing a
   `GenerationTrace`.
3. Build a **minimal** `components/GenerationTrace.tsx` that can render just
   this one stage (a checklist of entity names) — full multi-stage rendering
   arrives in Step 11, but you need something to look at now.
4. Wire `page.tsx`: clicking "Make Game" (from Step 04) now calls
   `generateGame` and renders the resulting trace's `entities` stage in the
   trace panel area.

## Out of Scope
- Micro-rhetoric selection/application (Step 06).
- Recipes, non-terminals, patches, final spec, runtime.
- Full trace UI for all stages (Step 11) — one stage view is enough here.

## Files Touched
- `src/program/generator/index.ts`
- `src/program/generator/trace.ts`
- `src/components/GenerationTrace.tsx` (minimal version)
- `src/app/page.tsx` wiring

## Automated Checks
- Vitest: `generateGame` with the Occupy template produces exactly 4 entities
  (Police, Occupier, Wall Street, WORLD), each with empty components.
- Vitest: invalid graphs (no edges, unknown verb) throw/return the §36 error
  shape instead of proceeding.

## Manual Test
1. Load Occupy template, click "Make Game".
2. Confirm the trace panel shows "STEP 1 — CREATE ENTITIES" with checkmarks
   for Police, Occupier, Wall Street, WORLD (matching §30's example exactly).
3. Break the graph (delete all edges) and confirm "Make Game" is disabled per
   Step 04, so the generator is never invoked with an invalid graph.

## Done When
- [ ] `generateGame` produces correct entities for any valid concept map.
- [ ] Trace stage 1 renders and matches the master spec's example format.
- [ ] Determinism holds: same graph + seed reruns give identical entity list order.
