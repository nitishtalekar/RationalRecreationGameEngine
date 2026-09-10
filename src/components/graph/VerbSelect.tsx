"use client";

import { Select, Text, Tooltip } from "@radix-ui/themes";
import { VERBS } from "@/program/generator/library";

export function verbHasImplementedMicroRhetoric(
  verb: string,
  implementedVerbs: ReadonlySet<string>
) {
  return implementedVerbs.has(verb);
}

export default function VerbSelect({
  value,
  onChange,
  showUnsupported,
  implementedVerbs,
}: {
  value: string;
  onChange: (verb: string) => void;
  showUnsupported: boolean;
  implementedVerbs: ReadonlySet<string>;
}) {
  const visibleVerbs = VERBS.filter(
    (v) => v.enabled || showUnsupported
  );

  return (
    <Select.Root value={value} onValueChange={onChange} size="1">
      <Select.Trigger
        variant="soft"
        style={{ fontSize: 11, height: 22, minWidth: 92 }}
      />
      <Select.Content position="popper">
        {visibleVerbs.map((v) => {
          const disabled = !v.enabled;
          const missingRhetoric =
            v.enabled && !verbHasImplementedMicroRhetoric(v.verb, implementedVerbs);
          const item = (
            <Select.Item key={v.verb} value={v.verb} disabled={disabled}>
              <Text color={disabled ? "gray" : missingRhetoric ? "amber" : undefined}>
                {v.verb}
              </Text>
            </Select.Item>
          );
          if (disabled) {
            return (
              <Tooltip
                key={v.verb}
                content="No micro-rhetoric published in paper"
              >
                {item}
              </Tooltip>
            );
          }
          return item;
        })}
      </Select.Content>
    </Select.Root>
  );
}
