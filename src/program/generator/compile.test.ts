// Tests for docs/10-GENERATED-GAME-SPEC.md (pipeline stages 14-15).
// Master spec references: §26 Generated Game Spec, §38 Tests.

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { generateGame } from "@/program/generator";
import { TEMPLATES } from "@/program/generator/library";

const OCCUPY_TEMPLATE = TEMPLATES.find((t) => t.id === "occupy");
if (!OCCUPY_TEMPLATE) {
  throw new Error("Occupy template not found in templates.json");
}
const OCCUPY_CONCEPT_MAP = OCCUPY_TEMPLATE.conceptMap;

const GOLDEN_SEED = 18372;

const ComponentAssignmentSchema = z.object({
  owner: z.string(),
  component: z.string(),
  target: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});

const GameEntitySchema = z.object({
  id: z.string(),
  noun: z.string(),
  components: z.array(ComponentAssignmentSchema),
  isPlayer: z.boolean(),
  transform: z
    .object({
      x: z.number().optional(),
      y: z.number().optional(),
      width: z.number().optional(),
      height: z.number().optional(),
      rotation: z.number().optional(),
    })
    .optional(),
  movementRestriction: z
    .object({ axis: z.string(), region: z.string() })
    .optional(),
  count: z.number().optional(),
});

const GeneratedGameSpecSchema = z.object({
  seed: z.number(),
  entities: z.array(GameEntitySchema),
  world: z.array(GameEntitySchema),
  playerEntityId: z.string(),
  winCondition: z.record(z.string(), z.unknown()),
  loseCondition: z.record(z.string(), z.unknown()),
  structure: z.record(z.string(), z.unknown()),
  instructions: z.object({
    player: z.string(),
    win: z.string(),
    lose: z.string(),
  }),
});

describe("§26 compileGeneratedGameSpec", () => {
  it("produces output that validates against the GeneratedGameSpec schema", () => {
    const { spec } = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed: GOLDEN_SEED });

    expect(() => GeneratedGameSpecSchema.parse(spec)).not.toThrow();
  });

  it("sets playerEntityId to whichever entity had isPlayer: true", () => {
    const { game, spec } = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed: GOLDEN_SEED });

    const player = game.entities.find((e) => e.isPlayer);
    expect(player).toBeDefined();
    expect(spec.playerEntityId).toBe(player?.id);
  });
});

describe("§18 instruction text interpolation", () => {
  it("interpolates the bound entity's noun into the win instruction", () => {
    const { spec } = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed: GOLDEN_SEED });

    expect(spec.instructions.win).toBe("Collect 100 points worth of Wall Street.");
  });

  it("uses the lose recipe's instruction verbatim (no bindings to interpolate)", () => {
    const { spec } = generateGame({ conceptMap: OCCUPY_CONCEPT_MAP, seed: GOLDEN_SEED });

    expect(spec.instructions.lose).toBe("Lose when time runs out.");
  });
});
