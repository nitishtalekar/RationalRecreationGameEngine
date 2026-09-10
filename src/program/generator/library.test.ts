import { describe, expect, it } from "vitest";

import {
  COMPONENTS,
  MICRO_RHETORICS,
  NON_TERMINALS,
  VERBS,
} from "@/program/generator/library";

describe("library schema validation", () => {
  it("parses every library JSON file without throwing (import-time Zod parse)", () => {
    expect(VERBS.length).toBeGreaterThan(0);
    expect(MICRO_RHETORICS.length).toBeGreaterThan(0);
    expect(COMPONENTS.length).toBeGreaterThan(0);
  });

  it("every enabled verb has at least one implemented micro-rhetoric", () => {
    const enabledVerbs = VERBS.filter((v) => v.enabled);
    for (const verb of enabledVerbs) {
      const hasImplemented = MICRO_RHETORICS.some(
        (mr) => mr.verb === verb.verb && mr.status === "implemented"
      );
      expect(
        hasImplemented,
        `verb "${verb.verb}" is enabled but has no implemented micro-rhetoric`
      ).toBe(true);
    }
  });

  it("every component referenced by a micro-rhetoric assignment is known or a documented non-terminal", () => {
    const knownComponents = new Set(COMPONENTS.map((c) => c.type));
    for (const mr of MICRO_RHETORICS) {
      for (const assignment of mr.assignments) {
        const isKnown =
          knownComponents.has(assignment.component) ||
          (NON_TERMINALS as readonly string[]).includes(assignment.component);
        expect(
          isKnown,
          `micro-rhetoric "${mr.id}" references unknown component "${assignment.component}"`
        ).toBe(true);
      }
    }
  });
});
