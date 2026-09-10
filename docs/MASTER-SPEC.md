# Game-O-Matic Paper-Faithful Replica — Next.js Implementation Spec

## 1. Goal

Build a **single-page, dark-themed Next.js recreation of the Game-O-Matic generation pipeline** described in the 2012 paper *Game-O-Matic: Generating Videogames that Represent Ideas*.

This version is intentionally conservative:

- no agents;
- no LLMs;
- no AI-generated mechanics;
- no invented micro-rhetorics;
- no invented recipe definitions presented as historical Game-O-Matic behavior;
- all generator knowledge lives in editable JSON files under `src/program/library/`;
- the UI exposes the complete generation process so a researcher can see **what was selected, why it was selected, what scores were calculated, what components were added/removed, and how the final game was produced**.

The generator should be implemented as its own clean subsystem so it can later be replaced, extended, or polished without rewriting the editor or runtime.

---

# 2. Fidelity Rule

The paper describes the overall architecture in detail, but it does **not publish the complete historical micro-rhetoric, recipe, component, or patch libraries**.

Therefore:

1. Implement only concrete micro-rhetorics explicitly described in the paper.
2. Do not invent additional micro-rhetorics to fill missing verbs.
3. Keep the full original verb vocabulary in `verbs.json`, but disable verbs that do not currently have a paper-described micro-rhetoric.
4. Leave the JSON structure easy to extend manually later.
5. Where the paper names a recipe but does not provide its exact predicates/modifications, store it as a disabled reference entry rather than guessing its implementation.
6. Every library entry must include:
   - `source: "paper"`
   - `status: "implemented" | "reference-only"`

The software is a **reconstruction of the published process**, not a claim to contain the unpublished original production libraries.

---

# 3. User Experience

Everything appears on **one page**.

The page has four major areas:

```text
┌─────────────────────────────────────────────────────────────┐
│ Game-O-Matic Replica                          Seed: 18372    │
├────────────────────────────┬────────────────────────────────┤
│                            │                                │
│ CONCEPT GRAPH              │ GENERATED GAME                 │
│                            │                                │
│ noun --verb--> noun        │ playable canvas               │
│                            │                                │
│ [Template] [Make Game]     │ [Play] [Try Another]          │
├────────────────────────────┴────────────────────────────────┤
│ GENERATION PIPELINE / TRACE                                 │
│                                                             │
│ 1 Entities                                                  │
│ 2 Micro-Rhetorics                                           │
│ 3 Partial Game                                              │
│ 4 Win Recipe Scores                                         │
│ 5 Lose Recipe Scores                                        │
│ 6 Structure Recipe Scores                                   │
│ 7 Player Selection                                          │
│ 8 Non-Terminal Resolution                                   │
│ 9 Patches                                                   │
│ 10 Final Game Spec                                          │
└─────────────────────────────────────────────────────────────┘
```

Desktop should use a two-column top area:

- left: graph;
- right: game.

Below it is a full-width trace/debug area.

On smaller screens these sections may stack vertically.

---

# 4. Dark Theme

Use a restrained research-tool aesthetic.

Suggested tokens:

```css
--bg: #0b0d10;
--panel: #12151a;
--panel-2: #181c22;
--border: #2a3038;
--text: #f4f6f8;
--muted: #9aa4b2;
--accent: #7c8cff;
--success: #62d394;
--warning: #f2c94c;
--danger: #eb5757;
```

Use Radix UI (Themes) or normal CSS/CSS Modules.

Do not use Tailwind.

Generation trace should resemble a developer inspection tool:

- monospaced values;
- expandable cards;
- compact tables;
- highlighted selected candidates;
- selected recipe in success styling;
- rejected/disabled candidates muted.

---

# 5. Tech Stack

Use:

- Next.js App Router
- TypeScript
- React
- Radix UI (`@radix-ui/themes`)
- `@xyflow/react` for concept graph editing
- HTML Canvas 2D for game runtime
- Zod for JSON/runtime schema validation
- seeded RNG library or small local seeded RNG implementation
- Vitest for generator tests

