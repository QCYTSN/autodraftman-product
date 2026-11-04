# FigFox research showcase · 2026-11-03 (historical)

**Superseded for scoring, artifact coverage, loading and release procedures by [the November 4 update](figfox-showcase-2026-11-04.md).** The notes below preserve the November 3 state.

This is the maintenance entry point for the November research showcase. Work stays on `codex/figfox-complete-redesign`; existing untracked film directories are untouched. Delivery is local source plus the existing Pages build, without a remote push or public deployment.

## Data mapping

Authoritative input: `D:/Github_Ku/FigFox-926/fyp_experiment_materials/数据表`. The eight CSV tables are UTF-8 BOM, with descriptive rows preceding their actual headers. The adapter reads the CSV copies, not rendered workbook cells.

| Display | Source condition / implementation | Cohort / protocol | Artifacts |
| --- | --- | --- | --- |
| FigFox | A: SAM + G0/G1/G2 + native repair | 80 frozen inputs, two independent model reviews | `01_latest/results/<sample>/A` |
| DrawAI | DrawAI, 20261023 delivery | Same 80 inputs and review | Local delivery archive, verified against review hashes |
| AutoFigure | AutoFigureEdit, 20261020 delivery | Same 80 inputs and review | Scores and evidence available; source images/SVG not supplied locally |
| Crafter | FigureCrafter, 20261023 delivery | Same 80 inputs and review | Local delivery archive, verified against review hashes |
| FigFox B | No SAM + full repair | Matched 80 inputs | `01_latest/results/<sample>/B` |
| FigFox C | SAM + G0 only | Exact shared A/C draft | `01_latest/results/<sample>/C` |

On November 3 the user clarified that external methods' SVG/PNG are not required; the priority is their quantitative results. Consequently all four methods have complete quantitative coverage, while optional output inspection uses the artifacts already available. AutoFigure's missing local preview is explicit, never substituted with a different run. AFE062's damaged original remains a distinct failure status.

Sample identities and SHA256 come from `02_dataset/samples_80.csv` and `01_latest/evaluation/comprehensive-review/<sample>/complete.json`. There are four visual-clutter strata of 20 inputs each, not four semantic figure categories or proven difficulty levels. This is not described as a strictly unseen test set. Display IDs are A, DrawAI, AFE, Crafter, B and C; artifact records retain condition, historical run path, evaluation version and original SVG hash. Counts and review excerpts are exported per sample. Source and output WebP previews retain the hashes of both original image bytes and preview bytes.

### Scoring and versions

- `v3-17-criteria`: 17 criterion definitions from `评分标准.csv`; historical numbering migration from `01_latest/evaluation/migration.json` (old D15 removed, old D16–D18 map to D15–D17).
- Score is `100 × pass / (pass + fail)`, on a 0–100 score scale. Unknown and NA remain separate. Empty denominators yield null, never zero. Sample N and judgment n are separately displayed. Per-image scores derive from at most two categorical model judgments, not precision estimates or continuous distributions.
- `评分判断明细.csv`: 2,720 rows × 6 variants = 16,320 judgments. The exporter cross-checks all counts against `评分计数.csv` and 16 current criterion summaries against both official score tables.
- **D09 exception:** both summary tables retain the explicitly supplied historical values. External-method historical scores used one review, FigFox historical ablations used two. Current D09 counts and per-image evidence remain current. Summary N is not attached to historical values; paired analysis excludes D09. The inspector explicitly labels the separate current judgments. `D09-display-override.json` is retained in provenance.
- No official Overall exists in these materials. None is synthesized. Group profiles show individual criterion scores within registry groups, without inventing group weights. Heatmap opacity uses the fixed 0–100 range, not per-row min/max.
- Main table sorts by the chosen criterion. Negative per-sample differences and SAM-off improvements remain visible. Evidence samples can be selected for clarity, but underlying formal runs are selected by review hashes, never by maximum scores.

### Resources

`时间费用Token.csv` supplies summary resources; `逐图效率.csv` supplies A/B/C per-image resources. Per-image cost/time/token means are checked against official A/B/C summaries. Costs include recorded reserves; time is the sum of historical recorded stages, not a uniformly measured fresh end-to-end duration. SAM time was not separately recorded and is not invented. Shared drafts are attributed separately to A/B/C, so the columns cannot be summed as an invoice. Independent evaluation is excluded from generation resources.

