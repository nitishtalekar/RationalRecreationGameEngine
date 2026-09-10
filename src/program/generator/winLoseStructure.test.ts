// Tests for docs/08-WIN-LOSE-STRUCTURE-RECIPES.md (pipeline stages 6-9).
// Master spec references: §33 Occupy Golden Path Test, §38 Tests
// ("Recipe Scoring", "Score Recipe", "Player").

import { describe, expect, it } from "vitest";

import { generateGame } from "@/program/generator";
import { TEMPLATES } from "@/program/generator/library";
import type { GenerationStage } from "@/program/generator/types";

const OCCUPY_TEMPLATE = TEMPLATES.find((t) => t.id === "occupy");
if (!OCCUPY_TEMPLATE) {
  throw new Error("Occupy template not found in templates.json");
}
const OCCUPY_CONCEPT_MAP = OCCUPY_TEMPLATE.conceptMap;

// §33 Occupy Golden Path Test: this seed selects
// arrests -> take custody, obstructs -> freeze, grows -> grow on collide.
const GOLDEN_SEED = 18372;

function findStage(stages: GenerationStage[], id: string): GenerationStage {
  const stage = stages.find((s) => s.id === id);
  if (!stage) throw new Error(`Trace stage not captured: ${id}`);
  return stage;
}

describe("§38 Recipe Scoring — Occupy win-recipe binding", () => {
  it("scores X=Occupier, Y=WallStreet at +4 via _isVulnerable", () => {
    const { trace } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const scoreStage = findStage(trace.stages, "recipe-score-win-score-100");
    const calculations = scoreStage.calculations as {
      binding: string;
      score: number;
    }[];

    const forward = calculations.find((c) => c.binding === "X=Occupier Y=WallStreet");
    expect(forward?.score).toBe(4);
  });

  it("scores the reverse binding X=WallStreet, Y=Occupier at 0", () => {
    const { trace } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const scoreStage = findStage(trace.stages, "recipe-score-win-score-100");
    const calculations = scoreStage.calculations as {
      binding: string;
      score: number;
    }[];

    const reverse = calculations.find((c) => c.binding === "X=WallStreet Y=Occupier");
    expect(reverse?.score).toBe(0);
  });

  it("selects the X=Occupier, Y=WallStreet binding for the golden seed", () => {
    const { trace } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const selectStage = findStage(trace.stages, "recipe-select-win");
    const selected = selectStage.selected as {
      highestScore: number;
      binding: string;
      recipeId: string;
    };

    expect(selected.highestScore).toBe(4);
    expect(selected.recipeId).toBe("win-score-100");
    expect(selected.binding).toBe("X=Occupier Y=WallStreet");
  });
});

describe("§38 Score Recipe — all six score-100 modifications", () => {
  it("applies blackboard write, component swap, and setPlayer in order", () => {
    const { game, trace } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const applyStage = findStage(trace.stages, "recipe-apply-win-score-100");
    expect(applyStage.mutations).toEqual([
      "blackboard.removeToWin = Wall Street",
      "Wall Street -= _isVulnerable(target=Occupier)",
      "Wall Street += _isRemovedBy(target=Occupier)",
      "Wall Street += ScoreRemovalOf(winScore=100, scoreEachRemoval=10)",
      "Wall Street += RespawnOnRemove",
      "Occupier made player",
    ]);

    expect(game.blackboard.removeToWin).toBe("wall-street");

    const wallStreet = game.entities.find((e) => e.id === "wall-street");
    expect(
      wallStreet?.components.some(
        (c) => c.component === "_isVulnerable" && c.target === "occupier"
      )
    ).toBe(false);
    // As of docs/09-NON-TERMINALS-AND-PATCHES.md, the `_isRemovedBy` tag this
    // recipe adds no longer survives to the final game — it is resolved to a
    // concrete collision-removal component (§22) later in the pipeline.
    expect(
      wallStreet?.components.some(
        (c) =>
          ["RemoveOnCollideComponent", "ShrinkOnCollideComponent", "StopOnCollideComponent"].includes(
            c.component
          ) && c.target === "occupier"
      )
    ).toBe(true);
    expect(
      wallStreet?.components.some(
        (c) =>
          c.component === "ScoreRemovalOfComponent" &&
          c.params?.winScore === 100 &&
          c.params?.scoreEachRemoval === 10
      )
    ).toBe(true);
    expect(
      wallStreet?.components.some((c) => c.component === "RespawnOnRemoveComponent")
    ).toBe(true);

    const occupier = game.entities.find((e) => e.id === "occupier");
    expect(occupier?.isPlayer).toBe(true);
  });
});

