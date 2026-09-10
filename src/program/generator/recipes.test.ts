// Generic recipe scoring engine tests per docs/07-RECIPES-ENGINE.md.
// Uses a small synthetic recipe defined inline (not library/) to validate
// engine mechanics in isolation — real recipe content lands in Step 08.

import { describe, expect, it } from "vitest";

import {
  applyRecipe,
  enumerateBindings,
  evaluatePredicate,
  scoreRecipes,
  selectRecipe,
} from "@/program/generator/recipes";
import { createSeededRng } from "@/program/generator/rng";
import { createTrace } from "@/program/generator/trace";
import type { Recipe, WorkingGame } from "@/program/generator/types";

function makeGame(): WorkingGame {
  return {
    conceptMap: { nodes: [], edges: [] },
    entities: [
      { id: "a", noun: "Alpha", components: [], isPlayer: false },
      {
        id: "b",
        noun: "Beta",
        components: [{ owner: "b", component: "_isVulnerable", target: "a" }],
        isPlayer: false,
      },
    ],
    world: { id: "WORLD", noun: "WORLD", components: [], isPlayer: false },
    blackboard: {},
  };
}

// Sometimes-true predicate: Y has tag _isVulnerable targeted by X.
// Only true for X=a, Y=b (per makeGame's fixture).
const SYNTHETIC_RECIPE: Recipe = {
  id: "synthetic-score",
  category: "win",
  status: "implemented",
  source: "test",
  enabled: true,
  predicates: [
    {
      description: "Y has tag _isVulnerable targeted by X",
      check: "hasComponentTag",
      subject: "Y",
      tag: "_isVulnerable",
      target: "X",
      trueScore: 4,
      falseScore: 0,
    },
  ],
  modifications: [
    { type: "setBlackboard", key: "removeToWin", value: "$Y" },
    { type: "addComponent", owner: "Y", component: "_isRemovedBy", target: "X" },
    { type: "setPlayer", owner: "X" },
  ],
  instruction: "Synthetic test recipe.",
};

// Strict variant: same predicate, marked strict, so failing bindings are
// rejected outright rather than merely scoring 0.
const STRICT_RECIPE: Recipe = {
  ...SYNTHETIC_RECIPE,
  id: "synthetic-strict",
  predicates: [{ ...SYNTHETIC_RECIPE.predicates[0], strict: true }],
};

// Two recipes that both score the maximum for the same binding shape,
// forcing selectRecipe to break the tie via RNG.
const TIE_RECIPE_A: Recipe = {
  ...SYNTHETIC_RECIPE,
  id: "synthetic-tie-a",
};
const TIE_RECIPE_B: Recipe = {
  ...SYNTHETIC_RECIPE,
  id: "synthetic-tie-b",
};

describe("recipes engine — enumerateBindings", () => {
  it("generates all X/Y bindings across every entity including WORLD", () => {
    const game = makeGame();
    const bindings = enumerateBindings(SYNTHETIC_RECIPE, game);

    // 3 entities (a, b, WORLD) ^ 2 variables (X, Y) = 9 combinations.
    expect(bindings).toHaveLength(9);
    expect(bindings).toContainEqual({ X: "a", Y: "b" });
    expect(bindings).toContainEqual({ X: "WORLD", Y: "WORLD" });
  });
});

describe("recipes engine — evaluatePredicate", () => {
  it("is true for the binding where the tag/target relationship holds", () => {
    const game = makeGame();
    const evaluation = evaluatePredicate(
      SYNTHETIC_RECIPE.predicates[0],
      { X: "a", Y: "b" },
      game
    );
    expect(evaluation.result).toBe(true);
    expect(evaluation.score).toBe(4);
  });

  it("is false for a binding where the relationship does not hold", () => {
    const game = makeGame();
    const evaluation = evaluatePredicate(
      SYNTHETIC_RECIPE.predicates[0],
      { X: "b", Y: "a" },
      game
    );
    expect(evaluation.result).toBe(false);
    expect(evaluation.score).toBe(0);
  });
});

