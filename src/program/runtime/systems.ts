// Component behavior systems per docs/12-GAME-RUNTIME.md §27.
// Generator-agnostic: only imports GeneratedGameSpec's type, never
// program/generator/* implementation modules (§28).

import type { GeneratedGameSpec } from "@/program/generator/types";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/program/runtime/types";
import type { ActionTint, InputState, RuntimeEntity, RuntimeState } from "@/program/runtime/types";

const RESPAWN_DELAY_SECONDS = 1.5;
const SHRINK_RATE_PER_SECOND = 12;
const GROW_RATE_PER_SECOND = 12;
const MIN_SIZE = 6;
const CHASE_SPEED = 90;
// "harms" (harms-projectile-shrink): per-hit shrink amount, gentler than
// ShrinkOnCollideComponent's SHRINK_RATE_PER_SECOND * 4 (which removes a
// default 48px entity in a single hit) so repeated hits are visible before
// the target disappears — a default-size entity takes ~4 hits.
const HARMS_SHRINK_PER_HIT = 12;
// "obstructs-freeze": how long StopOnCollideComponent removes an entity's
// (or the player's) agency for, not spec-driven since the micro-rhetoric
// assigns no params.
const FREEZE_DURATION_SECONDS = 1.5;
// How long an action's color tint stays visible on the affected entity.
const FLASH_DURATION_SECONDS = 0.4;

function isFrozen(entity: RuntimeEntity, state: RuntimeState): boolean {
  return entity.frozenUntil > state.elapsedSeconds;
}

function flash(entity: RuntimeEntity, tint: ActionTint, state: RuntimeState): void {
  entity.flashTint = tint;
  entity.flashUntil = state.elapsedSeconds + FLASH_DURATION_SECONDS;
}

// `target`/`evaderName` on a ComponentAssignment names a *spec* entity (by
// id or noun) — never a runtime entity's own id, which may not even be
// unique per spec entity once `count` > 1 spawns several RuntimeEntity rows
// sharing one spec entity (see GameRuntime.ts's createRuntimeState). So
// resolution must match on `sourceEntity`, and since several runtime rows
// can share that source, this returns every live match rather than one.
function findEntitiesBySourceId(state: RuntimeState, id: string | undefined): RuntimeEntity[] {
  if (!id) return [];
  return state.entities.filter((e) => e.sourceEntity.id === id);
}

function findNearestBySourceId(
  state: RuntimeState,
  from: RuntimeEntity,
  id: string | undefined
): RuntimeEntity | undefined {
  const candidates = findEntitiesBySourceId(state, id).filter((e) => !e.removed);
  if (candidates.length === 0) return undefined;
  return candidates.reduce((closest, candidate) => {
    const closestDist = Math.hypot(
      closest.position.x - from.position.x,
      closest.position.y - from.position.y
    );
    const candidateDist = Math.hypot(
      candidate.position.x - from.position.x,
      candidate.position.y - from.position.y
    );
    return candidateDist < closestDist ? candidate : closest;
  });
}

function componentsFor(entity: RuntimeEntity) {
  return entity.sourceEntity.components;
}

function paramNumber(
  params: Record<string, unknown> | undefined,
  key: string,
  fallback: number
): number {
  const value = params?.[key];
  return typeof value === "number" ? value : fallback;
}

function clampToCanvas(entity: RuntimeEntity): void {
  entity.position.x = Math.max(0, Math.min(CANVAS_WIDTH - entity.width, entity.position.x));
  entity.position.y = Math.max(0, Math.min(CANVAS_HEIGHT - entity.height, entity.position.y));
}

function aabbOverlap(a: RuntimeEntity, b: RuntimeEntity): boolean {
  return (
    a.position.x < b.position.x + b.width &&
    a.position.x + a.width > b.position.x &&
    a.position.y < b.position.y + b.height &&
    a.position.y + a.height > b.position.y
  );
}

