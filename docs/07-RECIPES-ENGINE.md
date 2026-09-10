# Step 07 — Generic Recipe Scoring Engine

## Depends On
Step 06 (Partial Game exists to score against).

## Master Spec References
- §17 Recipes (type, binding/scoring/selection algorithm)
- §25 Blackboard
- §30 Trace Views → "Recipe Calculations" example
- §34 `recipes.ts` (`enumerateBindings`, `evaluatePredicate`, `scoreRecipes`, `selectRecipe`, `applyRecipe`)

This step builds the **generic mechanism only** — no specific win/lose/
structure recipe content yet (that's Step 08). Think of this as the reusable
scoring engine that Step 08 will plug the actual `score-100`,
`lose-run-out-of-time`, and `Frogger` recipes into.

## Scope

1. Implement `program/generator/recipes.ts`:
   - `enumerateBindings(recipe, game)`: generate all possible variable
     bindings (e.g. `X`, `Y`, `Z`) across current entities.
   - `evaluatePredicate(predicate, binding, game)`: evaluate a single
     predicate (e.g. "Y has component/tag `_isVulnerable` targeted by X")
     against a binding, returning true/false and the associated weight.
   - `scoreRecipes(category, game, recipeLibrary, rng, trace)`: for every
     `implemented` recipe in the category, enumerate bindings, evaluate all
     predicates, reject bindings that fail a strict predicate, sum
     true/false weights, and produce a full candidate table (matching §30's
     "Recipe Calculations" format) captured in the trace.
   - `selectRecipe(...)`: pick the highest-scoring candidate; break ties via
     seeded RNG; record the decision in the trace.
   - `applyRecipe(game, recipe, binding, trace)`: apply `modifications` in
     order against the bound variables, recording each mutation and any
     blackboard writes (§25) in the trace.
2. Since no concrete recipes exist yet, write this step's tests against a
   **small synthetic recipe** (defined inline in the test file, not in
   `library/`) to validate the engine mechanics in isolation:
   - a predicate that's sometimes true/false depending on binding;
   - a tie-breaking scenario exercising the RNG;
   - a modification that writes to the blackboard.

## Out of Scope
- Any of the actual win/lose/structure recipe JSON content or their specific
  semantics (Step 08).
- Non-terminal resolution, patches (Step 09).

## Files Touched
- `src/program/generator/recipes.ts`
- `src/program/generator/recipes.test.ts`

## Automated Checks
- Vitest covering: binding enumeration correctness, predicate evaluation,
  strict-predicate rejection, score summation, tie-break randomness
  (deterministic under a fixed seed), modification application order, and
  blackboard writes appearing in the trace.

## Manual Test
Since this step has no UI surface yet, "manual" testing is running the
targeted Vitest file and reading the trace objects it produces:

1. Run `npx vitest run recipes.test.ts` and confirm all pass.
2. Temporarily `console.log(JSON.stringify(trace, null, 2))` from one test
   and visually confirm the shape matches §30's "Recipe Calculations"
   table (binding, predicate, result, score columns) before removing the log.

## Done When
- [ ] Engine functions are implemented and fully unit tested against a
      synthetic recipe.
- [ ] Trace output shape matches the master spec's recipe-calculation format.
- [ ] Tie-breaking is seeded and reproducible.
