# Step 10 — Instruction Text & Final GeneratedGameSpec Compilation (Pipeline Stages 14–15)

## Depends On
Step 09 (fully resolved `WorkingGame`, no remaining non-terminals, parameters filled).

## Master Spec References
- §13 Generation Pipeline (stages 14–15)
- §18/§19/§20 (`instruction` fields on recipes)
- §26 Generated Game Spec (full type)
- §30 Trace Views → "Final Spec" (Summary | Components | Blackboard | Raw JSON, Copy JSON button)

## Scope

1. Implement instruction text generation: pull the `instruction` string from
   the selected win/lose/structure recipes (with variable substitution, e.g.
   `{Y}` → the bound entity's noun, per §18's `"Collect 100 points worth of
   {Y}."`). Compose a `player` instruction (if applicable), `win`
   instruction, and `lose` instruction.
2. Implement `compileGeneratedGameSpec(game)` in `index.ts` (or a new
   `compile.ts` if that keeps `index.ts` clean): map the finalized
   `WorkingGame` into the `GeneratedGameSpec` shape from §26 — `seed`,
   `entities`, `world`, `playerEntityId`, `winCondition`, `loseCondition`,
   `structure`, `instructions`.
3. Capture a final `final-game` trace stage containing the compiled spec.
4. Build the **final-spec view** in `GenerationTrace.tsx` per §30: tabs or
   sections for Summary / Components / Blackboard / Raw JSON, plus a "Copy
   JSON" button (clipboard write).

## Out of Scope
- Actually rendering/playing the game (Step 12 — runtime).
- Full multi-stage trace polish across all earlier stages (Step 11 handles
  bringing every stage's UI up to final quality; this step only needs the
  final-spec view to work).

## Files Touched
- `src/program/generator/index.ts` (or new `compile.ts`)
- `src/components/GenerationTrace.tsx` (final-spec view)

## Automated Checks
- Vitest: `compileGeneratedGameSpec` output validates against a Zod schema
  for `GeneratedGameSpec`.
- Vitest: instruction text substitution correctly interpolates bound entity
  names (e.g. Occupy → `"Collect 100 points worth of Wall Street."`).
- Vitest: `playerEntityId` in the final spec matches whichever entity had
  `isPlayer: true` in the working game.

## Manual Test
1. Run "Make Game" on Occupy with the golden seed.
2. Confirm the trace's Final Spec section shows:
   - Summary: player, win instruction, lose instruction in plain English;
   - Components: full per-entity component listing;
   - Blackboard: `removeToWin = "wall-street"` (or equivalent id);
   - Raw JSON: the full `GeneratedGameSpec` object.
3. Click "Copy JSON" and paste elsewhere to confirm the clipboard contains
   valid, complete JSON matching the Raw JSON tab.
4. Confirm the win instruction reads "Collect 100 points worth of Wall
   Street." (or the correct bound noun).

## Done When
- [ ] `GeneratedGameSpec` is fully compiled and schema-valid.
- [ ] Instruction text is correctly generated with variable substitution.
- [ ] Final Spec trace view (all four sub-views + Copy JSON) works.