function moveToward(entity: RuntimeEntity, target: RuntimeEntity, speed: number, dt: number) {
  const dx = target.position.x - entity.position.x;
  const dy = target.position.y - entity.position.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return;
  entity.position.x += (dx / distance) * speed * dt;
  entity.position.y += (dy / distance) * speed * dt;
}

// Inverse of moveToward: steps directly away from `pursuer` instead of
// toward it, for FleeFromComponent ("avoids" subject) — the mirror image of
// ChaseDownComponent's approach vector.
function moveAway(entity: RuntimeEntity, pursuer: RuntimeEntity, speed: number, dt: number) {
  const dx = entity.position.x - pursuer.position.x;
  const dy = entity.position.y - pursuer.position.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return;
  entity.position.x += (dx / distance) * speed * dt;
  entity.position.y += (dy / distance) * speed * dt;
}

// §27 "simple autonomous movement" runtime-default for the resolved
// `_movesInAnyWay` non-terminal (see resolve.ts's BasicMovementComponent) —
// bounces off canvas edges at a per-entity speed drawn from
// parameter-ranges.json's movementSpeed range during finalization. Skipped
// for the player entity: direct player control (runPlayerController) always
// takes priority so the two systems don't fight over position/velocity.
function runBasicMovement(entity: RuntimeEntity, state: RuntimeState, dt: number): void {
  if (entity.isPlayer) return;
  if (isFrozen(entity, state)) return;
  const movement = componentsFor(entity).find((c) => c.component === "BasicMovementComponent");
  if (!movement) return;

  const speed = paramNumber(movement.params, "speed", 100);
  if (entity.velocity.x === 0 && entity.velocity.y === 0) {
    const angle = Math.random() * Math.PI * 2;
    entity.velocity.x = Math.cos(angle) * speed;
    entity.velocity.y = Math.sin(angle) * speed;
  }

  entity.position.x += entity.velocity.x * dt;
  entity.position.y += entity.velocity.y * dt;

  if (entity.position.x <= 0 || entity.position.x + entity.width >= CANVAS_WIDTH) {
    entity.velocity.x *= -1;
  }
  if (entity.position.y <= 0 || entity.position.y + entity.height >= CANVAS_HEIGHT) {
    entity.velocity.y *= -1;
  }
  clampToCanvas(entity);
}

// §27 MouseController substitute, keyboard-only variant: WASD/arrow keys
// drive the player directly, documented as a runtime web-input substitution
// rather than a paper claim. No pointer-follow — user request is WASD-only
// control with no mouse-following behavior. Applied to whichever entity is
// the player unconditionally — the generator has no recipe/micro-rhetoric
// that ever assigns a `MouseController` component (the paper's
// win/lose/structure recipes never reference input components), so gating
// this on the component's presence left the player permanently
// uncontrollable. The runtime guarantees direct player control regardless of
// what the generated spec's `isPlayer` entity happens to carry.
//
// While frozen (StopOnCollideComponent hit the player), this returns early
// and does not process input at all — a real freeze takes away player
// agency rather than only zeroing velocity, since the player is otherwise
// moved via direct position deltas that would ignore velocity entirely.
function runPlayerController(entity: RuntimeEntity, state: RuntimeState, input: InputState, dt: number): void {
  if (!entity.isPlayer) return;
  if (isFrozen(entity, state)) return;

  const ARROW_SPEED = 220;
  let dx = 0;
  let dy = 0;
  if (input.keys.has("ArrowLeft") || input.keys.has("a") || input.keys.has("A")) dx -= 1;
  if (input.keys.has("ArrowRight") || input.keys.has("d") || input.keys.has("D")) dx += 1;
  if (input.keys.has("ArrowUp") || input.keys.has("w") || input.keys.has("W")) dy -= 1;
  if (input.keys.has("ArrowDown") || input.keys.has("s") || input.keys.has("S")) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy) || 1;
    entity.position.x += (dx / length) * ARROW_SPEED * dt;
    entity.position.y += (dy / length) * ARROW_SPEED * dt;
  }

  clampToCanvas(entity);
}

