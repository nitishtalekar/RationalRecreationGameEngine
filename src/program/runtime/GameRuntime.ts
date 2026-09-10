// Generator-agnostic game runtime per docs/12-GAME-RUNTIME.md.
// Master spec references: §16/§26 (consumes only GeneratedGameSpec), §27
// Game Runtime, §28 Game Generation Must Be Replaceable.

import type { GeneratedGameSpec } from "@/program/generator/types";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/program/runtime/types";
import type { InputState, RuntimeEntity, RuntimeState } from "@/program/runtime/types";
import { runSystems } from "@/program/runtime/systems";

const DEFAULT_SIZE = 48;

function initialPosition(index: number, total: number, width: number, height: number) {
  // §27 scope: no paper-published initial layout beyond what structure
  // recipes set via `transform.x` — entities without one are spread out on
  // an even grid so nothing spawns stacked at the origin. Runtime safety.
  const columns = Math.max(1, Math.ceil(Math.sqrt(total)));
  const col = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: (CANVAS_WIDTH / (columns + 1)) * (col + 1) - width / 2,
    y: (CANVAS_HEIGHT / (Math.ceil(total / columns) + 1)) * (row + 1) - height / 2,
  };
}

export function createRuntimeState(spec: GeneratedGameSpec, seed?: number): RuntimeState {
  // seed is accepted for forward-compatibility with future randomized spawn
  // placement, but is unused today — initial layout is a deterministic grid.
  void seed;

  // §20 Structure Recipes / instances: a spec entity with `count` > 1 (set
  // by multiplyEntity) spawns that many RuntimeEntity copies here, all
  // sharing the same `sourceEntity` object reference — so every copy reads
  // the exact same components/params and can only ever behave identically.
  // Only position/velocity/size/removal/frozen/flash state is per-instance.
  const totalInstances = spec.entities.reduce((sum, e) => sum + (e.count ?? 1), 0);
  const entities: RuntimeEntity[] = [];
  let index = 0;

  for (const entity of spec.entities) {
    const width = entity.transform?.width
      ? entity.transform.width * DEFAULT_SIZE
      : DEFAULT_SIZE;
    const height = entity.transform?.height
      ? entity.transform.height * DEFAULT_SIZE
      : DEFAULT_SIZE;
    const count = entity.count ?? 1;

    for (let copy = 0; copy < count; copy++) {
      const fallback = initialPosition(index, totalInstances, width, height);
      // §20 Structure Recipes: multiplyEntity fixes a shared `transform.x`
      // (e.g. Frogger's "middle" lane) for every copy of a multiplied
      // entity, which would otherwise stack all of them at the same point —
      // the axis the spec pins is shared, but the free axis still spreads
      // each copy out evenly across the canvas so they render as visibly
      // separate on-screen instances.
      const spreadY = count > 1 ? (CANVAS_HEIGHT / (count + 1)) * (copy + 1) - height / 2 : undefined;
      entities.push({
        id: count > 1 ? `${entity.id}#${copy}` : entity.id,
        noun: entity.noun,
        isPlayer: entity.isPlayer,
        sourceEntity: entity,
        position: {
          x: entity.transform?.x ?? fallback.x,
          y: entity.transform?.y ?? spreadY ?? fallback.y,
        },
        velocity: { x: 0, y: 0 },
        width,
        height,
        removed: false,
        respawnAt: null,
        frozenUntil: 0,
        flashTint: null,
        flashUntil: 0,
      });
      index++;
    }
  }

  const meterComponent = spec.world
    .flatMap((w) => w.components)
    .find((c) => c.component === "MeterComponent");
  const timerSeconds =
    typeof meterComponent?.params?.seconds === "number"
      ? meterComponent.params.seconds
      : null;

  const winScores = spec.entities
    .flatMap((e) => e.components)
    .filter((c) => c.component === "ScoreRemovalOfComponent")
    .map((c) => c.params?.winScore)
    .filter((v): v is number => typeof v === "number");
  const maxScore = winScores.length > 0 ? Math.max(...winScores) : null;

  return {
    entities,
    score: 0,
    maxScore,
    timeRemainingSeconds: timerSeconds,
    maxTimeSeconds: timerSeconds,
    outcome: "playing",
    elapsedSeconds: 0,
  };
}

export type StepResult = {
  state: RuntimeState;
  events: string[];
};

export function stepRuntime(
  spec: GeneratedGameSpec,
  state: RuntimeState,
  input: InputState,
  deltaSeconds: number
): StepResult {
  if (state.outcome !== "playing") {
    return { state, events: [] };
  }

  return runSystems(spec, state, input, deltaSeconds);
}