describe("§38 Player — recipe selection vs. random fallback", () => {
  it("preserves the recipe-selected player and records the reason", () => {
    const { game, trace } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const playerStage = findStage(trace.stages, "player");
    expect(playerStage.selected).toEqual({
      noun: "Occupier",
      reason: "selected by recipe",
    });
    expect(game.entities.find((e) => e.id === "occupier")?.isPlayer).toBe(true);
  });

  it("falls back to a random noun when no win recipe meaningfully applies", () => {
    // Keep only "grows", which never assigns _isVulnerable, so win-score-100
    // has no binding with score > 0 and is treated as unassigned (§21).
    const growsOnly = {
      nodes: OCCUPY_CONCEPT_MAP.nodes,
      edges: OCCUPY_CONCEPT_MAP.edges.filter((e) => e.verb === "grows"),
    };

    const { game, trace } = generateGame({ conceptMap: growsOnly, seed: GOLDEN_SEED });

    const winSelectStage = findStage(trace.stages, "recipe-select-win");
    expect(winSelectStage.selected).toBeNull();

    const playerStage = findStage(trace.stages, "player");
    const selected = playerStage.selected as { noun: string; reason: string };
    expect(selected.reason).toBe("random fallback");
    expect(game.entities.some((e) => e.isPlayer)).toBe(true);
  });
});

describe("§33 / §20 Frogger structure recipe", () => {
  it("binds A=Occupier, B=WallStreet, C=Police off the win recipe's roles", () => {
    const { trace } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const selectStage = findStage(trace.stages, "recipe-select-structure");
    const selected = selectStage.selected as { recipeId: string; binding: string };
    expect(selected.recipeId).toBe("structure-frogger");
    expect(selected.binding).toBe("A=Occupier B=WallStreet C=Police");
  });

  it("places A left, B right at 2x scale, multiplies C, and restricts C to vertical bars", () => {
    const { game } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const occupier = game.entities.find((e) => e.id === "occupier");
    const wallStreet = game.entities.find((e) => e.id === "wall-street");
    const police = game.entities.find((e) => e.id === "police");

    expect(occupier?.transform?.x).toBeLessThan(wallStreet?.transform?.x ?? 0);
    expect(wallStreet?.transform?.width).toBe(2);
    expect(wallStreet?.transform?.height).toBe(2);

    expect(police?.count).toBeGreaterThan(1);
    expect(police?.movementRestriction).toEqual({
      axis: "vertical",
      region: "bars",
    });
  });

  it("is deterministic: same graph + seed reproduces the same trace and game", () => {
    const a = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed: GOLDEN_SEED });
    const b = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed: GOLDEN_SEED });

    expect(a.game).toEqual(b.game);
    expect(a.trace).toEqual(b.trace);
  });
});

describe("§17 Recipe ordering — WIN -> LOSE -> STRUCTURE", () => {
  it("captures lose-run-out-of-time applied to the real WORLD entity", () => {
    const { game, trace } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const selectStage = findStage(trace.stages, "recipe-select-lose");
    const selected = selectStage.selected as { recipeId: string };
    expect(selected.recipeId).toBe("lose-run-out-of-time");

    expect(
      game.world.components.some((c) => c.component === "MeterComponent")
    ).toBe(true);
    expect(
      game.entities.some((e) =>
        e.components.some((c) => c.component === "MeterComponent")
      )
    ).toBe(false);
  });

  it("orders win/lose/structure trace stages after partial-game and before player", () => {
    const { trace } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const ids = trace.stages.map((s) => s.id);
    const partialGameIndex = ids.indexOf("partial-game");
    const winIndex = ids.indexOf("win-recipe");
    const loseIndex = ids.indexOf("lose-recipe");
    const structureIndex = ids.indexOf("structure-recipe");
    const playerIndex = ids.indexOf("player");

    expect(partialGameIndex).toBeLessThan(winIndex);
    expect(winIndex).toBeLessThan(loseIndex);
    expect(loseIndex).toBeLessThan(structureIndex);
    expect(structureIndex).toBeLessThan(playerIndex);
  });
});