// Movement systems (this one included) never drive a player entity: direct
// player control (runPlayerController) is the sole source of the player's
// position, so a player who happens to hold a ChaseDownComponent/
// FleeFromComponent/SpawnTowardTargetComponent (e.g. because a win recipe
// made the "avoids" chaser or "harms" subject the player) does not also
// move autonomously and fight the player's own input. Collision-triggered
// effects (runCollisions) are unaffected by isPlayer and still apply.
function runChaseDown(entity: RuntimeEntity, state: RuntimeState, dt: number): void {
  if (entity.isPlayer) return;
  if (isFrozen(entity, state)) return;
  for (const c of componentsFor(entity)) {
    if (c.component !== "ChaseDownComponent") continue;
    const evaderName = typeof c.params?.evaderName === "string" ? c.params.evaderName : undefined;
    const target = evaderName
      ? state.entities.find((e) => e.noun === evaderName && !e.removed)
      : undefined;
    if (target) moveToward(entity, target, CHASE_SPEED, dt);
  }
  clampToCanvas(entity);
}

// "avoids" subject: actively steps away from its pursuer every frame, rather
// than relying on generic `_movesInAnyWay` bounce movement to accidentally
// put distance between them. Mirrors runChaseDown's lookup convention
// (pursuer resolved by noun, since $predicate interpolates to a noun string
// — see microRhetoric.ts's resolveParamValue).
function runFleeFrom(entity: RuntimeEntity, state: RuntimeState, dt: number): void {
  if (entity.isPlayer) return;
  if (isFrozen(entity, state)) return;
  for (const c of componentsFor(entity)) {
    if (c.component !== "FleeFromComponent") continue;
    const pursuerName = typeof c.params?.pursuerName === "string" ? c.params.pursuerName : undefined;
    const pursuer = pursuerName
      ? state.entities.find((e) => e.noun === pursuerName && !e.removed)
      : undefined;
    if (pursuer) moveAway(entity, pursuer, CHASE_SPEED, dt);
  }
  clampToCanvas(entity);
}

function runSpawnTowardTarget(entity: RuntimeEntity, state: RuntimeState, dt: number): void {
  if (entity.isPlayer) return;
  if (isFrozen(entity, state)) return;
  for (const c of componentsFor(entity)) {
    if (c.component !== "SpawnTowardTargetComponent") continue;
    const target = findNearestBySourceId(state, entity, c.target);
    if (target) moveToward(entity, target, CHASE_SPEED * 1.5, dt);
  }
  clampToCanvas(entity);
}

function runShrinkUnlessColliding(entity: RuntimeEntity, state: RuntimeState, dt: number): void {
  if (isFrozen(entity, state)) return;
  for (const c of componentsFor(entity)) {
    if (c.component !== "ShrinkUnlessCollidingComponent") continue;
    // "unless colliding" is satisfied by touching *any* live instance of the
    // target entity, not just the nearest one.
    const colliding = findEntitiesBySourceId(state, c.target).some(
      (target) => !target.removed && aabbOverlap(entity, target)
    );
    if (!colliding) {
      entity.width = Math.max(MIN_SIZE, entity.width - SHRINK_RATE_PER_SECOND * dt);
      entity.height = Math.max(MIN_SIZE, entity.height - SHRINK_RATE_PER_SECOND * dt);
      flash(entity, "shrink", state);
    }
  }
}

