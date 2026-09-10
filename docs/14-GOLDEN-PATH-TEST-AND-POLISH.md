# Step 14 — Occupy Golden Path Test & Definition of Done

## Depends On
All prior steps (01–13) — this is the final validation and polish pass.

## Master Spec References
- §33 Occupy Golden Path Test (full canonical values)
- §38 Tests (complete minimum test list)
- §39 Explicit Non-Goals (final audit)
- §40 Definition of Done (full checklist)
- §41 Canonical Mental Model (final sanity read-through)

## Scope

1. Write the canonical **Occupy Golden Path** automated test per §33 as a
   single Vitest integration test that runs `generateGame` end to end (not
   mocking any stage) with the documented golden seed and asserts, in order:
   - micro-rhetoric selections: `arrests-take-custody`, `obstructs-freeze`,
     `grows-grow-on-collide`;
   - the exact partial game component listing;
   - win recipe binds `X=Occupier, Y=WallStreet` and applies all 6
     modifications correctly;
   - lose recipe is `lose-run-out-of-time`;
   - structure recipe is Frogger with the documented layout
     (Occupier left, Wall Street right at 2x, Police multiplied + vertically
     constrained).
2. Sweep back through §38's full minimum test list and confirm every item is
   covered somewhere in the test suite (library validity, determinism,
   obstructs variation, recipe scoring, score recipe modifications, player
   fallback, patch application, non-terminal finalization) — fill any gaps
   found.
3. Audit against §39 Explicit Non-Goals — grep the codebase for anything
   resembling an agent, LLM call, invented micro-rhetoric, invented recipe
   scoring, backend/database usage, or generated source code, and remove/
   fix any violation.
4. Walk the full §40 Definition of Done checklist (19 items) against the
   running app and check off each one, fixing any gaps found.
5. Do a final pass reading through the app against §41's mental-model
   diagram to confirm the UI makes each pipeline transition visually obvious.

## Out of Scope
- New features not already specified in the master spec.

## Files Touched
- `src/program/generator/goldenPath.test.ts` (new canonical integration test)
- Any small fixes surfaced by the §38/§39/§40 audits (should be minor by this point)

## Automated Checks
- `npx vitest run` — full suite green, including the new golden path test.
- `npm run build` succeeds with no errors.

## Manual Test
1. Run the golden path test and confirm it passes without any test-only
   shortcuts (it must exercise the real pipeline, not a mocked one).
2. In the browser, manually reproduce the entire golden path: load Occupy,
   set the documented seed, Make Game, verify every trace stage matches
   §33's expected values, then Play and confirm the game is actually
   winnable and losable as described.
3. Go through the §40 checklist item by item in the running app, checking
   off each one explicitly.
4. Confirm `git status`/file search shows no stray debug code, no backend
   calls, no LLM/agent integration anywhere in the codebase.

## Done When
- [ ] Golden path automated test passes end to end.
- [ ] Every §38 minimum test exists and passes.
- [ ] §39 non-goals audit found no violations (or violations were fixed).
- [ ] All 19 items in §40 Definition of Done are checked off against the
      live app.
- [ ] The project is ready to call "done" per the master spec.
