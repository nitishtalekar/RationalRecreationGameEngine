# Step 01 — Project Setup & Dark Theme Shell

## Depends On
Nothing (first step).

## Master Spec References
- §3 User Experience (four-area layout)
- §4 Dark Theme (tokens, styling rules)
- §5 Tech Stack
- §6 Project Structure

## Scope

1. Scaffold a Next.js App Router + TypeScript project.
2. Install dependencies: React, Radix UI (`@radix-ui/themes`), `@xyflow/react`, Zod, a seeded
   RNG library (or plan for a local implementation in Step 03), Vitest.
3. Create the folder skeleton from master spec §6 (empty/stub files are fine):
   ```text
   src/
     app/page.tsx
     components/ConceptGraph.tsx
     components/GameViewport.tsx
     components/GenerationTrace.tsx
     components/Toolbar.tsx
     program/library/        (empty, populated in Step 02)
     program/generator/      (empty, populated in Steps 03, 05-10)
     program/runtime/        (empty, populated in Step 12)
     styles/globals.css
   ```
4. Implement the dark theme:
   - Define the CSS custom properties from §4 in `globals.css`.
   - Configure a Radix UI `<Theme appearance="dark">` that consumes those tokens.
   - No Tailwind.
5. Build the **static** four-area page layout shell in `app/page.tsx` using
   plain placeholder content (e.g. `<Card>` boxes with labels "Concept
   Graph", "Generated Game", "Generation Pipeline / Trace", toolbar bar at
   top with title + seed field). No real graph, game, or trace logic yet —
   just the responsive layout structure (two-column top area collapsing to
   stacked on small screens, full-width trace area below).
6. Confirm the project builds and runs (`npm run dev`).

## Out of Scope
- Any Game-O-Matic domain logic, JSON libraries, or generator code.
- Real graph editing, real game rendering, real trace content.
- Zod schemas (introduced when JSON exists, Step 02).

## Files Touched
- `package.json`, `tsconfig.json`, Next.js config files
- `src/app/page.tsx`, `src/app/layout.tsx`
- `src/styles/globals.css`
- `src/components/*.tsx` (stub components only)
- Empty directories under `src/program/`

## Automated Checks
- `npm run build` succeeds.
- `npm run dev` starts without runtime errors.

## Manual Test
1. Run `npm run dev` and open the page in a browser.
2. Verify dark background (`--bg`) and text tokens are visibly applied.
3. Resize the browser window narrow (mobile width) and confirm the two-column
   top area stacks vertically; widen it back and confirm it returns to
   two columns with the trace area full-width below both.
4. Confirm no console errors.

## Done When
- [ ] Project builds and runs cleanly.
- [ ] Folder structure matches §6.
- [ ] Dark theme tokens visibly applied, no Tailwind present.
- [ ] Layout responds correctly to viewport resize.
