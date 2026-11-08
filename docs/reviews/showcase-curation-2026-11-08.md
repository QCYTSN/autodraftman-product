# Showcase curation and comparison refinement

The opening demonstration now uses one editable/compare canvas with three
curated examples: learning and memory, protein structure generation
(`sample-0072`), and multimodal fusion (`sample-0079`). Supporting mechanism
examples remain accessible. This release changes presentation and demonstration
state only; it does not change generation, authentication, budgets, or scores.

## Recorded evidence

- The stage player uses the complete recorded `sample-0072` run: reference,
  shared G0 draft, final SVG, G1 observations, and native execution receipt.
- Draft SHA256: `c76d4dec828f84240e83b287f198f7433ac94d151bd4c53a52d512208960c025`.
- Final SHA256: `9d9650c9204a8739ab0410493f64133e67050fc210f2979fa7b7c2407599126e`.
- The recorded five edits remain five edits. The retained C2 observation is
  disclosed in the edit records; execution is not presented as a new visual
  acceptance result.
- `scripts/export-showcase-curation.py <research-package>` verifies these hashes
  and derives region bounds from G1. It makes no model calls. The generated
  `pipeline-featured.json` includes the source-record hashes.
- The supplied `framework-v80.svg` is copied unchanged. SHA256:
  `bf708712b0ad50cf78f0c6b68f0efe11de8fba31a821c9c1a1fe47d0a8fcc55f`.
  Its 3,220 paths and seven embedded images have no external resource references.
  Both architecture views use this asset.

## Interaction and visual changes

- Edit/compare modes share the main canvas; edited copies survive mode and case
  changes. Text and tspans share a snapshot so reset correctly restores multiline
  labels after editing and dragging. Published SVG files stay unchanged.
- The player follows one named region across inspection and repair, with a
  whole-figure locator and local paired views. Playback takes 18 seconds, supports
  pause/resume, and pauses outside the viewport or in a hidden tab.
- Either comparator pane can display the source. The panes have equal viewing
  areas and shared zoom/pan, retain aspect ratio, and omit scores and costs for
  the source. The duplicate source thumbnail is removed in this mode.
- Orange identifies FigFox values/markers. AutoFigure uses muted mauve; controls
  stay purple. Key score labels and values align across all three columns.
- The cost insight shows the actual FigFox cost, with directional comparison in
  text. Orange is not used to imply every difference is an improvement.

## Verification

Built with the existing Pages production settings. Passed:

- `npm run build:pages` (TypeScript and production build).
- `node scripts/research-check.mjs`: 12 groups, including 68 heatmap cells, all
  16 comparable metrics, actual resource values, animated chart transitions,
  ablations, deep links and focus restoration.
- `node scripts/showcase-check.mjs`: eight groups, 21 existing manifest assets,
  mechanism/refinement interactions, SVG export, bilingual/mobile layout and
  workspace entry. The showcase makes no API requests; workspace entry only
  reads the available authentication providers.
- `node scripts/showcase-curation-check.mjs`: all three curated SVGs edited,
  dragged, exported, switched and reset; source/result hashes; playback;
  source selection in both comparator scopes; matching viewport geometry;
  synchronized transforms; Chinese/English at 1440 and 390 pixels.
  No page errors, horizontal overflow, or generation requests.

Browser evidence is saved under `frontend/.review/showcase-curation/`, with test
reports alongside the screenshots. Visual review covered desktop/mobile pairs
and a correction pass. The design detector reported four existing warnings in
the original hero/navigation and table styles; none introduced by these changes.

The original experiment summaries, sample assets, kernel and cloud services are
unchanged. No paid generation was run for this release.
