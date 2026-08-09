# FigFox frontend redesign plan

## Product thesis

FigFox is an AI-native scientific figure studio. It supports three related jobs:

- Create: turn a written research description into a scientific figure.
- Guide: use text plus a reference image to guide a new figure.
- Rebuild: recover a raster scientific figure as structured, editable SVG.

Rebuild is the clearest differentiator and must receive the strongest visual and
product emphasis. The product promise is not merely image generation. It is a
figure that the researcher can inspect, correct, edit, reuse, and export.

## Current visual diagnosis

The current interface is coherent and carefully composed, but its warm paper,
clay accent, hand-drawn hero, and large editorial serif create the wrong product
category. The result reads as an academic writing or editorial research tool.
Raster-to-vector reconstruction is not visible in the first screen, and the
homepage does not prove what "editable" means.

The workspace has a sound functional skeleton but still presents as a form next
to a preview. Text and reference modes are present, while Rebuild is missing as
a first-class task. History, input, canvas, and account controls compete too
evenly for attention. The canvas should become the dominant surface.

The current SVG route safely imports, sanitizes, previews, inspects top-level
structure, and exports SVG. It is not yet an editor: selection, node, shape, and
text tools are disabled. SVG-Edit integration is therefore an editor-engine
integration, not only a cosmetic reskin.

The pricing page is the strongest existing brandable surface. Sketch, Folio,
and Atlas form a memorable progression, and their three bespoke illustrations
have character without fabricating product claims.

## Preserve

- Existing API boundaries for identity, credits, uploads, drafts, and feedback.
- Guest-to-account migration and OAuth-provider discovery.
- Draft persistence, rename, delete, autosave, and history collapse behavior.
- Reference upload validation, progress, cancellation, and private storage flow.
- Local SVG sanitization, failure recovery, typeface disclosure, and export.
- Chinese/English switching and responsive behavior.
- Honest labels such as internal preview, research prototype, and local-only.
- Pricing plan names Sketch, Folio, and Atlas.
- The three current pricing illustrations, adapted to the new color system.
- Phosphor as the single product icon family.

## Remove or replace

- All visible AutoDraftman naming, wordmarks, metadata, and alt text.
- Warm paper and clay as the dominant brand system.
- The editorial-newsroom composition and oversized serif dependency.
- The hand-drawn drafting-sheet hero as the primary product proof.
- Generic marketing statements that do not demonstrate editable output.
- A workspace IA that treats Text and Text + Reference as the highest-level
  product modes.
- Decorative drafting motifs that do not communicate product state.
- Disabled faux-editor chrome once SVG-Edit provides real editing tools.

Technical identifiers and backend routes keep their current names during this
frontend phase unless a coordinated migration is planned. Existing browser
storage keys remain readable so the rebrand does not erase user preferences or
draft context.

## New design direction

The visual world is a precise scientific creation instrument with a restrained
sense of life. It uses neutral working surfaces, deep aubergine ink, intelligent
violet for structure and focus, and scarce fox orange for generation and active
events. Curves, paths, selection geometry, and a small number of collaborating
parts become semantic product graphics rather than decoration.

Homepage and product surfaces share the same brand DNA at different densities:

- Marketing is expressive, demonstrative, and spacious.
- Workspace and editor are compact, neutral, predictable, and canvas-first.

The logo remains an independent abstract symbol plus a FigFox wordmark. It must
work in black and white before color is applied. The first concept round is a
selection exercise; no unapproved symbol becomes a permanent product asset.

## Information architecture

Public navigation:

- Product
- Examples
- Guide
- Pricing
- Workspace

Workspace task hierarchy:

- Create
  - Text
  - Text + reference
- Rebuild
  - Raster upload
  - Processing review
  - Editable SVG result

Editor hierarchy:

- Return to workspace / document title / save state / export
- Tool rail and contextual top controls
- Dominant canvas
- Layers and inspector

History, account, settings, and secondary navigation remain available but do not
compete with the canvas.

## Design system plan

### Color roles

- Neutral canvas and product surfaces: 70-80%.
- Violet structure, selection, and focus: 15-20%.
- Orange generation, processing, and important events: 5-10%.
- Error, warning, success, and information colors remain semantic and pass WCAG
  contrast requirements.

### Typography

- Use a modern sans-serif family with enough human character for the brand and
  excellent density for product UI.
- Marketing may use a more expressive size and width axis, not a separate
  editorial-serif personality.