describe("recipes engine — scoreRecipes", () => {
  it("produces a candidate table with binding/predicate/result/score for every binding", () => {
    const game = makeGame();
    const rng = createSeededRng(1);
    const trace = createTrace(1);

    const scorings = scoreRecipes("win", game, [SYNTHETIC_RECIPE], rng, trace);

    expect(scorings).toHaveLength(1);
    expect(scorings[0].candidates).toHaveLength(9);

    const winning = scorings[0].candidates.find(
      (c) => c.binding.X === "a" && c.binding.Y === "b"
    );
    expect(winning?.score).toBe(4);
    expect(winning?.evaluations[0].result).toBe(true);
    expect(winning?.rejected).toBe(false);

    const stage = trace.finish().stages.find((s) => s.id === "recipe-score-synthetic-score");
    expect(stage).toBeDefined();
    expect(
      (stage?.calculations as { binding: string; score: number }[]).some(
        (c) => c.binding === "X=Alpha Y=Beta" && c.score === 4
      )
    ).toBe(true);
  });

  it("only includes implemented + enabled recipes in the given category", () => {
    const game = makeGame();
    const rng = createSeededRng(1);
    const trace = createTrace(1);

    const disabled: Recipe = { ...SYNTHETIC_RECIPE, id: "disabled", enabled: false };
    const wrongCategory: Recipe = { ...SYNTHETIC_RECIPE, id: "lose-one", category: "lose" };

    const scorings = scoreRecipes(
      "win",
      game,
      [SYNTHETIC_RECIPE, disabled, wrongCategory],
      rng,
      trace
    );

    expect(scorings.map((s) => s.recipe.id)).toEqual(["synthetic-score"]);
  });

  it("rejects bindings that fail a strict predicate instead of merely scoring 0", () => {
    const game = makeGame();
    const rng = createSeededRng(1);
    const trace = createTrace(1);

    const scorings = scoreRecipes("win", game, [STRICT_RECIPE], rng, trace);
    const candidates = scorings[0].candidates;

    const passing = candidates.find((c) => c.binding.X === "a" && c.binding.Y === "b");
    const failing = candidates.find((c) => c.binding.X === "b" && c.binding.Y === "a");

    expect(passing?.rejected).toBe(false);
    expect(failing?.rejected).toBe(true);
  });
});

describe("recipes engine — selectRecipe", () => {
  it("selects the highest-scoring, non-rejected candidate", () => {
    const game = makeGame();
    const rng = createSeededRng(1);
    const trace = createTrace(1);

    const selection = selectRecipe("win", game, [SYNTHETIC_RECIPE], rng, trace);

    expect(selection).not.toBeNull();
    expect(selection?.recipe.id).toBe("synthetic-score");
    expect(selection?.binding).toEqual({ X: "a", Y: "b" });
    expect(selection?.score).toBe(4);
  });

  it("returns null and traces the miss when every candidate is rejected", () => {
    const rng = createSeededRng(1);
    const trace = createTrace(1);

    // No entity satisfies the strict predicate for X != a or Y != b,
    // but rejection only removes failing bindings — the passing one still
    // wins. To force an all-rejected scenario, use a game with no _isVulnerable tag at all.
    const bareGame: WorkingGame = {
      conceptMap: { nodes: [], edges: [] },
      entities: [{ id: "a", noun: "Alpha", components: [], isPlayer: false }],
      world: { id: "WORLD", noun: "WORLD", components: [], isPlayer: false },
      blackboard: {},
    };

    const selection = selectRecipe("win", bareGame, [STRICT_RECIPE], rng, trace);
    expect(selection).toBeNull();

    const stage = trace.finish().stages.find((s) => s.id === "recipe-select-win");
    expect(stage?.selected).toBeNull();
  });

  it("breaks ties via seeded RNG, deterministically under a fixed seed", () => {
    const game = makeGame();

    function selectWithSeed(seed: number) {
      const rng = createSeededRng(seed);
      const trace = createTrace(seed);
      return selectRecipe("win", game, [TIE_RECIPE_A, TIE_RECIPE_B], rng, trace);
    }

    const seenIds = new Set<string>();
    for (let seed = 0; seed < 50; seed++) {
      const selection = selectWithSeed(seed);
      expect(selection?.score).toBe(4);
      if (selection) seenIds.add(selection.recipe.id);
    }

    // Both tied recipes must be reachable across seeds...
    expect(seenIds.has("synthetic-tie-a")).toBe(true);
    expect(seenIds.has("synthetic-tie-b")).toBe(true);

    // ...and a fixed seed must reproduce the exact same choice every time.
    const first = selectWithSeed(7);
    const second = selectWithSeed(7);
    expect(first?.recipe.id).toBe(second?.recipe.id);
  });
});

