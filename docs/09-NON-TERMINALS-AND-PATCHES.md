# Step 09 — Non-Terminal Resolution, Patches & Parameter Finalization (Pipeline Stages 10–13)

## Depends On
Step 08 (win/lose/structure recipes applied, player selected).

## Master Spec References
- §12 Non-Terminals
- §13 Generation Pipeline (stages 10–13)
- §22 Non-Terminal Resolution (`_isVulnerable` → concrete component candidates, `_movesInAnyWay` runtime-default note)
- §23 Patches (`everything-moves` only)
- §24 Parameters (`parameter-ranges.json`, runtime-default vs paper distinction)
- §30 Trace Views → "Non-Terminals" and "Patches" examples
- §34 `resolve.ts` (`resolveNonTerminals`, `finalizeParameters`), `patches.ts` (`applyPatches`)

## Scope

1. Implement `resolveNonTerminals(game, rng, trace)` in `resolve.ts`:
   - for each non-terminal tag present on an entity (`_isVulnerable`,
     `_isRemovedBy`, `_isCollidable`, `_movesInAnyWay`), look up candidate
     concrete components via `components.json` tags;
   - if multiple candidates, use seeded RNG to select one, recording
     candidates + selection + reason in the trace exactly like §22's example;
   - `_movesInAnyWay` resolves to a minimal runtime-default movement
     component, clearly labeled `runtime-default` (not a paper component) in
     both code and trace.
2. Implement `applyPatches(game, patches, trace)` in `patches.ts`: apply
   `everything-moves` — give a movement component to every entity lacking
   one — recording each entity checked and whether the patch applied to it
   (§30 "Patches" view: "show every evaluated/applicable patch and its
   mutation").
3. Pipeline order per §13/§35: resolve non-terminals → apply patches →
   resolve non-terminals **again** (patches may introduce new non-terminals).
4. Implement `finalizeParameters(game, rng, trace)`: for every component
   with unset parameters, randomly select a value from
   `parameter-ranges.json` via seeded RNG; trace must distinguish "selection
   mechanism: paper" vs "numeric range: runtime-default" per §24.
5. Wire all of this into `generateGame`'s pipeline in `index.ts`.
6. Extend `GenerationTrace.tsx` with renderers for the `non-terminals`,
   `patches`, and `parameters` stages.

## Out of Scope
- Final `GeneratedGameSpec` compilation and instruction text (Step 10).
- Runtime rendering (Step 12).

## Files Touched
- `src/program/generator/resolve.ts`
- `src/program/generator/patches.ts`
- `src/program/generator/index.ts`
- `src/components/GenerationTrace.tsx`

## Automated Checks
- Vitest ("Patch" per §38): an entity lacking movement receives it via
  `everything-moves`; an entity that already has movement is left alone (and
  the trace shows it as "not applicable" rather than silently skipped).
- Vitest ("Finalization" per §38): after the full resolve → patch → resolve
  cycle, no supported non-terminal tag remains on any entity.
- Vitest: `_isVulnerable` resolution picks only from
  `RemoveOnCollideComponent` / `ShrinkOnCollideComponent` /
  `StopOnCollideComponent` and is reproducible under a fixed seed.
- Vitest: parameter finalization only fills previously-unset parameters and
  respects the configured min/max ranges.

## Manual Test
1. Run "Make Game" on Occupy with the golden seed.
2. In the trace, confirm the Non-Terminals stage lists every symbolic tag
   from the partial game (e.g. `_isVulnerable(target=Occupier)` on Wall
   Street pre-win-recipe-mutation, or whatever remains post-recipes) with
   its candidates and seeded selection, matching §22's format.
3. Confirm the Patches stage lists every entity and whether `everything-moves`
   applied to it.
4. Confirm no `_`-prefixed non-terminal remains anywhere in the trace's final
   partial-game snapshot after the second resolution pass.
5. Confirm the Parameters stage shows values chosen for previously-unset
   fields (e.g. movement speed, entity size, timer seconds) with the
   paper/runtime-default distinction visible.
6. Re-run with the same seed and confirm identical non-terminal and
   parameter choices (determinism).

## Done When
- [ ] All non-terminals resolve to concrete, traced components.
- [ ] `everything-moves` patch behaves correctly and is fully traced.
- [ ] Parameters are filled with correct paper/runtime-default labeling.
- [ ] No unresolved non-terminal remains before Step 10.