No backend is required.

No database is required.

No dynamic source-code generation is allowed.

---

# 6. Project Structure

Keep the code modular but not fragmented.

```text
src/
  app/
    page.tsx

  components/
    ConceptGraph.tsx
    GameViewport.tsx
    GenerationTrace.tsx
    Toolbar.tsx

  program/
    library/
      verbs.json
      micro-rhetorics.json
      components.json
      win-recipes.json
      lose-recipes.json
      structure-recipes.json
      patches.json
      parameter-ranges.json
      templates.json

    generator/
      index.ts
      microRhetoric.ts
      recipes.ts
      resolve.ts
      patches.ts
      trace.ts
      types.ts

    runtime/
      GameRuntime.ts
      systems.ts
      renderer.ts
      types.ts

  styles/
    globals.css
```

Do not create dozens of tiny files.

The important architectural boundary is:

```text
UI
  |
  v
program/generator
  |
  v
GeneratedGameSpec
  |
  v
program/runtime
```

The generator must know nothing about React.

The runtime must know nothing about recipe scoring.

The UI must not contain game-generation logic.

---

# 7. Library Folder

All authored Game-O-Matic knowledge must live in:

```text
src/program/library/
```

The goal is that future research work can alter the system mostly by editing JSON.

---

# 8. verbs.json

The paper lists these supported verbs:

```json
[
  {"verb":"arrests","enabled":true},
  {"verb":"attacks","enabled":false},
  {"verb":"avoids","enabled":true},
  {"verb":"carries","enabled":false},
  {"verb":"collects","enabled":false},
  {"verb":"deflects","enabled":false},
  {"verb":"follows","enabled":false},
  {"verb":"gets","enabled":false},
  {"verb":"grows","enabled":true},
  {"verb":"harms","enabled":true},
  {"verb":"influences","enabled":false},
  {"verb":"makes","enabled":false},
  {"verb":"needs","enabled":true},
  {"verb":"obstructs","enabled":true},
  {"verb":"prevents","enabled":false},
  {"verb":"wastes","enabled":false},
  {"verb":"watches","enabled":false}
]
```

`enabled` means:

> At least one micro-rhetoric is explicitly described well enough in the paper to implement without inventing its mechanics.

The graph editor's verb selector should default to showing only `enabled:true` verbs.

Add a developer toggle:

```text
Show unsupported paper verbs
```

Unsupported verbs appear disabled with:

```text
No micro-rhetoric published in paper
```

When you manually add a micro-rhetoric later, set the verb to enabled.

---

# 9. Concept Graph

The graph follows:

```text
SUBJECT -- VERB --> PREDICATE
```

Example:

```text
Police --arrests--> Occupier
Occupier --obstructs--> Wall Street
Wall Street --grows--> Occupier
```

Data:

```ts
type ConceptNode = {
  id: string;
  label: string;
};

type ConceptEdge = {
  id: string;
  source: string;
  target: string;
  verb: string;
};

type ConceptMap = {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
};
```

User can:

- add noun;
- rename noun;
- drag noun;
- delete noun;
- connect nouns;
- select a supported verb;
- edit verb;
- delete relationship;
- load template.

`Make Game` is disabled if an edge uses a verb without an implemented micro-rhetoric.

---

# 10. Paper-Described Micro-Rhetorics Only

Do not add any micro-rhetoric that is not described in the paper.

The initial library contains the following.

## 10.1 A avoids B

Paper description:

- subject A gets `_movesInAnyWay`;
- predicate B gets `_movesInAnyWay`;
- predicate B gets `ChaseDownComponent` with `evaderName=A`;
- subject A gets `_isVulnerable` targeting B.

