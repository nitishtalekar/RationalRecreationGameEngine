// Patch application per docs/09-NON-TERMINALS-AND-PATCHES.md.
// Master spec references: §13 Generation Pipeline (stage 11), §23 Patches,
// §30 Trace Views ("Patches"), §34 patches.ts.

import type { Trace } from "@/program/generator/trace";
import type { LibraryPatch } from "@/program/generator/library";
import { RUNTIME_DEFAULT_MOVEMENT_COMPONENT } from "@/program/generator/resolve";
import type { ComponentAssignment, GameEntity, WorkingGame } from "@/program/generator/types";

// §23: only "everything-moves" is implemented, and its modification uses an
// `owner: "*"` wildcard meaning "every entity" — a shape the single-owner
// Modification/applyRecipe model (recipes.ts) does not support, so patches
// get their own per-entity iteration here rather than reusing applyRecipe.
const WILDCARD_OWNER = "*";

function allEntities(game: WorkingGame): GameEntity[] {
  return [...game.entities, game.world];
}

// By the time patches run, an entity's own `_movesInAnyWay` (if it had one)
// has already gone through the first non-terminal resolution pass (§13
// stage 10) and become the concrete runtime-default movement component —
// see resolve.ts's RUNTIME_DEFAULT_MOVEMENT_COMPONENT — so both forms count
// as "already has movement" here.
function hasMovementComponent(entity: GameEntity): boolean {
  return entity.components.some(
    (c) =>
      c.component === "_movesInAnyWay" || c.component === RUNTIME_DEFAULT_MOVEMENT_COMPONENT
  );
}

// §23 preconditions are free-text in patches.json ("entity lacks any
// movement component"); "everything-moves" is the only implemented patch, so
// this checks that precondition directly rather than building a generic
// precondition-expression evaluator for a single case.
function patchApplies(patch: LibraryPatch, entity: GameEntity): boolean {
  if (patch.id === "everything-moves") {
    return !hasMovementComponent(entity);
  }
  return false;
}

export function applyPatches(
  game: WorkingGame,
  patches: LibraryPatch[],
  trace: Trace
): void {
  const implemented = patches.filter((p) => p.status === "implemented");

  for (const patch of implemented) {
    const evaluations: { owner: string; applicable: boolean }[] = [];
    const mutations: string[] = [];

    for (const entity of allEntities(game)) {
      const applicable = patchApplies(patch, entity);
      evaluations.push({ owner: entity.noun, applicable });

      if (!applicable) continue;

      const { modification } = patch;
      if (modification.type === "addComponent" && modification.component) {
        if (modification.owner !== WILDCARD_OWNER) continue;

        const assignment: ComponentAssignment = {
          owner: entity.id,
          component: modification.component,
        };
        entity.components.push(assignment);

        const label = modification.component.replace(/Component$/, "");
        mutations.push(`${entity.noun} += ${label}`);
      }
    }

    trace.capture(`patch-${patch.id}`, {
      name: `STEP 11 — PATCH: ${patch.id}`,
      input: { description: patch.description, precondition: patch.precondition },
      calculations: evaluations.map((e) => ({
        owner: e.owner,
        applicable: e.applicable,
        outcome: e.applicable ? "applied" : "not applicable",
      })),
      mutations,
    });
  }
}
