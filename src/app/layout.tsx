import type { Metadata } from "next";
import "@/styles/globals.css";
import ThemeRegistry from "./ThemeRegistry";

export const metadata: Metadata = {
  title: "Game-O-Matic Replica",
  description:
    "Paper-faithful reconstruction of the Game-O-Matic generation pipeline",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