```json
{
  "id": "avoids-chased-and-vulnerable",
  "verb": "avoids",
  "source": "paper",
  "status": "implemented",
  "assignments": [
    {"owner":"subject","component":"_movesInAnyWay"},
    {"owner":"predicate","component":"_movesInAnyWay"},
    {
      "owner":"predicate",
      "component":"ChaseDownComponent",
      "params":{"evaderName":"$subject"}
    },
    {
      "owner":"subject",
      "target":"predicate",
      "component":"_isVulnerable"
    }
  ]
}
```

## 10.2 A needs B

Paper description:

A constantly shrinks unless A is colliding with B.

```json
{
  "id": "needs-contact-or-shrink",
  "verb": "needs",
  "source": "paper",
  "status": "implemented",
  "assignments": [
    {
      "owner":"subject",
      "target":"predicate",
      "component":"ShrinkUnlessCollidingComponent"
    }
  ]
}
```

Do not invent a second `needs` interpretation.

## 10.3 A harms B

Paper high-level example:

A spawns a shape that moves toward B; when it collides with B, B shrinks.

```json
{
  "id": "harms-projectile-shrink",
  "verb": "harms",
  "source": "paper",
  "status": "implemented",
  "assignments": [
    {
      "owner":"subject",
      "target":"predicate",
      "component":"SpawnTowardTargetComponent"
    },
    {
      "owner":"predicate",
      "component":"ShrinkOnSpawnCollisionComponent"
    }
  ]
}
```

Do not create alternative `harms` micro-rhetorics.

## 10.4 A arrests B — `take custody`

Paper example:

```text
Police arrests Occupier
```

produces:

- Police: `_movesInAnyWay`
- Occupier: `_movesInAnyWay`
- Occupier: `StopOnCollideComponent`, target Police

```json
{
  "id": "arrests-take-custody",
  "verb": "arrests",
  "source": "paper",
  "status": "implemented",
  "assignments": [
    {"owner":"subject","component":"_movesInAnyWay"},
    {"owner":"predicate","component":"_movesInAnyWay"},
    {
      "owner":"predicate",
      "target":"subject",
      "component":"StopOnCollideComponent"
    }
  ]
}
```

## 10.5 A obstructs B — `freeze`

Paper example:

B receives `StopOnCollideComponent` targeting A.

```json
{
  "id": "obstructs-freeze",
  "verb": "obstructs",
  "source": "paper",
  "status": "implemented",
  "assignments": [
    {
      "owner":"predicate",
      "target":"subject",
      "component":"StopOnCollideComponent"
    }
  ]
}
```

## 10.6 A obstructs B — `redirect`

Paper explicitly describes another possible `obstructs` micro-rhetoric:

B receives `ReflectOnCollideComponent` targeting A.

```json
{
  "id": "obstructs-redirect",
  "verb": "obstructs",
  "source": "paper",
  "status": "implemented",
  "assignments": [
    {
      "owner":"predicate",
      "target":"subject",
      "component":"ReflectOnCollideComponent"
    }
  ]
}
```

This is currently the only verb with two explicitly published selectable micro-rhetorics.

## 10.7 A grows B

Paper example:

B gets `GrowOnCollideComponent` with target A.

```json
{
  "id": "grows-grow-on-collide",
  "verb": "grows",
  "source": "paper",
  "status": "implemented",
  "assignments": [
    {
      "owner":"predicate",
      "target":"subject",
      "component":"GrowOnCollideComponent"
    }
  ]
}
```

---

# 11. components.json

Keep runtime components and their rhetorical tags in JSON.

The paper explicitly names:

```text
RemoveOnCollideComponent
DestroyIfOffScreen
FollowBehind
MouseController
ShrinkOnCollideComponent
StopOnCollideComponent
ChaseDownComponent
ReflectOnCollideComponent
GrowOnCollideComponent
ScoreRemovalOfComponent
RespawnOnRemoveComponent
MeterComponent
```

The paper explicitly says `_isVulnerable` can resolve to:

```text
RemoveOnCollideComponent
ShrinkOnCollideComponent
StopOnCollideComponent
```

Example:

