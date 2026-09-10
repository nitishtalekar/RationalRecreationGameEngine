// Tests for docs/12-GAME-RUNTIME.md — systems/logic layer only, no canvas
// (vitest environment is "node"; §12's own Automated Checks note this).

import { describe, expect, it } from "vitest";

import { createRuntimeState, stepRuntime } from "@/program/runtime/GameRuntime";
import type { InputState } from "@/program/runtime/types";
import type { GameEntity, GeneratedGameSpec } from "@/program/generator/types";

const NO_INPUT: InputState = { keys: new Set() };

function makeEntity(overrides: Partial<GameEntity> & { id: string; noun: string }): GameEntity {
  return {
    components: [],
    isPlayer: false,
    ...overrides,
  };
}

function makeSpec(entities: GameEntity[], world: GameEntity[] = []): GeneratedGameSpec {
  const player = entities.find((e) => e.isPlayer) ?? entities[0];
  return {
    seed: 1,
    entities,
    world,
    playerEntityId: player.id,
    winCondition: {},
    loseCondition: {},
    structure: {},
    instructions: { player: "", win: "", lose: "" },
  };
}

describe("§27 StopOnCollideComponent", () => {
  it("halts the owner's velocity when it touches its target (owner is the one affected, per §22)", () => {
    // Mirrors obstructs-freeze: the obstructed entity (here "blocked") holds
    // StopOnCollideComponent targeting the obstacle ("wall") — "blocked"
    // stops when it touches "wall", not the other way around.
    const wall = makeEntity({
      id: "wall",
      noun: "Wall",
      transform: { x: 0, y: 0, width: 1, height: 1 },
    });
    const blocked = makeEntity({
      id: "blocked",
      noun: "Blocked",
      isPlayer: true,
      transform: { x: 0, y: 0, width: 1, height: 1 },
      components: [{ owner: "blocked", component: "StopOnCollideComponent", target: "wall" }],
    });

    const spec = makeSpec([blocked, wall]);
    let state = createRuntimeState(spec);

    const blockedRuntime = state.entities.find((e) => e.id === "blocked")!;
    blockedRuntime.velocity = { x: 50, y: 50 };
    blockedRuntime.position = { x: 0, y: 0 };
    const wallRuntime = state.entities.find((e) => e.id === "wall")!;
    wallRuntime.position = { x: 0, y: 0 };

    const result = stepRuntime(spec, state, NO_INPUT, 0.016);
    state = result.state;

    const updatedBlocked = state.entities.find((e) => e.id === "blocked")!;
    expect(updatedBlocked.velocity).toEqual({ x: 0, y: 0 });
    expect(result.events).toContain("stop:blocked");
  });
});

describe("§27 ScoreRemovalOfComponent", () => {
  it("increments score on removal and checks the win threshold", () => {
    const target = makeEntity({
      id: "target",
      noun: "Target",
      transform: { x: 0, y: 0, width: 1, height: 1 },
      components: [
        { owner: "target", component: "RemoveOnCollideComponent", target: "player" },
        {
          owner: "target",
          component: "ScoreRemovalOfComponent",
          params: { winScore: 20, scoreEachRemoval: 10 },
        },
      ],
    });
    const player = makeEntity({
      id: "player",
      noun: "Player",
      isPlayer: true,
      transform: { x: 0, y: 0, width: 1, height: 1 },
    });

    const spec = makeSpec([player, target]);
    let state = createRuntimeState(spec);
    for (const e of state.entities) e.position = { x: 0, y: 0 };

    let result = stepRuntime(spec, state, NO_INPUT, 0.016);
    state = result.state;
    expect(state.score).toBe(10);
    expect(state.outcome).toBe("playing");

    // Respawn happens after the delay; force a second removal by re-marking
    // not-removed and re-colliding to reach the win threshold.
    const respawned = state.entities.find((e) => e.id === "target")!;
    respawned.removed = false;
    respawned.position = { x: 0, y: 0 };
    result = stepRuntime(spec, state, NO_INPUT, 0.016);
    state = result.state;

    expect(state.score).toBe(20);
    expect(state.outcome).toBe("won");
    expect(result.events).toContain("outcome:won");
  });
});

