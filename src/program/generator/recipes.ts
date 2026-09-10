// Generic recipe scoring engine per docs/07-RECIPES-ENGINE.md.
// Master spec references: §17 Recipes, §25 Blackboard, §30 Trace Views
// ("Recipe Calculations"), §34 recipes.ts.

import type { Trace } from "@/program/generator/trace";
import type { SeededRng } from "@/program/generator/rng";
import { COMPONENTS } from "@/program/generator/library";
import type {
  ComponentAssignment,
  GameEntity,
  Modification,
  Predicate,
  Recipe,
  WorkingGame,
} from "@/program/generator/types";

const VARIABLE_PATTERN = /^[A-Z][A-Za-z0-9]*$/;

// "WORLD" is the fixed sentinel entity id (see createEntity("WORLD", ...) in
// index.ts), not a recipe-author-chosen logical variable, even though it
// matches VARIABLE_PATTERN — e.g. lose-run-out-of-time's
// `{ owner: "WORLD" }` is a literal reference to the world entity.
const RESERVED_ENTITY_IDS = new Set(["WORLD"]);

// §20 Structure Recipes: the paper says Frogger multiplies C into "several"
// middle-lane instances but does not publish an exact count. Treated as a
// runtime-default, not a published historical value.
const STRUCTURE_MULTIPLY_COUNT = 3;

const PLACEMENT_X: Record<string, number> = { left: 0, middle: 400, right: 800 };

// Only these modification fields ever hold a logical variable reference
// (bare, e.g. "X", or "$"-prefixed, e.g. "$Y"). `component`/`tag`/`key`/
// `position`/`axis`/`region` hold literal strings (component type names,
// blackboard keys, placement keywords) that happen to also be capitalized
// and must never be mistaken for a binding variable.
const VARIABLE_BEARING_FIELDS = ["owner", "target", "value"] as const;

function addVariableRef(variables: Set<string>, value: unknown): void {
  if (typeof value !== "string") return;
  const name = value.startsWith("$") ? value.slice(1) : value;
  if (VARIABLE_PATTERN.test(name) && !RESERVED_ENTITY_IDS.has(name)) {
    variables.add(name);
  }
}

function collectVariables(recipe: Recipe): string[] {
  const variables = new Set<string>();

  for (const predicate of recipe.predicates) {
    addVariableRef(variables, predicate.subject);
    addVariableRef(variables, predicate.target);
  }

  for (const modification of recipe.modifications) {
    for (const field of VARIABLE_BEARING_FIELDS) {
      addVariableRef(variables, modification[field]);
    }
    if (modification.params) {
      for (const value of Object.values(modification.params)) {
        addVariableRef(variables, value);
      }
    }
  }

  return [...variables].sort();
}

function allEntities(game: WorkingGame): GameEntity[] {
  return [...game.entities, game.world];
}

export type Binding = Record<string, string>;

export function enumerateBindings(
  recipe: Recipe,
  game: WorkingGame,
  fixedBinding: Binding = {}
): Binding[] {
  const variables = collectVariables(recipe).filter(
    (variable) => fixedBinding[variable] === undefined
  );
  const entityIds = allEntities(game).map((e) => e.id);

  if (variables.length === 0) {
    return [{ ...fixedBinding }];
  }

  let bindings: Binding[] = [{ ...fixedBinding }];

  for (const variable of variables) {
    const next: Binding[] = [];
    for (const partial of bindings) {
      for (const entityId of entityIds) {
        next.push({ ...partial, [variable]: entityId });
      }
    }
    bindings = next;
  }

  return bindings;
}

function resolveEntityId(ref: string, binding: Binding): string {
  return binding[ref] ?? ref;
}

function findEntity(game: WorkingGame, entityId: string): GameEntity | undefined {
  return allEntities(game).find((e) => e.id === entityId);
}

const COMPONENT_TAGS = new Map(COMPONENTS.map((c) => [c.type, c.tags]));

