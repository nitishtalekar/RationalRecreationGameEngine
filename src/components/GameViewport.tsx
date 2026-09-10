"use client";

import { useEffect, useRef, useState } from "react";
import { Badge, Button, Dialog, Flex, Progress, Text } from "@radix-ui/themes";
import { InfoCircledIcon } from "@radix-ui/react-icons";

import type { GeneratedGameSpec } from "@/program/generator/types";
import { createRuntimeState, stepRuntime } from "@/program/runtime/GameRuntime";
import { renderFrame } from "@/program/runtime/renderer";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "@/program/runtime/types";
import type { InputState, RuntimeState } from "@/program/runtime/types";

export default function GameViewport({
  game,
  onTryAnother,
}: {
  game?: GeneratedGameSpec;
  // §13 Toolbar/seed-regeneration integration lands in Step 13 — the button
  // exists and is wired to this optional callback, but is inert if the
  // caller doesn't supply one yet.
  onTryAnother?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<RuntimeState | null>(null);
  const inputRef = useRef<InputState>({ keys: new Set() });
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [hud, setHud] = useState<{
    score: number;
    maxScore: number | null;
    time: number | null;
    maxTime: number | null;
    outcome: string;
  }>(() => {
    // Derive initial bar bounds from a scratch runtime state so the stat
    // bars are visible (full time, zero score) before "Play" is clicked,
    // not just after the first tick. This component remounts fresh (keyed
    // by generation in page.tsx) whenever a new game spec arrives, so this
    // lazy initializer re-runs exactly when it should.
    if (!game) {
      return { score: 0, maxScore: null, time: null, maxTime: null, outcome: "playing" };
    }
    const initial = createRuntimeState(game, game.seed);
    return {
      score: initial.score,
      maxScore: initial.maxScore,
      time: initial.timeRemainingSeconds,
      maxTime: initial.maxTimeSeconds,
      outcome: initial.outcome,
    };
  });

  // Runtime safety: always tear down the RAF loop and listeners on
  // unmount/replay so intervals never leak and entities never duplicate
  // across a stop/replay cycle (§12 manual test 7) — not a Game-O-Matic
  // behavior, purely defensive plumbing.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Play state resets whenever a new game spec arrives because the caller
  // (page.tsx) keys this component by the spec's identity — React remounts
  // it fresh rather than this component reconciling old state in place.

  function handlePlay() {
    if (!game) return;
    stateRef.current = createRuntimeState(game, game.seed);
    lastTimeRef.current = null;
    setPlaying(true);
  }

  useEffect(() => {
    if (!playing || !game) return;

    function tick(time: number) {
      if (!game) return;
      const canvas = canvasRef.current;
      const state = stateRef.current;
      if (!canvas || !state) return;

      const last = lastTimeRef.current ?? time;
      const deltaSeconds = Math.min(0.05, (time - last) / 1000);
      lastTimeRef.current = time;

      const { state: nextState } = stepRuntime(game, state, inputRef.current, deltaSeconds);
      stateRef.current = nextState;

      const ctx = canvas.getContext("2d");
      if (ctx) renderFrame(ctx, nextState);

      setHud({
        score: nextState.score,
        maxScore: nextState.maxScore,
        time: nextState.timeRemainingSeconds,
        maxTime: nextState.maxTimeSeconds,
        outcome: nextState.outcome,
      });

      if (nextState.outcome === "playing") {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, game]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLCanvasElement>) {
    inputRef.current.keys.add(e.key);
  }

  function handleKeyUp(e: React.KeyboardEvent<HTMLCanvasElement>) {
    inputRef.current.keys.delete(e.key);
  }

  if (!game) {
    return (
      <Flex align="center" justify="center" height="100%" minHeight="320px">
        <Text color="gray">Generated game viewport placeholder</Text>
      </Flex>
    );
  }

  const playerEntity = game.entities.find((e) => e.isPlayer);

  return (
    <Flex direction="column" gap="2" height="100%" width="100%">
      <Flex align="center" gap="3" wrap="wrap">
        <Button size="1" onClick={handlePlay} disabled={playing}>
          Play
        </Button>
        <Button size="1" variant="soft" onClick={onTryAnother} disabled={!onTryAnother}>
          Try Another
        </Button>
        <Dialog.Root>
          <Dialog.Trigger>
            <Button size="1" variant="soft" color="gray">
              <InfoCircledIcon /> Instructions
            </Button>
          </Dialog.Trigger>
          <Dialog.Content maxWidth="420px">
            <Dialog.Title>How to Play</Dialog.Title>
            <Flex direction="column" gap="3">
              <Flex direction="column" gap="1">
                <Text size="2" weight="bold">
                  You control
                </Text>
                <Text size="2" color="gray">
                  {playerEntity
                    ? `You are the ${playerEntity.noun} (the blue circle). Move with WASD or the arrow keys.`
                    : "Move with WASD or the arrow keys."}
                </Text>
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="2" weight="bold">
                  How to win
                </Text>
                <Text size="2" color="gray">
                  {game.instructions.win}
                </Text>
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="2" weight="bold">
                  How to lose
                </Text>
                <Text size="2" color="gray">
                  {game.instructions.lose || "No lose condition was generated."}
                </Text>
              </Flex>
              <Flex direction="column" gap="1">
                <Text size="2" weight="bold">
                  Effects
                </Text>
                <Text size="2" color="gray">
                  A blue outline means an entity is frozen and can&apos;t move (if it&apos;s you,
                  you temporarily lose control). Colors flash blue for freeze, green for grow,
                  red for shrink, and purple for redirect whenever they happen.
                </Text>
              </Flex>
            </Flex>
            <Flex justify="end" mt="3">
              <Dialog.Close>
                <Button size="1" variant="soft">
                  Close
                </Button>
              </Dialog.Close>
            </Flex>
          </Dialog.Content>
        </Dialog.Root>
        {hud.outcome === "won" && <Badge color="green">You win!</Badge>}
        {hud.outcome === "lost" && <Badge color="red">You lose!</Badge>}
      </Flex>

      <Text size="1" color="gray">
        {game.instructions.win}
        {game.instructions.lose ? ` ${game.instructions.lose}` : ""}
      </Text>

      {/* §3 stat bars: whichever stat is being tracked (score toward the
          win threshold, time counting down toward the lose condition)
          renders as a progress bar above the game, per user request. */}
      <Flex direction="column" gap="2">
        {hud.maxScore !== null && (
          <Flex direction="column" gap="1">
            <Flex justify="between">
              <Text size="1" color="gray">
                Score
              </Text>
              <Text size="1" color="gray" className="mono">
                {hud.score} / {hud.maxScore}
              </Text>
            </Flex>
            <Progress
              value={Math.min(100, (hud.score / hud.maxScore) * 100)}
              color="green"
              size="2"
            />
          </Flex>
        )}
        {hud.time !== null && hud.maxTime !== null && (
          <Flex direction="column" gap="1">
            <Flex justify="between">
              <Text size="1" color="gray">
                Time
              </Text>
              <Text size="1" color="gray" className="mono">
                {Math.ceil(hud.time)}s / {hud.maxTime}s
              </Text>
            </Flex>
            <Progress value={(hud.time / hud.maxTime) * 100} color="orange" size="2" />
          </Flex>
        )}
      </Flex>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        style={{
          width: "100%",
          maxWidth: `${CANVAS_WIDTH}px`,
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          border: "1px solid var(--gray-6)",
          borderRadius: "4px",
        }}
      />
    </Flex>
  );
}
