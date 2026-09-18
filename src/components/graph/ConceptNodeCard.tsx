"use client";

import { useState, type KeyboardEvent } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Box, IconButton, TextField } from "@radix-ui/themes";
import { Cross2Icon } from "@radix-ui/react-icons";
import { colorForEntityKey } from "@/program/entityColor";

export type ConceptFlowNodeData = {
  label: string;
  onRename: (id: string, label: string) => void;
  onDelete: (id: string) => void;
};

export type ConceptFlowNode = Node<ConceptFlowNodeData, "conceptNode">;

export default function ConceptNodeCard({
  id,
  data,
  selected,
}: NodeProps<ConceptFlowNode>) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data.label);
  const color = colorForEntityKey(id);

  function commit() {
    const trimmed = draft.trim();
    setEditing(false);
    if (trimmed.length > 0) {
      data.onRename(id, trimmed);
    } else {
      setDraft(data.label);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setDraft(data.label);
      setEditing(false);
    }
  }

  return (
    <Box
      style={{
        position: "relative",
        minWidth: 96,
        maxWidth: 150,
        padding: "6px 10px",
        paddingRight: 22,
        borderRadius: "var(--radius-3)",
        background: "var(--gray-2)",
        borderLeft: `4px solid ${color}`,
        borderTop: selected ? "1.5px solid var(--accent-9)" : "1px solid var(--gray-6)",
        borderRight: selected ? "1.5px solid var(--accent-9)" : "1px solid var(--gray-6)",
        borderBottom: selected ? "1.5px solid var(--accent-9)" : "1px solid var(--gray-6)",
        boxShadow: selected ? "0 0 0 1px var(--accent-a5)" : "none",
        fontSize: 12,
        lineHeight: 1.3,
        cursor: "default",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          width: 12,
          height: 12,
          left: -7,
          background: color,
          border: "2px solid var(--gray-1)",
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 12,
          height: 12,
          right: -7,
          background: color,
          border: "2px solid var(--gray-1)",
        }}
      />

      <IconButton
        size="1"
        variant="ghost"
        color="gray"
        radius="full"
        aria-label={`Delete ${data.label}`}
        onClick={(event) => {
          event.stopPropagation();
          data.onDelete(id);
        }}
        style={{
          position: "absolute",
          top: 2,
          right: 2,
          width: 16,
          height: 16,
        }}
      >
        <Cross2Icon width={10} height={10} />
      </IconButton>

      {editing ? (
        <TextField.Root
          size="1"
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          onClick={(event) => event.stopPropagation()}
          style={{ fontSize: 12 }}
        />
      ) : (
        <Box
          onDoubleClick={(event) => {
            event.stopPropagation();
            setDraft(data.label);
            setEditing(true);
          }}
          style={{
            fontWeight: 600,
            wordBreak: "break-word",
            userSelect: "none",
          }}
        >
          {data.label}
        </Box>
      )}
    </Box>
  );
}