```json
[
  {
    "type":"RemoveOnCollideComponent",
    "tags":["_isVulnerable","_isRemovedBy"],
    "source":"paper"
  },
  {
    "type":"ShrinkOnCollideComponent",
    "tags":["_isVulnerable","_isRemovedBy"],
    "source":"paper"
  },
  {
    "type":"StopOnCollideComponent",
    "tags":["_isVulnerable","_isCollidable"],
    "source":"paper"
  },
  {
    "type":"ReflectOnCollideComponent",
    "tags":["_isCollidable"],
    "source":"paper"
  },
  {
    "type":"GrowOnCollideComponent",
    "tags":["_isCollidable"],
    "source":"paper"
  }
]
```

Important:

The paper says both Stop and Grow are tagged `_isCollidable`.

Runtime-only infrastructure components may exist in code where necessary, but they must not be presented as historical rhetorical components.

---

# 12. Non-Terminals

The paper uses component grammar/non-terminals prefixed with `_`.

Required:

```text
_movesInAnyWay
_isVulnerable
_isRemovedBy
_isCollidable
```

The generator should store these exactly like component requests.

They are not resolved immediately.

They remain in the partial game until the finalization stage.

---

# 13. Generation Pipeline

Implement this pipeline as separate observable stages:

```text
1. Validate Concept Map
2. Create Entity structures from nouns
3. Select one micro-rhetoric for every relationship
4. Apply micro-rhetoric component assignments
5. Produce Partial Game Description
6. Score and apply Win Recipe
7. Score and apply Lose Recipe
8. Score and apply Structure Recipe
9. If no recipe selected a player, select a noun randomly
10. Resolve non-terminal components
11. Apply every applicable patch
12. Resolve non-terminals introduced by patches
13. Randomly fill unset component parameters from ranges
14. Generate instruction text
15. Produce GeneratedGameSpec
16. Runtime renders GeneratedGameSpec
```

Every stage must produce a trace entry shown in the UI.

---

# 14. Generator API

All generation lives under:

```text
src/program/generator/
```

Primary API:

```ts
generateGame({
  conceptMap,
  seed
}): GenerationResult
```

Return:

```ts
type GenerationResult = {
  game: GeneratedGameSpec;
  trace: GenerationTrace;
};
```

The generator receives no UI objects.

It should be easy to replace later with:

```ts
generateGameV2(...)
```

without changing the game renderer.

---

# 15. Seeded Randomness

Every generative choice uses the same seeded RNG instance.

Random choices include:

- selecting between multiple micro-rhetorics;
- selecting among equal highest-scoring recipe candidates;
- selecting terminal component for a non-terminal;
- selecting player if recipes did not;
- unset component parameter values.

Same graph + same seed must produce the same trace and game spec.

`Try Another` changes only the seed and reruns the full generator.

---

# 16. Working Game Model

```ts
type GameEntity = {
  id: string;
  noun: string;
  components: ComponentAssignment[];
  isPlayer: boolean;
  transform?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
  };
};

type WorkingGame = {
  conceptMap: ConceptMap;
  entities: GameEntity[];
  world: GameEntity;
  blackboard: Record<string, unknown>;
};
```

The paper describes `World` as an entity holding global components such as UI and entity-instantiation behavior.

---

# 17. Recipes

Recipes are JSON-driven.

```ts
type Recipe = {
  id: string;
  category: "win" | "lose" | "structure";
  status: "implemented" | "reference-only";
  predicates: Predicate[];
  modifications: Modification[];
  instruction?: string;
};
```

Predicates use logical variables such as `X`, `Y`, `Z`.

For each recipe:

1. enumerate all possible entity bindings;
2. evaluate all predicates;
3. reject a binding if a strict predicate fails;
4. add true/false weights to the score;
5. retain all candidates and calculations in the trace;
6. select the highest-scoring candidate;
7. if several tie for highest, select one randomly;
8. apply modifications using that candidate's variable binding.

Recipes run:

```text
WIN -> LOSE -> STRUCTURE
```

