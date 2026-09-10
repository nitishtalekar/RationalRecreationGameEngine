"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Panel,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type NodeTypes,
  type EdgeTypes,
  type EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Badge,
  Box,
  Button,
  Callout,
  Flex,
  Switch,
  Text,
} from "@radix-ui/themes";
import { ExclamationTriangleIcon, PlusIcon } from "@radix-ui/react-icons";

import type { ConceptMap } from "@/program/generator/types";
import ConceptNodeCard, {
  type ConceptFlowNode,
} from "@/components/graph/ConceptNodeCard";
import ConceptEdgeLabel, {
  type ConceptFlowEdge,
} from "@/components/graph/ConceptEdgeLabel";
import {
  IMPLEMENTED_VERBS,
  validateConceptMap,
} from "@/components/graph/validateConceptMap";

const nodeTypes: NodeTypes = { conceptNode: ConceptNodeCard };

let nodeIdCounter = 0;
function nextNodeId() {
  nodeIdCounter += 1;
  return `noun-${Date.now()}-${nodeIdCounter}`;
}

let edgeIdCounter = 0;
function nextEdgeId() {
  edgeIdCounter += 1;
  return `edge-${Date.now()}-${edgeIdCounter}`;
}

const GRID_SPACING_X = 260;
const GRID_SPACING_Y = 160;

function layoutNodes(
  nodes: { id: string; label: string }[]
): ConceptFlowNode[] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));
  return nodes.map((n, i) => ({
    id: n.id,
    type: "conceptNode",
    position: {
      x: (i % cols) * GRID_SPACING_X,
      y: Math.floor(i / cols) * GRID_SPACING_Y,
    },
    data: { label: n.label, onRename: () => {}, onDelete: () => {} },
  }));
}

// Deterministic small offset per edge id, used to stagger label position
// along the curve so two unrelated edges that happen to cross on screen
// don't also stack their labels on top of each other.
function hashUnitOffset(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return ((hash >>> 0) % 1000) / 1000; // [0, 1)
}

// Edges sharing an unordered node pair (either direction) get spread across a
// fan of curvatures so parallel/opposite relationships between the same two
// nouns don't overlap into a single visual line. Every edge also gets a
// slightly different position along its own curve (labelT, near but not
// exactly the midpoint) so labels on edges that cross on screen don't render
// at the same point.
function withFannedCurvature<T extends { id: string; source: string; target: string }>(
  edges: T[]
): (T & { curvature: number; labelT: number })[] {
  const pairGroups = new Map<string, T[]>();
  for (const edge of edges) {
    const key = [edge.source, edge.target].sort().join("::");
    const group = pairGroups.get(key) ?? [];
    group.push(edge);
    pairGroups.set(key, group);
  }

  const curvatureByEdge = new Map<T, number>();
  for (const group of pairGroups.values()) {
    const step = 0.5;
    group.forEach((edge, i) => {
      const offset = i - (group.length - 1) / 2;
      curvatureByEdge.set(edge, offset * step);
    });
  }

  return edges.map((edge) => ({
    ...edge,
    curvature: curvatureByEdge.get(edge) ?? 0,
    // Spread labels across the middle 40% of each curve (0.3-0.7) instead of
    // pinning every label to the exact midpoint (0.5).
    labelT: 0.3 + hashUnitOffset(edge.id) * 0.4,
  }));
}

function conceptMapToFlow(map: ConceptMap): {
  nodes: ConceptFlowNode[];
  edges: ConceptFlowEdge[];
} {
  return {
    nodes: layoutNodes(map.nodes),
    edges: withFannedCurvature(map.edges).map((e) => ({
      id: e.id,
      type: "conceptEdge",
      source: e.source,
      target: e.target,
      data: { verb: e.verb, curvature: e.curvature, labelT: e.labelT },
    })),
  };
}

export type ConceptMapLoadRequest = {
  // Bumped by the caller (page.tsx) every time `conceptMap` should be
  // loaded into the editor, replacing whatever is currently there (initial
  // template load, template switch, or Reset). A plain object identity
  // check isn't used because the caller may legitimately want to reload the
  // same template twice in a row (e.g. Reset after editing).
  requestId: number;
  conceptMap: ConceptMap;
};

