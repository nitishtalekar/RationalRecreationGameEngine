// Player fallback per docs/08-WIN-LOSE-STRUCTURE-RECIPES.md.
// Non-terminal resolution & parameter finalization per
// docs/09-NON-TERMINALS-AND-PATCHES.md.
// Master spec references: §13 Generation Pipeline (stages 9-13), §21 Player
// Selection, §22 Non-Terminal Resolution, §24 Parameters, §30 Trace Views
// ("Player", "Non-Terminals", "Parameters").

import type { Trace } from "@/program/generator/trace";
import type { SeededRng } from "@/program/generator/rng";
import { COMPONENTS, NON_TERMINALS, PARAMETER_RANGES } from "@/program/generator/library";
import type { ComponentAssignment, GameEntity, WorkingGame } from "@/program/generator/types";

// Entity instance counts, generic across every noun/template: an author can
// give any ConceptNode a `countRange` (resolve.ts's caller resolves it via
// seeded RNG, same mechanism as finalizeParameters below, so "Try Another"
// re-rolls counts along with everything else). Whichever entity ends up
// `isPlayer` is forced back to a single instance regardless of what was
// authored — a player is by definition the one thing the user controls, so
// this rule is a property of `isPlayer`, not a hardcoded noun like "police".
// Must run after every isPlayer assignment (recipe `setPlayer` +
// selectFallbackPlayer) and after structure recipes' `multiplyEntity`, so
// this is the final authority on `count` for every entity.
export function resolveEntityCounts(
  game: WorkingGame,
  rng: SeededRng,
  trace: Trace
): void {
  const resolved: {
    owner: string;
    isPlayer: boolean;
    range: { min: number; max: number } | null;
    count: number;
    reason: string;
  }[] = [];

  for (const entity of game.entities) {
    const node = game.conceptMap.nodes.find((n) => n.id === entity.id);
    const range = node?.countRange ?? null;

    if (entity.isPlayer) {
      entity.count = 1;
      resolved.push({
        owner: entity.noun,
        isPlayer: true,
        range,
        count: 1,
        reason: "player entities are always a single controlled instance",
      });
      continue;
    }

    if (entity.count !== undefined) {
      // A structure recipe (e.g. multiplyEntity) already assigned a fixed
      // count — more specific than an authored template range, so it wins.
      resolved.push({
        owner: entity.noun,
        isPlayer: false,
        range,
        count: entity.count,
        reason: "already set by a structure recipe",
      });
    } else if (range) {
      const count = range.min === range.max ? range.min : rng.int(range.min, range.max);
      entity.count = count;
      resolved.push({
        owner: entity.noun,
        isPlayer: false,
        range,
        count,
        reason:
          range.min === range.max
            ? "fixed count (min == max), no RNG call"
            : "seeded random choice within authored range",
      });
    } else {
      resolved.push({
        owner: entity.noun,
        isPlayer: false,
        range: null,
        count: 1,
        reason: "default: no countRange authored",
      });
    }
  }

  trace.capture("entity-counts", {
    name: "STEP 9B — ENTITY INSTANCE COUNTS",
    calculations: resolved.map((r) => ({
      owner: r.owner,
      isPlayer: r.isPlayer,
      authoredRange: r.range ? `[${r.range.min}, ${r.range.max}]` : "none",
    })),
    selected: resolved.map((r) => ({
      owner: r.owner,
      count: r.count,
      reason: r.reason,
    })),
  });
}

export function selectFallbackPlayer(
  game: WorkingGame,
  rng: SeededRng,
  trace: Trace
): void {
  const existingPlayer = game.entities.find((e) => e.isPlayer);

  if (existingPlayer) {
    trace.capture("player", {
      name: "STEP 9 — PLAYER SELECTION",
      selected: {
        noun: existingPlayer.noun,
        reason: "selected by recipe",
      },
    });
    return;
  }

  const index = rng.pickIndex(game.entities.length);
  const chosen = game.entities[index];
  chosen.isPlayer = true;

  trace.capture("player", {
    name: "STEP 9 — PLAYER SELECTION",
    calculations: game.entities.map((e) => e.noun),
    selected: {
      noun: chosen.noun,
      reason: "random fallback",
    },
  });
}

// §22 Non-Terminal Resolution: `_movesInAnyWay` has no matching entry in
// components.json — the paper never specifies a concrete implementation for
// generic movement, so this is a minimal web-runtime substitute, clearly
// labeled `runtime-default` rather than presented as a paper component (see
// docs/12-GAME-RUNTIME.md's "simple autonomous movement" runtime behavior).
export const RUNTIME_DEFAULT_MOVEMENT_COMPONENT = "BasicMovementComponent";

type NonTerminal = (typeof NON_TERMINALS)[number];

function isNonTerminal(component: string): component is NonTerminal {
  return (NON_TERMINALS as readonly string[]).includes(component);
}

function allEntities(game: WorkingGame): GameEntity[] {
  return [...game.entities, game.world];
}