Later recipes see the mutations made by earlier recipes.

---

# 18. Win Recipes

## Implemented: Score 100 Points

The paper gives this recipe in enough detail to implement.

Predicate:

```text
Y has component/tag _isVulnerable targeted by X
True: +4
False: 0
```

Modifications:

```text
1. blackboard.removeToWin = Y
2. remove Y component tagged _isVulnerable with target X
3. add Y _isRemovedBy with target X
4. add Y ScoreRemovalOfComponent(winScore=100, scoreEachRemoval=10)
5. add Y RespawnOnRemoveComponent
6. make X player
```

Instruction:

```text
Collect 100 points worth of {Y}.
```

## Reference-only Win Recipes

The paper names these examples but does not provide complete scoring definitions:

```text
remove all of one entity type
move player to right side
survive for specified time
make X huge
```

Put them in `win-recipes.json` with:

```json
{
  "status":"reference-only",
  "enabled":false
}
```

Do not guess their scoring rules.

---

# 19. Lose Recipes

## Implemented: Run Out Of Time

The detailed example says this lose recipe adds a `MeterComponent` to `World`.

Store:

```json
{
  "id":"lose-run-out-of-time",
  "category":"lose",
  "status":"implemented",
  "source":"paper",
  "modifications":[
    {
      "type":"addComponent",
      "owner":"WORLD",
      "component":"MeterComponent"
    }
  ],
  "instruction":"Lose when time runs out."
}
```

The original scoring predicates are not published in the example, so in the initial replica this is the only selectable lose recipe.

## Reference-only Lose Recipes

The paper names:

```text
run out of lives
fail to protect one entity from another
fail to reach high score within specified time
```

Store these disabled.

---

# 20. Structure Recipes

## Implemented: Frogger

The paper describes the Frogger structure and its Occupy example.

Layout:

```text
A / player -> left side
B -> right side
C -> multiple entities in middle
C movement -> restricted to vertical bars
B -> double size
```

The Occupy walkthrough binds:

```text
A = Occupier
B = Wall Street
C = Police
```

Structure recipes must not replace movement behavior established by micro-rhetorics.

They modify placement, scale, multiplicity, and movement region.

## Reference-only Structures

The paper states structures exist based on:

```text
Space Invaders
Kaboom
Asteroids
```

but does not publish their complete recipe definitions.

Store them as disabled reference entries.

Do not invent them.

---

# 21. Player Selection

Recipes may assign a player.

For example, `score-100` makes `X` the player.

If no recipe assigns one, the paper specifies:

```text
randomly select one noun from the concept map
```

Show this decision in the trace.

---

# 22. Non-Terminal Resolution

After recipes, resolve abstract components using component tags.

Example:

```text
_isVulnerable
```

can resolve to:

```text
RemoveOnCollideComponent
ShrinkOnCollideComponent
StopOnCollideComponent
```

The paper's detailed example says `_isRemovedBy` can resolve to a removal behavior such as `RemoveOnCollideComponent`, and later shows it resolving to shrinking until removal.

For `_movesInAnyWay`, use only minimal web-runtime movement implementations needed to run the documented examples. Mark any runtime substitute clearly as `runtime-default`, not as a published historical component.

Every resolution must appear in the trace:

```text
Non-terminal: _isRemovedBy(target=Occupier)
Candidates:
- RemoveOnCollideComponent
- ShrinkOnCollideComponent
Selected:
- ShrinkOnCollideComponent
Reason:
- seeded random choice
```

---

# 23. Patches

The paper says:

- patches resemble recipes;
- patch preconditions are strict;
- patches are not scored;
- every applicable patch is applied.

Implement only the explicitly described patch:

## Everything Moves

```text
Give a movement component to every entity that does not already have one.
```

Do not invent additional historical patches.

Runtime crash-prevention checks are allowed, but label them `runtime safety`, not `Game-O-Matic patch`.

---

# 24. Parameters

The paper says unset component parameters are randomly selected from defined ranges.

