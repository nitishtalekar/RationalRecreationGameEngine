import { describe, expect, it } from "vitest";

import { generateGame } from "@/program/generator";
import { TEMPLATES } from "@/program/generator/library";

const OCCUPY_TEMPLATE = TEMPLATES.find((t) => t.id === "occupy");
if (!OCCUPY_TEMPLATE) {
  throw new Error("Occupy template not found in templates.json");
}
const OCCUPY_CONCEPT_MAP = OCCUPY_TEMPLATE.conceptMap;

// §33 Occupy Golden Path Test: this seed selects
// arrests -> take custody, obstructs -> freeze, grows -> grow on collide.
const GOLDEN_SEED = 18372;

function partialGameStage(seed: number) {
  const { trace } = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed });
  const stage = trace.stages.find((s) => s.id === "partial-game");
  if (!stage) {
    throw new Error("partial-game stage not captured");
  }
  return stage.output as { noun: string; components: string[] }[];
}

describe("micro-rhetorics — selection & application", () => {
  it("§33 golden seed produces the exact documented partial game", () => {
    const output = partialGameStage(GOLDEN_SEED);

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

  it("records candidates + seeded choice + mutation for every relationship", () => {
    const { trace } = generateGame({
      conceptMap: OCCUPY_CONCEPT_MAP,
      seed: GOLDEN_SEED,
    });

    const obstructsSelection = trace.stages.find(
      (s) => s.id === "micro-rhetoric-occupier-obstructs-wall-street"
    );
    expect(obstructsSelection).toBeDefined();
    expect(obstructsSelection?.calculations).toEqual([
      "obstructs-freeze",
      "obstructs-redirect",
    ]);
    expect(
      (obstructsSelection?.selected as { selected: string }).selected
    ).toBe("obstructs-freeze");

    const arrestsSelection = trace.stages.find(
      (s) => s.id === "micro-rhetoric-police-arrests-occupier"
    );
    expect(arrestsSelection?.calculations).toEqual(["arrests-take-custody"]);
    expect(
      (arrestsSelection?.selected as { seededChoice: string }).seededChoice
    ).toContain("only candidate");

    const obstructsMutation = trace.stages.find(
      (s) => s.id === "micro-rhetoric-apply-occupier-obstructs-wall-street"
    );
    expect(obstructsMutation?.mutations).toEqual([
      "Wall Street += StopOnCollide(target=Occupier)",
    ]);
  });

  it("§38 Obstructs Variation: both freeze and redirect are reachable across seeds", () => {
    const selections = new Set<string>();

    for (let seed = 0; seed < 200; seed++) {
      const { trace } = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed });
      const stage = trace.stages.find(
        (s) => s.id === "micro-rhetoric-occupier-obstructs-wall-street"
      );
      const selected = (stage?.selected as { selected: string }).selected;
      selections.add(selected);
    }

    expect(selections.has("obstructs-freeze")).toBe(true);
    expect(selections.has("obstructs-redirect")).toBe(true);
  });

  it("is deterministic: same graph + seed produces identical partial game and trace", () => {
    const a = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed: GOLDEN_SEED });
    const b = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed: GOLDEN_SEED });

    expect(a.game).toEqual(b.game);
    expect(a.trace).toEqual(b.trace);
  });
});
