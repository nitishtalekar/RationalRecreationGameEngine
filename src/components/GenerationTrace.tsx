"use client";

import { Fragment, useState } from "react";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Button, Card, Code, Flex, Grid, Tabs, Text } from "@radix-ui/themes";

import type {
  GeneratedGameSpec,
  GenerationStage,
  GenerationTrace as GenerationTraceData,
} from "@/program/generator/types";

type MicroRhetoricSelected = { seededChoice: string; selected: string };
type PartialGameEntity = { noun: string; components: string[] };
type RecipeScoreCalculation = {
  binding: string;
  predicates: { description: string; result: boolean; score: number }[];
  score: number;
  rejected: boolean;
};
type RecipeSelected = {
  highestScore: number;
  seededChoice: string;
  recipeId: string;
  binding: string;
} | null;
type PlayerSelected = { noun: string; reason: string };
type NonTerminalCalculation = {
  owner: string;
  nonTerminal: string;
  candidates: string[];
  seededChoice: string;
};
type NonTerminalSelected = { owner: string; resolved: string; reason: string };
type PatchCalculation = { owner: string; applicable: boolean; outcome: string };
type ParameterCalculation = {
  owner: string;
  component: string;
  key: string;
  range: string;
  selectionMechanism: string;
};
type ParameterSelected = {
  owner: string;
  component: string;
  key: string;
  value: number;
  source: string;
};

// §4/§30 numbered-stage outline: every trace card carries the stage number
// it corresponds to and can collapse, so a researcher can jump straight to
// the stage they care about instead of scrolling past ones they don't.
function StageCard({
  stageNumber,
  title,
  id,
  defaultOpen = true,
  children,
}: {
  stageNumber?: number;
  title?: React.ReactNode;
  id?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card variant="surface" size="1" id={id} style={{ scrollMarginTop: "12px" }}>
      <Flex direction="column" gap="2" height="100%">
        {title !== undefined && (
          <Flex
            asChild
            align="center"
            gap="2"
            style={{ cursor: "pointer" }}
            onClick={() => setOpen((o) => !o)}
          >
            <button
              type="button"
              aria-expanded={open}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                font: "inherit",
                color: "inherit",
                textAlign: "left",
                width: "100%",
              }}
            >
              {open ? (
                <ChevronDownIcon color="var(--gray-9)" />
              ) : (
                <ChevronRightIcon color="var(--gray-9)" />
              )}
              <StageLabel>
                {stageNumber !== undefined ? `${stageNumber}. ` : ""}
                {title}
              </StageLabel>
            </button>
          </Flex>
        )}
        {open && children}
      </Flex>
    </Card>
  );
}

function StageLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      size="1"
      color="gray"
      weight="medium"
      style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
    >
      {children}
    </Text>
  );
}

function EntitiesCard({ stage }: { stage: GenerationStage }) {
  const entityNames = (stage.output as string[] | undefined) ?? [];

  return (
    <StageCard stageNumber={1} title="Entities" id="stage-1">
      <Flex direction="column" gap="1">
        {entityNames.map((name, i) => (
          <Flex key={`${name}-${i}`} align="center" gap="2">
            <CheckIcon color="var(--green-9)" />
            <Text size="2" className="mono">
              {name}
            </Text>
          </Flex>
        ))}
      </Flex>
    </StageCard>
  );
}

function MicroRhetoricCard({
  selectionStage,
  mutationStage,
  stageNumber,
  id,
}: {
  selectionStage: GenerationStage;
  mutationStage?: GenerationStage;
  stageNumber: number;
  id?: string;
}) {
  const relationship = (
    selectionStage.input as { relationship?: string } | undefined
  )?.relationship;
  const candidates = (selectionStage.calculations as string[] | undefined) ?? [];
  const selected = selectionStage.selected as MicroRhetoricSelected | undefined;
  const mutations = (mutationStage?.mutations as string[] | undefined) ?? [];

  return (
    <StageCard stageNumber={stageNumber} title="Micro-Rhetoric" id={id}>
      <Text size="2" weight="medium" className="mono">
        {relationship}
      </Text>
      <Flex direction="column" gap="1">
        <Text size="1" color="gray">
          Available:
        </Text>
        {candidates.map((id, i) => (
          <Text
            key={id}
            size="1"
            className={selected?.selected === id ? "trace-selected" : "trace-rejected"}
          >
            {i + 1}. {id}
          </Text>
        ))}
      </Flex>
      {selected && (
        <Flex direction="column" gap="1">
          <Text size="1" color="gray">
            Seeded choice: {selected.seededChoice}
          </Text>
          <Text size="2">
            Selected: <Code className="trace-selected">{selected.selected}</Code>
          </Text>
        </Flex>
      )}
      {mutations.length > 0 && (
        <Flex direction="column" gap="1">
          <Text size="1" color="gray">
            Mutation:
          </Text>
          {mutations.map((m, i) => (
            <Text key={i} size="2" className="mono">
              {m}
            </Text>
          ))}
        </Flex>
      )}
    </StageCard>
  );
}