- Product controls, numeric values, inspector rows, and metadata use stable,
  compact sans-serif typography with tabular numerals where useful.
- Chinese and English are visually tested at the same breakpoints.

### Surfaces and tokens

Define canonical tokens for color, type, spacing, radius, border, shadow,
surface, motion, and z-index. Cards are used only when containment is meaningful.
Canvas, inspector, floating tool controls, dialogs, and marketing proof each use
a distinct surface role.

Component boundaries should move toward:

- `components/ui`: accessible primitives and generic controls.
- `components/layout`: header, footer, shells, rails, and panels.
- `components/product`: figure proof, task switcher, rebuild progress, layers,
  SVG document summaries, pricing plans.
- `components/effects`: semantic path, node, and reconstruction motion only.

## Homepage plan

1. Hero: "From research ideas or pixels to editable scientific figures" with a
   real or clearly labelled internal figure showing Raster -> Processing -> SVG.
2. Product proof: before/after view with visible object, text, path, connector,
   layer, and selection evidence. No fabricated benchmark data.
3. Capabilities: Create and Guide support the larger Rebuild story instead of
   becoming three equal cards.
4. Editability: show a canvas selection, layers, text/color/path editing, and
   export so "editable SVG" is visually self-explanatory.
5. Multi-agent story: Understand -> Structure -> Compose -> Vector -> Review,
   connected by one fox-tail-like path after product value is understood.
6. Real output gallery: only repository-backed artifacts, each marked as
   internal example or research prototype where appropriate.
7. How it works, integrity/privacy, and one focused workspace CTA.

## Workspace plan

- Replace the current top-level mode switch with Create and Rebuild.
- Keep Text and Text + Reference as subordinate choices within Create.
- Give the canvas the largest area and highest contrast hierarchy.
- Convert history into a quiet collapsible rail and keep account entry secondary.
- Reuse the current draft, upload, identity, credit, and autosave logic.
- Add a Rebuild upload scene and a meaningful processing sequence:
  Understanding figure -> Recovering structure -> Rebuilding vectors ->
  Checking alignment -> Finalizing editable SVG.
- Keep current simulated or disconnected states explicitly labelled until the
  generation and reconstruction kernels are connected.

## SVG editor plan

Use SVG-Edit V7 as the editing foundation rather than reimplementing mature
canvas behavior. Integrate it inside the FigFox editor route and normalize its
color, typography, spacing, radius, iconography, focus, and motion to the FigFox
system.

Implementation preference:

- Start with the embeddable SVG-Edit editor to obtain selection, zoom, pan,
  shapes, paths, text, undo/redo, and export behavior.
- Keep FigFox-owned document title, return path, save/export state, rebuild
  context, and product-level error handling outside the embedded editor.
- Limit or hide unrelated SVG-Edit extensions and controls.
- Map generated or rebuilt SVG documents into the editor without a server round
  trip when possible.
- Preserve sanitization and current-document recovery before loading content.
- Treat mobile as review/export first; dense path editing remains desktop-first.

The full SVG-Edit editor is preferred over building a custom UI directly on
`@svgedit/svgcanvas` for the first production-capable version, because the latter
would require rebuilding tool state, menus, keyboard behavior, undo/redo, and
accessibility. A custom canvas-only integration can be reconsidered after the
editing workflow is validated.

## Motion plan

- Raster pixels resolve into paths, layers, and selection geometry.
- Agent stages activate along one controlled curve.
- Bounding boxes and nodes appear only when they indicate real editability.
- Workspace motion is short, quiet, functional, and interruptible.
- Hover, pressed, focused, selected, dragging, uploading, processing, saved,
  offline, error, success, export, undo, and delete states are explicit.
- Reduced-motion mode removes non-essential movement.

## Delivery sequence

1. Logo symbol selection and brand foundations.
2. FigFox tokens, typography, global surfaces, visible rename, and metadata.
3. Navigation and homepage composition.
4. Product proof, editability demonstration, and real-output gallery.
5. Workspace Create/Rebuild IA and processing states.
6. SVG-Edit integration and FigFox editor chrome.
7. Secondary pages and pricing adaptation.
8. Responsive behavior, accessibility, state coverage, and visual QA at 1440,
   1280, and mobile widths.

## Current decision gate

Select two or three symbol directions from the first black-and-white FigFox
exploration. Those directions will be refined, paired with wordmark studies, and
tested at 64, 32, 24, and 16 pixels before one logo is installed across the UI.
