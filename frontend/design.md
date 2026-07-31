# AutoDraftman design system

This file records the visual decisions shared by the local AutoDraftman product.
`tokens.css` is the canonical runtime source for exact values.

## Design thesis

AutoDraftman combines two related voices:

- The public site is a warm scientific editorial: calm, selective, and human.
- The workspace is a precise drafting instrument: denser, quieter, and clearly
  operational.

The product should feel made for researchers, not styled as a generic AI SaaS
and not staged as a literal antique drawing desk.

## Palette

- Warm paper: `#f3eee5`
- White working surface: `#fffdf8`
- Recessed paper: `#eae1d5`
- Sand section surface: `#dfd3c3`
- Near-black ink: `#141413`
- Soft ink: `#3d3934`
- Muted ink: `#6f685f`
- Rules: `#d2c6b8` and `#b6a99a`
- Clay accent: `#c86445`
- Deep clay: `#a94e35`
- Pale clay: `#efd3c5`

Blue and green are not part of the product palette. Clay is an accent for
direction, focus, active states, and meaningful illustration details; it does
not fill large interface regions.

## Typography

- Display and narrative headings: Newsreader Variable, with Noto Serif SC for
  Chinese.
- Navigation, controls, forms, and body copy: IBM Plex Sans Variable.
- Technical values such as ratio, format, and status use the body family with
  tabular numerals rather than decorative monospaced text.

Large serif type belongs to page-level narrative. It does not appear inside
ordinary controls or property panels.

## Hierarchy and surfaces

- Only the main product proof, result sheet, and modal may visibly rise from the
  page.
- Navigation, explanatory copy, and step labels remain flat.
- A border creates a functional container; it is not a default decoration.
- Shadows identify the foreground. They do not make every card hover.
- The workspace has four layers: record rail, input panel, workbench, and the
  result or SVG document surface.
- Product modes keep an explicit return hierarchy: home → generation workspace
  → SVG editor. Compact work modes do not restore the full marketing
  navigation, but they never rely on the wordmark alone as the way back.
- A loaded SVG editor may use a tool rail, ruled workbench, document sheet, and
  property inspector. The empty state removes rulers, active tools, and
  placeholder fields; it offers one real action: open a local SVG document.

## Decoration

Decoration is welcome when it improves recognition or composition:

- crop and registration marks around a scientific proof;
- hand-drawn scientific or drafting illustrations;
- ruler ticks and nodes that correspond to real editor concepts;
- semantic marks for reference input, one-result output, and privacy.

Avoid arbitrary sequence numbers, fake versions, fake research metadata,
rotated paper stacks, decorative pill clusters, and repeated uppercase
eyebrows. The pricing vocabulary `Sketch · Folio · Atlas` is intentional and
must remain.

## Motion

- Page and pricing entrances may use a short opacity and vertical-settle motion.
- Billing switches, active tabs, navigation underlines, and tool focus may
  transition.
- No universal hover lift, parallax, bouncing, or ornamental scroll reveals.
- Reduced-motion preferences collapse movement to near-instant state changes.

## Page rules

### Home

The hero is the thesis. One supplied scientific illustration is the main proof.
The remaining decoration supports it rather than competing with it. Product
principles use semantic symbols, while the three workflow stages keep their
true sequential numbering. The workflow is a compact, clickable demonstration:
one stage owns the foreground at a time, the result canvas changes with it, and
mobile uses three readable tabs instead of a long scroll-driven presentation.
The page ends once: a small operational entry leads into the workspace, while
the footer owns the final brand statement.

### Guides and policies

The user guide is a reading surface, not a second marketing page. It uses a
compact introduction, an explicit table of contents, a restrained article
measure, and numbered sections only because the document has a real sequence.
Legal pages may share the paper palette, but body reading hierarchy takes
priority over decorative display typography.

### Workspace

The workspace must fit at common laptop sizes without turning into a marketing
page. Forms remain compact and the result surface is dominant. Generation and
SVG editing belong to the same draft but use separate work modes: the generation
workspace owns prompts, references, settings, and result preview; a generated
SVG opens in a dedicated editor route with no generation form or marketing
navigation. The same editor accepts an existing local SVG, sanitizes scriptable
or external content, previews the cleaned document, exposes its top-level
structure, and exports a cleaned copy without uploading the source file. Wide,
landscape, square, and portrait documents fit the available canvas without
cropping. Import failures preserve the current valid document and appear as
actionable canvas notices; referenced typefaces are disclosed because browser
fallbacks may change text rendering.
Unavailable manipulation tools remain disabled rather than implying false
editing support. Version one reserves precise editing for desktop; mobile
provides import, review, and export rather than dense node manipulation.

### Pricing

Sketch, Folio, and Atlas are a coherent naming system and remain visible in the
intro and individual plans. Cards stay aligned and stable. Illustration marks,
a short drafting rule, and the featured clay edge provide the visual rhythm;
the cards do not tilt or float on hover.

## Accessibility

- Focus is always visible.
- Hover has an equivalent focus or click state.
- Disabled editor controls remain legible and explain why they are unavailable.
- Operational copy and status labels remain at least 12px; only genuinely
  technical metadata may be smaller.
- Mobile interactive targets are at least 44px.
- Text contrast is maintained against every paper surface.
- Desktop and mobile layouts must not create horizontal overflow.