function removeEntity(entity: RuntimeEntity, state: RuntimeState, events: string[]): void {
  entity.removed = true;
  events.push(`removed:${entity.id}`);

  const scoreComponent = componentsFor(entity).find(
    (c) => c.component === "ScoreRemovalOfComponent"
  );
  if (scoreComponent) {
    const perRemoval = paramNumber(scoreComponent.params, "scoreEachRemoval", 10);
    const winScore = paramNumber(scoreComponent.params, "winScore", 100);
    state.score += perRemoval;
    events.push(`score:${state.score}`);
    if (state.score >= winScore && state.outcome === "playing") {
      state.outcome = "won";
      events.push("outcome:won");
    }
  }

  const respawnComponent = componentsFor(entity).find(
    (c) => c.component === "RespawnOnRemoveComponent"
  );
  if (respawnComponent) {
    entity.respawnAt = state.elapsedSeconds + RESPAWN_DELAY_SECONDS;
  }

  // lose-protected-entity-runs-out: once every live instance sharing this
  // spec entity is gone (count > 1 spawns several RuntimeEntity rows from
  // one spec entity, same convention as findEntitiesBySourceId elsewhere)
  // and none is queued to respawn, the protected entity has "run out" and
  // the game is lost. Checked here rather than once per frame so it fires
  // exactly on the removal that empties the last instance.
  const loseOnAllRemoved = componentsFor(entity).find(
    (c) => c.component === "LoseOnAllRemovedComponent"
  );
  if (loseOnAllRemoved && state.outcome === "playing") {
    const allGone = findEntitiesBySourceId(state, entity.sourceEntity.id).every(
      (e) => e.removed && e.respawnAt === null
    );
    if (allGone) {
      state.outcome = "lost";
      events.push("outcome:lost");
    }
  }
}

// §22/§10 semantics (confirmed against the Occupy golden path and every
// micro-rhetoric example): the *owner* of an OnCollide component — the
// entity the component is physically attached to — is the one affected by
// the collision. `target` only names which other entity must touch it to
// trigger that effect; the target itself is untouched by this component
// instance. E.g. Wall Street holds RemoveOnCollide(target=Occupier): Wall
// Street is removed when Occupier touches it, not the other way around.
function runCollisions(state: RuntimeState, events: string[]): void {
  const active = state.entities.filter((e) => !e.removed);

  for (const entity of active) {
    for (const c of componentsFor(entity)) {
      // A target name resolves to every live instance sharing that spec
      // entity (there can be several when `count` > 1) — touching any one
      // of them triggers the effect, same as touching the single instance
      // would have before entities could be multiplied.
      const touchingTarget = findEntitiesBySourceId(state, c.target).some(
        (target) => !target.removed && target !== entity && aabbOverlap(entity, target)
      );
      if (!touchingTarget) continue;

      switch (c.component) {
        case "StopOnCollideComponent": {
          entity.velocity = { x: 0, y: 0 };
          entity.frozenUntil = Math.max(
            entity.frozenUntil,
            state.elapsedSeconds + FREEZE_DURATION_SECONDS
          );
          flash(entity, "freeze", state);
          events.push(`stop:${entity.id}`);
          break;
        }
        case "ReflectOnCollideComponent": {
          entity.velocity.x *= -1;
          entity.velocity.y *= -1;
          flash(entity, "reflect", state);
          events.push(`reflect:${entity.id}`);
          break;
        }
        case "GrowOnCollideComponent": {
          entity.width += GROW_RATE_PER_SECOND;
          entity.height += GROW_RATE_PER_SECOND;
          flash(entity, "grow", state);
          events.push(`grow:${entity.id}`);
          break;
        }
        case "ShrinkOnCollideComponent": {
          entity.width = Math.max(MIN_SIZE, entity.width - SHRINK_RATE_PER_SECOND * 4);
          entity.height = Math.max(MIN_SIZE, entity.height - SHRINK_RATE_PER_SECOND * 4);
          flash(entity, "shrink", state);
          if (entity.width <= MIN_SIZE && entity.height <= MIN_SIZE) {
            removeEntity(entity, state, events);
          }
          break;
        }
        case "RemoveOnCollideComponent": {
          removeEntity(entity, state, events);
          break;
        }
        default:
          break;
      }
    }
  }

  runHarmsShrink(state, events);
}

