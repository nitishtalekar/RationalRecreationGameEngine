// Instruction text & final GeneratedGameSpec compilation per
// docs/10-GENERATED-GAME-SPEC.md.
// Master spec references: §13 Generation Pipeline (stages 14-15), §18/§19/§20
// (recipe `instruction` fields), §26 Generated Game Spec, §30 Trace Views
// ("Final Spec").

import type { Trace } from "@/program/generator/trace";
import type { Binding } from "@/program/generator/recipes";
import type { GameEntity, GeneratedGameSpec, Recipe, WorkingGame } from "@/program/generator/types";

const INTERPOLATION_PATTERN = /\{([A-Za-z0-9]+)\}/g;

function findEntity(game: WorkingGame, entityId: string): GameEntity | undefined {
  return [...game.entities, game.world].find((e) => e.id === entityId);
}

// §18-20: instruction strings use `{Y}`-style placeholders naming a recipe's
// logical binding variable (e.g. win-score-100's `{Y}`); interpolate each
// with the noun of whichever entity that variable was bound to.
function interpolateInstruction(
  instruction: string,
  game: WorkingGame,
  binding: Binding
): string {
  return instruction.replace(INTERPOLATION_PATTERN, (match, variable: string) => {
    const entityId = binding[variable];
    const entity = entityId ? findEntity(game, entityId) : undefined;
    return entity ? entity.noun : match;
  });
}

export type RecipeSelectionForInstructions = {
  recipe: Recipe;
  binding: Binding;
} | null;

export type Instructions = {
  player: string;
  win: string;
  lose: string;
};

const NO_WIN_INSTRUCTION = "No win condition was generated.";
const NO_LOSE_INSTRUCTION = "No lose condition was generated.";
const NO_PLAYER_INSTRUCTION = "";

// §18/§19: only win/lose recipes carry `instruction` text; structure recipes
// don't (structure-frogger's is `null`), so there's no "structure"
// instruction to compose. The "player" instruction is derived from the win
// instruction since the paper doesn't publish a separate player-facing
// string distinct from the win condition's own phrasing.
export function generateInstructions(
  game: WorkingGame,
  winSelection: RecipeSelectionForInstructions,
  loseSelection: RecipeSelectionForInstructions,
  trace: Trace
): Instructions {
  const win =
    winSelection?.recipe.instruction
      ? interpolateInstruction(winSelection.recipe.instruction, game, winSelection.binding)
      : NO_WIN_INSTRUCTION;

  const lose =
    loseSelection?.recipe.instruction
      ? interpolateInstruction(loseSelection.recipe.instruction, game, loseSelection.binding)
      : NO_LOSE_INSTRUCTION;

  const player = winSelection?.recipe.instruction ? win : NO_PLAYER_INSTRUCTION;

  const instructions: Instructions = { player, win, lose };

  trace.capture("instructions", {
    name: "STEP 14 — INSTRUCTION TEXT",
    input: {
      winRecipeId: winSelection?.recipe.id ?? null,
      loseRecipeId: loseSelection?.recipe.id ?? null,
    },
    output: instructions,
  });

  return instructions;
}

// §26: maps the finalized WorkingGame into the GeneratedGameSpec shape.
// `world` is an array in the spec even though WorkingGame.world is a single
// sentinel entity, so it's wrapped here.
export function compileGeneratedGameSpec(
  game: WorkingGame,
  seed: number,
  instructions: Instructions,
  trace: Trace
): GeneratedGameSpec {
  const playerEntity = game.entities.find((e) => e.isPlayer);
  if (!playerEntity) {
    throw new Error("No player entity found when compiling GeneratedGameSpec");
  }

  const spec: GeneratedGameSpec = {
    seed,
    entities: game.entities,
    world: [game.world],
    playerEntityId: playerEntity.id,
    winCondition: { ...game.blackboard },
    loseCondition: { ...game.blackboard },
    structure: { ...game.blackboard },
    instructions,
  };

  trace.capture("final-game", {
    name: "STEP 15 — FINAL GAME SPEC",
    output: spec,
  });

  return spec;
}
