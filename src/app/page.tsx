"use client";

import { useCallback, useMemo, useState } from "react";
import { Card, Flex, Text } from "@radix-ui/themes";
import Toolbar from "@/components/Toolbar";
import ConceptGraph, {
  type ConceptMapLoadRequest,
} from "@/components/ConceptGraph";
import GameViewport from "@/components/GameViewport";
import GenerationTrace from "@/components/GenerationTrace";
import { ConceptMapValidationError, generateGame } from "@/program/generator";
import type { GenerateGameResult } from "@/program/generator";
import { TEMPLATES } from "@/program/generator/library";
import type { ConceptMap } from "@/program/generator/types";
import { validateConceptMap } from "@/components/graph/validateConceptMap";

const DEFAULT_SEED = 18372;
const EMPTY_MAP: ConceptMap = { nodes: [], edges: [] };

function randomSeed(): number {
  return Math.floor(Math.random() * 1_000_000_000);
}

export default function Home() {
  const initialTemplate = TEMPLATES[0];

  const [conceptMap, setConceptMap] = useState<ConceptMap>(
    initialTemplate?.conceptMap ?? EMPTY_MAP
  );
  const [templateId, setTemplateId] = useState<string>(
    initialTemplate?.id ?? ""
  );
  const [seed, setSeed] = useState(DEFAULT_SEED);
  const [loadRequest, setLoadRequest] = useState<ConceptMapLoadRequest>({
    requestId: 0,
    conceptMap: initialTemplate?.conceptMap ?? EMPTY_MAP,
  });
  const [result, setResult] = useState<GenerateGameResult | undefined>(
    undefined
  );
  const [generation, setGeneration] = useState(0);

  const errors = useMemo(() => validateConceptMap(conceptMap), [conceptMap]);
  const canMakeGame = errors.length === 0;

  const handleTemplateChange = useCallback((id: string) => {
    const template = TEMPLATES.find((t) => t.id === id);
    if (!template) return;
    setTemplateId(id);
    setLoadRequest((prev) => ({
      requestId: prev.requestId + 1,
      conceptMap: template.conceptMap,
    }));
    setResult(undefined);
  }, []);

  const handleMakeGame = useCallback(() => {
    try {
      const next = generateGame({ conceptMap, seed });
      setResult(next);
      setGeneration((g) => g + 1);
    } catch (err) {
      if (err instanceof ConceptMapValidationError) {
        // "Make Game" is disabled whenever validateConceptMap reports
        // errors (§36), so this should be unreachable via the UI.
        console.error("Cannot generate:", err.errors.join(" "));
        return;
      }
      throw err;
    }
  }, [conceptMap, seed]);

  // §15/§31 "Try Another": keeps the concept graph untouched, draws a new
  // seed, and reruns the full generator against the current graph.
  const handleTryAnother = useCallback(() => {
    const nextSeed = randomSeed();
    setSeed(nextSeed);
    try {
      const next = generateGame({ conceptMap, seed: nextSeed });
      setResult(next);
      setGeneration((g) => g + 1);
    } catch (err) {
      if (err instanceof ConceptMapValidationError) {
        console.error("Cannot generate:", err.errors.join(" "));
        return;
      }
      throw err;
    }
  }, [conceptMap]);

  // §31 Reset: clears the graph back to empty, matching "user can start
  // fresh" rather than reloading whichever template was last active.
  const handleReset = useCallback(() => {
    setLoadRequest((prev) => ({
      requestId: prev.requestId + 1,
      conceptMap: EMPTY_MAP,
    }));
    setResult(undefined);
    setSeed(DEFAULT_SEED);
  }, []);

  return (
    <Flex direction="column" minHeight="100vh">
      <Toolbar
        templates={TEMPLATES}
        templateId={templateId}
        onTemplateChange={handleTemplateChange}
        seed={seed}
        onSeedChange={setSeed}
        onMakeGame={handleMakeGame}
        onTryAnother={handleTryAnother}
        onReset={handleReset}
        canMakeGame={canMakeGame}
        validationError={errors[0]}
      />

      <Flex asChild direction="column" gap="4" p="4" flexGrow="1">
        <main>
          <Flex direction={{ initial: "column", md: "row" }} gap="4">
            <Card variant="surface" style={{ flex: 1 }}>
              <Flex direction="column" height="100%">
                <Text
                  size="1"
                  color="gray"
                  weight="medium"
                  mb="2"
                  style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  Concept Graph
                </Text>
                <Flex flexGrow="1">
                  <ConceptGraph
                    onChangeMap={setConceptMap}
                    loadRequest={loadRequest}
                  />
                </Flex>
              </Flex>
            </Card>

            <Card variant="surface" style={{ flex: 1 }}>
              <Flex direction="column" height="100%">
                <Text
                  size="1"
                  color="gray"
                  weight="medium"
                  mb="2"
                  style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  Generated Game
                </Text>
                <Flex flexGrow="1">
                  <GameViewport
                    key={generation}
                    game={result?.spec}
                    onTryAnother={handleTryAnother}
                  />
                </Flex>
              </Flex>
            </Card>
          </Flex>

          <Card variant="surface">
            <Text
              size="1"
              color="gray"
              weight="medium"
              mb="2"
              style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}
            >
              Generation Pipeline / Trace
            </Text>
            <GenerationTrace trace={result?.trace} />
          </Card>
        </main>
      </Flex>
    </Flex>
  );
}