// "harms" (harms-projectile-shrink, docs/MASTER-SPEC.md §10.3): "A spawns a
// shape that moves toward B; when it collides with B, B shrinks." Handled
// separately from the generic c.target-driven loop above because the
// paper's own published assignment for ShrinkOnSpawnCollisionComponent
// carries no `target` field (only SpawnTowardTargetComponent, on the
// *harmer*, names the harmed entity) — so instead of requiring the harmed
// entity to declare its own attacker, this looks up every live entity that
// holds a SpawnTowardTargetComponent aimed at it and treats touching any of
// them as a hit. Each hit shrinks it (same rate as ShrinkOnCollideComponent)
// rather than removing it outright, only removing it once fully shrunk.
function runHarmsShrink(state: RuntimeState, events: string[]): void {
  for (const entity of state.entities) {
    if (entity.removed) continue;
    const hasShrinkOnSpawnCollision = componentsFor(entity).some(
      (c) => c.component === "ShrinkOnSpawnCollisionComponent"
    );
    if (!hasShrinkOnSpawnCollision) continue;

    const hitByHarmer = state.entities.some((harmer) => {
      if (harmer.removed || harmer === entity) return false;
      const aimsAtThis = componentsFor(harmer).some(
        (c) => c.component === "SpawnTowardTargetComponent" && c.target === entity.sourceEntity.id
      );
      return aimsAtThis && aabbOverlap(harmer, entity);
    });
    if (!hitByHarmer) continue;

    entity.width = Math.max(MIN_SIZE, entity.width - HARMS_SHRINK_PER_HIT);
    entity.height = Math.max(MIN_SIZE, entity.height - HARMS_SHRINK_PER_HIT);
    flash(entity, "shrink", state);
    if (entity.width <= MIN_SIZE && entity.height <= MIN_SIZE) {
      removeEntity(entity, state, events);
    }
  }
}

function runRespawns(state: RuntimeState, spec: GeneratedGameSpec, events: string[]): void {
  for (const entity of state.entities) {
    if (!entity.removed || entity.respawnAt === null) continue;
    if (state.elapsedSeconds < entity.respawnAt) continue;

    const sourceSpec = spec.entities.find((e) => e.id === entity.sourceEntity.id);
    entity.removed = false;
    entity.respawnAt = null;
    entity.frozenUntil = 0;
    entity.flashTint = null;
    entity.flashUntil = 0;
    entity.width = sourceSpec?.transform?.width ? sourceSpec.transform.width * 48 : entity.width;
    entity.height = sourceSpec?.transform?.height
      ? sourceSpec.transform.height * 48
      : entity.height;
    entity.position = {
      x: Math.random() * (CANVAS_WIDTH - entity.width),
      y: Math.random() * (CANVAS_HEIGHT - entity.height),
    };
    events.push(`respawned:${entity.id}`);
  }
}

function runMeter(state: RuntimeState, spec: GeneratedGameSpec, dt: number, events: string[]): void {
  const meter = spec.world
    .flatMap((w) => w.components)
    .find((c) => c.component === "MeterComponent");
  if (!meter || state.timeRemainingSeconds === null) return;

  state.timeRemainingSeconds = Math.max(0, state.timeRemainingSeconds - dt);
  if (state.timeRemainingSeconds <= 0 && state.outcome === "playing") {
    state.outcome = "lost";
    events.push("outcome:lost");
  }
}

export function runSystems(
  spec: GeneratedGameSpec,
  state: RuntimeState,
  input: InputState,
  deltaSeconds: number
): { state: RuntimeState; events: string[] } {
  const events: string[] = [];
  state.elapsedSeconds += deltaSeconds;

  for (const entity of state.entities) {
    if (entity.removed) continue;
    runBasicMovement(entity, state, deltaSeconds);
    runPlayerController(entity, state, input, deltaSeconds);
    runChaseDown(entity, state, deltaSeconds);
    runFleeFrom(entity, state, deltaSeconds);
    runSpawnTowardTarget(entity, state, deltaSeconds);
    runShrinkUnlessColliding(entity, state, deltaSeconds);
  }

  runCollisions(state, events);
  runRespawns(state, spec, events);
  runMeter(state, spec, deltaSeconds, events);

  return { state, events };
}
