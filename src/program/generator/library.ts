// Zod-validated loaders for src/program/library/*.json.
// Every file is parsed at module init so a malformed file fails loudly at
// import time (docs/03-CORE-TYPES-AND-RNG.md).

import { z } from "zod";

import verbsJson from "@/program/library/verbs.json";
import microRhetoricsJson from "@/program/library/micro-rhetorics.json";
import componentsJson from "@/program/library/components.json";
import winRecipesJson from "@/program/library/win-recipes.json";
import loseRecipesJson from "@/program/library/lose-recipes.json";
import structureRecipesJson from "@/program/library/structure-recipes.json";
import patchesJson from "@/program/library/patches.json";
import parameterRangesJson from "@/program/library/parameter-ranges.json";
import templatesJson from "@/program/library/templates.json";

export const NON_TERMINALS = [
  "_movesInAnyWay",
  "_isVulnerable",
  "_isRemovedBy",
  "_isCollidable",
] as const;

const VerbSchema = z.object({
  verb: z.string(),
  enabled: z.boolean(),
});

const MicroRhetoricAssignmentSchema = z.object({
  owner: z.enum(["subject", "predicate"]),
  component: z.string(),
  target: z.enum(["subject", "predicate"]).optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});

const MicroRhetoricSchema = z.object({
  id: z.string(),
  verb: z.string(),
  source: z.string(),
  status: z.enum(["implemented", "reference-only"]),
  assignments: z.array(MicroRhetoricAssignmentSchema),
});

const ComponentSchema = z.object({
  type: z.string(),
  tags: z.array(z.string()),
  source: z.string(),
});

const PredicateSchema = z.object({
  description: z.string(),
  check: z.string(),
  subject: z.string(),
  tag: z.string(),
  target: z.string(),
  trueScore: z.number(),
  falseScore: z.number(),
  strict: z.boolean().optional(),
});

const ModificationSchema = z
  .object({
    type: z.string(),
    owner: z.string().optional(),
    component: z.string().optional(),
    target: z.string().optional(),
    tag: z.string().optional(),
    key: z.string().optional(),
    value: z.unknown().optional(),
    params: z.record(z.string(), z.unknown()).optional(),
    position: z.string().optional(),
    scale: z.number().optional(),
    axis: z.string().optional(),
    region: z.string().optional(),
  })
  .passthrough();

const RecipeSchema = z.object({
  id: z.string(),
  category: z.enum(["win", "lose", "structure"]),
  status: z.enum(["implemented", "reference-only"]),
  source: z.string(),
  enabled: z.boolean(),
  predicates: z.array(PredicateSchema),
  modifications: z.array(ModificationSchema),
  instruction: z.string().nullable().optional(),
});

const PatchSchema = z.object({
  id: z.string(),
  source: z.string(),
  status: z.enum(["implemented", "reference-only"]),
  description: z.string(),
  precondition: z.string(),
  modification: ModificationSchema,
});

const ParameterRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
  source: z.string(),
});

const ParameterRangesSchema = z.record(z.string(), ParameterRangeSchema);

const ConceptNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  countRange: z
    .object({
      min: z.number().int().min(1).max(5),
      max: z.number().int().min(1).max(5),
    })
    .refine((r) => r.min <= r.max, { message: "countRange.min must be <= max" })
    .optional(),
});

const ConceptEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  verb: z.string(),
});

const TemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: z.string(),
  status: z.enum(["implemented", "reference-only"]),
  conceptMap: z.object({
    nodes: z.array(ConceptNodeSchema),
    edges: z.array(ConceptEdgeSchema),
  }),
});

export const VERBS = z.array(VerbSchema).parse(verbsJson);
export const MICRO_RHETORICS = z
  .array(MicroRhetoricSchema)
  .parse(microRhetoricsJson);
export const COMPONENTS = z.array(ComponentSchema).parse(componentsJson);
export const WIN_RECIPES = z.array(RecipeSchema).parse(winRecipesJson);
export const LOSE_RECIPES = z.array(RecipeSchema).parse(loseRecipesJson);
export const STRUCTURE_RECIPES = z
  .array(RecipeSchema)
  .parse(structureRecipesJson);
export const PATCHES = z.array(PatchSchema).parse(patchesJson);
export const PARAMETER_RANGES = ParameterRangesSchema.parse(
  parameterRangesJson
);
export const TEMPLATES = z.array(TemplateSchema).parse(templatesJson);

export type Verb = z.infer<typeof VerbSchema>;
export type MicroRhetoric = z.infer<typeof MicroRhetoricSchema>;
export type LibraryComponent = z.infer<typeof ComponentSchema>;
export type LibraryRecipe = z.infer<typeof RecipeSchema>;
export type LibraryPatch = z.infer<typeof PatchSchema>;
export type ParameterRange = z.infer<typeof ParameterRangeSchema>;
export type Template = z.infer<typeof TemplateSchema>;
