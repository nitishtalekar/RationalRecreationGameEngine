# Step 11 — Full Generation Trace UI Polish

## Depends On
Steps 05–10 (every pipeline stage now produces trace data; earlier steps
already built minimal/ad-hoc renderers for each stage as they were introduced).

## Master Spec References
- §4 Dark Theme (trace-specific styling: monospaced values, expandable
  cards, compact tables, highlighted selected candidates, success styling
  for selected recipes, muted rejected/disabled candidates)
- §29 Generation Trace (type)
- §30 Trace Views (all subsections — Entities, Micro-Rhetorics, Partial
  Game, Recipe Calculations, Player, Non-Terminals, Patches, Final Spec)

## Scope

This step is a **consolidation and polish pass**, not new pipeline logic.
By now every stage already emits correct trace data and has *some* renderer
(built incrementally in Steps 05–10). This step:

1. Reorganizes `GenerationTrace.tsx` into a consistent, numbered stage list
   matching §3's outline (1 Entities … 10 Final Game Spec), using
   expandable/collapsible cards per stage.
2. Applies the dark-theme trace styling rules from §4 consistently across
   every stage: monospaced values for component names/params, compact
   tables for recipe scoring, clear success-color highlighting for the
   selected candidate in every selection (micro-rhetoric, recipe, non-terminal,
   player), muted styling for rejected/disabled candidates.
3. Ensures every stage transition is visually traceable — e.g. a mutation
   made in stage 2 is visibly reflected in stage 3's partial game view.
4. Adds a top-level trace summary/breadcrumb (optional but recommended) so a
   researcher can jump directly to a stage instead of scrolling.

## Out of Scope
- Any change to generator logic or trace *data* — if data is wrong, that's a
  bug in the step that produced it, not this step.
- Game runtime (Step 12).

## Files Touched
- `src/components/GenerationTrace.tsx` (and any extracted sub-components,
  e.g. `TraceStageCard.tsx`, `RecipeScoreTable.tsx`, if it's getting large)
- `src/styles/globals.css` (trace-specific style refinements)

## Automated Checks
- None new required; existing Vitest suite must remain green (this step
  shouldn't touch generator logic).

## Manual Test
1. Run "Make Game" on Occupy with the golden seed and walk through all 10
   numbered stages in the trace panel end to end.
2. Confirm every stage is expandable/collapsible and legible at a glance —
   selected candidates pop with success styling, rejected ones are visibly
   muted.
3. Confirm recipe score tables are compact and readable (binding | predicate
   | result | score columns per §30).
4. Confirm component/parameter values render in a monospaced font throughout.
5. Resize to mobile width and confirm the trace area remains usable
   (scrollable tables rather than broken layout).
6. Have a second person (or yourself, fresh) unfamiliar with the pipeline
   read through the trace and confirm they can explain in their own words
   why the game turned out the way it did — this is the real acceptance bar
   per §41's "generation trace is as important as the game itself."

## Done When
- [ ] Every one of the 10 numbered stages has a clear, well-styled trace view.
- [ ] Selected vs rejected/disabled candidates are visually distinct everywhere.
- [ ] The trace reads as a coherent story from concept graph to final spec.