describe("recipes engine — collectVariables / enumerateBindings precision", () => {
  it("does not mistake a literal component name for a logical variable", () => {
    // component: "SomeComponent" is a literal component type, not a bound
    // variable, even though it matches the capitalized-word pattern used
    // for X/Y/A/B/C.
    const recipe: Recipe = {
      ...SYNTHETIC_RECIPE,
      predicates: [],
      modifications: [
        { type: "addComponent", owner: "X", component: "SomeComponent" },
      ],
    };
    const game = makeGame();
    const bindings = enumerateBindings(recipe, game);

    // Only X varies (3 entities); "SomeComponent" must not add a second
    // free variable.
    expect(bindings).toHaveLength(3);
    expect(Object.keys(bindings[0])).toEqual(["X"]);
  });

  it("does not treat the literal WORLD entity id as a free variable", () => {
    const recipe: Recipe = {
      ...SYNTHETIC_RECIPE,
      predicates: [],
      modifications: [{ type: "addComponent", owner: "WORLD", component: "MeterComponent" }],
    };
    const game = makeGame();
    const bindings = enumerateBindings(recipe, game);

    expect(bindings).toEqual([{}]);
  });

  it("restricts enumeration to a supplied fixedBinding, collapsing ties to one candidate", () => {
    const recipe: Recipe = {
      ...SYNTHETIC_RECIPE,
      id: "no-predicate-abc",
      predicates: [],
      modifications: [
        { type: "addComponent", owner: "A", component: "Foo" },
        { type: "addComponent", owner: "B", component: "Bar" },
      ],
    };
    const game = makeGame();
    const bindings = enumerateBindings(recipe, game, { A: "a", B: "b" });

    expect(bindings).toEqual([{ A: "a", B: "b" }]);
  });
});

describe("recipes engine — evaluatePredicate resolves tags via components.json", () => {
  it("treats an entity holding a tagged component (not the literal tag) as satisfying the predicate", () => {
    const game: WorkingGame = {
      conceptMap: { nodes: [], edges: [] },
      entities: [
        { id: "a", noun: "Alpha", components: [], isPlayer: false },
        {
          id: "b",
          noun: "Beta",
          // StopOnCollideComponent is tagged _isVulnerable in components.json,
          // not the literal string "_isVulnerable" itself.
          components: [{ owner: "b", component: "StopOnCollideComponent", target: "a" }],
          isPlayer: false,
        },
      ],
      world: { id: "WORLD", noun: "WORLD", components: [], isPlayer: false },
      blackboard: {},
    };

    const evaluation = evaluatePredicate(
      SYNTHETIC_RECIPE.predicates[0],
      { X: "a", Y: "b" },
      game
    );
    expect(evaluation.result).toBe(true);
    expect(evaluation.score).toBe(4);
  });
});

