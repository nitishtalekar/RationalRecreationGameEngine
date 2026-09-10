// Runtime-only types per docs/12-GAME-RUNTIME.md.
// Master spec references: §16/§26 (data boundary: runtime consumes only
// GeneratedGameSpec), §27 Game Runtime.
//
// This module must only ever import from generator/types' GeneratedGameSpec
// shape — never from program/generator/* implementation modules — so the
// generator can be replaced without touching the runtime (§28).

import type { GameEntity } from "@/program/generator/types";

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 500;

export type Vector2 = { x: number; y: number };

// Per-instance mutable runtime state layered on top of a GameEntity's
// static spec data (position/velocity/size/removal/score bookkeeping).
// GeneratedGameSpec's `transform` is the initial placement; everything an
// entity needs to change frame-to-frame lives here instead of mutating the
// spec object itself, keeping the spec read-only/replayable.
export type ActionTint = "freeze" | "grow" | "shrink" | "reflect";

export type RuntimeEntity = {
  id: string;
  noun: string;
  isPlayer: boolean;
  sourceEntity: GameEntity;
  position: Vector2;
  velocity: Vector2;
  width: number;
  height: number;
  removed: boolean;
  respawnAt: number | null;
  // Set by StopOnCollideComponent (the "obstructs-freeze" rhetoric): while
  // elapsedSeconds < frozenUntil, this entity ignores movement/input systems
  // entirely, including player control — a real, agency-removing freeze
  // rather than a same-frame velocity zeroing.
  frozenUntil: number;
  // Brief color tint shown on top of the base entity color whenever an
  // action (freeze/grow/shrink/reflect) fires on this entity, so the effect
  // reads visually rather than only changing size/velocity silently.
  flashTint: ActionTint | null;
  flashUntil: number;
};

export type RuntimeState = {
  entities: RuntimeEntity[];
  score: number;
  // Highest `winScore` among the spec's ScoreRemovalOfComponents, or null if
  // none exists — lets the HUD render a score progress bar without
  // re-scanning the spec on every frame.
  maxScore: number | null;
  timeRemainingSeconds: number | null;
  // The MeterComponent's starting `seconds`, fixed at game start — used as
  // the denominator for a time-remaining progress bar (counts down to 0).
  maxTimeSeconds: number | null;
  outcome: "playing" | "won" | "lost";
  elapsedSeconds: number;
};

export type InputState = {
  // §27 MouseController substitute, keyboard-only: WASD/arrow keys are the
  // sole player input (§23) — no pointer-follow, per user request.
  keys: Set<string>;
};