describe("§27 RespawnOnRemoveComponent", () => {
  it("respawns a removed entity after the respawn delay elapses", () => {
    const target = makeEntity({
      id: "target",
      noun: "Target",
      transform: { x: 0, y: 0, width: 1, height: 1 },
      components: [
        { owner: "target", component: "RemoveOnCollideComponent", target: "player" },
        { owner: "target", component: "RespawnOnRemoveComponent" },
      ],
    });
    const player = makeEntity({
      id: "player",
      noun: "Player",
      isPlayer: true,
      transform: { x: 0, y: 0, width: 1, height: 1 },
    });

    const spec = makeSpec([player, target]);
    let state = createRuntimeState(spec);
    for (const e of state.entities) e.position = { x: 0, y: 0 };

    let result = stepRuntime(spec, state, NO_INPUT, 0.016);
    state = result.state;
    expect(state.entities.find((e) => e.id === "target")?.removed).toBe(true);

    // Move the colliding player far away so it doesn't immediately
    // re-collide with the respawned target before the assertion.
    const playerRuntime = state.entities.find((e) => e.id === "player")!;
    playerRuntime.position = { x: 700, y: 450 };

    result = stepRuntime(spec, state, NO_INPUT, 2);
    state = result.state;

    expect(state.entities.find((e) => e.id === "target")?.removed).toBe(false);
    expect(result.events.some((e) => e.startsWith("respawned:"))).toBe(true);
  });
});

describe("player control — always controllable regardless of assigned components", () => {
  it("moves the player via arrow keys with no MouseController component", () => {
    // The generator never assigns a MouseController component (no
    // recipe/micro-rhetoric references it), so player control must not be
    // gated on its presence — the runtime always controls whichever entity
    // is isPlayer.
    const player = makeEntity({
      id: "player",
      noun: "Player",
      isPlayer: true,
      transform: { x: 100, y: 100, width: 1, height: 1 },
      components: [],
    });

    const spec = makeSpec([player]);
    let state = createRuntimeState(spec);

    const input: InputState = { keys: new Set(["ArrowRight"]) };
    const result = stepRuntime(spec, state, input, 0.1);
    state = result.state;

    expect(state.entities[0].position.x).toBeGreaterThan(100);
  });

  it("does not move the player when no keys are held (no pointer-follow)", () => {
    const player = makeEntity({
      id: "player",
      noun: "Player",
      isPlayer: true,
      transform: { x: 100, y: 100, width: 1, height: 1 },
      components: [],
    });

    const spec = makeSpec([player]);
    let state = createRuntimeState(spec);

    const result = stepRuntime(spec, state, NO_INPUT, 0.1);
    state = result.state;

    expect(state.entities[0].position).toEqual({ x: 100, y: 100 });
  });

  it("does not let autonomous BasicMovementComponent movement override direct player control", () => {
    const player = makeEntity({
      id: "player",
      noun: "Player",
      isPlayer: true,
      transform: { x: 100, y: 100, width: 1, height: 1 },
      components: [{ owner: "player", component: "BasicMovementComponent", params: { speed: 999 } }],
    });

    const spec = makeSpec([player]);
    let state = createRuntimeState(spec);

    const input: InputState = { keys: new Set(["ArrowRight"]) };
    const result = stepRuntime(spec, state, input, 0.1);
    state = result.state;

    // Arrow-key control moves at a fixed, known speed (220/s) — if
    // BasicMovement's 999/s also applied, x would be much further right.
    expect(state.entities[0].position.x).toBeCloseTo(122, 0);
  });
});

describe("player control — WASD", () => {
  it("moves the player via WASD keys with no MouseController component", () => {
    const player = makeEntity({
      id: "player",
      noun: "Player",
      isPlayer: true,
      transform: { x: 100, y: 100, width: 1, height: 1 },
      components: [],
    });

    const spec = makeSpec([player]);
    let state = createRuntimeState(spec);

    const input: InputState = { keys: new Set(["d"]) };
    const result = stepRuntime(spec, state, input, 0.1);
    state = result.state;

    expect(state.entities[0].position.x).toBeGreaterThan(100);
  });
});

