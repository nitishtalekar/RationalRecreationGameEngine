// Curve + point-at-t math for concept-map edges. A single quadratic control
// point is offset perpendicular to the straight line between source and
// target, scaled by `curvature`, so:
//   - curvature 0 draws a straight line;
//   - a positive/negative curvature bows the edge to one side or the other
//     of that line, regardless of node layout (horizontal, vertical, or
//     diagonal) — unlike @xyflow/system's own getBezierPath, whose control
//     points are offset only along each endpoint's fixed handle axis (here,
//     always Left/Right — see ConceptNodeCard.tsx), which produces zero
//     perpendicular offset whenever two nodes are handle-axis-aligned (e.g.
//     the common case of two nodes in the same row).
// This matters for A->B / B->A pairs: withFannedCurvature (ConceptGraph.tsx)
// assigns them opposite-signed curvature so they bow to opposite sides and
// never overlap or cross, each keeping a clear arrowhead at its own target.

import { Position } from "@xyflow/react";

export type BezierPoints = {
  sourceX: number;
  sourceY: number;
  sourcePosition: Position;
  targetX: number;
  targetY: number;
  targetPosition: Position;
  curvature: number;
};

function quadraticAt(p0: number, p1: number, p2: number, t: number): number {
  const mt = 1 - t;
  return mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
}

export function bezierPathAndPointAt(
  params: BezierPoints,
  t: number
): { path: string; x: number; y: number } {
  const { sourceX, sourceY, targetX, targetY, curvature } = params;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.hypot(dx, dy) || 1;

  // Unit vector perpendicular to the source->target line.
  const perpX = -dy / distance;
  const perpY = dx / distance;

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  const offset = curvature * distance;

  const controlX = midX + perpX * offset;
  const controlY = midY + perpY * offset;

  const path = `M${sourceX},${sourceY} Q${controlX},${controlY} ${targetX},${targetY}`;

  const x = quadraticAt(sourceX, controlX, targetX, t);
  const y = quadraticAt(sourceY, controlY, targetY, t);

  return { path, x, y };
}
