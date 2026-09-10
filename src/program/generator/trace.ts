// Generation trace builder per docs/05-ENTITY-CREATION.md.
// Master spec references: §29 Generation Trace.

import type { GenerationStage, GenerationTrace } from "@/program/generator/types";

export type Trace = {
  capture: (stageId: string, data: Omit<GenerationStage, "id">) => void;
  finish: () => GenerationTrace;
};

export function createTrace(seed: number): Trace {
  const stages: GenerationStage[] = [];

  function capture(stageId: string, data: Omit<GenerationStage, "id">): void {
    stages.push({ id: stageId, ...data });
  }

  function finish(): GenerationTrace {
    return { seed, stages };
  }

  return { capture, finish };
}
