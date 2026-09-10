"use client";

import { Button, Flex, Heading, Select, Text, TextField, Tooltip } from "@radix-ui/themes";
import { MagicWandIcon, ResetIcon, ShuffleIcon } from "@radix-ui/react-icons";

import type { Template } from "@/program/generator/library";

export default function Toolbar({
  templates,
  templateId,
  onTemplateChange,
  seed,
  onSeedChange,
  onMakeGame,
  onTryAnother,
  onReset,
  canMakeGame,
  validationError,
}: {
  templates: Template[];
  templateId: string;
  onTemplateChange: (id: string) => void;
  seed: number;
  onSeedChange: (seed: number) => void;
  onMakeGame: () => void;
  onTryAnother: () => void;
  onReset: () => void;
  canMakeGame: boolean;
  validationError?: string;
}) {
  return (
    <Flex
      asChild
      align="center"
      gap="4"
      px="4"
      py="3"
      wrap="wrap"
      style={{ borderBottom: "1px solid var(--gray-a5)" }}
    >
      <header>
        <Heading size="4" style={{ flexGrow: 1 }}>
          Game-O-Matic Replica
        </Heading>

        <Flex align="center" gap="2">
          <Text size="2" color="gray">
            Template
          </Text>
          <Select.Root value={templateId} onValueChange={onTemplateChange}>
            <Select.Trigger style={{ width: 140 }} />
            <Select.Content>
              {templates.map((t) => (
                <Select.Item key={t.id} value={t.id}>
                  {t.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Flex>

        <Flex align="center" gap="2">
          <Text size="2" color="gray">
            Seed
          </Text>
          <TextField.Root
            size="2"
            type="number"
            value={String(seed)}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) onSeedChange(next);
            }}
            style={{ width: 120, fontFamily: "monospace" }}
          />
        </Flex>

        <Flex align="center" gap="2">
          <Tooltip content={canMakeGame ? "Generate a game from this concept map" : validationError}>
            <Button size="2" disabled={!canMakeGame} onClick={onMakeGame}>
              <MagicWandIcon /> Make Game
            </Button>
          </Tooltip>
          <Button size="2" variant="soft" onClick={onTryAnother}>
            <ShuffleIcon /> Try Another
          </Button>
          <Button size="2" variant="soft" color="gray" onClick={onReset}>
            <ResetIcon /> Reset
          </Button>
        </Flex>
      </header>
    </Flex>
  );
}
