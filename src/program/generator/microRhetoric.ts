// Micro-rhetoric selection & application per docs/06-MICRO-RHETORICS.md.
// Master spec references: §10 Paper-Described Micro-Rhetorics Only, §12
// Non-Terminals, §15 Seeded Randomness, §30 Trace Views ("Micro-Rhetorics"),
// §34 microRhetoric.ts.

import type { Trace } from "@/program/generator/trace";
import type { SeededRng } from "@/program/generator/rng";
import type {
  ComponentAssignment,
  ConceptEdge,
  GameEntity,
  WorkingGame,
} from "@/program/generator/types";
import type { MicroRhetoric } from "@/program/generator/library";

export type MicroRhetoricSelection = {
  relationship: ConceptEdge;
  candidates: string[];
  seededChoice: string;
  selected: MicroRhetoric;
};

export function selectMicroRhetoric(
  relationship: ConceptEdge,
  library: MicroRhetoric[],
  rng: SeededRng,
  trace: Trace
): MicroRhetoric {
  const candidates = library.filter(
    (entry) => entry.status === "implemented" && entry.verb === relationship.verb
  );

  if (candidates.length === 0) {
    throw new Error(
      `No implemented micro-rhetoric found for verb "${relationship.verb}"`
    );
  }

  let selectedIndex = 0;
  let seededChoice = "index 0 (only candidate, no RNG call)";

  if (candidates.length > 1) {
    selectedIndex = rng.pickIndex(candidates.length);
    seededChoice = `index ${selectedIndex}`;
  }

  const selected = candidates[selectedIndex];

  trace.capture(`micro-rhetoric-${relationship.id}`, {
    name: `${relationship.source} --${relationship.verb}--> ${relationship.target}`,
    input: {
      relationship: `${relationship.source} --${relationship.verb}--> ${relationship.target}`,
    },
    calculations: candidates.map((c) => c.id),
    selected: {
      seededChoice,
      selected: selected.id,
    },
  });

  return selected;
}

function resolveParamValue(
  value: unknown,
  relationship: ConceptEdge,
  game: WorkingGame
): unknown {
  if (value === "$subject") {
    return findEntity(game, relationship.source)?.noun ?? relationship.source;
  }
  if (value === "$predicate") {
    return findEntity(game, relationship.target)?.noun ?? relationship.target;
  }
  return value;
}

function findEntity(game: WorkingGame, nodeId: string): GameEntity | undefined {
  return game.entities.find((e) => e.id === nodeId);
}

export function applyMicroRhetoric(
  game: WorkingGame,
  relationship: ConceptEdge,
  rhetoric: MicroRhetoric,
  trace: Trace
): void {
  const mutations: string[] = [];

  for (const assignment of rhetoric.assignments) {
    const ownerId =
      assignment.owner === "subject" ? relationship.source : relationship.target;
    const owner = findEntity(game, ownerId);
    if (!owner) {
      throw new Error(`Unknown entity referenced by micro-rhetoric owner: ${ownerId}`);
    }

    const resolvedTarget =
      assignment.target === "subject"
        ? relationship.source
        : assignment.target === "predicate"
          ? relationship.target
          : undefined;
    const targetNoun = resolvedTarget ? findEntity(game, resolvedTarget)?.noun : undefined;

    const resolvedParams = assignment.params
      ? Object.fromEntries(
          Object.entries(assignment.params).map(([key, value]) => [
            key,
            resolveParamValue(value, relationship, game),
          ])
        )
      : undefined;

    const componentAssignment: ComponentAssignment = {
      owner: assignment.owner,
      component: assignment.component,
      ...(resolvedTarget ? { target: resolvedTarget } : {}),
      ...(resolvedParams ? { params: resolvedParams } : {}),
    };

    owner.components.push(componentAssignment);

    const componentLabel = assignment.component.replace(/Component$/, "");
    const detail = targetNoun
      ? `${componentLabel}(target=${targetNoun})`
      : resolvedParams
        ? `${componentLabel}(${Object.entries(resolvedParams)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ")})`
        : componentLabel;

    mutations.push(`${owner.noun} += ${detail}`);
  }

  trace.capture(`micro-rhetoric-apply-${relationship.id}`, {
    name: `${relationship.source} --${relationship.verb}--> ${relationship.target} mutations`,
    mutations,
  });
}