function ConceptGraphInner({
  onChangeMap,
  loadRequest,
}: {
  onChangeMap: (map: ConceptMap) => void;
  loadRequest: ConceptMapLoadRequest;
}) {
  const initial = useMemo(
    () => conceptMapToFlow({ nodes: [], edges: [] }),
    []
  );
  const [nodes, setNodes] = useState<ConceptFlowNode[]>(initial.nodes);
  const [edges, setEdges] = useState<ConceptFlowEdge[]>(initial.edges);
  const [showUnsupported, setShowUnsupported] = useState(false);
  const { fitView } = useReactFlow();
  const lastLoadedRequestId = useRef<number | null>(null);

  const renameNode = useCallback((id: string, label: string) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label } } : n))
    );
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => {
      const next = eds.filter((e) => e.source !== id && e.target !== id);
      return withFannedCurvature(next).map((e) => ({
        ...e,
        data: { ...e.data!, curvature: e.curvature, labelT: e.labelT },
      }));
    });
  }, []);

  const changeEdgeVerb = useCallback((id: string, verb: string) => {
    setEdges((eds) =>
      eds.map((e) => (e.id === id ? { ...e, data: { ...e.data!, verb } } : e))
    );
  }, []);

  const deleteEdge = useCallback((id: string) => {
    setEdges((eds) => {
      const next = eds.filter((e) => e.id !== id);
      return withFannedCurvature(next).map((e) => ({
        ...e,
        data: { ...e.data!, curvature: e.curvature, labelT: e.labelT },
      }));
    });
  }, []);

  const edgeTypes: EdgeTypes = useMemo(
    () => ({
      conceptEdge: (props: EdgeProps<ConceptFlowEdge>) => (
        <ConceptEdgeLabel
          {...props}
          onVerbChange={changeEdgeVerb}
          onDelete={deleteEdge}
          showUnsupported={showUnsupported}
          implementedVerbs={IMPLEMENTED_VERBS}
        />
      ),
    }),
    [changeEdgeVerb, deleteEdge, showUnsupported]
  ) as EdgeTypes;

  const onNodesChange = useCallback((changes: NodeChange<ConceptFlowNode>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<ConceptFlowEdge>[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => {
      const next = addEdge<ConceptFlowEdge>(
        {
          ...connection,
          id: nextEdgeId(),
          type: "conceptEdge",
          data: { verb: "arrests" },
        },
        eds
      );
      return withFannedCurvature(next).map((e) => ({
        ...e,
        data: { ...e.data!, curvature: e.curvature, labelT: e.labelT },
      }));
    });
  }, []);

  const addNoun = useCallback(() => {
    const id = nextNodeId();
    setNodes((nds) => {
      const count = nds.length;
      const minX = nds.length
        ? Math.min(...nds.map((n) => n.position.x))
        : 0;
      const maxY = nds.length
        ? Math.max(...nds.map((n) => n.position.y))
        : 0;
      return [
        ...nds,
        {
          id,
          type: "conceptNode",
          position: { x: minX, y: maxY + (nds.length ? GRID_SPACING_Y : 0) },
          data: {
            label: `Noun ${count + 1}`,
            onRename: renameNode,
            onDelete: deleteNode,
          },
        },
      ];
    });
    requestAnimationFrame(() => fitView({ padding: 0.3, duration: 200 }));
  }, [renameNode, deleteNode, fitView]);

  const loadMap = useCallback(
    (map: ConceptMap) => {
      const flow = conceptMapToFlow(map);
      setNodes(
        flow.nodes.map((n) => ({
          ...n,
          data: { ...n.data, onRename: renameNode, onDelete: deleteNode },
        }))
      );
      setEdges(flow.edges);
      requestAnimationFrame(() => fitView({ padding: 0.3, duration: 200 }));
    },
    [renameNode, deleteNode, fitView]
  );

  // Load whenever the caller bumps `loadRequest.requestId` — covers the
  // initial template load, switching templates, and Reset (§13/§31/§32).
  // Kept as an effect (rather than loading synchronously during render or
  // inside onNodesChange/onEdgesChange) per the React-Flow "cannot update a
  // component while rendering a different component" pitfall noted from
  // Step 04.
  useEffect(() => {
    if (lastLoadedRequestId.current === loadRequest.requestId) return;
    lastLoadedRequestId.current = loadRequest.requestId;
    loadMap(loadRequest.conceptMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadRequest]);

  const currentMap = useMemo<ConceptMap>(
    () => ({
      nodes: nodes.map((n) => ({ id: n.id, label: n.data.label })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        verb: e.data!.verb,
      })),
    }),
    [nodes, edges]
  );

  useEffect(() => {
    onChangeMap(currentMap);
  }, [currentMap, onChangeMap]);

  const errors = useMemo(() => validateConceptMap(currentMap), [currentMap]);

  return (
    <Flex direction="column" gap="2" height="100%" width="100%">
      <Flex align="center" gap="3" wrap="wrap">
        <Button size="1" variant="soft" onClick={addNoun}>
          <PlusIcon /> Add noun
        </Button>
        <Flex align="center" gap="2" ml="auto">
          <Text size="1" color="gray">
            Show unsupported paper verbs
          </Text>
          <Switch
            size="1"
            checked={showUnsupported}
            onCheckedChange={setShowUnsupported}
          />
        </Flex>
      </Flex>

      {errors.length > 0 && (
        <Flex direction="column" gap="1">
          {errors.map((err, i) => (
            <Callout.Root key={i} color="amber" size="1">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{err}</Callout.Text>
            </Callout.Root>
          ))}
        </Flex>
      )}

      <Box
        style={{
          flexGrow: 1,
          minHeight: 360,
          border: "1px solid var(--gray-6)",
          borderRadius: "var(--radius-3)",
          overflow: "hidden",
        }}
      >
        <ReactFlow<ConceptFlowNode, ConceptFlowEdge>
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          colorMode="dark"
        >
          <Background gap={16} size={1} />
          <Controls showInteractive={false} position="bottom-right" />
          <Panel position="top-left">
            <Badge color="gray" variant="soft" size="1">
              {nodes.length} nouns · {edges.length} relationships
            </Badge>
          </Panel>
        </ReactFlow>
      </Box>
    </Flex>
  );
}

const EMPTY_MAP: ConceptMap = { nodes: [], edges: [] };

export default function ConceptGraph({
  onChangeMap,
  loadRequest,
}: {
  onChangeMap?: (map: ConceptMap) => void;
  loadRequest?: ConceptMapLoadRequest;
}) {
  return (
    <ReactFlowProvider>
      <ConceptGraphInner
        onChangeMap={onChangeMap ?? (() => {})}
        loadRequest={loadRequest ?? { requestId: 0, conceptMap: EMPTY_MAP }}
      />
    </ReactFlowProvider>
  );
}
