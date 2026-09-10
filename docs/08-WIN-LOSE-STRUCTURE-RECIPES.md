# Step 08 — Win / Lose / Structure Recipes & Player Fallback (Pipeline Stages 6–9)

## Depends On
Step 07 (generic recipe engine), Step 02 (win/lose/structure-recipes.json content).

## Master Spec References
- §13 Generation Pipeline (stages 6–9)
- §18 Win Recipes (`score-100` full definition)
- §19 Lose Recipes (`lose-run-out-of-time`)
- §20 Structure Recipes (Frogger)
- §21 Player Selection (random fallback)
- §30 Trace Views → "Player" example
- §33 Occupy Golden Path Test (expected win-recipe binding/modifications)

## Scope

1. Wire the real library recipes through the Step 07 engine, run in the
   mandated order: `WIN -> LOSE -> STRUCTURE` (§17), each stage seeing
   mutations from the previous one.
2. Win: score `score-100` against the Partial Game; confirm it binds `X` and
   `Y` correctly (predicate: "Y has `_isVulnerable` targeted by X"); apply
   its 6 modifications in order (blackboard write, component swap, add
   `ScoreRemovalOfComponent`, add `RespawnOnRemoveComponent`, make X player).
3. Lose: apply `lose-run-out-of-time` (adds `MeterComponent` to WORLD) — only
   one implemented candidate, so selection is trivial but must still be traced.
4. Structure: apply Frogger — implement its modifications (placement,
   scaling B to double size, multiplying C into several vertically-restricted
   instances) per §20, using the Occupy binding (A=Occupier, B=WallStreet,
   C=Police) as the concrete case to validate against.
5. Player fallback (§21): after all three recipe categories run, if no
   entity has `isPlayer: true`, randomly select one noun via seeded RNG and
   record the decision (`selected by recipe` vs `random fallback`) in the trace.
6. Extend `program/generator/index.ts` to run these stages in order and
   capture `win-recipe`, `lose-recipe`, `structure-recipe`, and `player`
   trace stages.
7. Extend `GenerationTrace.tsx` to render these four stages per §30's
   formats (recipe calculation tables, selected binding, applied
   modifications in order, player selection reasoning).

## Out of Scope
- Non-terminal resolution and patches (Step 09) — components like
  `_isVulnerable` remain unresolved symbolic tags at the end of this step.
- Final `GeneratedGameSpec` compilation (Step 10).

## Files Touched
- `src/program/generator/index.ts`
- `src/program/generator/resolve.ts` (add `selectFallbackPlayer` only —
  full non-terminal/parameter resolution comes in Step 09)
- `src/components/GenerationTrace.tsx`

## Automated Checks
- Vitest ("Recipe Scoring" per §38): for the Occupy example, confirm
  `X=Occupier, Y=WallStreet` scores +4 via `_isVulnerable` while the reverse
  binding scores 0.
- Vitest ("Score Recipe" per §38): assert all six `score-100` modifications
  applied correctly and in order, including the blackboard write
  (`removeToWin = WallStreet`) and `Occupier.isPlayer === true`.
- Vitest ("Player" per §38): recipe-selected player is preserved when
  present; random fallback selects a noun when no recipe assigns one (test
  with a graph/recipe combination where no win recipe applies).
- Vitest: Frogger structure produces the expected Occupy layout (A left, B
  right at 2x, C multiplied + vertically constrained) matching §33.

## Manual Test
1. Run "Make Game" on the Occupy template with the documented golden seed.
2. In the trace, confirm the Win Recipe stage shows the binding table with
   `X=Occupier, Y=WallStreet` scoring 4 and being selected.
3. Confirm the 6 modifications appear in order, including the blackboard
   write and `Occupier` becoming the player.
4. Confirm the Lose Recipe stage shows `lose-run-out-of-time` applied to WORLD.
5. Confirm the Structure Recipe stage shows the Frogger layout bound to
   A=Occupier, B=WallStreet, C=Police.
6. Confirm the Player stage explicitly states the player was set by the win
   recipe, not by random fallback.
7. Temporarily modify the graph so no win recipe can apply (e.g. remove the
   `obstructs` edge) and confirm the Player stage instead shows a random
   fallback selection.

## Done When
- [ ] Win/lose/structure recipes run in the correct order with visible mutation chaining.
- [ ] Occupy golden values from §33 are reproduced exactly for the win recipe.
- [ ] Player fallback logic works and is traced correctly in both paths.
