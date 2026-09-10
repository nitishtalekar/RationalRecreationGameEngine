// Canonical Occupy Golden Path test per docs/14-GOLDEN-PATH-TEST-AND-POLISH.md.
// Master spec reference: §33 Occupy Golden Path Test — this is the single
// end-to-end narrative assertion of the whole generator pipeline, run for
// real (no stage mocked) against the documented golden seed. The individual
// facts asserted here are already covered piecemeal across
// microRhetoric.test.ts / winLoseStructure.test.ts / resolve.test.ts /
// compile.test.ts; this file exists to assert them together, in pipeline
// order, exactly as §33 narrates the walkthrough.

import { describe, expect, it } from "vitest";

import { generateGame } from "@/program/generator";
import { TEMPLATES } from "@/program/generator/library";
import type { GenerationStage } from "@/program/generator/types";

const OCCUPY_TEMPLATE = TEMPLATES.find((t) => t.id === "occupy");
if (!OCCUPY_TEMPLATE) {
  throw new Error("Occupy template not found in templates.json");
}
const OCCUPY_CONCEPT_MAP = OCCUPY_TEMPLATE.conceptMap;

// §31/§33: the toolbar's own default seed happens to be the documented
// golden-path seed — it selects arrests -> take custody, obstructs ->
// freeze, grows -> grow on collide.
const GOLDEN_SEED = 18372;

function findStage(stages: GenerationStage[], id: string): GenerationStage {
  const stage = stages.find((s) => s.id === id);
  if (!stage) throw new Error(`Trace stage not captured: ${id}`);
  return stage;
}

describe("§33 Occupy Golden Path", () => {
  it("selects arrests-take-custody, obstructs-freeze, grows-grow-on-collide", () => {
    const { trace } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const arrests = findStage(
      trace.stages,
      "micro-rhetoric-police-arrests-occupier"
    );
    expect(
      (arrests.selected as { selected: string }).selected
    ).toBe("arrests-take-custody");

    const obstructs = findStage(
      trace.stages,
      "micro-rhetoric-occupier-obstructs-wall-street"
    );
    expect(
      (obstructs.selected as { selected: string }).selected
    ).toBe("obstructs-freeze");

    const grows = findStage(
      trace.stages,
      "micro-rhetoric-wall-street-grows-occupier"
    );
    expect(
      (grows.selected as { selected: string }).selected
    ).toBe("grows-grow-on-collide");
  });

  it("produces the exact partial game component listing", () => {
    const { trace } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const partialGame = findStage(trace.stages, "partial-game");
    const output = partialGame.output as { noun: string; components: string[] }[];

    expect(output.find((e) => e.noun === "Police")?.components).toEqual([
      "_movesInAnyWay",
    ]);
    expect(output.find((e) => e.noun === "Occupier")?.components).toEqual([
      "_movesInAnyWay",
      "StopOnCollide(target=Police)",
      "GrowOnCollide(target=Wall Street)",
    ]);
    expect(output.find((e) => e.noun === "Wall Street")?.components).toEqual([
      "StopOnCollide(target=Occupier)",
    ]);
  });

  it("binds the win recipe X=Occupier, Y=WallStreet and applies all 6 modifications", () => {
    const { game, trace } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const selectStage = findStage(trace.stages, "recipe-select-win");
    const selected = selectStage.selected as {
      highestScore: number;
      binding: string;
      recipeId: string;
    };
    expect(selected.recipeId).toBe("win-score-100");
    expect(selected.binding).toBe("X=Occupier Y=WallStreet");
    expect(selected.highestScore).toBe(4);

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
    expect(game.entities.find((e) => e.id === "occupier")?.isPlayer).toBe(true);

    const wallStreet = game.entities.find((e) => e.id === "wall-street");
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
  });

  it("selects lose-run-out-of-time as the lose recipe", () => {
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
  });

  it("selects the Frogger structure recipe with the documented Occupy layout", () => {
    const { game, trace } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const selectStage = findStage(trace.stages, "recipe-select-structure");
    const selected = selectStage.selected as { recipeId: string; binding: string };
    expect(selected.recipeId).toBe("structure-frogger");
    expect(selected.binding).toBe("A=Occupier B=WallStreet C=Police");

    const occupier = game.entities.find((e) => e.id === "occupier");
    const wallStreet = game.entities.find((e) => e.id === "wall-street");
    const police = game.entities.find((e) => e.id === "police");

    // Occupier left, Wall Street right.
    expect(occupier?.transform?.x).toBeLessThan(wallStreet?.transform?.x ?? 0);
    // Wall Street at double size.
    expect(wallStreet?.transform?.width).toBe(2);
    expect(wallStreet?.transform?.height).toBe(2);
    // Police multiplied into several on-screen instances via `count`, all
    // sharing this one entity's movement restriction.
    expect(police?.count).toBeGreaterThan(1);
    expect(police?.movementRestriction).toEqual({
      axis: "vertical",
      region: "bars",
    });
  });

  it("is fully reproducible end to end under the golden seed", () => {
    const a = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed: GOLDEN_SEED });
    const b = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed: GOLDEN_SEED });

    expect(a.game).toEqual(b.game);
    expect(a.trace).toEqual(b.trace);
    expect(a.spec).toEqual(b.spec);
  });
});
