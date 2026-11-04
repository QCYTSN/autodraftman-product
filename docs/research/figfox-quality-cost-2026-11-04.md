# Score gaps and quality–cost presentation

The comparison overview now leads with actual scores for text (D01), layout
(D08) and visual hierarchy (D11). Their FigFox-to-best gaps are 3.174603,
1.265823 and 1.265823 points. Across all 16 current criteria, 10 are within
5 points of their per-criterion best. Complete ranks remain in a disclosure;
the five-group profiles and all 17 original score rows remain available.

The quality–cost chart places quality on a 0–100 horizontal axis and recorded
USD per image on an inverted vertical axis: $0 at the top, increasing costs
toward the bottom. Higher scores and lower costs therefore move toward the
upper right. Both axis directions are explicitly labeled. It defaults to an explicitly
labeled equal-criterion arithmetic mean and supports each of the 16 current
criteria. D09 retains its historical display and is excluded from this mean.
Each criterion has weight 1/16 (6.25%); eligible image counts vary by criterion,
so this mean is not a pooled image pass rate. No fitted or subjective weights
were introduced. Computation uses the four-method scope, never ablation scores.

| Method | 16-criterion mean | Recorded USD / image | Recorded minutes / image |
| --- | ---: | ---: | ---: |
| FigFox | 88.00036349 | 1.014800085 | 6.17189633 |
| DrawAI | 90.75224979 | 2.124172875 | 19.18103271 |
| AutoFigure | 77.30923365 | 0.300731000 | 2.17856250 |
| Crafter | 73.20335132 | 2.365091250 | 15.56585417 |

FigFox's mean is 2.75188630 points below DrawAI's, with 52.2261066% lower
recorded cost. The chart shows both quantities separately, not a single
quality/cost ratio or a statistical-equivalence claim. Costs and times retain
their original accounting scopes, documented in Experiment settings. All four
methods' scores, costs and times remain in an expandable table.

The existing custom selector controls the chart and table together. Dots and
numeric values interpolate, interrupted changes resume from the visible value,
and reduced-motion mode updates directly. Points support mouse, touch and
keyboard selection with exact-value readouts. No chart dependency or dataset
request was added.

Validation: production build; full research browser checks (including all
16 criterion coordinates and original ranking calculations); Chinese/English
desktop, laptop, 390 px and 320 px layouts; cold-load/deferred-resource checks;
and Pages route verification. Browser captures are local under
`frontend/.review/comparison/`.

## Whole-page motion follow-up

The existing hero and reconstruction sequence remain the focal animations.
Section entrances now also cover evaluation, benchmarks, selected cases,
ablations, quality/cost and source downloads. Titles and reading-sized content
groups enter once, with a 16 px rise, 480 ms opacity transition and 560 ms
ease-out movement; sibling offsets are capped at 120 ms. Interactive groups
use opacity only, so pointer targets stay fixed during focus. Already-read content
stays visible when scrolling back. Criterion explanations and opened detail
contents use a short 220 ms transition; score/dot interpolation is unchanged.

The original entrance observer only registered the first render. A child-list
observer now registers newly inserted reveal groups, including lazy Results
and additional metric cards, without scanning on animated text or attributes.
Removed groups are unobserved and both observers disconnect on unmount.
Keyboard focus makes its group visible immediately. Reduced-motion mode shows
everything, including delayed content, and can change during the visit.

`node scripts/showcase-motion-check.mjs` checks delayed data, real intermediate
opacity, reveal coverage, quick scrolling, reverse-axis point order, bilingual
mobile labels and live preference changes. Captures are in
`frontend/.review/motion/`.
