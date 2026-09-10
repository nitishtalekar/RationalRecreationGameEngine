import { describe, expect, it } from "vitest";

import {
  ConceptMapValidationError,
  generateGame,
} from "@/program/generator";
import { TEMPLATES } from "@/program/generator/library";
import type { ConceptMap } from "@/program/generator/types";

const OCCUPY_TEMPLATE = TEMPLATES.find((t) => t.id === "occupy");
if (!OCCUPY_TEMPLATE) {
  throw new Error("Occupy template not found in templates.json");
}
const OCCUPY_CONCEPT_MAP = OCCUPY_TEMPLATE.conceptMap;

describe("generateGame — entity creation", () => {
  it("creates exactly 4 entities from the Occupy template before recipes run", () => {
    // Asserted against the "entities" trace stage (stage 1) rather than the
    // final `game`, since stages 6-9 (docs/08-WIN-LOSE-STRUCTURE-RECIPES.md)
    // mutate `game` afterward — e.g. Frogger's multiplyEntity sets a `count`
    // on one entity, and a recipe/fallback always assigns a player by the
    // end of the run.
    const { trace } = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed: 1 });

    const entitiesStage = trace.stages.find((s) => s.id === "entities");
    expect(entitiesStage?.output).toEqual([
      "Police",
      "Occupier",
      "Wall Street",
      "WORLD",
    ]);
  });

  it("captures an 'entities' trace stage matching the §30 checklist format", () => {
    const { trace } = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed: 1 });

    const entitiesStage = trace.stages.find((s) => s.id === "entities");
    expect(entitiesStage).toBeDefined();
    expect(entitiesStage?.name).toBe("STEP 1 — CREATE ENTITIES");
    expect(entitiesStage?.output).toEqual([
      "Police",
      "Occupier",
      "Wall Street",
      "WORLD",
    ]);
  });

  it("throws the §36 validation error shape for a graph with no edges", () => {
    const invalidMap: ConceptMap = {
      nodes: OCCUPY_CONCEPT_MAP.nodes,
      edges: [],
    };

    expect(() => generateGame({ conceptMap: invalidMap, seed: 1 })).toThrow(
      ConceptMapValidationError
    );
  });

  it("throws the §36 validation error shape for an unknown verb", () => {
    const invalidMap: ConceptMap = {
      nodes: OCCUPY_CONCEPT_MAP.nodes,
      edges: [
        {
          id: "bad-edge",
          source: OCCUPY_CONCEPT_MAP.nodes[0].id,
          target: OCCUPY_CONCEPT_MAP.nodes[1].id,
          verb: "not-a-real-verb",
        },
      ],
    };

    let caught: unknown;
    try {
      generateGame({ conceptMap: invalidMap, seed: 1 });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ConceptMapValidationError);
    expect((caught as ConceptMapValidationError).errors[0]).toContain(
      "not a verb listed in verbs.json"
    );
  });

  it("is deterministic: same graph + seed produces identical entity order", () => {
    const a = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed: 42 });
    const b = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed: 42 });

    expect(a.game.entities.map((e) => e.id)).toEqual(
      b.game.entities.map((e) => e.id)
    );
    expect(a.trace).toEqual(b.trace);
  });
});
