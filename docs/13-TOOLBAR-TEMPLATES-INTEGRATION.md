# Step 13 — Toolbar, Templates & Full Page Integration

## Depends On
Step 04 (graph), Step 11 (trace UI), Step 12 (runtime) — this step wires
everything already built into one cohesive page.

## Master Spec References
- §15 Seeded Randomness ("Try Another" reruns with a new seed)
- §31 Toolbar
- §32 Templates
- §28 Game Generation Must Be Replaceable (page only calls `generateGame` then renders `GameViewport`/`GenerationTrace`)

## Scope

1. Implement `components/Toolbar.tsx` per §31:
   - Title "Game-O-Matic Replica";
   - Template dropdown (initially just "Occupy" per §32 — the hardcoded
     load button from Step 04 becomes a proper dropdown; document that
     additional templates are added only once their required
     micro-rhetorics exist in the JSON library);
   - Seed input field (numeric, editable, defaults e.g. to 18372 per the
     spec's mockup);
   - `Make Game`, `Try Another`, `Reset` buttons.
2. `Make Game`: validates graph (§36), calls `generateGame({ conceptMap,
   seed })`, stores `{ game, trace }` in page state, renders
   `<GameViewport game={result.game} />` and `<GenerationTrace
   trace={result.trace} />`.
3. `Try Another`: keeps the current `conceptMap` unchanged, generates a new
   seed (random), reruns `generateGame`, replaces game+trace in state.
4. `Reset`: clears the graph back to empty (or back to the last loaded
   template — decide and document which; empty is simplest and matches "user
   can start fresh").
5. Finalize `app/page.tsx` to strictly follow the §28 boundary — the page
   component itself must contain no generation or scoring logic, only:
   graph state, calling `generateGame`, and rendering the three main
   components (`ConceptGraph`, `GameViewport`, `GenerationTrace`) plus the
   `Toolbar`.

## Out of Scope
- Adding new templates beyond Occupy (explicitly deferred per §32 until
  their micro-rhetorics exist).
- Any new generator/runtime logic — this step is pure wiring.

## Files Touched
- `src/components/Toolbar.tsx`
- `src/app/page.tsx` (final integration pass)

## Automated Checks
- None new required beyond build passing; optionally a smoke test that
  `page.tsx` renders without crashing given the Occupy template.

## Manual Test
1. Load the page fresh — confirm the toolbar shows title, template dropdown
   (Occupy selected/available), seed field, and the three action buttons.
2. Select "Occupy" from the dropdown — confirm the graph loads exactly as in
   Step 04's manual test.
3. Click "Make Game" — confirm game + trace render together, matching all
   prior steps' manual tests combined.
4. Click "Try Another" several times — confirm the graph is untouched, the
   seed value visibly changes, and the game/trace regenerate with
   (potentially) different micro-rhetoric/recipe selections.
5. Edit the graph (add a noun), then click "Try Another" — confirm it still
   uses the edited graph, not a reverted one.
6. Click "Reset" — confirm the graph clears (or reverts, per your documented
   choice) and game/trace panels clear accordingly.
7. Manually type a specific seed value, click "Make Game" twice in a row
   without changing anything — confirm both runs produce byte-identical
   trace/game output (determinism holds through the full integrated page).

## Done When
- [ ] Toolbar matches §31 exactly.
- [ ] `Try Another` and `Reset` behave per spec.
- [ ] `page.tsx` contains no generation logic, only orchestration.
- [ ] End-to-end flow (load template → make game → play → try another) works
      without errors.
