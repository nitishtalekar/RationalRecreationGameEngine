// Tests for docs/09-NON-TERMINALS-AND-PATCHES.md (pipeline stages 10-13).
// Master spec references: §22 Non-Terminal Resolution, §23 Patches, §24
// Parameters, §38 Tests ("Patch", "Finalization").

import { describe, expect, it } from "vitest";

import { generateGame } from "@/program/generator";
import { TEMPLATES } from "@/program/generator/library";
import { NON_TERMINALS } from "@/program/generator/library";
import type { GenerationStage } from "@/program/generator/types";

const OCCUPY_TEMPLATE = TEMPLATES.find((t) => t.id === "occupy");
if (!OCCUPY_TEMPLATE) {
  throw new Error("Occupy template not found in templates.json");
}
const OCCUPY_CONCEPT_MAP = OCCUPY_TEMPLATE.conceptMap;

const GOLDEN_SEED = 18372;

function findStage(stages: GenerationStage[], id: string): GenerationStage {
  const stage = stages.find((s) => s.id === id);
  if (!stage) throw new Error(`Trace stage not captured: ${id}`);
  return stage;
}

describe("§38 Patch — everything-moves", () => {
  it("gives movement to an entity lacking it and leaves a moving entity alone", () => {
    const { game, trace } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const patchStage = findStage(trace.stages, "patch-everything-moves");
    const calculations = patchStage.calculations as {
      owner: string;
      applicable: boolean;
      outcome: string;
    }[];

    // Occupier and Police already got _movesInAnyWay from the
    // "arrests" micro-rhetoric, so the patch must find them not applicable.
    const occupierEval = calculations.find((c) => c.owner === "Occupier");
    const policeEval = calculations.find((c) => c.owner === "Police");
    expect(occupierEval?.applicable).toBe(false);
    expect(occupierEval?.outcome).toBe("not applicable");
    expect(policeEval?.applicable).toBe(false);

    // Wall Street never receives a movement component from any
    // micro-rhetoric/recipe, so the patch must apply to it.
    const wallStreetEval = calculations.find((c) => c.owner === "Wall Street");
    expect(wallStreetEval?.applicable).toBe(true);
    expect(wallStreetEval?.outcome).toBe("applied");

    const wallStreet = game.entities.find((e) => e.id === "wall-street");
    expect(
      wallStreet?.components.some((c) =>
        ["_movesInAnyWay", "BasicMovementComponent"].includes(c.component)
      )
    ).toBe(true);
  });
});

describe("§38 Finalization — full resolve -> patch -> resolve cycle", () => {
  it("leaves no supported non-terminal tag on any entity", () => {
    const { game } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const allEntities = [...game.entities, game.world];
    for (const entity of allEntities) {
      for (const assignment of entity.components) {
        expect(NON_TERMINALS as readonly string[]).not.toContain(assignment.component);
      }
    }
  });

  it("is reproducible under a fixed seed", () => {
    const a = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed: GOLDEN_SEED });
    const b = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed: GOLDEN_SEED });

    expect(a.game).toEqual(b.game);
    expect(a.trace).toEqual(b.trace);
  });
});

describe("§38 _isVulnerable / _isRemovedBy resolution", () => {
  it("resolves only to RemoveOnCollide/ShrinkOnCollide/StopOnCollide", () => {
    const { trace } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const stage = findStage(trace.stages, "non-terminals");
    const calculations = stage.calculations as {
      nonTerminal: string;
      candidates: string[];
    }[];

    const vulnerableOrRemoved = calculations.filter(
      (c) => c.nonTerminal.includes("_isVulnerable") || c.nonTerminal.includes("_isRemovedBy")
    );
    expect(vulnerableOrRemoved.length).toBeGreaterThan(0);

    const allowed = ["RemoveOnCollideComponent", "ShrinkOnCollideComponent", "StopOnCollideComponent"];
    for (const c of vulnerableOrRemoved) {
      for (const candidate of c.candidates) {
        const name = candidate.split(" ")[0];
        expect(allowed).toContain(name);
      }
    }
  });
});

describe("§20 multiplied entities stay a single spec row", () => {
  it("keeps Police as one entity with a count, not separate clone entities", () => {
    // Regression: multiplyEntity used to clone a GameEntity into separate
    // rows (id `${owner.id}-instance-N`), which let resolveNonTerminals /
    // finalizeParameters resolve each clone independently and draw a
    // different random value (e.g. movement speed) per copy. Setting `count`
    // on the one entity instead means there is nothing per-copy to diverge —
    // the runtime spawns `count` RuntimeEntity instances from this single
    // spec entity (see GameRuntime.test.ts).
    const { game } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const policeEntities = game.entities.filter((e) => e.noun === "Police");
    expect(policeEntities).toHaveLength(1);
    expect(policeEntities[0].count).toBeGreaterThan(1);
  });
});

describe("§38 Parameter finalization", () => {
  it("only fills previously-unset parameters and respects configured ranges", () => {
    const { game, trace } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const stage = findStage(trace.stages, "parameters");
    const selections = stage.selected as { key: string; value: number }[];
    expect(selections.length).toBeGreaterThan(0);

    for (const selection of selections) {
      if (selection.key === "speed") {
        expect(selection.value).toBeGreaterThanOrEqual(80);
        expect(selection.value).toBeLessThanOrEqual(160);
      }
      if (selection.key === "seconds") {
        expect(selection.value).toBeGreaterThanOrEqual(30);
        expect(selection.value).toBeLessThanOrEqual(60);
      }
    }

    // ScoreRemovalOfComponent's winScore/scoreEachRemoval were already set
    // by the win recipe, so finalization must not have touched them.
    const wallStreet = game.entities.find((e) => e.id === "wall-street");
    const scoreComponent = wallStreet?.components.find(
      (c) => c.component === "ScoreRemovalOfComponent"
    );
    expect(scoreComponent?.params?.winScore).toBe(100);
    expect(scoreComponent?.params?.scoreEachRemoval).toBe(10);
  });
});