describe("recipes engine — selectRecipe score-floor eligibility", () => {
  it("treats an all-zero tie among predicated candidates as no eligible selection", () => {
    // No entity carries _isVulnerable anywhere, so every binding scores 0 —
    // none of them represents a predicate that actually fired.
    const bareGame: WorkingGame = {
      conceptMap: { nodes: [], edges: [] },
      entities: [
        { id: "a", noun: "Alpha", components: [], isPlayer: false },
        { id: "b", noun: "Beta", components: [], isPlayer: false },
      ],
      world: { id: "WORLD", noun: "WORLD", components: [], isPlayer: false },
      blackboard: {},
    };
    const rng = createSeededRng(1);
    const trace = createTrace(1);

    const selection = selectRecipe("win", bareGame, [SYNTHETIC_RECIPE], rng, trace);
    expect(selection).toBeNull();
  });

  it("remains eligible for a predicate-less recipe even though every candidate scores 0", () => {
    const structuralRecipe: Recipe = {
      ...SYNTHETIC_RECIPE,
      id: "no-predicate-structural",
      category: "structure",
      predicates: [],
      modifications: [{ type: "placeEntity", owner: "X", position: "left" }],
    };
    const game = makeGame();
    const rng = createSeededRng(1);
    const trace = createTrace(1);

    const selection = selectRecipe("structure", game, [structuralRecipe], rng, trace);
    expect(selection).not.toBeNull();
    expect(selection?.score).toBe(0);
  });
});

describe("recipes engine — applyRecipe", () => {
  it("applies modifications in order and writes to the blackboard, all captured in the trace", () => {
    const game = makeGame();
    const trace = createTrace(1);
    const binding = { X: "a", Y: "b" };

    applyRecipe(game, SYNTHETIC_RECIPE, binding, trace);

    // blackboard write
    expect(game.blackboard.removeToWin).toBe("b");

    // component addition, in modification order, appended after the
    // fixture's pre-existing _isVulnerable component
    const beta = game.entities.find((e) => e.id === "b");
    expect(beta?.components).toEqual([
      { owner: "b", component: "_isVulnerable", target: "a" },
      { owner: "b", component: "_isRemovedBy", target: "a" },
    ]);

    // setPlayer
    const alpha = game.entities.find((e) => e.id === "a");
    expect(alpha?.isPlayer).toBe(true);

    const stage = trace.finish().stages.find((s) => s.id === "recipe-apply-synthetic-score");
    expect(stage).toBeDefined();
    expect(stage?.mutations).toEqual([
      "blackboard.removeToWin = Beta",
      "Beta += _isRemovedBy(target=Alpha)",
      "Alpha made player",
    ]);
    expect((stage?.output as { blackboard: Record<string, unknown> }).blackboard).toEqual({
      removeToWin: "b",
    });
  });

  it("applies Frogger-style placement, scale, multiplication, and movement restriction", () => {
    const game = makeGame();
    const trace = createTrace(1);
    const frogger: Recipe = {
      id: "structure-frogger-fixture",
      category: "structure",
      status: "implemented",
      source: "test",
      enabled: true,
      predicates: [],
      modifications: [
        { type: "placeEntity", owner: "X", position: "left" },
        { type: "placeEntity", owner: "Y", position: "right" },
        { type: "scaleEntity", owner: "Y", scale: 2 },
        { type: "multiplyEntity", owner: "X", position: "middle" },
        { type: "restrictMovement", owner: "X", axis: "vertical", region: "bars" },
      ],
      instruction: null,
    };

    applyRecipe(game, frogger, { X: "a", Y: "b" }, trace);

    const alpha = game.entities.find((e) => e.id === "a");
    const beta = game.entities.find((e) => e.id === "b");
    expect(alpha?.transform?.x).toBe(400); // last write wins: placed left then multiplied to middle
    expect(beta?.transform?.x).toBe(800);
    expect(beta?.transform?.width).toBe(2);
    expect(beta?.transform?.height).toBe(2);

    expect(alpha?.count).toBeGreaterThan(1);
    expect(alpha?.movementRestriction).toEqual({ axis: "vertical", region: "bars" });

    const stage = trace
      .finish()
      .stages.find((s) => s.id === "recipe-apply-structure-frogger-fixture");
    expect(stage?.mutations).toEqual([
      "Alpha placed at left",
      "Beta placed at right",
      "Beta scaled to 2x",
      "Alpha multiplied into 3 instances at middle",
      "Alpha movement restricted to vertical (bars)",
    ]);
  });
});