describe("real freeze — StopOnCollideComponent removes agency for a duration", () => {
  it("keeps the player's velocity at zero and blocks WASD/arrow input for a period after collision", () => {
    const wall = makeEntity({
      id: "wall",
      noun: "Wall",
      transform: { x: 0, y: 0, width: 1, height: 1 },
    });
    const player = makeEntity({
      id: "player",
      noun: "Player",
      isPlayer: true,
      transform: { x: 0, y: 0, width: 1, height: 1 },
      components: [{ owner: "player", component: "StopOnCollideComponent", target: "wall" }],
    });

    const spec = makeSpec([player, wall]);
    let state = createRuntimeState(spec);
    for (const e of state.entities) e.position = { x: 0, y: 0 };

    // First tick: collide with the wall while also pressing a direction —
    // freeze should take priority and the player should not move at all.
    const input: InputState = { keys: new Set(["d", "ArrowRight"]) };
    let result = stepRuntime(spec, state, input, 0.1);
    state = result.state;

    const frozenPlayer = state.entities.find((e) => e.id === "player")!;
    expect(result.events).toContain(`stop:${frozenPlayer.id}`);
    expect(frozenPlayer.frozenUntil).toBeGreaterThan(state.elapsedSeconds);
    const positionRightAfterFreeze = { ...frozenPlayer.position };

    // Move the wall away so there's no ongoing collision, then keep pressing
    // input while still within the freeze window — position must not change.
    const wallRuntime = state.entities.find((e) => e.id === "wall")!;
    wallRuntime.position = { x: 700, y: 450 };

    result = stepRuntime(spec, state, input, 0.1);
    state = result.state;
    const stillFrozenPlayer = state.entities.find((e) => e.id === "player")!;
    expect(stillFrozenPlayer.position).toEqual(positionRightAfterFreeze);

    // After the freeze duration elapses, input works again.
    result = stepRuntime(spec, state, input, 2);
    state = result.state;
    const unfrozenPlayer = state.entities.find((e) => e.id === "player")!;
    expect(unfrozenPlayer.position.x).toBeGreaterThan(positionRightAfterFreeze.x);
  });

  it("also freezes non-player entities driven by autonomous movement", () => {
    const wall = makeEntity({
      id: "wall",
      noun: "Wall",
      transform: { x: 0, y: 0, width: 1, height: 1 },
    });
    const mover = makeEntity({
      id: "mover",
      noun: "Mover",
      transform: { x: 0, y: 0, width: 1, height: 1 },
      components: [
        { owner: "mover", component: "BasicMovementComponent", params: { speed: 100 } },
        { owner: "mover", component: "StopOnCollideComponent", target: "wall" },
      ],
    });

    const spec = makeSpec([mover, wall]);
    let state = createRuntimeState(spec);
    for (const e of state.entities) e.position = { x: 0, y: 0 };

    let result = stepRuntime(spec, state, NO_INPUT, 0.1);
    state = result.state;
    const afterCollision = { ...state.entities.find((e) => e.id === "mover")!.position };

    result = stepRuntime(spec, state, NO_INPUT, 0.1);
    state = result.state;
    const stillFrozen = state.entities.find((e) => e.id === "mover")!;
    expect(stillFrozen.position).toEqual(afterCollision);
  });
});

