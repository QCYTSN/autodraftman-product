# FigFox showcase update · November 4, 2026

This supersedes the November 3 notes for data, artifact coverage, loading and
publishing. The existing layout, example editor and reconstruction algorithms
remain in place.

## Authoritative data

The user selected the November 4 scores from
`D:/Downloads/FigFox-研究资料总库/FigFox-研究资料总库`.
`02-评分与证据/unified-refresh-20261104/statistics.json` and
`harness-judgments.json` supply the two separate statistical scopes:

- Four methods: A, AFE, Crafter, DrawAI. Each criterion uses the intersection of
  figures with pass/fail judgments for all four methods.
- Ablation: A, B, C. Each criterion uses its own three-configuration intersection.
- Score is `100 × passes / jointly eligible figures`; unknown and NA do not enter
  that criterion's denominator. These are 8,160 current single Codex judgments.
- For example, FigFox D01 is 95.238095 with N=63 in the four-method comparison and
  94.594595 with N=74 in the ablation. These values must not be pooled or substituted.
- D09 retains explicitly labeled historical display values. It is excluded from
  the 16-criterion ranking and ablation chart. Its current per-image evidence is
  separately labeled; CSV exports leave the historical display denominator blank.
- The descriptive `Full-逐指标最大值-描述性汇总.csv` is not used.
- New ranking: FigFox is first on 5 of 16 criteria, and in the top two on 13 of 16,
  counting ties at original precision. Headlines derive from the data.
- Generation costs and times remain the original recorded means. Different
  methods have different timing boundaries; the limitation appears beside the
  comparison chart, with further details in the expandable settings.

`research-catalog.json` preserves the frozen 80 identities/source hashes and
bilingual criterion definitions from the earlier verified cohort, not its scores.
The exporter cross-checks the catalog, archive manifest, rubric, every current
judgment and both scope-specific score tables. Source file hashes, valid counts,
current judgments and evidence are published with the artifacts.

## Artifact identity and previews

All 480 original SVG downloads match the hashes recorded for the evaluated runs.
The archive normalized CRLF to LF in 240 external-method SVGs. The exporter only
restores line endings when the resulting complete file matches the original hash;
otherwise it stops. It never rewrites SVG elements or substitutes another run.

AutoFigure: 80 original SVGs, 79 WebP previews. Samples 0033 and 0097 have recorded
previews; 0030 has no archival PNG, so unchanged original SVG bytes are rendered
locally by Chromium and the derived origin is labeled. Sample 0062 contains a
truncated original SVG and retains its damaged status and original download.
No paid generation or new model evaluation is performed.

The remaining five configurations each have 80 previews. Previews preserve aspect
ratio, use WebP at quality 88 and fit within 1600×1200. Transparent pixels remain
transparent; this also corrects 48 original output PNGs whose old RGB-only previews
exposed black pixels beneath transparent backgrounds. Preview hashes are distinct
from original image and SVG hashes. Source research files are read-only.

## Loading and rendering

- Load `summary.json` once, with both aggregate scopes and eligible example IDs.
- Scrolling into research does not fetch sample records. Opening the inspector
  fetches a 12.9 KB uncompressed identity index, then only the selected sample's
  metadata. Detailed evidence loads when expanded; original SVGs load on download.
- A 120 ms selection debounce, request cancellation, guarded response updates and
  a shared fulfilled-data cache prevent stale pictures/scores and repeat requests.
- Fixed inspector height, reserved image dimensions, and `object-fit: contain`
  preserve the comparison frame. Close restores the caller's focus and scroll.
- Four dedicated 320 px picker WebPs total 55.3 KB. The three old examples alone
  fall from about 4.1 MB of PNGs to 40.8 KB; original comparison assets remain.
- The editable SVG mounts when visible. Large comparison originals begin loading
  near the viewport. Hidden crop dialogs do not mount content; the enlarged
  architecture PNG remains available while the page uses a smaller WebP preview.
- The initial home entry defers the existing product application and its styles
  until product navigation. The existing application then owns routing/state.
- Subsets preserve the installed Noto variable-font outlines and weights for the
  showcase copy. The complete original family remains available as a fallback for
  evidence and arbitrary editor text. Font licenses are included.

## Rebuild and verify

From `frontend/`, with Python/Pillow, fonttools with WOFF support and local Chrome:

```powershell
python scripts/export-research.py 'D:/Downloads/FigFox-研究资料总库/FigFox-研究资料总库'
python scripts/prepare-demo-previews.py
python scripts/prepare-showcase-fonts.py
python scripts/research-data-check.py
npm run build:pages
npm run preview -- --port 4175 --strictPort --base /figfox/
```

