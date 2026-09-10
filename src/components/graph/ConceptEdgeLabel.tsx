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

export type ConceptFlowEdgeData = {
  verb: string;
  curvature?: number;
  labelT?: number;
};

export type ConceptFlowEdge = Edge<ConceptFlowEdgeData, "conceptEdge">;

export type ConceptEdgeLabelExtraProps = {
  onVerbChange: (id: string, verb: string) => void;
  onDelete: (id: string) => void;
  showUnsupported: boolean;
  implementedVerbs: ReadonlySet<string>;
};

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
  onVerbChange,
  onDelete,
  showUnsupported,
  implementedVerbs,
}: EdgeProps<ConceptFlowEdge> & ConceptEdgeLabelExtraProps) {
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
            onChange={(verb) => onVerbChange(id, verb)}
            showUnsupported={showUnsupported}
            implementedVerbs={implementedVerbs}
          />
          <IconButton
            size="1"
            variant="ghost"
            color="gray"
            radius="full"
            aria-label="Delete relationship"
            onClick={() => onDelete(id)}
            style={{ width: 18, height: 18 }}
          >
            <Cross2Icon width={10} height={10} />
          </IconButton>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