describe("action tints — freeze/grow/shrink/reflect flash the affected entity", () => {
  it("sets a freeze tint on StopOnCollideComponent", () => {
    const wall = makeEntity({
      id: "wall",
      noun: "Wall",
      transform: { x: 0, y: 0, width: 1, height: 1 },
    });
    const blocked = makeEntity({
      id: "blocked",
      noun: "Blocked",
      isPlayer: true,
      transform: { x: 0, y: 0, width: 1, height: 1 },
      components: [{ owner: "blocked", component: "StopOnCollideComponent", target: "wall" }],
    });

    const spec = makeSpec([blocked, wall]);
    let state = createRuntimeState(spec);
    for (const e of state.entities) e.position = { x: 0, y: 0 };

    const result = stepRuntime(spec, state, NO_INPUT, 0.1);
    state = result.state;

    const entity = state.entities.find((e) => e.id === "blocked")!;
    expect(entity.flashTint).toBe("freeze");
    expect(entity.flashUntil).toBeGreaterThan(state.elapsedSeconds);
  });

  it("sets a grow tint on GrowOnCollideComponent", () => {
    const wall = makeEntity({
      id: "wall",
      noun: "Wall",
      transform: { x: 0, y: 0, width: 1, height: 1 },
    });
    const grower = makeEntity({
      id: "grower",
      noun: "Grower",
      isPlayer: true,
      transform: { x: 0, y: 0, width: 1, height: 1 },
      components: [{ owner: "grower", component: "GrowOnCollideComponent", target: "wall" }],
    });

    const spec = makeSpec([grower, wall]);
    let state = createRuntimeState(spec);
    for (const e of state.entities) e.position = { x: 0, y: 0 };

    const result = stepRuntime(spec, state, NO_INPUT, 0.1);
    state = result.state;

    const entity = state.entities.find((e) => e.id === "grower")!;
    expect(entity.flashTint).toBe("grow");
  });

  it("sets a shrink tint on ShrinkOnCollideComponent", () => {
    const wall = makeEntity({
      id: "wall",
      noun: "Wall",
      transform: { x: 0, y: 0, width: 1, height: 1 },
    });
    const shrinker = makeEntity({
      id: "shrinker",
      noun: "Shrinker",
      isPlayer: true,
      transform: { x: 0, y: 0, width: 1, height: 1 },
      components: [{ owner: "shrinker", component: "ShrinkOnCollideComponent", target: "wall" }],
    });

    const spec = makeSpec([shrinker, wall]);
    let state = createRuntimeState(spec);
    for (const e of state.entities) e.position = { x: 0, y: 0 };

    const result = stepRuntime(spec, state, NO_INPUT, 0.1);
    state = result.state;

    const entity = state.entities.find((e) => e.id === "shrinker")!;
    expect(entity.flashTint).toBe("shrink");
  });

  it("sets a reflect tint on ReflectOnCollideComponent", () => {
    const wall = makeEntity({
      id: "wall",
      noun: "Wall",
      transform: { x: 0, y: 0, width: 1, height: 1 },
    });
    const bouncer = makeEntity({
      id: "bouncer",
      noun: "Bouncer",
      isPlayer: true,
      transform: { x: 0, y: 0, width: 1, height: 1 },
      components: [{ owner: "bouncer", component: "ReflectOnCollideComponent", target: "wall" }],
    });

    const spec = makeSpec([bouncer, wall]);
    let state = createRuntimeState(spec);
    for (const e of state.entities) {
      e.position = { x: 0, y: 0 };
    }
    state.entities.find((e) => e.id === "bouncer")!.velocity = { x: 10, y: 10 };

    const result = stepRuntime(spec, state, NO_INPUT, 0.1);
    state = result.state;

    const entity = state.entities.find((e) => e.id === "bouncer")!;
    expect(entity.flashTint).toBe("reflect");
  });
});