The exact original numeric ranges are not published.

Use `parameter-ranges.json` with clearly marked runtime defaults:

```json
{
  "movementSpeed": {
    "min":80,
    "max":160,
    "source":"runtime-default"
  },
  "entitySize": {
    "min":32,
    "max":72,
    "source":"runtime-default"
  },
  "timerSeconds": {
    "min":30,
    "max":60,
    "source":"runtime-default"
  }
}
```

The trace should distinguish:

```text
selection mechanism: paper
numeric range: runtime-default
```

---

# 25. Blackboard

Use:

```ts
type Blackboard = Record<string, unknown>;
```

Example:

```ts
blackboard.removeToWin = "wall-street";
```

Every blackboard write must be shown in the trace.

---

# 26. Generated Game Spec

The generator outputs a renderer-independent object.

```ts
type GeneratedGameSpec = {
  seed: number;
  entities: GameEntity[];
  world: GameEntity[];
  playerEntityId: string;
  winCondition: Record<string, unknown>;
  loseCondition: Record<string, unknown>;
  structure: Record<string, unknown>;
  instructions: {
    player: string;
    win: string;
    lose: string;
  };
};
```

The runtime receives only this structure.

This is the key boundary for future iteration.

---

# 27. Game Runtime

Keep the runtime simple and independent.

```text
GameRuntime.ts
systems.ts
renderer.ts
```

Use Canvas 2D.

Recommended logical size:

```text
800 x 500
```

Render nouns as simple labeled shapes.

Support only behaviors currently needed by the paper-based library:

```text
StopOnCollideComponent
ReflectOnCollideComponent
GrowOnCollideComponent
ShrinkOnCollideComponent
RemoveOnCollideComponent
ChaseDownComponent
ShrinkUnlessCollidingComponent
SpawnTowardTargetComponent
ScoreRemovalOfComponent
RespawnOnRemoveComponent
MeterComponent
MouseController / web controller substitute
simple autonomous movement
```

Do not spend major effort on game art.

The runtime exists to expose and play the generated rule system.

---

# 28. Game Generation Must Be Replaceable

The page should only do:

```ts
const result = generateGame({ conceptMap, seed });
```

then:

```tsx
<GameViewport game={result.game} />
<GenerationTrace trace={result.trace} />
```

Later, a new generator should be able to output the same `GeneratedGameSpec` without rewriting the runtime or graph UI.

---

# 29. Generation Trace

The trace is a first-class product feature.

```ts
type GenerationTrace = {
  seed: number;
  stages: GenerationStage[];
};

type GenerationStage = {
  id: string;
  name: string;
  input?: unknown;
  calculations?: unknown;
  selected?: unknown;
  mutations?: unknown;
  output?: unknown;
};
```

Every meaningful choice must be observable.

---

# 30. Trace Views

## Entities

```text
STEP 1 — CREATE ENTITIES

✓ Police
✓ Occupier
✓ Wall Street
✓ WORLD
```

## Micro-Rhetorics

```text
Relationship:
Occupier --obstructs--> Wall Street

Available:
1. obstructs-freeze
2. obstructs-redirect

Seeded choice:
index 0

Selected:
obstructs-freeze

Mutation:
Wall Street += StopOnCollide(target=Occupier)
```

## Partial Game

Show all entities and their current components before recipes.

## Recipe Calculations

Example:

```text
WIN RECIPE: score-100

Binding                  Predicate                      Result  Score
X=Occupier Y=WallStreet  Y _isVulnerable to X         true      +4
X=WallStreet Y=Occupier  Y _isVulnerable to X         false      0
```

Then:

```text
Highest score: 4
Selected binding:
X = Occupier
Y = Wall Street
```

Show each modification in order.

## Player

Show whether selected by a recipe or random fallback.

## Non-Terminals

Show candidates and selected concrete component.

## Patches

Show every evaluated/applicable patch and its mutation.

## Final Spec

Provide:

