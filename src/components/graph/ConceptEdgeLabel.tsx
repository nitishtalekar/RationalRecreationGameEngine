"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";
import { IconButton } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import VerbSelect from "./VerbSelect";
import { bezierPathAndPointAt } from "./bezierLabel";

// Persisted shape: what actually represents a relationship in the concept
// map (verb + layout hints). This is what ConceptGraph's `edges` state and
// `currentMap` derivation deal in.
export type ConceptFlowEdgeData = {
  verb: string;
  curvature?: number;
  labelT?: number;
};

// Render-time shape: the persisted data plus the UI callbacks/flags the
// label needs. These live on `data` (rather than being injected as extra
// props via an inline wrapper in edgeTypes) so `edgeTypes` itself can be a
// stable, module-level object — React Flow warns (error #002) if
// nodeTypes/edgeTypes changes identity across renders, which an inline
// `useMemo`-wrapped component recreated whenever these callbacks change
// would otherwise trigger. ConceptGraph derives this from the persisted
// edges only for what it hands to <ReactFlow>.
export type ConceptFlowEdgeRenderData = ConceptFlowEdgeData & {
  onVerbChange: (id: string, verb: string) => void;
  onDelete: (id: string) => void;
  showUnsupported: boolean;
  implementedVerbs: ReadonlySet<string>;
};

export type ConceptFlowEdge = Edge<ConceptFlowEdgeData, "conceptEdge">;
export type ConceptFlowRenderEdge = Edge<ConceptFlowEdgeRenderData, "conceptEdge">;

export default function ConceptEdgeLabel({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  selected,
}: EdgeProps<ConceptFlowRenderEdge>) {
  const { path: edgePath, x: labelX, y: labelY } = bezierPathAndPointAt(
    {
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      curvature: data?.curvature ?? 0.25,
    },
    data?.labelT ?? 0.5
  );

  if (!data) return null;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "var(--accent-9)" : "var(--gray-8)",
          strokeWidth: selected ? 2 : 1.5,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: "var(--color-panel-solid)",
            border: "1px solid var(--gray-6)",
            borderRadius: "var(--radius-2)",
            padding: 2,
          }}
          className="nodrag nopan"
        >
          <VerbSelect
            value={data.verb}
            onChange={(verb) => data.onVerbChange(id, verb)}
            showUnsupported={data.showUnsupported}
            implementedVerbs={data.implementedVerbs}
          />
          <IconButton
            size="1"
            variant="ghost"
            color="gray"
            radius="full"
            aria-label="Delete relationship"
            onClick={() => data.onDelete(id)}
            style={{ width: 18, height: 18 }}
          >
            <Cross2Icon width={10} height={10} />
          </IconButton>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
