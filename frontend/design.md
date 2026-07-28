# Design — AutoDraftman

This file is the visual source of truth for the local AutoDraftman web app.
Pages share the same typography, colour, spacing, controls, and motion. Extend
this system deliberately; do not regenerate a separate theme per route.

## Genre

Editorial, with technical product controls.

## Concept

**Scientific Draftsman / 科研制图师.** The product behaves like a modern
craftsperson's studio: pale oak, warm drafting paper, vellum, graphite, brass
instruments, and mist-blue technical notation. Depth comes from one upper-left
light source, layered sheets, material contrast, and hand-built scientific SVG
components. The voice is rigorous and quiet, with enough tactility to feel made.

## Macrostructure family

- Marketing pages: **Map / Diagram**, using one spatial research constellation
  and H9 hand-built SVG enrichment instead of repeated linear sections.
- App pages: **Workbench**, expressed as a pale-oak drafting desk with a tool
  board, vellum input surfaces, ruler controls, and one raised result sheet.
- Pricing pages: **Narrative Workflow**, moving through Pencil → Compass → Plate
  as three stages of the same drafting craft.

## Theme

- Paper: `oklch(96.4% 0.019 79)`
- Secondary paper: `oklch(98.7% 0.01 82)`
- Ink: `oklch(22% 0.022 51)`
- Muted ink: `oklch(48% 0.02 60)`
- Rule: `oklch(83.5% 0.028 72)`
- Accent: `oklch(75% 0.126 76)` — brass ochre, under 5% of a viewport
- Strong accent: `oklch(52% 0.14 57)` — accessible text and rules
- Support: `oklch(88% 0.04 255)` — faded blueprint blue, functional states
- Oak: `oklch(84% 0.052 67)` — workbench surfaces
- Vellum: `oklch(98% 0.022 86 / 0.84)` — layered input and proof surfaces
- Focus: `oklch(55% 0.16 53)`

## Typography

- Display: **Newsreader Variable + Noto Serif SC Variable**, weight 520, upright.
- Body/UI: **IBM Plex Sans Variable**, weight 400, CJK system sans fallback.
- Third face: none.
- Display tracking: `-0.032em`.
- Home hero scale: `clamp(2.65rem, 4.7vw, 4.2rem)`.
- Display scale: `clamp(3rem, 7vw, 5.25rem)`.
- Figure labels use the body family in small tabular caps; mono is not decorative.

## Spacing

A four-point named scale lives in `tokens.css`. Page CSS uses named tokens and
does not improvise raw colours or font families.

## Motion

- One quiet page entrance and one SVG ink-on sequence.
- Link underline, tool emphasis, and button press are the only decorative
  microinteractions.
- Functional progress remains visible.
- Reduced motion collapses spatial movement to a short opacity transition.

## Microinteractions stance

- Visible keyboard focus is immediate.
- Hover always has a focus or click equivalent.
- Successful visible actions are silent.
- Loading, error, and disabled states remain explicit.
- No universal hover lift, bounce, parallax, or scroll-triggered section reveals.

## CTA voice

- Primary: graphite fill, paper text, short verb, compact tool-like corners.
- Secondary: typographic link or quiet paper outline, never a large pill.
- Accent colour marks direction; it does not fill large surfaces.

## Per-page allowances

- Home uses a hand-built research constellation plus the supplied scientific
  figure as a raised proof plate.
- Workspace uses material metaphors only where they clarify function; the
  generator remains the visual centre.
- Pricing uses three distinct drafting instruments and material stages, not
  three equal SaaS card towers.

## What pages MUST share

- Lowercase `autodraftman` wordmark and compass-nib mark.
- Warm paper, pale oak, graphite ink, brass accent, and faded blueprint support.
- Display/body pairing, control heights, focus ring, and button voice.
- Upper-left lighting direction, layered paper shadows, and varied rhythm.
- The scientific component set: molecule nodes, cells, flows, plates, compass,
  pencil, registration marks, and drafting hands.

## What pages MAY differ on

- Proof placement and figure crop.
- Section spacing within the shared scale.
- App-specific state colour and density.

## Exports

### tokens.css

`tokens.css` at the frontend root is the canonical runtime export.

### Tailwind v4 `@theme`

```css
@theme {
  --color-paper: oklch(96.4% 0.019 79);
  --color-paper-2: oklch(98.7% 0.01 82);
  --color-paper-3: oklch(92.8% 0.03 75);
  --color-ink: oklch(22% 0.022 51);
  --color-muted: oklch(48% 0.02 60);
  --color-rule: oklch(83.5% 0.028 72);
  --color-accent: oklch(75% 0.126 76);
  --color-wood: oklch(84% 0.052 67);
  --color-vellum: oklch(98% 0.022 86 / 0.84);
  --font-display: "Newsreader Variable", "Noto Serif SC Variable", serif;
  --font-body: "IBM Plex Sans Variable", sans-serif;
  --spacing-md: 1.5rem;
  --spacing-xl: 3rem;
  --text-display: clamp(3rem, 7vw, 5.25rem);
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
```

### DTCG `tokens.json`

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(96.4% 0.019 79)", "$type": "color" },
    "ink": { "$value": "oklch(22% 0.022 51)", "$type": "color" },
    "accent": { "$value": "oklch(75% 0.126 76)", "$type": "color" },
    "support": { "$value": "oklch(88% 0.04 255)", "$type": "color" },
    "wood": { "$value": "oklch(84% 0.052 67)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Newsreader Variable, Noto Serif SC Variable, serif", "$type": "fontFamily" },
    "body": { "$value": "IBM Plex Sans Variable, sans-serif", "$type": "fontFamily" }
  },
  "space": {
    "md": { "$value": "1.5rem", "$type": "dimension" },
    "xl": { "$value": "3rem", "$type": "dimension" }
  }
}
```

### shadcn/ui CSS variables

```css
:root {
  --background: 96.4% 0.019 79;
  --foreground: 22% 0.022 51;
  --card: 98.7% 0.01 82;
  --card-foreground: 22% 0.022 51;
  --primary: 22% 0.022 51;
  --primary-foreground: 96.4% 0.019 79;
  --secondary: 92.8% 0.03 75;
  --secondary-foreground: 32% 0.022 52;
  --muted: 83.5% 0.028 72;
  --muted-foreground: 48% 0.02 60;
  --border: 83.5% 0.028 72;
  --input: 83.5% 0.028 72;
  --ring: 55% 0.16 53;
  --radius: 0.6rem;
}
```
