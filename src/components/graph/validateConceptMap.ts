import type { ConceptMap } from "@/program/generator/types";
import { VERBS, MICRO_RHETORICS } from "@/program/generator/library";

const KNOWN_VERBS = new Set(VERBS.map((v) => v.verb));
export const IMPLEMENTED_VERBS = new Set(
  MICRO_RHETORICS.filter((m) => m.status === "implemented").map((m) => m.verb)
);

export function validateConceptMap(map: ConceptMap): string[] {
  const errors: string[] = [];

  if (map.edges.length === 0) {
    errors.push("Add at least one relationship between nouns.");
  }

  const emptyLabelNode = map.nodes.find((n) => n.label.trim().length === 0);
  if (emptyLabelNode) {
    errors.push("All noun labels must be non-empty.");
  }

  const nodeIds = new Set(map.nodes.map((n) => n.id));
  for (const edge of map.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      errors.push(`Relationship "${edge.id}" has a missing endpoint.`);
      continue;
    }

    if (!KNOWN_VERBS.has(edge.verb)) {
      errors.push(`"${edge.verb}" is not a verb listed in verbs.json.`);
      continue;
    }

    if (!IMPLEMENTED_VERBS.has(edge.verb)) {
      errors.push(
        `Cannot generate: "${edge.verb}" is listed in the Game-O-Matic paper, ` +
          "but no implementable micro-rhetoric for it is specified in the " +
          "current paper-faithful library."
      );
    }
  }

  return errors;
}