// §12 Non-Terminals are stored on entities exactly like component requests,
// so an unresolved non-terminal that equals the tag being searched for
// (e.g. an entity literally holding `_isVulnerable`) satisfies the tag too,
// in addition to any concrete component whose components.json entry lists
// the tag (e.g. StopOnCollideComponent -> _isVulnerable).
function componentCarriesTag(componentName: string, tag: string): boolean {
  return (
    componentName === tag || (COMPONENT_TAGS.get(componentName) ?? []).includes(tag)
  );
}

function hasComponentTag(
  entity: GameEntity,
  tag: string,
  targetEntityId: string
): boolean {
  return entity.components.some(
    (c) => componentCarriesTag(c.component, tag) && c.target === targetEntityId
  );
}

export type PredicateEvaluation = {
  predicate: Predicate;
  result: boolean;
  score: number;
};

export function evaluatePredicate(
  predicate: Predicate,
  binding: Binding,
  game: WorkingGame
): PredicateEvaluation {
  const subjectId = resolveEntityId(predicate.subject, binding);
  const subject = findEntity(game, subjectId);

  let result = false;
  if (subject) {
    switch (predicate.check) {
      case "hasComponentTag": {
        const targetId = resolveEntityId(predicate.target, binding);
        result = hasComponentTag(subject, predicate.tag, targetId);
        break;
      }
      default:
        throw new Error(`Unknown predicate check: "${predicate.check}"`);
    }
  }

  const score = result ? predicate.trueScore : predicate.falseScore;
  return { predicate, result, score };
}

function formatBinding(binding: Binding, game: WorkingGame): string {
  const entries = Object.entries(binding).map(([variable, entityId]) => {
    const entity = findEntity(game, entityId);
    return `${variable}=${entity ? entity.noun.replace(/\s+/g, "") : entityId}`;
  });
  return entries.join(" ");
}

export type RecipeCandidate = {
  binding: Binding;
  evaluations: PredicateEvaluation[];
  score: number;
  rejected: boolean;
};

export type RecipeScoring = {
  recipe: Recipe;
  candidates: RecipeCandidate[];
};

export function scoreRecipes(
  category: "win" | "lose" | "structure",
  game: WorkingGame,
  recipeLibrary: Recipe[],
  _rng: SeededRng,
  trace: Trace,
  fixedBinding: Binding = {}
): RecipeScoring[] {
  const implementedRecipes = recipeLibrary.filter(
    (recipe) =>
      recipe.category === category &&
      recipe.status === "implemented" &&
      recipe.enabled
  );

  const scorings: RecipeScoring[] = [];

  for (const recipe of implementedRecipes) {
    const bindings = enumerateBindings(recipe, game, fixedBinding);
    const candidates: RecipeCandidate[] = [];

    for (const binding of bindings) {
      const evaluations: PredicateEvaluation[] = [];
      let rejected = false;
      let score = 0;

      for (const predicate of recipe.predicates) {
        const evaluation = evaluatePredicate(predicate, binding, game);
        evaluations.push(evaluation);

        score += evaluation.score;

        if (predicate.strict && !evaluation.result) {
          rejected = true;
        }
      }

      candidates.push({ binding, evaluations, score, rejected });
    }

    scorings.push({ recipe, candidates });

    trace.capture(`recipe-score-${recipe.id}`, {
      name: `${category.toUpperCase()} RECIPE: ${recipe.id}`,
      input: { category, recipeId: recipe.id },
      calculations: candidates.map((c) => ({
        binding: formatBinding(c.binding, game),
        predicates: c.evaluations.map((e) => ({
          description: e.predicate.description,
          result: e.result,
          score: e.score,
        })),
        score: c.score,
        rejected: c.rejected,
      })),
    });
  }

  return scorings;
}

export type RecipeSelection = {
  category: "win" | "lose" | "structure";
  recipe: Recipe;
  binding: Binding;
  score: number;
} | null;