The scatter plot compares only A/B/C under the shared accounting/timing scope. Known baseline quality and resources remain in a separate table. Crafter's image API costs were incompletely returned. No fastest/cheapest or Pareto claim is made. Per-image records can be inspected in the FigFox evidence drawer; external per-image resources are not reverse-engineered from means.

## Architecture and presentation

The supplied PNG is preserved unchanged as `frontend/public/assets/demo/figfox-method-20261103.png`. The three stages link to the same formal `sample-0001` lineage: C/shared G0, actual G1 issue excerpts, G2 operation targets, A/final, and native receipt (13/13 operations). Clicking a G1 issue highlights its recorded bounding box in the reference and draft. The replay switches saved stages and pauses on interaction, offscreen or hidden document; it never simulates generation.

Current source was checked through the GitHub connector on November 3:

- [Current README](https://github.com/LawrenceRiver/FigFox/blob/main/README.md), blob `6c1f1709cc1c8e3f6929b28f19b3f5eb98e0bf57`.
- [Factual pipeline](https://github.com/LawrenceRiver/FigFox/blob/main/docs/factual-pipeline.md), blob `779df0f434155b230002ae6f0d27416b92c3c5a2`.
- [17-criterion registry](https://github.com/LawrenceRiver/FigFox/blob/main/benchmark/figfox-score-v3/README.md).

The historical cohort used GPT-5.5 for G0/G1/G2 and independent DeepSeek evaluation. The public runner defaults G1/G2 to DeepSeek. Execution acceptance is not visual quality acceptance. G2 independently checks and plans **before** local execution. Earlier mechanism/repair demos remain labeled separately from formal cohort statistics.

Live DrawAI and published FigFox were inspected in Chrome. The useful borrowed principles are criterion-to-evidence exploration, complementary table/profile/heatmap forms and sample-level comparisons. No DrawAI claims, results, evaluation names or branding are reused. The current white/violet brand and Google Sans Flex typography remain. New research visuals use native React/SVG and CSS, with no chart-library dependency.

## Implementation and updates

Main files:

- `frontend/scripts/export-research.py`: read-only data adapter and validation. Python 3 + Pillow; the ordinary site build needs no Python or access to the research directory.
- `frontend/src/features/demo/research/`: typed data, shared context, lazy sample inspector, quantitative sections, architecture evidence and responsive styling.
- `FigFoxDemoPage.tsx`, `DemoCanvas.tsx`, `cases.ts`: editorial overview, formal editable sample, per-case temporary edit copies, explicit object targets, safe mixed-text editing and return-to-explanation navigation.
- `RefinementSection.tsx`: user-triggered change-region overlay; formal paired scores replace the old placeholder.
- `frontend/scripts/research-check.mjs`, `frontend/scripts/showcase-check.mjs`: current data and interaction checks, preserving earlier editable-demo coverage.

Run in `D:/Github_Ku/autodraftman-product/frontend`:

```powershell
npm run research:export
npm run build:pages
npm run preview -- --port 4175 --strictPort --base /figfox/
```

The exporter also accepts an explicit materials directory and optional archive directory:

```powershell
python scripts/export-research.py 'D:/Github_Ku/FigFox-926/fyp_experiment_materials' 'D:/path/to/archives'
```

It only copies allowlisted results, previews, tables and selected evidence fields. No prompts, model conversation logs, account ledgers or credentials are published. Original experiments remain read-only and no paid model calls occur. Approximately 82 MB of research assets are available for on-demand inspection, with a ~32 KB overview and ~638 KB sample index. Individual evidence files and SVGs load when requested. The build output is `frontend/dist`, served below `/figfox/` through the existing release flow.

## Verification and review artifacts

Commands, with the preview running:

```powershell
npm run review:research
$env:AUDIT_BASE_URL='http://127.0.0.1:4175/figfox'
npm run review:showcase
node scripts/verify-pages.mjs
```

Research coverage: 17 definitions/68 heatmap cells; correct metric/sample/condition drilldown; focus/zoom/pan/reset; Escape and trigger-focus restoration; ablation matrix/preview synchronization; recorded issue bounding boxes; native receipt; persisted per-case edits/reset/download; formal SVG demo; direct deep links; Chinese and English at 1440×900, 1280×720 and 390×844 with reduced motion. Page checks cover `/figfox/` and all existing product entry paths without HTTP errors or page overflow.

Screenshots and machine-readable results live under `frontend/.review/research/` (`desktop-hero.png`, `desktop-results.png`, `architecture.png`, `comparison.png`, localized viewport captures and `checks.json`); preserved showcase checks under `frontend/.review/demo/release/`. These local review artifacts are not shipped to the public asset directory.

Final executed results: `build:pages` passed; `review:research` passed all eight interaction groups with zero browser/resource errors; updated `review:showcase` passed all eight groups and 21 existing asset checks; `verify-pages.mjs` passed all 11 existing routes with zero failed resources and no page overflow. `git diff --check` passed. Existing large-bundle notices remain in the Vite build; no unrelated dependency refactor was introduced.

Remaining source limitations: AutoFigure local previews and external methods' full model configurations are absent from the supplied package. All quantitative results remain usable. No new evaluation or external artifacts are required by the user's clarified scope.

## Visual refinement after screenshot feedback

The overview link now shares the statistic text baseline and moves only on hover. The extra architecture-stage rectangle was removed; the default diagram is capped at 900 px (820 px on shorter desktop viewports), retaining the enlarged view. Profile rows preserve method identity across category changes: one motion value drives both the marker and displayed number over 480 ms, resumes from the current value on interrupted switches, and updates immediately with reduced motion. Initial scores are shown directly.

Heatmap winners use deep violet and a textual Best label, based on unrounded values and criterion direction; ties are all marked. Main research sections now have consistent 128–160 px separation on desktop and 88 px on phones. Chart subsections have 80–88 px separation (56–64 px on phones). Scoped styles prevent the existing global heading/paragraph reset from erasing that spacing.

Validation after this refinement: `build:pages`, all nine `review:research` groups and all eight `review:showcase` groups passed, with no browser/resource errors. Tests check every heatmap winner, intermediate marker/number values during transition, and spacing. Visual captures are in `frontend/.review/research/polish/` (`overview.png`, `architecture.png`, `profiles.png`, `heatmap.png`, `mobile.png`).

## Promotional presentation refinement

The main research narrative now focuses on FigFox: a single sentence introduces each chart, three FigFox scores anchor the results, and full four-method scores remain in an expandable 17-criterion heatmap with the existing exact-value best markers. Five criterion groups use open text controls. Technical methodology, historical D09 scope, model versions, completion records, resource accounting and downloadable data are consolidated in the expandable experiment settings.

The pipeline uses a numbered 01 → 02 → 03 sequence with connected arrows, an open stage heading and equal-size input/output figures. Saved-stage playback, issue-region highlights and the 13/13 native operation receipt remain available; full operation records are expandable. The architecture asset remains unchanged and limited to 900 px in its default view.

The 80-row sample-ID explorer on the landing page is replaced by three named visual examples: training/inference (sample-0033), multi-layer architecture (sample-0062) and attention mechanisms (sample-0097). Visitors can switch the original and FigFox output, inspect matching details, and download the original output SVG. The underlying 80-image data and evidence browser remain available.

The ablation chart uses plain configuration names and a labeled draft reference marker. It shares the animated-score hook with criterion profiles: numeric labels and markers follow the same 480 ms value, support interrupted transitions and respond to live reduced-motion preference changes. The current Motion package snapshots that preference at mount, so a small media-query subscription handles changes while the page is open.

The resource scatter is replaced by two labeled stage breakdowns: per-image recorded cost and time, each split into shared draft C and full A minus C. These remain recorded experimental resources; the exact scope is in experiment settings. Numbers come directly from the existing summary data. No source experiment or output SVG was changed.

Research sections now have 120–180 px desktop separation (96 px on phones), fewer bordered controls, readable headings, and larger visual comparisons. The sticky navigation now discovers lazily mounted research sections when layout changes. Early mechanism and refinement notes use concise descriptive copy; their cohort distinction is retained in settings.

Validation: the Pages build passed; all 10 research interaction groups passed with zero page/resource errors, including rapid metric changes, live reduced motion, named-case identity, exact resource proportions, all heatmap winners, and Chinese/English layouts at 1440, 1280, 390 and 320 px. The preserved showcase suite passed all eight groups and 21 asset checks. All 11 product routes passed the Pages review. Review captures are under `frontend/.review/research/promo/`; logs are `promo-build.log`, `promo-check.log`, `promo-showcase.log` and `promo-pages.log`.

## Four-method quality and resource comparison

The primary results summary now computes ranks across the 16 criteria with a shared review protocol (D09 remains separately marked in the complete table). FigFox ranks first on 9 and in the top two on all 16. The open ranking distribution shows each method's first / second / remaining counts: FigFox 9/7/0, DrawAI 6/8/2, AutoFigure 1/1/14, Crafter 0/0/16. Rank calculations use original precision and competition ranking for ties; they do not introduce an Overall quality score.

The resource section now aligns all four methods in rows with quality, recorded ledger cost, and recorded runtime in adjacent columns. FigFox has a consistent violet emphasis. Quality defaults to the number of criteria in the top two and can switch to any of the 16 individual scores; values, bars and markers animate from their current positions. Individual rank labels correctly retain second place where applicable. All methods use the same zero-based axes for each column. FigFox's original stage breakdown is retained in a disclosure below.

Resource numbers remain exactly those in the source tables. The chart labels them as recorded cost/time and links to measurement scopes. Source timing boundaries differ, FigFox excludes unrecorded SAM preparation/waits, and some Crafter image API charges were not returned. The page does not infer uniform end-to-end speed ratios or a Pareto frontier from these records. No experimental inputs or outputs were modified.

Validation: Pages build passed; all 11 research browser groups passed with no browser/resource errors. New assertions cover all four rank distributions, every switchable quality score, actual first/second labels, proportional resource bars with common axes, intermediate animation values, settings navigation, and Chinese/English at desktop and 390/320 px. The preserved showcase suite passed all eight groups and 21 asset checks. Screenshots are in `frontend/.review/research/comparison/`; build/check logs use the `comparison-` prefix.

## Showcase criterion menus

The ablation and quality/resource controls now share a dedicated `CriterionSelect` based on the project's existing Base UI Select dependency. The closed control retains the page's open underline treatment. Its portal uses matching Google Sans Flex / Noto typography, a thin neutral border, subtle shadow, grouped criteria, violet selected rows and check marks. The list scrolls within the available viewport and repositions above the trigger when needed. No native system popup is used for these two controls.

Keyboard navigation, Home/End, typeahead, Escape, outside dismissal and return focus use Base UI's existing behavior. Explicit dynamic item labels keep typeahead correct when changing between Chinese and English. The existing chart state handlers and animations are preserved. Browser checks wait for the library's actual popup/focus lifecycle, including its retained hidden popup nodes.

Validation: Pages build and all 11 research checks passed. Dedicated menu checks cover both option sets, groups, keyboard selection, English typeahead after a language switch, dismissal/focus, chart updates, 390/320 px viewport bounds, internal scrolling and reduced motion. Screenshots and the menu check result are in `frontend/.review/research/select/`.

## Visible pipeline playback

Playback is now a single 10.8-second walkthrough with immediate feedback: the saved SVG draft is progressively revealed, the four recorded issue regions are highlighted in sequence, and the final repair output is shown. A three-segment progress indicator and current-stage status accompany the control. Playback supports pause/resume, finishes on the final stage, and offers replay. Manual stage/region selection stops playback; leaving the section, hiding the tab, or opening detailed inspection pauses it. Reduced motion shows the saved images directly and advances the progress display by stage.

The editable case picker's Chinese and English subtitles no longer display `sample-0001`; internal identifiers and asset paths remain unchanged.

Validation: Pages build and all 11 research checks passed. A dedicated browser walkthrough verified immediate reveal, changing issue boxes, pause stability, resume, one-pass completion, replay from the start, manual stop, offscreen pause, reduced motion, bilingual 320 px layout, and absence of visible sample IDs in the picker. Captures and check results are in `frontend/.review/research/playback/`.
