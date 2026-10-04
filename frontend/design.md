# FigFox visual system

The showcase and product share white surfaces, blue-black text, restrained purple
and blue details, the supplied FigFox SVG mark, and consistent typography.
`src/features/demo/demo.css` owns showcase composition;
`src/features/product/product.css` owns the product surfaces and editor theme.
The earlier warm-paper and clay design is superseded.

## Type and color

- Chinese: Noto Sans SC. English and numbers: Google Sans Flex.
- Main text: `#1e2437`; secondary text: `#6d7384`.
- Action purple: `#6243ce`; hover: `#5035b2`; selected surfaces: `#f0ecfa`.
- Working surface: white; surrounding surface: `#fcfcfe` or a pale violet-gray.
- Borders: pale neutral purple, used to separate controls or document surfaces.

Imported SVG documents retain their own typefaces and colors. The editor UI theme
must not recolor the user's artwork.

## Layout

The showcase has a spacious first screen, one clear thesis, and demonstrations
that explain reconstruction and editability through real interactions. Research
sections preserve room for actual experiments. Missing figures show a white
placeholder rather than invented results.

Product navigation has three primary destinations: Guide, Pricing, Workspace.
The mark returns to the showcase. The SVG editor is a separate working route with
an explicit return to the workspace, file status and import/export actions.

Pricing uses three aligned plans. Sketch, Folio and Atlas retain their names,
illustration assets and original pricing values. Plan comparison and FAQ sit
below; subscriptions remain visibly unavailable until payment exists.

The guide is a reading surface with a sticky directory, a real example that
opens in the editor, and practical troubleshooting. The workspace has a draft
rail, preparation form and a library of independently saved SVGs. Source previews
and the library can be switched without removing a reference image. Mobile
stacks the form and library; history becomes a focus-managed drawer. Functional
panels may be denser than the showcase without marketing-sized headings.

## Motion and pointer

Use a brief page entrance and short transitions for actual state changes.
The showcase's initial content reveals play once; navigation and header states
respond to repeat scrolling. Avoid repeatedly hiding content that has been read.

One shared pointer lives above the showcase and product routes, outside animated
page containers. Its position follows the mouse exactly; only its shape has
elasticity. Controls, tabs and FAQ summaries share the same hover feedback.
Labels appear only for working zoom targets. Forms, sliders, text selection,
dialogs and the SVG editing region use native cursors. Editor header navigation
keeps the shared pointer. Route changes recheck the target beneath a stationary
mouse; touch input and system accessibility preferences keep native cursors.

Editor entrance animates opacity only, keeping canvas coordinates stable.
Reduced-motion and forced-color preferences disable decorative motion.

## Interaction and copy

Keep copy literal and tied to available actions. Do not present invented usage
counts, research scores, generation results, account identities or credit balances.
Use native details for FAQ and focus-managed dialogs for consequential choices.

The showcase uses the same curated assets and full sections in development and
production. Only unmeasured charts use placeholders. The static release edits,
stores and exports multiple real local SVGs. Generation, OAuth and
subscriptions have truthful pending states. A local document save is distinct
from a hosted account or a cloud backup; failed storage must not claim success.

Visible focus, names for icon controls, touch-sized targets and layouts without
page-wide horizontal overflow are part of the design. The comparison table may
scroll within its own container on narrow screens.