```text
Summary | Components | Blackboard | Raw JSON
```

Include a `Copy JSON` button.

---

# 31. Toolbar

Top toolbar:

```text
Game-O-Matic Replica

Template [Occupy ▼]
Seed [18372]

[Make Game]
[Try Another]
[Reset]
```

`Try Another`:

- keeps graph unchanged;
- chooses new seed;
- reruns full generation.

---

# 32. Templates

Use the detailed paper example as the default.

## Occupy

```text
Police arrests Occupier
Occupier obstructs Wall Street
Wall Street grows Occupier
```

Other templates should only be added when all required micro-rhetorics are actually present in the JSON library.

---

# 33. Occupy Golden Path Test

Create one fixed seed that selects:

```text
arrests -> take custody
obstructs -> freeze
grows -> grow on collide
```

Expected partial game:

```text
Police
  _movesInAnyWay

Occupier
  _movesInAnyWay
  StopOnCollide(target=Police)
  GrowOnCollide(target=WallStreet)

WallStreet
  StopOnCollide(target=Occupier)
```

The score-100 recipe should allow:

```text
X = Occupier
Y = Wall Street
```

because `StopOnCollideComponent` is tagged `_isVulnerable`.

Apply:

```text
blackboard.removeToWin = Wall Street
remove WallStreet _isVulnerable(target=Occupier)
add WallStreet _isRemovedBy(target=Occupier)
add ScoreRemovalOfComponent(winScore=100, scoreEachRemoval=10)
add RespawnOnRemoveComponent
make Occupier player
```

Then:

```text
lose -> run out of time
structure -> Frogger
```

Expected layout:

```text
Occupier: left
Wall Street: right, 2x scale
Police: several instances in middle
Police: vertically constrained movement
```

This test is the canonical end-to-end validation of the replica.

---

# 34. Generator Functions

Keep generation code to roughly these modules:

## `index.ts`

```ts
generateGame()
```

Pipeline orchestration.

## `microRhetoric.ts`

```ts
selectMicroRhetoric()
applyMicroRhetoric()
```

## `recipes.ts`

```ts
enumerateBindings()
evaluatePredicate()
scoreRecipes()
selectRecipe()
applyRecipe()
```

## `resolve.ts`

```ts
selectFallbackPlayer()
resolveNonTerminals()
finalizeParameters()
```

## `patches.ts`

```ts
applyPatches()
```

## `trace.ts`

Trace helpers.

This is modular enough to iterate on without turning the project into a framework.

---

# 35. Generator Pseudocode

```ts
export function generateGame(
  input: GenerateGameInput
): GenerationResult {
  const rng = createSeededRng(input.seed);
  const trace = createTrace(input.seed);

  const game = createWorkingGame(input.conceptMap);
  trace.capture("entities", game);

  for (const relationship of input.conceptMap.edges) {
    const rhetoric = selectMicroRhetoric(
      relationship,
      MICRO_RHETORICS,
      rng,
      trace
    );

    applyMicroRhetoric(
      game,
      relationship,
      rhetoric,
      trace
    );
  }

  trace.capture("partial-game", game);

  const win = selectRecipe("win", game, WIN_RECIPES, rng, trace);
  applyRecipe(game, win, trace);

  const lose = selectRecipe("lose", game, LOSE_RECIPES, rng, trace);
  applyRecipe(game, lose, trace);

  const structure = selectRecipe(
    "structure",
    game,
    STRUCTURE_RECIPES,
    rng,
    trace
  );
  applyRecipe(game, structure, trace);

  if (!game.entities.some(e => e.isPlayer)) {
    selectFallbackPlayer(game, rng, trace);
  }

  resolveNonTerminals(game, rng, trace);

  applyPatches(game, PATCHES, trace);

  resolveNonTerminals(game, rng, trace);

  finalizeParameters(game, rng, trace);

  const generated = compileGeneratedGameSpec(game);

  trace.capture("final-game", generated);

  return {
    game: generated,
    trace: trace.finish()
  };
}
```

