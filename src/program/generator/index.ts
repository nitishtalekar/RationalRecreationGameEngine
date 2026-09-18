// Generator entry point per docs/05-ENTITY-CREATION.md,
// docs/06-MICRO-RHETORICS.md, and docs/08-WIN-LOSE-STRUCTURE-RECIPES.md.
// Master spec references: §13 Generation Pipeline (stages 1-9), §16 Working
// Game Model, §17 Recipes, §20 Structure Recipes, §21 Player Selection, §29
// Generation Trace, §30 Trace Views ("Entities", "Micro-Rhetorics", "Partial
// Game", "Recipe Calculations", "Player"), §35 Generator Pseudocode, §36
// Validation.

import { validateConceptMap } from "@/components/graph/validateConceptMap";
import { createSeededRng } from "@/program/generator/rng";
import { createTrace } from "@/program/generator/trace";
import {
  LOSE_RECIPES,
  MICRO_RHETORICS,
  PATCHES,
  STRUCTURE_RECIPES,
  WIN_RECIPES,
} from "@/program/generator/library";
import {
  applyMicroRhetoric,
  selectMicroRhetoric,
} from "@/program/generator/microRhetoric";
import { applyRecipe, selectRecipe, type Binding } from "@/program/generator/recipes";
import { applyPatches } from "@/program/generator/patches";
import {
  finalizeParameters,
  resolveEntityCounts,
  resolveNonTerminals,
  selectFallbackPlayer,
} from "@/program/generator/resolve";
import { compileGeneratedGameSpec, generateInstructions } from "@/program/generator/compile";
import type {
  ConceptMap,
  GameEntity,
  GeneratedGameSpec,
  GenerationTrace,
  WorkingGame,
} from "@/program/generator/types";

export class ConceptMapValidationError extends Error {
  errors: string[];

  constructor(errors: string[]) {
    super(errors.join(" "));
    this.name = "ConceptMapValidationError";
    this.errors = errors;
  }
}

export type GenerateGameInput = {
  conceptMap: ConceptMap;
  seed: number;
};

export type GenerateGameResult = {
  game: WorkingGame;
  trace: GenerationTrace;
  spec: GeneratedGameSpec;
};

function createEntity(nodeId: string, label: string): GameEntity {
  return {
    id: nodeId,
    noun: label,
    components: [],
    isPlayer: false,
  };
}

export function generateGame({
  conceptMap,
  seed,
}: GenerateGameInput): GenerateGameResult {
  const errors = validateConceptMap(conceptMap);
  if (errors.length > 0) {
    throw new ConceptMapValidationError(errors);
  }

  const trace = createTrace(seed);
  const rng = createSeededRng(seed);

  const entities = conceptMap.nodes.map((node) =>
    createEntity(node.id, node.label)
  );
  const world = createEntity("WORLD", "WORLD");

  trace.capture("entities", {
    name: "STEP 1 — CREATE ENTITIES",
    output: [...entities, world].map((entity) => entity.noun),
  });

  const game: WorkingGame = {
    conceptMap,
    entities,
    world,
    blackboard: {},
  };

  for (const relationship of conceptMap.edges) {
    const rhetoric = selectMicroRhetoric(
      relationship,
      MICRO_RHETORICS,
      rng,
      trace
    );
    applyMicroRhetoric(game, relationship, rhetoric, trace);
  }

  trace.capture("partial-game", {
    name: "STEP 5 — PARTIAL GAME",
    output: [...entities, world].map((entity) => ({
      noun: entity.noun,
      components: entity.components.map((c) => {
        const label = c.component.replace(/Component$/, "");
        const targetEntity = c.target
          ? [...entities, world].find((e) => e.id === c.target)
          : undefined;
        if (targetEntity) {
          return `${label}(target=${targetEntity.noun})`;
        }
        if (c.params) {
          return `${label}(${Object.entries(c.params)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ")})`;
        }
        return label;
      }),
    })),
  });

  const winSelection = selectRecipe("win", game, WIN_RECIPES, rng, trace);
  trace.capture("win-recipe", {
    name: "STEP 6 — WIN RECIPE",
    selected: winSelection
      ? { recipeId: winSelection.recipe.id, score: winSelection.score }
      : null,
  });
  if (winSelection) {
    applyRecipe(game, winSelection.recipe, winSelection.binding, trace);
  }

  const loseSelection = selectRecipe("lose", game, LOSE_RECIPES, rng, trace);
  trace.capture("lose-recipe", {
    name: "STEP 7 — LOSE RECIPE",
    selected: loseSelection
      ? { recipeId: loseSelection.recipe.id, score: loseSelection.score }
      : null,
  });
  if (loseSelection) {
    applyRecipe(game, loseSelection.recipe, loseSelection.binding, trace);
  }

  // §20 Structure Recipes: Frogger has no predicates, so every A/B/C
  // binding would otherwise tie at score 0. Bind deterministically off the
  // win recipe's own binding — A = the win recipe's player (X), B = the win
  // recipe's target (Y) — rather than picking randomly among ties, so the
  // structure recipe reinforces the same win-condition roles instead of an
  // arbitrary one. Any remaining noun entity (excluding WORLD) becomes C.
  const structureFixedBinding: Binding = {};
  if (winSelection) {
    const [xVar, yVar] = Object.keys(winSelection.binding).sort();
    if (xVar) structureFixedBinding.A = winSelection.binding[xVar];
    if (yVar) structureFixedBinding.B = winSelection.binding[yVar];
    const remaining = entities.find(
      (e) =>
        e.id !== structureFixedBinding.A && e.id !== structureFixedBinding.B
    );
    if (remaining) structureFixedBinding.C = remaining.id;
  }

  const structureSelection = selectRecipe(
    "structure",
    game,
    STRUCTURE_RECIPES,
    rng,
    trace,
    structureFixedBinding
  );
  trace.capture("structure-recipe", {
    name: "STEP 8 — STRUCTURE RECIPE",
    selected: structureSelection
      ? { recipeId: structureSelection.recipe.id, score: structureSelection.score }
      : null,
  });
  if (structureSelection) {
    applyRecipe(
      game,
      structureSelection.recipe,
      structureSelection.binding,
      trace
    );
  }

  selectFallbackPlayer(game, rng, trace);
  resolveEntityCounts(game, rng, trace);

  resolveNonTerminals(
    game,
    rng,
    trace,
    "non-terminals",
    "STEP 10 — NON-TERMINAL RESOLUTION"
  );
  applyPatches(game, PATCHES, trace);
  resolveNonTerminals(
    game,
    rng,
    trace,
    "non-terminals-post-patch",
    "STEP 12 — NON-TERMINAL RESOLUTION (POST-PATCH)"
  );
  finalizeParameters(game, rng, trace);

  const instructions = generateInstructions(game, winSelection, loseSelection, trace);
  const spec = compileGeneratedGameSpec(game, seed, instructions, trace);

  return { game, trace: trace.finish(), spec };
}
