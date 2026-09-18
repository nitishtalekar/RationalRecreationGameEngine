# Edge Action Effects

What each concept-map edge verb does to its subject (source) and predicate
(target) entity once a game is generated. Verbs are defined in
[`verbs.json`](../../src/program/library/verbs.json) and implemented as
micro-rhetorics in
[`micro-rhetorics.json`](../../src/program/library/micro-rhetorics.json).

| Verb | Subject (source) gets | Predicate (target) gets | Effect in-game |
|---|---|---|---|
| **arrests** | moves autonomously | moves autonomously; freezes on contact with subject | If the subject touches the predicate, the predicate is frozen in place (loses movement/control) until the freeze expires. E.g. "Police arrests Occupier" → touching an occupier freezes them. |
| **obstructs** *(freeze variant)* | — | freezes on contact with subject | Same freeze effect, but without granting the subject movement — used when the subject is typically static (e.g. "Wall Street"). Touching it freezes whatever touches it. |
| **obstructs** *(redirect variant)* | — | bounces/reflects off contact with subject | Instead of freezing, the predicate bounces away when it touches the subject — like a wall deflecting a ball. |
| **grows** | — | grows in size on contact with subject | Touching the subject makes the predicate permanently larger. E.g. "Wall Street grows Occupier" → occupiers get bigger each time they touch Wall Street. |
| **wastes** | — | shrinks (and is removed once fully shrunk) on contact with subject | The opposite of `grows`. Touching the subject makes the predicate permanently smaller each hit; once it shrinks to the minimum size it's removed from the game. Not a paper verb implementation — added as a `manual-addition` micro-rhetoric (see note below) reusing the paper-listed `ShrinkOnCollideComponent`. |
| **avoids** | actively moves away from its pursuer (the predicate) every frame; becomes vulnerable to the predicate on contact | moves autonomously; actively chases the subject | The predicate actively hunts the subject while the subject actively flees in the opposite direction; if the predicate catches (touches) the subject anyway, the subject becomes "vulnerable" — eligible to be removed/scored by whatever `arrests`/`harms`-style component targets it. This is the core evasion/chase mechanic. |
| **needs** | shrinks continuously over time; shrinking pauses while touching the predicate | — | The subject shrinks every frame it is *not* touching the predicate, and stops shrinking (pauses, doesn't reverse) for as long as contact with the predicate continues — models a dependency (e.g. needs food/shelter to avoid wasting away). |
| **harms** | spawns projectiles aimed at the predicate | shrinks a little on each hit; removed once shrunk to nothing | The subject fires projectiles toward the predicate; each hit shrinks the predicate a bit (~4 hits to fully deplete a default-size entity) rather than removing it outright on the first hit. If the concept map gives the predicate a `countRange` (multiple instances), the game is lost once **every** instance has run out — see the lose-condition note below. |

Note: `obstructs` has two implemented micro-rhetorics (freeze and redirect);
which one is selected for a given edge is decided by seeded RNG at
generation time, not by anything authored on the edge itself.

Note on `wastes`: the Game-O-Matic paper's verb list is fixed (17 verbs,
`verbs.json`), and `wastes` originally shipped `enabled: false` with no
micro-rhetoric — the paper never describes one. Per the project's own
extensibility convention (`MASTER-SPEC.md` §37), a currently-unimplemented
paper verb was given a `source: "manual-addition"` micro-rhetoric rather than
inventing a brand-new verb name, keeping `verbs.json` paper-faithful while
still giving templates a "shrink" counterpart to `grows`.

Note on `harms`'s shrink behavior: the paper's own published micro-rhetoric
(`harms-projectile-shrink`) already says "when it collides with B, B
shrinks" — the original runtime implementation removed the predicate outright
on the very first hit instead, which didn't match either the paper's
description or the component's own name. This was a runtime bug fix, not a
change to the paper-sourced micro-rhetoric's JSON.

## Lose condition: "Y runs out" (harms-driven)

A new lose recipe, `lose-protected-entity-runs-out` (`source:
"manual-addition"`, since the paper never publishes exact scoring rules for
its reference-only "fail to protect one entity from another" lose condition —
`MASTER-SPEC.md` §19 explicitly says "do not guess" — so this is a distinct
addition rather than a guess at that unpublished recipe), fires automatically
whenever a `harms` edge exists in the concept map: the harmed predicate (`Y`)
is marked so that once every live instance of it has been shrunk away (all
instances if it has a `countRange`, with none pending a respawn), the game is
lost. This outscores the always-available time-based lose recipe
(`lose-run-out-of-time`) whenever it applies, so a `harms`-containing template
loses on "the target ran out" instead of a countdown timer; templates with no
`harms` edge are unaffected and keep the time-based lose condition.

## Cross-cutting rules

- **Win condition**: whichever entity gets tagged `_isVulnerable` targeted by
  another (currently only produced by `avoids`) becomes eligible for the win
  recipe — touching/removing it scores points toward winning.
- **Player selection**: whichever entity a win recipe assigns as `X` (the
  "actor" side, e.g. the chaser in `avoids`) becomes the entity the user
  controls; if no recipe picks one, a random entity is chosen instead. That
  entity is always forced to exactly one on-screen instance, regardless of
  any authored `countRange` on its concept-map node.
- **Player movement is exclusive**: whichever entity is the player only ever
  moves from direct keyboard input (WASD/arrow keys). Any autonomous-movement
  component it happens to carry from its edges (`ChaseDownComponent`,
  `FleeFromComponent`, `SpawnTowardTargetComponent`, generic
  `_movesInAnyWay`/`BasicMovementComponent`) is inert while it's the player —
  those components still exist on the entity, but the movement systems that
  would drive them skip the player entity entirely, so they never fight the
  player's own input. Collision-triggered effects (freeze, reflect, grow,
  shrink, removal) are unaffected by this and still apply normally to the
  player.
