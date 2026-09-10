# Step 02 — Library JSON Authoring

## Depends On
Step 01 (folder structure exists).

## Master Spec References
- §2 Fidelity Rule (every entry needs `source` + `status`)
- §7 Library Folder
- §8 verbs.json
- §10 Paper-Described Micro-Rhetorics (full JSON for each)
- §11 components.json
- §12 Non-Terminals
- §18 Win Recipes
- §19 Lose Recipes
- §20 Structure Recipes
- §23 Patches
- §24 Parameters (parameter-ranges.json)
- §32 Templates (Occupy)

## Scope

Author every file under `src/program/library/`, with **no code reading
them yet** — this step is pure data authoring, checked by hand and by a
schema-validation script.

1. `verbs.json` — full 17-verb list from §8, `enabled` flags as specified.
2. `micro-rhetorics.json` — all 8 entries from §10 (avoids, needs, harms,
   arrests, obstructs×2, grows), each with `source: "paper"`,
   `status: "implemented"`.
3. `components.json` — components + tags from §11, matching tag assignments
   exactly (note: both `StopOnCollideComponent` and `GrowOnCollideComponent`
   are tagged `_isCollidable` per the paper).
4. `win-recipes.json` — `score-100` implemented per §18, plus reference-only
   disabled stubs for the four named-but-undefined recipes.
5. `lose-recipes.json` — `lose-run-out-of-time` implemented per §19, plus
   reference-only disabled stubs for the three named recipes.
6. `structure-recipes.json` — Frogger implemented per §20, plus reference-only
   disabled stubs for Space Invaders / Kaboom / Asteroids.
7. `patches.json` — only `everything-moves` per §23.
8. `parameter-ranges.json` — exactly the three ranges in §24, each tagged
   `source: "runtime-default"`.
9. `templates.json` — the Occupy template per §32
   (`Police arrests Occupier`, `Occupier obstructs Wall Street`,
   `Wall Street grows Occupier`).
10. Write a small standalone Node/TS script (not yet wired into the app) that
    loads each JSON file and checks:
    - valid JSON syntax;
    - every entry has `source` and `status`;
    - every enabled verb in `verbs.json` has at least one micro-rhetoric in
      `micro-rhetorics.json` with matching `verb` and `status: "implemented"`;
    - every component referenced by a micro-rhetoric assignment exists in
      `components.json` or is a documented non-terminal (§12).

This script can be a throwaway file (e.g. `scripts/validate-library.ts`) run
manually via `npx tsx` — it does not need to be a permanent Vitest suite yet
(that comes in Step 03/07 once Zod schemas exist).

## Out of Scope
- Zod schema definitions (Step 03).
- Any TypeScript types consuming this JSON beyond the validation script.
- Generator logic.

## Files Touched
- `src/program/library/verbs.json`
- `src/program/library/micro-rhetorics.json`
- `src/program/library/components.json`
- `src/program/library/win-recipes.json`
- `src/program/library/lose-recipes.json`
- `src/program/library/structure-recipes.json`
- `src/program/library/patches.json`
- `src/program/library/parameter-ranges.json`
- `src/program/library/templates.json`
- `scripts/validate-library.ts` (throwaway validation helper)

## Automated Checks
- `npx tsx scripts/validate-library.ts` exits 0 with no errors printed.

## Manual Test
1. Open each JSON file and eyeball it against the corresponding master spec
   section — confirm no invented micro-rhetorics or recipes crept in.
2. Run the validation script and confirm it reports:
   - all enabled verbs covered;
   - no dangling component references;
   - reference-only entries present but marked `enabled: false` /
     `status: "reference-only"`.
3. Deliberately break one file (e.g. remove `source` from an entry), confirm
   the validation script catches it, then revert.

## Done When
- [ ] All 9 JSON files exist and match the master spec content exactly.
- [ ] Validation script passes cleanly.
- [ ] Validation script correctly fails on an intentionally broken file.
