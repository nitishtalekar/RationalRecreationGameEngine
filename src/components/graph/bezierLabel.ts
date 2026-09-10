// Cubic bezier control-point + point-at-t math mirroring @xyflow/system's
// internal getBezierPath, so a label can be placed at an arbitrary point
// along the curve instead of the library's fixed midpoint (t=0.5). Needed so
// two edges that cross on screen don't also stack their labels on top of
// each other (see docs/06-MICRO-RHETORICS.md follow-up: intersecting edges).

import { Position } from "@xyflow/react";

type ControlPointParams = {
  pos: Position;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  c: number;
};

// Same formula @xyflow/system uses: offset the control point from its own
// endpoint, along that endpoint's handle direction, by curvature * distance.
function getControlWithCurvature({ pos, x1, y1, x2, y2, c }: ControlPointParams): [number, number] {
  switch (pos) {
    case Position.Left:
      return [x1 - c * Math.abs(x2 - x1), y1];
    case Position.Right:
      return [x1 + c * Math.abs(x2 - x1), y1];
    case Position.Top:
      return [x1, y1 - c * Math.abs(y2 - y1)];
    case Position.Bottom:
      return [x1, y1 + c * Math.abs(y2 - y1)];
  }
}

export type BezierPoints = {
  sourceX: number;
  sourceY: number;
  sourcePosition: Position;
  targetX: number;
  targetY: number;
  targetPosition: Position;
  curvature: number;
};

function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
}

export function bezierPathAndPointAt(
  params: BezierPoints,
  t: number
): { path: string; x: number; y: number } {
  const { sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, curvature } =
    params;

  const [cp1x, cp1y] = getControlWithCurvature({
    pos: sourcePosition,
    x1: sourceX,
    y1: sourceY,
    x2: targetX,
    y2: targetY,
    c: curvature,
  });
  const [cp2x, cp2y] = getControlWithCurvature({
    pos: targetPosition,
    x1: targetX,
    y1: targetY,
    x2: sourceX,
    y2: sourceY,
    c: curvature,
  });

  const path = `M${sourceX},${sourceY} C${cp1x},${cp1y} ${cp2x},${cp2y} ${targetX},${targetY}`;

  const x = cubicAt(sourceX, cp1x, cp2x, targetX, t);
  const y = cubicAt(sourceY, cp1y, cp2y, targetY, t);

  return { path, x, y };
}