export function selectRecipe(
  category: "win" | "lose" | "structure",
  game: WorkingGame,
  recipeLibrary: Recipe[],
  rng: SeededRng,
  trace: Trace,
  fixedBinding: Binding = {}
): RecipeSelection {
  const scorings = scoreRecipes(
    category,
    game,
    recipeLibrary,
    rng,
    trace,
    fixedBinding
  );

  // A recipe with predicates but a score <= 0 never had a predicate
  // actually fire for any binding — it isn't meaningfully "assigned"
  // (§21 Player Selection: a win recipe like this must not silently claim
  // the player role over an arbitrary tied binding). Recipes with no
  // predicates at all (lose/structure) are unconditionally eligible.
  type Eligible = { recipe: Recipe; candidate: RecipeCandidate };
  const eligible: Eligible[] = [];
  for (const scoring of scorings) {
    const hasPredicates = scoring.recipe.predicates.length > 0;
    for (const candidate of scoring.candidates) {
      if (!candidate.rejected && (!hasPredicates || candidate.score > 0)) {
        eligible.push({ recipe: scoring.recipe, candidate });
      }
    }
  }

  if (eligible.length === 0) {
    trace.capture(`recipe-select-${category}`, {
      name: `${category.toUpperCase()} RECIPE SELECTION`,
      selected: null,
    });
    return null;
  }

  const highestScore = Math.max(...eligible.map((e) => e.candidate.score));
  const topCandidates = eligible.filter((e) => e.candidate.score === highestScore);

  let chosenIndex = 0;
  let seededChoice = "index 0 (only top candidate, no RNG call)";
  if (topCandidates.length > 1) {
    chosenIndex = rng.pickIndex(topCandidates.length);
    seededChoice = `index ${chosenIndex}`;
  }

  const chosen = topCandidates[chosenIndex];

  trace.capture(`recipe-select-${category}`, {
    name: `${category.toUpperCase()} RECIPE SELECTION`,
    calculations: topCandidates.map((c) => ({
      recipeId: c.recipe.id,
      binding: formatBinding(c.candidate.binding, game),
      score: c.candidate.score,
    })),
    selected: {
      highestScore,
      seededChoice,
      recipeId: chosen.recipe.id,
      binding: formatBinding(chosen.candidate.binding, game),
    },
  });

  return {
    category,
    recipe: chosen.recipe,
    binding: chosen.candidate.binding,
    score: chosen.candidate.score,
  };
}

function resolveModificationValue(value: unknown, binding: Binding): unknown {
  if (typeof value === "string") {
    if (value.startsWith("$")) {
      const variable = value.slice(1);
      return binding[variable] ?? value;
    }
    if (binding[value] !== undefined) {
      return binding[value];
    }
  }
  return value;
}

function describeModification(
  modification: Modification,
  game: WorkingGame,
  binding: Binding
): string {
  const ownerId = modification.owner
    ? resolveModificationValue(modification.owner, binding)
    : undefined;
  const owner = typeof ownerId === "string" ? findEntity(game, ownerId) : undefined;
  const ownerLabel = owner ? owner.noun : ownerId ?? "?";

  switch (modification.type) {
    case "setBlackboard": {
      const value = resolveModificationValue(modification.value, binding);
      const valueEntity = typeof value === "string" ? findEntity(game, value) : undefined;
      return `blackboard.${modification.key} = ${valueEntity ? valueEntity.noun : value}`;
    }
    case "removeComponentTag": {
      const targetId = modification.target
        ? resolveModificationValue(modification.target, binding)
        : undefined;
      const targetEntity = typeof targetId === "string" ? findEntity(game, targetId) : undefined;
      return `${ownerLabel} -= ${modification.tag}${targetEntity ? `(target=${targetEntity.noun})` : ""}`;
    }
    case "addComponent": {
      const targetId = modification.target
        ? resolveModificationValue(modification.target, binding)
        : undefined;
      const targetEntity = typeof targetId === "string" ? findEntity(game, targetId) : undefined;
      const label = (modification.component ?? "").replace(/Component$/, "");
      if (targetEntity) return `${ownerLabel} += ${label}(target=${targetEntity.noun})`;
      if (modification.params) {
        const params = Object.entries(modification.params)
          .map(([k, v]) => `${k}=${v}`)
          .join(", ");
        return `${ownerLabel} += ${label}(${params})`;
      }
      return `${ownerLabel} += ${label}`;
    }
    case "setPlayer":
      return `${ownerLabel} made player`;
    case "placeEntity":
      return `${ownerLabel} placed at ${modification.position}`;
    case "scaleEntity":
      return `${ownerLabel} scaled to ${modification.scale}x`;
    case "multiplyEntity":
      return `${ownerLabel} multiplied into ${STRUCTURE_MULTIPLY_COUNT} instances at ${modification.position}`;
    case "restrictMovement":
      return `${ownerLabel} movement restricted to ${modification.axis} (${modification.region})`;
    default:
      return `${modification.type} applied to ${ownerLabel}`;
  }
}

