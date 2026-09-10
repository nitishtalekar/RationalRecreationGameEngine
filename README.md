# Game-O-Matic Replica

A single-page, dark-themed Next.js recreation of the generation pipeline described in the 2012 paper *Game-O-Matic: Generating Videogames that Represent Ideas*.

You build a **concept graph** (`noun --verb--> noun`), run it through a paper-faithful generation pipeline (micro-rhetorics → win/lose/structure recipes → non-terminal resolution → patches → parameter finalization), and get a playable Canvas 2D game plus a full **generation trace** showing exactly what was selected, why, and how the final game spec was produced.

This is a research tool, not a game-authoring product: all generator knowledge lives in editable JSON under [src/program/library/](src/program/library/), and only verbs backed by a micro-rhetoric explicitly described in the paper are enabled by default. See [docs/MASTER-SPEC.md](docs/MASTER-SPEC.md) for the full spec and [docs/00-OVERVIEW.md](docs/00-OVERVIEW.md) for the implementation roadmap.

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router) + TypeScript + React
- [Radix UI Themes](https://www.radix-ui.com/themes) for the dark-themed UI shell
- [@xyflow/react](https://reactflow.dev/) for the concept graph editor
- HTML Canvas 2D for the game runtime
- [Zod](https://zod.dev/) for JSON/runtime schema validation
- [seedrandom](https://www.npmjs.com/package/seedrandom) for deterministic, seeded generation
- [Vitest](https://vitest.dev/) for generator unit tests

No backend or database is required.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run test` | Run the Vitest generator test suite |

## Project Structure

```text
src/
  app/            Next.js App Router entry (page, layout, theme)
  components/     UI: concept graph editor, game viewport, trace panel, toolbar
  program/
    library/      Paper-derived generator knowledge as JSON (verbs, micro-rhetorics,
                   components, win/lose/structure recipes, patches, parameter ranges)
    generator/    Pure TypeScript pipeline: concept map -> GeneratedGameSpec + trace
    runtime/      Canvas 2D game runtime that plays a GeneratedGameSpec
docs/             Master spec + step-by-step implementation roadmap
```

The generator knows nothing about React; the runtime knows nothing about recipe scoring; the UI contains no generation logic.
