"use client";

import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import type { ReactNode } from "react";
import { tokens } from "./theme";

export default function ThemeRegistry({ children }: { children: ReactNode }) {
  return (
    <Theme
      appearance="dark"
      accentColor="iris"
      grayColor="slate"
      radius="medium"
      style={{ backgroundColor: tokens.bg, color: tokens.text, minHeight: "100vh" }}
    >
      {children}
    </Theme>
  );
}