function PartialGameCard({ stage }: { stage: GenerationStage }) {
  const entities = (stage.output as PartialGameEntity[] | undefined) ?? [];

  return (
    <StageCard stageNumber={3} title="Partial Game" id="stage-3">
      <Flex direction="column" gap="3">
        {entities.map((entity) => (
          <Flex key={entity.noun} direction="column" gap="1">
            <Text size="2" weight="medium">
              {entity.noun}
            </Text>
            {entity.components.length === 0 ? (
              <Text size="1" color="gray">
                (no components)
              </Text>
            ) : (
              entity.components.map((c, i) => (
                <Text key={i} size="1" color="gray" className="mono">
                  {c}
                </Text>
              ))
            )}
          </Flex>
        ))}
      </Flex>
    </StageCard>
  );
}

function RecipeCard({
  category,
  scoreStages,
  selectStage,
  applyStage,
  stageNumber,
  id,
}: {
  category: "win" | "lose" | "structure";
  scoreStages: GenerationStage[];
  selectStage?: GenerationStage;
  applyStage?: GenerationStage;
  stageNumber: number;
  id?: string;
}) {
  const selected = selectStage?.selected as RecipeSelected;
  const mutations = (applyStage?.mutations as string[] | undefined) ?? [];
  const label =
    category === "win"
      ? "Win Recipe Scores"
      : category === "lose"
        ? "Lose Recipe Scores"
        : "Structure Recipe Scores";

  return (
    <StageCard stageNumber={stageNumber} title={label} id={id}>
      {scoreStages.map((stage) => {
        const calculations = (stage.calculations as RecipeScoreCalculation[] | undefined) ?? [];
        const isSelectedRecipe = selected?.recipeId === stage.id.replace(/^recipe-score-/, "");
        return (
          <Flex key={stage.id} direction="column" gap="1">
            <Text
              size="1"
              color="gray"
              className={isSelectedRecipe ? "trace-selected" : undefined}
            >
              {stage.name}
            </Text>
            {/* §30 compact table: binding | predicate | result | score */}
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "12px" }}>
              <tbody>
                {calculations.map((c, i) => {
                  const isSelectedBinding =
                    isSelectedRecipe && selected?.binding === c.binding;
                  const rowClass = c.rejected
                    ? "trace-rejected"
                    : isSelectedBinding
                      ? "trace-selected"
                      : undefined;
                  return (
                    <Fragment key={i}>
                      <tr>
                        <td className={`mono ${rowClass ?? ""}`} style={{ padding: "2px 4px 2px 0" }}>
                          {c.binding}
                        </td>
                        <td className={rowClass} style={{ padding: "2px 4px", textAlign: "right" }}>
                          {c.score}
                          {c.rejected ? " (rejected)" : ""}
                        </td>
                      </tr>
                      {c.predicates.map((p, j) => (
                        <tr key={`${i}-${j}`}>
                          <td colSpan={2} style={{ padding: "0 4px 2px 12px" }}>
                            <Text size="1" color="gray">
                              {p.description}: {String(p.result)} ({p.score >= 0 ? "+" : ""}
                              {p.score})
                            </Text>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </Flex>
        );
      })}

      {selectStage && (
        <Flex direction="column" gap="1">
          {selected ? (
            <>
              <Text size="1" color="gray">
                Highest score: {selected.highestScore} — {selected.seededChoice}
              </Text>
              <Text size="2">
                Selected: <Code className="trace-selected">{selected.recipeId}</Code> (
                {selected.binding})
              </Text>
            </>
          ) : (
            <Text size="2" color="gray">
              No eligible candidate — recipe not applied.
            </Text>
          )}
        </Flex>
      )}

      {mutations.length > 0 && (
        <Flex direction="column" gap="1">
          <Text size="1" color="gray">
            Modifications applied (in order):
          </Text>
          {mutations.map((m, i) => (
            <Text key={i} size="2" className="mono">
              {i + 1}. {m}
            </Text>
          ))}
        </Flex>
      )}
    </StageCard>
  );
}

function PlayerCard({ stage }: { stage: GenerationStage }) {
  const selected = stage.selected as PlayerSelected | undefined;
  const candidates = (stage.calculations as string[] | undefined) ?? [];

  return (
    <StageCard stageNumber={7} title="Player Selection" id="stage-7">
      {selected && (
        <>
          <Text size="2">
            Player: <Code className="trace-selected">{selected.noun}</Code>
          </Text>
          <Text size="1" color="gray">
            {selected.reason === "selected by recipe"
              ? "Selected by recipe."
              : "No recipe assigned a player — selected by random fallback."}
          </Text>
        </>
      )}
      {candidates.length > 0 && (
        <Flex direction="column" gap="1">
          <Text size="1" color="gray">
            Candidates:
          </Text>
          {candidates.map((c, i) => (
            <Text
              key={i}
              size="1"
              className={selected?.noun === c ? "trace-selected" : "trace-rejected"}
            >
              {i + 1}. {c}
            </Text>
          ))}
        </Flex>
      )}
    </StageCard>
  );
}

function NonTerminalsCard({
  stage,
  stageNumber,
  id,
}: {
  stage: GenerationStage;
  stageNumber: number;
  id?: string;
}) {
  const calculations = (stage.calculations as NonTerminalCalculation[] | undefined) ?? [];
  const selections = (stage.selected as NonTerminalSelected[] | undefined) ?? [];

  return (
    <StageCard stageNumber={stageNumber} title={stage.name} id={id}>
      {calculations.length === 0 ? (
        <Text size="1" color="gray">
          No non-terminals present.
        </Text>
      ) : (
        calculations.map((c, i) => {
          const selection = selections[i];
          const resolvedName = selection?.resolved.split("(")[0];
          return (
            <Flex key={i} direction="column" gap="1">
              <Text size="2">
                {c.owner}: <Code>{c.nonTerminal}</Code>
              </Text>
              <Flex direction="column" gap="0">
                <Text size="1" color="gray">
                  Candidates:
                </Text>
                {c.candidates.map((candidate, j) => (
                  <Text
                    key={j}
                    size="1"
                    className={
                      resolvedName && candidate.startsWith(resolvedName)
                        ? "trace-selected"
                        : "trace-rejected"
                    }
                  >
                    {candidate}
                  </Text>
                ))}
              </Flex>
              <Text size="1" color="gray">
                Seeded choice: {c.seededChoice}
              </Text>
              {selection && (
                <Text size="2">
                  Resolved: <Code className="trace-selected">{selection.resolved}</Code>{" "}
                  <Text size="1" color="gray">
                    ({selection.reason})
                  </Text>
                </Text>
              )}
            </Flex>
          );
        })
      )}
    </StageCard>
  );
}

function PatchCard({
  stage,
  stageNumber,
  id,
}: {
  stage: GenerationStage;
  stageNumber: number;
  id?: string;
}) {
  const evaluations = (stage.calculations as PatchCalculation[] | undefined) ?? [];
  const mutations = (stage.mutations as string[] | undefined) ?? [];
  const input = stage.input as { description?: string; precondition?: string } | undefined;

  return (
    <StageCard stageNumber={stageNumber} title={stage.name} id={id}>
      {input?.description && (
        <Text size="1" color="gray">
          {input.description}
        </Text>
      )}
      <Flex direction="column" gap="1">
        {evaluations.map((e, i) => (
          <Text key={i} size="1" className={e.applicable ? "trace-selected" : "trace-rejected"}>
            {e.owner}: {e.outcome}
          </Text>
        ))}
      </Flex>
      {mutations.length > 0 && (
        <Flex direction="column" gap="1">
          <Text size="1" color="gray">
            Mutations applied:
          </Text>
          {mutations.map((m, i) => (
            <Text key={i} size="2" className="mono">
              {i + 1}. {m}
            </Text>
          ))}
        </Flex>
      )}
    </StageCard>
  );
}

function ParametersCard({ stage, id }: { stage: GenerationStage; id?: string }) {
  const calculations = (stage.calculations as ParameterCalculation[] | undefined) ?? [];
  const selections = (stage.selected as ParameterSelected[] | undefined) ?? [];

  return (
    <StageCard title="Parameters (part of Non-Terminal Resolution / Stage 8)" id={id}>
      {calculations.length === 0 ? (
        <Text size="1" color="gray">
          No unset parameters to finalize.
        </Text>
      ) : (
        calculations.map((c, i) => {
          const selection = selections[i];
          return (
            <Flex key={i} direction="column" gap="0">
              <Text size="2">
                {c.owner} — <Code>{c.component}</Code>.{c.key}
              </Text>
              <Text size="1" color="gray">
                Range {c.range} — {c.selectionMechanism}
              </Text>
              {selection && (
                <Text size="1" className="trace-selected">
                  Selected: <Code className="trace-selected">{selection.value}</Code> (
                  {selection.source})
                </Text>
              )}
            </Flex>
          );
        })
      )}
    </StageCard>
  );
}

function FinalSpecCard({ stage }: { stage: GenerationStage }) {
  const spec = stage.output as GeneratedGameSpec | undefined;
  const [copied, setCopied] = useState(false);

  if (!spec) return null;

  const json = JSON.stringify(spec, null, 2);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied by the browser; there's nothing more
      // to do than leave the button unconfirmed.
    }
  }

  return (
    <Card variant="surface" size="1" style={{ width: "100%" }}>
      <Flex direction="column" gap="2">
        <Flex align="center" justify="between">
          <StageLabel>10. Final Game Spec</StageLabel>
          <Button size="1" variant="soft" onClick={handleCopy}>
            {copied ? "Copied!" : "Copy JSON"}
          </Button>
        </Flex>

        <Tabs.Root defaultValue="summary">
          <Tabs.List>
            <Tabs.Trigger value="summary">Summary</Tabs.Trigger>
            <Tabs.Trigger value="components">Components</Tabs.Trigger>
            <Tabs.Trigger value="blackboard">Blackboard</Tabs.Trigger>
            <Tabs.Trigger value="json">Raw JSON</Tabs.Trigger>
          </Tabs.List>

          <Flex pt="3">
            <Tabs.Content value="summary" style={{ width: "100%" }}>
              <Flex direction="column" gap="2">
                <Text size="2">
                  Player: <Code>{spec.entities.find((e) => e.id === spec.playerEntityId)?.noun}</Code>
                </Text>
                <Text size="2">Win: {spec.instructions.win}</Text>
                <Text size="2">Lose: {spec.instructions.lose}</Text>
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="components" style={{ width: "100%" }}>
              <Flex direction="column" gap="3">
                {spec.entities.map((entity) => (
                  <Flex key={entity.id} direction="column" gap="1">
                    <Text size="2" weight="medium">
                      {entity.noun}
                      {entity.isPlayer ? " (player)" : ""}
                    </Text>
                    {entity.components.length === 0 ? (
                      <Text size="1" color="gray">
                        (no components)
                      </Text>
                    ) : (
                      entity.components.map((c, i) => (
                        <Text key={i} size="1" color="gray">
                          <Code>{c.component}</Code>
                          {c.target ? ` (target=${c.target})` : ""}
                        </Text>
                      ))
                    )}
                  </Flex>
                ))}
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="blackboard" style={{ width: "100%" }}>
              <Flex direction="column" gap="1">
                {Object.entries(spec.winCondition).length === 0 ? (
                  <Text size="1" color="gray">
                    (empty blackboard)
                  </Text>
                ) : (
                  Object.entries(spec.winCondition).map(([key, value]) => (
                    <Text key={key} size="1">
                      <Code>
                        {key} = {JSON.stringify(value)}
                      </Code>
                    </Text>
                  ))
                )}
              </Flex>
            </Tabs.Content>

            <Tabs.Content value="json" style={{ width: "100%" }}>
              <pre
                style={{
                  fontSize: "12px",
                  overflowX: "auto",
                  maxHeight: "400px",
                  margin: 0,
                }}
              >
                {json}
              </pre>
            </Tabs.Content>
          </Flex>
        </Tabs.Root>
      </Flex>
    </Card>
  );
}

export default function GenerationTrace({
  trace,
}: {
  trace?: GenerationTraceData;
}) {
  if (!trace) {
    return (
      <Flex align="center" justify="center" minHeight="200px">
        <Text color="gray">Generation pipeline / trace placeholder</Text>
      </Flex>
    );
  }

  const entitiesStage = trace.stages.find((s) => s.id === "entities");
  const microRhetoricStages = trace.stages.filter(
    (s) =>
      s.id.startsWith("micro-rhetoric-") &&
      !s.id.startsWith("micro-rhetoric-apply-")
  );
  const microRhetoricMutationStages = trace.stages.filter((s) =>
    s.id.startsWith("micro-rhetoric-apply-")
  );
  const partialGameStage = trace.stages.find((s) => s.id === "partial-game");

  // §3's numbered outline gives win/lose/structure recipe scoring stages 4,
  // 5, 6 respectively.
  const recipeCategories = [
    { category: "win" as const, stageNumber: 4 },
    { category: "lose" as const, stageNumber: 5 },
    { category: "structure" as const, stageNumber: 6 },
  ];
  const recipeCards = recipeCategories.map(({ category, stageNumber }) => {
    const scoreStages = trace.stages.filter(
      (s) =>
        s.id.startsWith("recipe-score-") &&
        (s.input as { category?: string } | undefined)?.category === category
    );
    const selectStage = trace.stages.find((s) => s.id === `recipe-select-${category}`);
    const selected = selectStage?.selected as RecipeSelected;
    const applyStage = selected
      ? trace.stages.find((s) => s.id === `recipe-apply-${selected.recipeId}`)
      : undefined;
    return { category, stageNumber, scoreStages, selectStage, applyStage };
  });

  const playerStage = trace.stages.find((s) => s.id === "player");

  // §22: non-terminal resolution runs twice (before and after patches) — both
  // passes belong to stage 8 in §3's 10-item outline, as does parameter
  // finalization, since the spec's fixed 10-stage list has no separate slot
  // for it.
  const nonTerminalStages = trace.stages.filter(
    (s) => s.id === "non-terminals" || s.id === "non-terminals-post-patch"
  );
  const patchStages = trace.stages.filter((s) => s.id.startsWith("patch-"));
  const parametersStage = trace.stages.find((s) => s.id === "parameters");
  const finalGameStage = trace.stages.find((s) => s.id === "final-game");

  // §3's 10-stage outline, now as tabs instead of a scrolling card grid —
  // switching stages is a click, not a scroll.
  const tabs: { value: string; label: string; content: React.ReactNode }[] = [
    {
      value: "stage-1",
      label: "1. Entities",
      content: entitiesStage && <EntitiesCard stage={entitiesStage} />,
    },
    {
      value: "stage-2",
      label: "2. Micro-Rhetorics",
      content: (
        <Grid columns={{ initial: "1", sm: "2", lg: "3" }} gap="3" style={{ alignItems: "start" }}>
          {microRhetoricStages.map((stage, i) => (
            <MicroRhetoricCard
              key={stage.id}
              selectionStage={stage}
              mutationStage={microRhetoricMutationStages[i]}
              stageNumber={2}
              id={`stage-2-${i}`}
            />
          ))}
        </Grid>
      ),
    },
    {
      value: "stage-3",
      label: "3. Partial Game",
      content: partialGameStage && <PartialGameCard stage={partialGameStage} />,
    },
    ...recipeCards.map(({ category, stageNumber, scoreStages, selectStage, applyStage }) => ({
      value: `stage-${stageNumber}`,
      label: `${stageNumber}. ${category === "win" ? "Win" : category === "lose" ? "Lose" : "Structure"} Recipe`,
      content: (
        <RecipeCard
          category={category}
          stageNumber={stageNumber}
          id={`stage-${stageNumber}`}
          scoreStages={scoreStages}
          selectStage={selectStage}
          applyStage={applyStage}
        />
      ),
    })),
    {
      value: "stage-7",
      label: "7. Player Selection",
      content: playerStage && <PlayerCard stage={playerStage} />,
    },
    {
      value: "stage-8",
      label: "8. Non-Terminal Resolution",
      content: (
        <Grid columns={{ initial: "1", sm: "2" }} gap="3" style={{ alignItems: "start" }}>
          {nonTerminalStages.map((stage, i) => (
            <NonTerminalsCard key={stage.id} stage={stage} stageNumber={8} id={`stage-8-${i}`} />
          ))}
          {parametersStage && <ParametersCard stage={parametersStage} id="stage-8-parameters" />}
        </Grid>
      ),
    },
    {
      value: "stage-9",
      label: "9. Patches",
      content: (
        <Grid columns={{ initial: "1", sm: "2" }} gap="3" style={{ alignItems: "start" }}>
          {patchStages.map((stage, i) => (
            <PatchCard key={stage.id} stage={stage} stageNumber={9} id={`stage-9-${i}`} />
          ))}
        </Grid>
      ),
    },
    {
      value: "stage-10",
      label: "10. Final Game Spec",
      content: finalGameStage && <FinalSpecCard stage={finalGameStage} />,
    },
  ];

  return (
    <Tabs.Root defaultValue="stage-1">
      <Tabs.List style={{ flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <Tabs.Trigger key={t.value} value={t.value} className="mono">
            {t.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {tabs.map((t) => (
        <Tabs.Content key={t.value} value={t.value}>
          <Flex direction="column" p="3" width="100%">
            {t.content}
          </Flex>
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