function candidatesForTag(tag: NonTerminal): { name: string; source: string }[] {
  if (tag === "_movesInAnyWay") {
    return [{ name: RUNTIME_DEFAULT_MOVEMENT_COMPONENT, source: "runtime-default" }];
  }
  return COMPONENTS.filter((c) => c.tags.includes(tag)).map((c) => ({
    name: c.type,
    source: c.source,
  }));
}

function describeAssignment(assignment: ComponentAssignment, game: WorkingGame): string {
  const label = assignment.component.replace(/Component$/, "");
  const targetEntity = assignment.target
    ? allEntities(game).find((e) => e.id === assignment.target)
    : undefined;
  return targetEntity ? `${label}(target=${targetEntity.noun})` : label;
}

// §22: for each non-terminal tag present on an entity, look up concrete
// component candidates via components.json tags, and — when more than one
// candidate exists — use seeded RNG to select one. Runs a second time after
// patches (§13 stage 12) since patches may introduce new non-terminals
// (`everything-moves` adds `_movesInAnyWay`).
export function resolveNonTerminals(
  game: WorkingGame,
  rng: SeededRng,
  trace: Trace,
  stageId: string,
  stageName: string
): void {
  const resolutions: {
    owner: string;
    before: string;
    tag: NonTerminal;
    candidates: { name: string; source: string }[];
    seededChoice: string;
    resolved: string;
  }[] = [];

  for (const entity of allEntities(game)) {
    for (const assignment of entity.components) {
      if (!isNonTerminal(assignment.component)) continue;

      const tag = assignment.component;
      const before = describeAssignment(assignment, game);
      const candidates = candidatesForTag(tag);

      if (candidates.length === 0) {
        throw new Error(`No concrete component candidates found for non-terminal "${tag}"`);
      }

      let chosenIndex = 0;
      let seededChoice = "index 0 (only candidate, no RNG call)";
      if (candidates.length > 1) {
        chosenIndex = rng.pickIndex(candidates.length);
        seededChoice = `index ${chosenIndex}`;
      }

      const chosen = candidates[chosenIndex];
      assignment.component = chosen.name;

      resolutions.push({
        owner: entity.noun,
        before,
        tag,
        candidates,
        seededChoice,
        resolved: describeAssignment(assignment, game),
      });
    }
  }

  trace.capture(stageId, {
    name: stageName,
    calculations: resolutions.map((r) => ({
      owner: r.owner,
      nonTerminal: r.before,
      candidates: r.candidates.map((c) => `${c.name} (${c.source})`),
      seededChoice: r.seededChoice,
    })),
    selected: resolutions.map((r) => ({
      owner: r.owner,
      resolved: r.resolved,
      reason:
        r.candidates.length > 1 ? "seeded random choice" : "only candidate available",
    })),
  });
}

// §24 Parameters: fill any component params left unset by a recipe/micro-
// rhetoric via a runtime-default numeric range (parameter-ranges.json). The
// paper never specifies these exact numbers, so every value here is traced
// as "numeric range: runtime-default", distinct from the "selection
// mechanism: paper" labeling used for e.g. non-terminal resolution above.
const PARAM_RANGE_BY_KEY: Record<string, keyof typeof PARAMETER_RANGES> = {
  speed: "movementSpeed",
  movementSpeed: "movementSpeed",
  size: "entitySize",
  entitySize: "entitySize",
  seconds: "timerSeconds",
  timerSeconds: "timerSeconds",
};

const PARAMETRIZED_COMPONENTS: Record<string, string[]> = {
  [RUNTIME_DEFAULT_MOVEMENT_COMPONENT]: ["speed"],
  MeterComponent: ["seconds"],
};

export function finalizeParameters(game: WorkingGame, rng: SeededRng, trace: Trace): void {
  const finalized: {
    owner: string;
    component: string;
    key: string;
    rangeKey: string;
    min: number;
    max: number;
    value: number;
  }[] = [];

  for (const entity of allEntities(game)) {
    for (const assignment of entity.components) {
      const requiredKeys = PARAMETRIZED_COMPONENTS[assignment.component];
      if (!requiredKeys) continue;

      for (const key of requiredKeys) {
        const existing = assignment.params?.[key];
        if (existing !== undefined) continue;

        const rangeKey = PARAM_RANGE_BY_KEY[key];
        const range = PARAMETER_RANGES[rangeKey];
        const value = rng.int(range.min, range.max);

        assignment.params = { ...assignment.params, [key]: value };

        finalized.push({
          owner: entity.noun,
          component: assignment.component,
          key,
          rangeKey,
          min: range.min,
          max: range.max,
          value,
        });
      }
    }
  }

  trace.capture("parameters", {
    name: "STEP 13 — PARAMETER FINALIZATION",
    calculations: finalized.map((f) => ({
      owner: f.owner,
      component: f.component.replace(/Component$/, ""),
      key: f.key,
      range: `[${f.min}, ${f.max}]`,
      selectionMechanism: "numeric range: runtime-default",
    })),
    selected: finalized.map((f) => ({
      owner: f.owner,
      component: f.component.replace(/Component$/, ""),
      key: f.key,
      value: f.value,
      source: "runtime-default",
    })),
  });
}
