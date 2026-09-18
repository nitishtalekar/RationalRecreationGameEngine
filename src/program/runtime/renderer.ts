// Canvas 2D rendering per docs/12-GAME-RUNTIME.md.
// Simple labeled circle + noun text per entity — no art, per §27's explicit
// scope limit. All entities render as circles (a deliberate runtime styling
// choice, not a paper claim).

import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/program/runtime/types";
import type { ActionTint, RuntimeState } from "@/program/runtime/types";
import { colorForEntityKey } from "@/program/entityColor";

const BACKGROUND = "#111318";
const PLAYER_COLOR = "#5ec8f8";
const TEXT_COLOR = "#f4f4f4";
const FROZEN_OUTLINE = "#bfe9ff";

// Action tint colors: the fill color swaps to one of these while an entity's
// flashUntil is in the future, so freeze/grow/shrink/reflect read visually
// instead of only changing size/velocity silently.
const TINT_COLORS: Record<ActionTint, string> = {
  freeze: "#5ec8f8",
  grow: "#7be08a",
  shrink: "#f2617a",
  reflect: "#d8a6ff",
};

export function renderFrame(ctx: CanvasRenderingContext2D, state: RuntimeState): void {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  for (const entity of state.entities) {
    if (entity.removed) continue;

    const flashing = entity.flashTint && state.elapsedSeconds < entity.flashUntil;
    const frozen = state.elapsedSeconds < entity.frozenUntil;

    ctx.fillStyle = flashing
      ? TINT_COLORS[entity.flashTint as ActionTint]
      : entity.isPlayer
        ? PLAYER_COLOR
        : colorForEntityKey(entity.sourceEntity.id);

    const radius = Math.min(entity.width, entity.height) / 2;
    const centerX = entity.position.x + entity.width / 2;
    const centerY = entity.position.y + entity.height / 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    if (frozen) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = FROZEN_OUTLINE;
      ctx.stroke();
    }

    ctx.fillStyle = TEXT_COLOR;
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(entity.noun, centerX, centerY + 4);
  }
}