---

# 36. Validation

Before generation:

```text
✓ graph has at least one relationship
✓ all noun labels are non-empty
✓ all edge endpoints exist
✓ every edge verb exists in verbs.json
✓ every selected verb has an enabled implemented micro-rhetoric
✓ all JSON files pass schema validation
```

If a verb lacks a micro-rhetoric:

```text
Cannot generate:
"attacks" is listed in the Game-O-Matic paper,
but no implementable micro-rhetoric for it is specified
in the current paper-faithful library.
```

Do not silently substitute another behavior.

---

# 37. Research-Friendly Extensibility

Adding a new micro-rhetoric later should generally require only JSON:

```json
{
  "id":"my-new-rhetoric",
  "verb":"attacks",
  "source":"manual-addition",
  "status":"implemented",
  "assignments":[
    ...
  ]
}
```

No generator TypeScript should need to change unless the new entry introduces a genuinely new component behavior.

Likewise for recipes.

---

# 38. Tests

Minimum tests:

### Library
- JSON validates;
- every enabled verb has >= 1 implemented micro-rhetoric;
- every referenced component/non-terminal exists.

### Determinism
Same graph + seed -> same trace and game spec.

### Obstructs Variation
Across seeds, both paper-described `freeze` and `redirect` can be selected.

### Recipe Scoring
For the Occupy example:

```text
X=Occupier
Y=WallStreet
Y has _isVulnerable targeted by X
=> +4
```

### Score Recipe
Assert all six published modifications.

### Player
Recipe-selected player is preserved; otherwise random fallback selects one noun.

### Patch
An entity lacking movement receives movement through `everything-moves`.

### Finalization
No supported non-terminal remains unresolved before runtime.

---

# 39. Explicit Non-Goals

Do not implement:

- agents;
- LLMs;
- arbitrary verbs;
- semantic inference;
- auto-generated micro-rhetorics;
- guessed historical micro-rhetoric entries;
- guessed historical recipe scoring;
- complex assets;
- backend;
- accounts;
- cloud saving;
- multiplayer;
- generated source code.

---

# 40. Definition of Done

The project is complete when:

1. Everything is shown on one dark-themed page.
2. User can edit a noun/verb concept graph.
3. Only verbs backed by implemented paper-described micro-rhetorics are selectable by default.
4. `Make Game` runs the documented pipeline.
5. Each noun becomes an entity.
6. Each relationship selects exactly one compatible micro-rhetoric.
7. Partial components are shown.
8. Recipe calculations and scores are shown.
9. Recipe mutations are shown.
10. Player selection is shown.
11. Non-terminal resolution is shown.
12. Patch application is shown.
13. Parameter selection is shown.
14. Final game JSON is inspectable.
15. Game is playable in the same page.
16. `Try Another` keeps the graph and changes the seed.
17. All authored system knowledge lives in JSON under `library/`.
18. Generator and runtime are cleanly separated.
19. No undocumented micro-rhetoric is added automatically.

---

# 41. Canonical Mental Model

The implementation should make this visually obvious:

```text
CONCEPT GRAPH
    ↓
NOUNS BECOME ENTITIES
    ↓
VERBS SELECT MICRO-RHETORICS
    ↓
PARTIAL GAME COMPONENTS
    ↓
WIN RECIPE
    ↓
LOSE RECIPE
    ↓
STRUCTURE RECIPE
    ↓
PLAYER FALLBACK IF NEEDED
    ↓
RESOLVE NON-TERMINALS
    ↓
PATCHES
    ↓
RESOLVE AGAIN
    ↓
FILL PARAMETER RANGES
    ↓
GENERATED GAME SPEC
    ↓
PLAYABLE GAME
```

The **generation trace is as important as the game itself**.

The project should function as:

1. a paper-faithful Game-O-Matic reconstruction;
2. a visual explanation of how the generator works;
3. a baseline for research experiments;
4. a clean foundation for a later improved generator.
