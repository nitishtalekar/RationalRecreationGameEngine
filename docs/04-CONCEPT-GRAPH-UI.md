# Step 04 — Concept Graph Editor UI

## Depends On
Step 01 (page shell), Step 03 (`ConceptMap` types, verbs library).

## Master Spec References
- §8 verbs.json (enabled-only default, "Show unsupported paper verbs" toggle)
- §9 Concept Graph (full interaction list)
- §36 Validation (edge/verb validation rules relevant to enabling "Make Game")

## Scope

1. Implement `components/ConceptGraph.tsx` using `@xyflow/react`:
   - render nodes (nouns) and edges (verb-labeled relationships);
   - add noun, rename noun, drag noun, delete noun;
   - connect two nouns to create an edge;
   - edit an edge's verb via a selector;
   - delete a relationship;
   - "load template" hook (wire to a hardcoded Occupy graph for now; full
     template selector arrives in Step 13).
2. Verb selector behavior:
   - defaults to showing only `enabled: true` verbs;
   - developer toggle "Show unsupported paper verbs" reveals disabled verbs;
   - disabled verbs render distinctly and show tooltip/caption "No
     micro-rhetoric published in paper" (§8).
3. Local component state only — hold the `ConceptMap` in React state in
   `page.tsx` (or a small context), no generator wired in yet.
4. Implement the validation checks from §36 that concern the graph itself
   (not generation): at least one relationship, non-empty labels, valid
   endpoints, every edge verb exists in `verbs.json`, every selected verb has
   an implemented micro-rhetoric. Surface violations as inline UI messages.
5. Add a disabled "Make Game" button in the toolbar area that becomes enabled
   only when graph validation passes (per §9: "disabled if an edge uses a verb
   without an implemented micro-rhetoric"). Clicking it can just log the
   current `ConceptMap` to the console for now — real generation is Step 05+.

## Out of Scope
- Any generator invocation beyond a console.log of the graph.
- Trace panel, game viewport.
- Full template dropdown (Step 13) — a single hardcoded Occupy load button is enough here.

## Files Touched
- `src/components/ConceptGraph.tsx`
- Supporting hooks/state in `src/app/page.tsx`

## Automated Checks
- None required beyond existing build/lint passing; optional component test
  for the verb-filtering logic if convenient.

## Manual Test
1. Load the hardcoded Occupy template — confirm 3 nodes and 3 verb-labeled
   edges render correctly.
2. Add a new noun, rename it, drag it, delete it — confirm graph updates.
3. Connect two nouns and pick a verb from the default (enabled-only) list.
4. Toggle "Show unsupported paper verbs" — confirm disabled verbs (e.g.
   `attacks`) appear, are visually muted/disabled, and show the "No
   micro-rhetoric published in paper" message.
5. Create an edge using a disabled verb (if the UI allows selecting it for
   inspection) and confirm "Make Game" becomes disabled with a validation
   message; remove/fix that edge and confirm "Make Game" re-enables.
6. Delete all edges — confirm "Make Game" is disabled (needs ≥1 relationship).
7. Click "Make Game" with a valid graph and confirm the `ConceptMap` logged
   to console matches what's on screen.

## Done When
- [ ] All graph CRUD interactions from §9 work.
- [ ] Verb gating (enabled-only default + toggle) works exactly as specified.
- [ ] "Make Game" enablement correctly reflects §36 validation rules.