The usual build and cloud deployment use committed exports and require only Node
and the locked npm dependencies, not the local research archive or Python.
In a second terminal:

```powershell
$env:AUDIT_BASE_URL='http://127.0.0.1:4175/figfox'
npm run review:research
npm run review:showcase
node scripts/research-loading-check.mjs
node scripts/verify-pages.mjs
$env:PERFORMANCE_LABEL='after'
node scripts/research-performance.mjs
```

Research checks cover separate valid counts, every displayed score/rank, animated
criterion changes, all three ablation selections, inspector focus/zoom/pan/reset,
native receipts, deep links, restored scroll, SVG edits and both languages at
1440, 1280, 390 and 320 px with reduced motion. Loading checks include delayed
obsolete responses, reused caches, explicit-only evidence and original downloads,
AutoFigure previews and the damaged-original download hash. Page checks cover all
11 existing entry routes under the built `/figfox/` path.

Performance reports and screenshots are stored locally under
`frontend/.review/performance/{before,after}/`. Conditions are identical: fresh
browser contexts, cache disabled, 80 ms latency, 10 Mbps download and 4× CPU
slowdown. Each run records cold load, research scroll and inspector interaction
separately. Event Timing is a lab interaction proxy, not field INP.

## Measured results

The complete measurements are in [the versioned JSON report](figfox-performance-2026-11-04.json).
Baseline is source `0da60f7`; the final run uses the build delivered with this update.
Cold-load transfer includes everything requested before scrolling, including any
browser look-ahead loads. Decimal MB/KB are used.

| Viewport | Cold MB, before → after | Requests | LCP seconds | Cold CLS |
| --- | --- | --- | --- | --- |
| 1440×900 | 7.25 → 0.69 | 37 → 31 | 4.91 → 3.24 | 0.000842 → 0.000130 |
| 1280×720 | 7.25 → 0.69 | 37 → 31 | 11.98 → 3.01 | 0.000045 → 0.000185 |
| 390×844 | 7.25 → 0.99 | 37 → 33 | 3.98 → 2.04 | 0.000051 → 0.000068 |

Across viewports, cold JS transfer falls from 312.2 KB to 219.2 KB and CSS from
124.7 KB to 82.6 KB. Fonts fall from 1,105.1 KB to 322.1 KB. Desktop image transfer
falls from 5,584.2 KB to 58.9 KB; mobile is 239.3 KB after optimization because
Chrome starts the nearby architecture preview. The mobile run also records an
SVG canvas request during layout. Neither request preloads the research cohort.

| Viewport | Cold script ms, before → after | Layout ms, before → after | Final style recalculation ms | Cold long tasks, count / total ms, before → after |
| --- | --- | --- | --- | --- |
| 1440 | 1096 → 482 | 5385 → 2742 | 105 | 11 / 6872 → 9 / 3402 |
| 1280 | 1352 → 477 | 10653 → 2501 | 115 | 13 / 14189 → 8 / 3075 |
| 390 | 996 → 530 | 5210 → 2574 | 124 | 12 / 7496 → 11 / 3310 |

Baseline style-recalculation time was not separately captured. Timing observations
vary with the host; these are comparable lab scenarios, not population estimates.
There are still cold rendering tasks above 50 ms, so this is not a claim of zero
main-thread blocking.

Scrolling into research now requests only three selected preview images
(181.1 KB), with zero full sample records. Research-scroll long tasks total
60 / 0 / 53 ms for desktop / laptop / mobile in the final run.
Opening the four-method inspector adds 10 requests / 488.6 KB. Including the three
rapid sample selections, the complete inspector scenario adds 19 requests /
675.8 KB. It fetches metadata only for the current selections, never 80 SVGs or
80 image sets. Evidence remains deferred until expanded. The corresponding old
inspector scenario made 23 requests; total bytes varied with cancelled image
requests, and AutoFigure previews were absent, so byte totals are not a like-for-like
image coverage comparison.

The inspector scenario has 3 / 5 / 5 long tasks totaling 341 / 440 / 419 ms.
Event Timing records only three interactions per viewport, with observed maxima
136 / 128 / 136 ms. This is **not a field INP measurement**. Final full-scenario CLS
stays below 0.001 in all three viewports. Raw reports and screenshots for the final
run are in `frontend/.review/performance/after-verified/`.

Research asset URLs include a release identifier so a returning browser cannot
combine the new application with cached November 3 JSON or old opaque previews.

## Production release

Follow [the single source-SHA release flow](../../deploy/README.md). The mirror
workflow only accepts manual dispatch with a full reviewed source SHA. It checks
out that commit, builds it and writes `_release.json` from actual HEAD. Ordinary
mirror pushes cannot deploy its archived `site/` directory.
