# Step 12 — Canvas 2D Game Runtime

## Depends On
Step 10 (a valid, compiled `GeneratedGameSpec` exists to render).

## Master Spec References
- §16/§26 (data boundary: runtime consumes only `GeneratedGameSpec`)
- §27 Game Runtime (full component behavior list, canvas size, scope limits)
- §28 Game Generation Must Be Replaceable (`<GameViewport game={...} />` contract)

## Scope

1. Implement `program/runtime/types.ts`, `GameRuntime.ts`, `systems.ts`,
   `renderer.ts` as a **generator-agnostic** subsystem: it must only import
   from `GeneratedGameSpec`'s type, never from `generator/`.
2. Canvas setup: 800×500 logical size, simple labeled shapes per entity
   (rectangle/circle + noun text label is sufficient — no art).
3. Implement runtime behavior for exactly the components listed in §27:
   - `StopOnCollideComponent`
   - `ReflectOnCollideComponent`
   - `GrowOnCollideComponent`
   - `ShrinkOnCollideComponent`
   - `RemoveOnCollideComponent`
   - `ChaseDownComponent`
   - `ShrinkUnlessCollidingComponent`
   - `SpawnTowardTargetComponent`
   - `ScoreRemovalOfComponent`
   - `RespawnOnRemoveComponent`
   - `MeterComponent`
   - `MouseController` / a web-input substitute (mouse/touch drag or arrow
     keys — document this substitution clearly as a runtime choice, not a
     paper claim)
   - simple autonomous movement for the `runtime-default` `_movesInAnyWay`
     resolution from Step 09
4. Build `components/GameViewport.tsx` wrapping the runtime: `Play` starts
   the loop, shows score/timer/win-lose state; `Try Another` (button wiring
   only — full integration with seed regeneration happens in Step 13, but
   the button should visibly exist and be inert or stubbed here if Step 13
   hasn't landed yet).
5. Any crash-prevention/defensive checks in the runtime must be labeled
   "runtime safety" in comments/dev tooling, not presented as Game-O-Matic
   behavior (§23).

## Out of Scope
- Toolbar/template/seed integration (Step 13).
- Any change to generator or trace code.

## Files Touched
- `src/program/runtime/GameRuntime.ts`
- `src/program/runtime/systems.ts`
- `src/program/runtime/renderer.ts`
- `src/program/runtime/types.ts`
- `src/components/GameViewport.tsx`

## Automated Checks
- Vitest (where feasible without a real canvas — test the systems/logic
  layer independent of rendering): collision detection triggers the correct
  component behavior (e.g. `StopOnCollideComponent` halts movement on
  contact; `ScoreRemovalOfComponent` increments score and checks win
  threshold; `RespawnOnRemoveComponent` respawns after removal).

## Manual Test
1. Run the full pipeline on Occupy with the golden seed, then click "Play".
2. Confirm all 4 entities render as labeled shapes on an 800×500 canvas.
3. Confirm Occupier (player) responds to input (mouse/touch or keys) per the
   `MouseController` substitute.
4. Drive Occupier into Police — confirm `StopOnCollide` halts appropriately
   per the resolved non-terminal from Step 09/06.
5. Drive Occupier into Wall Street — confirm the win-path behavior triggers
   (removal/shrink per whichever `_isVulnerable` resolution was chosen),
   score increments by 10 per removal, and the game announces a win at 100
   points; confirm `RespawnOnRemoveComponent` causes Wall Street instances to
   respawn so the player can keep scoring.
6. Let the lose timer (`MeterComponent`) run out without winning — confirm a
   lose state is announced.
7. Confirm no console errors during play, and that closing/replaying doesn't
   leak intervals or duplicate entities.

## Done When
- [ ] Runtime renders and plays entirely from a `GeneratedGameSpec`, no
      generator imports.
- [ ] Every component in §27's list has working behavior.
- [ ] Win and lose conditions are both reachable and correctly detected in a
      live play session.