export function applyRecipe(
  game: WorkingGame,
  recipe: Recipe,
  binding: Binding,
  trace: Trace
): void {
  const mutations: string[] = [];

  for (const modification of recipe.modifications) {
    const ownerId = modification.owner
      ? resolveModificationValue(modification.owner, binding)
      : undefined;
    const owner = typeof ownerId === "string" ? findEntity(game, ownerId) : undefined;

    switch (modification.type) {
      case "setBlackboard": {
        if (modification.key) {
          const value = resolveModificationValue(modification.value, binding);
          game.blackboard[modification.key] = value;
        }
        break;
      }
      case "removeComponentTag": {
        if (owner && modification.tag) {
          const targetId = modification.target
            ? resolveModificationValue(modification.target, binding)
            : undefined;
          owner.components = owner.components.filter(
            (c) =>
              !(
                c.component === modification.tag &&
                (targetId === undefined || c.target === targetId)
              )
          );
        }
        break;
      }
      case "addComponent": {
        if (owner && modification.component) {
          const targetId = modification.target
            ? resolveModificationValue(modification.target, binding)
            : undefined;
          const resolvedParams = modification.params
            ? Object.fromEntries(
                Object.entries(modification.params).map(([k, v]) => [
                  k,
                  resolveModificationValue(v, binding),
                ])
              )
            : undefined;
          const assignment: ComponentAssignment = {
            owner: owner.id,
            component: modification.component,
            ...(typeof targetId === "string" ? { target: targetId } : {}),
            ...(resolvedParams ? { params: resolvedParams } : {}),
          };
          owner.components.push(assignment);
        }
        break;
      }
      case "setPlayer": {
        if (owner) {
          owner.isPlayer = true;
        }
        break;
      }
      case "placeEntity": {
        if (owner && modification.position) {
          owner.transform = {
            ...owner.transform,
            x: PLACEMENT_X[modification.position] ?? owner.transform?.x,
          };
        }
        break;
      }
      case "scaleEntity": {
        if (owner && modification.scale) {
          owner.transform = {
            ...owner.transform,
            width: (owner.transform?.width ?? 1) * modification.scale,
            height: (owner.transform?.height ?? 1) * modification.scale,
          };
        }
        break;
      }
      case "multiplyEntity": {
        // §20 Structure Recipes: one GameEntity carries a `count` instead of
        // being cloned into separate entity rows — every on-screen copy then
        // shares this single entity's components/transform/params by
        // construction, so they can only ever behave identically (see
        // GameRuntime.ts's createRuntimeState, which spawns `count` runtime
        // instances from this one spec entity).
        if (owner) {
          const x = modification.position
            ? (PLACEMENT_X[modification.position] ?? owner.transform?.x)
            : owner.transform?.x;
          owner.transform = { ...owner.transform, x };
          owner.count = STRUCTURE_MULTIPLY_COUNT;
        }
        break;
      }
      case "restrictMovement": {
        if (owner && modification.axis && modification.region) {
          owner.movementRestriction = {
            axis: modification.axis,
            region: modification.region,
          };
        }
        break;
      }
      default:
        break;
    }

    mutations.push(describeModification(modification, game, binding));
  }

  trace.capture(`recipe-apply-${recipe.id}`, {
    name: `${recipe.category.toUpperCase()} RECIPE APPLY: ${recipe.id}`,
    mutations,
    output: { blackboard: { ...game.blackboard } },
  });
}
