// Shared generator types per docs/03-CORE-TYPES-AND-RNG.md.
// Master spec references: §9, §15, §16, §17, §26, §29.

export type ConceptNode = {
  id: string;
  label: string;
};

export type ConceptEdge = {
  id: string;
  source: string;
  target: string;
  verb: string;
};

export type ConceptMap = {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
};

export type ComponentAssignment = {
  owner: string;
  component: string;
  target?: string;
  params?: Record<string, unknown>;
};

export type GameEntity = {
  id: string;
  noun: string;
  components: ComponentAssignment[];
  isPlayer: boolean;
  transform?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
  };
  movementRestriction?: {
    axis: string;
    region: string;
  };
  // §20 Structure Recipes: `multiplyEntity` sets this instead of cloning
  // separate GameEntity rows, so every on-screen copy shares one spec entity
  // (one components array, one transform, one set of resolved parameters) —
  // they can only ever behave identically since there is nothing per-copy to
  // diverge. The runtime spawns `count` RuntimeEntity instances from this
  // single spec entity (GameRuntime.ts's createRuntimeState). Undefined/1
  // means a single instance.
  count?: number;
};

export type Blackboard = Record<string, unknown>;

export type WorkingGame = {
  conceptMap: ConceptMap;
  entities: GameEntity[];
  world: GameEntity;
  blackboard: Blackboard;
};

export type Predicate = {
  description: string;
  check: string;
  subject: string;
  tag: string;
  target: string;
  trueScore: number;
  falseScore: number;
  strict?: boolean;
};

export type Modification = {
  type: string;
  owner?: string;
  component?: string;
  target?: string;
  tag?: string;
  key?: string;
  value?: unknown;
  params?: Record<string, unknown>;
  position?: string;
  scale?: number;
  axis?: string;
  region?: string;
};

export type Recipe = {
  id: string;
  category: "win" | "lose" | "structure";
  status: "implemented" | "reference-only";
  source: string;
  enabled: boolean;
  predicates: Predicate[];
  modifications: Modification[];
  instruction?: string | null;
};

export type GeneratedGameSpec = {
  seed: number;
  entities: GameEntity[];
  world: GameEntity[];
  playerEntityId: string;
  winCondition: Record<string, unknown>;
  loseCondition: Record<string, unknown>;
  structure: Record<string, unknown>;
  instructions: {
    player: string;
    win: string;
    lose: string;
  };
};

export type GenerationStage = {
  id: string;
  name: string;
  input?: unknown;
  calculations?: unknown;
  selected?: unknown;
  mutations?: unknown;
  output?: unknown;
};

export type GenerationTrace = {
  seed: number;
  stages: GenerationStage[];
};