describe("§20 multiplied entities (`count`) spawn identically-behaving instances", () => {
  it("spawns `count` runtime entities sharing one sourceEntity, so their components/params can never diverge", () => {
    const police = makeEntity({
      id: "police",
      noun: "Police",
      count: 3,
      transform: { x: 400, width: 1, height: 1 },
      components: [{ owner: "police", component: "BasicMovementComponent", params: { speed: 123 } }],
    });
    const player = makeEntity({
      id: "player",
      noun: "Player",
      isPlayer: true,
      transform: { x: 0, y: 0, width: 1, height: 1 },
    });

    const spec = makeSpec([player, police]);
    const state = createRuntimeState(spec);

    const policeInstances = state.entities.filter((e) => e.sourceEntity.id === "police");
    expect(policeInstances).toHaveLength(3);

    // Distinct runtime ids (so they're individually addressable/removable)
    // but the exact same sourceEntity object — there is nothing per-copy
    // that could hold a different value.
    const ids = new Set(policeInstances.map((e) => e.id));
    expect(ids.size).toBe(3);
    for (const instance of policeInstances) {
      expect(instance.sourceEntity).toBe(police);
    }
  });

  it("spreads instances along the free axis instead of stacking them at a shared fixed x", () => {
    // multiplyEntity fixes transform.x for every copy of a multiplied entity
    // (e.g. Frogger's "middle" lane) — without a per-copy spread, all copies
    // would render on top of each other at that x.
    const police = makeEntity({
      id: "police",
      noun: "Police",
      count: 3,
      transform: { x: 400, width: 1, height: 1 },
    });
    const player = makeEntity({
      id: "player",
      noun: "Player",
      isPlayer: true,
      transform: { x: 0, y: 0, width: 1, height: 1 },
    });

    const spec = makeSpec([player, police]);
    const state = createRuntimeState(spec);

    const policeInstances = state.entities.filter((e) => e.sourceEntity.id === "police");
    for (const instance of policeInstances) {
      expect(instance.position.x).toBe(400);
    }
    const ys = policeInstances.map((e) => e.position.y);
    expect(new Set(ys).size).toBe(3);
  });

  it("freezes the player when touching any one of several target instances", () => {
    const police = makeEntity({
      id: "police",
      noun: "Police",
      count: 3,
      transform: { width: 1, height: 1 },
    });
    const occupier = makeEntity({
      id: "occupier",
      noun: "Occupier",
      isPlayer: true,
      transform: { x: 0, y: 0, width: 1, height: 1 },
      components: [{ owner: "occupier", component: "StopOnCollideComponent", target: "police" }],
    });

    const spec = makeSpec([occupier, police]);
    let state = createRuntimeState(spec);

    // Move every Police instance away except one, which the player touches.
    const policeInstances = state.entities.filter((e) => e.sourceEntity.id === "police");
    policeInstances.forEach((instance, i) => {
      instance.position = i === 1 ? { x: 0, y: 0 } : { x: 700, y: 450 };
    });
    const occupierRuntime = state.entities.find((e) => e.id === "occupier")!;
    occupierRuntime.position = { x: 0, y: 0 };

    const result = stepRuntime(spec, state, NO_INPUT, 0.1);
    state = result.state;

    const updatedOccupier = state.entities.find((e) => e.id === "occupier")!;
    expect(result.events).toContain(`stop:${updatedOccupier.id}`);
    expect(updatedOccupier.frozenUntil).toBeGreaterThan(state.elapsedSeconds);
  });

  it("removes and respawns one instance independently of its siblings", () => {
    const police = makeEntity({
      id: "police",
      noun: "Police",
      count: 3,
      transform: { width: 1, height: 1 },
      components: [
        { owner: "police", component: "RemoveOnCollideComponent", target: "player" },
        { owner: "police", component: "RespawnOnRemoveComponent" },
      ],
    });
    const player = makeEntity({
      id: "player",
      noun: "Player",
      isPlayer: true,
      transform: { x: 0, y: 0, width: 1, height: 1 },
    });

    const spec = makeSpec([player, police]);
    let state = createRuntimeState(spec);

    const policeInstances = state.entities.filter((e) => e.sourceEntity.id === "police");
    policeInstances.forEach((instance, i) => {
      instance.position = i === 0 ? { x: 0, y: 0 } : { x: 700, y: 450 };
    });
    const playerRuntime = state.entities.find((e) => e.id === "player")!;
    playerRuntime.position = { x: 0, y: 0 };

    const result = stepRuntime(spec, state, NO_INPUT, 0.1);
    state = result.state;

    const afterCollision = state.entities.filter((e) => e.sourceEntity.id === "police");
    expect(afterCollision.filter((e) => e.removed)).toHaveLength(1);
    expect(afterCollision.filter((e) => !e.removed)).toHaveLength(2);
  });
});

describe("§27 MeterComponent — lose on timeout", () => {
  it("announces a lose state once time runs out", () => {
    const player = makeEntity({
      id: "player",
      noun: "Player",
      isPlayer: true,
      transform: { x: 0, y: 0, width: 1, height: 1 },
    });
    const world = makeEntity({
      id: "WORLD",
      noun: "WORLD",
      components: [{ owner: "WORLD", component: "MeterComponent", params: { seconds: 1 } }],
    });

    const spec = makeSpec([player], [world]);
    let state = createRuntimeState(spec);
    expect(state.timeRemainingSeconds).toBe(1);

    const result = stepRuntime(spec, state, NO_INPUT, 2);
    state = result.state;

    expect(state.outcome).toBe("lost");
    expect(result.events).toContain("outcome:lost");
  });
});
