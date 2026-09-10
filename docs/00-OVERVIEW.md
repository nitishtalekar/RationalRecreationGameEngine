# Game-O-Matic Replica — Implementation Roadmap

This folder splits [`MASTER-SPEC.md`](MASTER-SPEC.md) (the master spec) into
sequential, independently-testable steps. Implement them **in order** — each
step builds on artifacts created by the previous one, and each ends with a
manual verification you can run before moving on.

The master spec remains the source of truth for fidelity rules (what counts
as "paper-described" vs "reference-only"), full JSON content, and the overall
vision. These step specs tell you **what to build, in what order, and how to
know it works** — cross-referencing the master spec's section numbers instead
of restating everything.

## Step Index

| # | Spec | What you get at the end |
|---|------|--------------------------|
| 01 | [01-PROJECT-SETUP.md](01-PROJECT-SETUP.md) | Next.js + TS + Radix UI project skeleton, dark theme shell, folder structure, no logic yet |
| 02 | [02-LIBRARY-JSON.md](02-LIBRARY-JSON.md) | All `src/program/library/*.json` files authored and schema-validated |
| 03 | [03-CORE-TYPES-AND-RNG.md](03-CORE-TYPES-AND-RNG.md) | Shared TS types + seeded RNG utility, unit tested in isolation |
| 04 | [04-CONCEPT-GRAPH-UI.md](04-CONCEPT-GRAPH-UI.md) | Editable concept graph (`@xyflow/react`) with verb gating, no generator wired up yet |
| 05 | [05-ENTITY-CREATION.md](05-ENTITY-CREATION.md) | Pipeline stage 1: nouns → entities + trace stage 1, visible in a minimal trace panel |
| 06 | [06-MICRO-RHETORICS.md](06-MICRO-RHETORICS.md) | Pipeline stages 2–4: micro-rhetoric selection/application producing the Partial Game |
| 07 | [07-RECIPES-ENGINE.md](07-RECIPES-ENGINE.md) | Generic recipe scoring/selection engine (predicates, bindings, modifications) |
| 08 | [08-WIN-LOSE-STRUCTURE-RECIPES.md](08-WIN-LOSE-STRUCTURE-RECIPES.md) | Pipeline stages 6–9: score-100 win, run-out-of-time lose, Frogger structure, player fallback |
| 09 | [09-NON-TERMINALS-AND-PATCHES.md](09-NON-TERMINALS-AND-PATCHES.md) | Pipeline stages 10–13: non-terminal resolution, patches, parameter finalization |
| 10 | [10-GENERATED-GAME-SPEC.md](10-GENERATED-GAME-SPEC.md) | Pipeline stages 14–15: instruction text + final `GeneratedGameSpec` compilation |
| 11 | [11-GENERATION-TRACE-UI.md](11-GENERATION-TRACE-UI.md) | Full `GenerationTrace` component rendering all stages per master spec §29–30 |
| 12 | [12-GAME-RUNTIME.md](12-GAME-RUNTIME.md) | Canvas 2D runtime: entities render and the generated rules actually run/are playable |
| 13 | [13-TOOLBAR-TEMPLATES-INTEGRATION.md](13-TOOLBAR-TEMPLATES-INTEGRATION.md) | Toolbar, templates, `Try Another`/`Reset`, full page wiring end to end |
| 14 | [14-GOLDEN-PATH-TEST-AND-POLISH.md](14-GOLDEN-PATH-TEST-AND-POLISH.md) | Occupy golden-path automated test (master spec §33) + Definition of Done checklist (§40) |

## How to use these specs

1. Open the step file, read **Scope**, **Depends On**, and **Master Spec References**.
2. Implement only what's in **Scope** — resist pulling forward later steps.
3. Run the **Automated Checks** (if any) and then the **Manual Test** procedure.
4. Only proceed to the next step once the manual test passes.

## Conventions used in every step spec

- **Depends On** — which earlier steps must be complete.
- **Master Spec References** — section numbers in the master spec to reread while implementing.
- **Scope** — the concrete deliverables for this step, no more.
- **Out of Scope** — explicitly deferred items, to prevent scope creep into later steps.
- **Files Touched** — expected new/modified files.
- **Automated Checks** — `npm run` commands / tests to add or run.
- **Manual Test** — step-by-step actions you take in the browser/CLI to confirm the step works.
- **Done When** — a short checklist gate before moving on.
