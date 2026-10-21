# Precision color editing — 2026-10-21

The fill/stroke popover previously led with ten fixed colors and a small browser-native color input. SVG-Edit 7.4.2 itself includes a continuous color map, channel inputs and gradient editing; the limited presentation was in FigFox's replacement UI.

## Current workflow

Click Fill or Stroke in Properties → Appearance to open the continuous saturation/brightness area, hue strip, alpha strip, HEX field and numeric RGB/alpha inputs. HEX accepts 3/4/6/8 digits; 4/8-digit values include alpha. Invalid HEX blocks applying. Quick colors remain available in a collapsed section.

The panel previews a draft locally. Apply color changes the selected artwork once; Cancel or dismissing the panel discards the draft. One undo restores the previous paint and its opacity. Editing fill does not change stroke or the object's overall opacity. Changes to RGB/hue preserve fractional alpha exactly; the alpha slider and numeric percent field allow 0.01 percentage-point increments.

Gradient & opacity retains the existing linear/radial controls. Clicking any gradient stop opens the same precision picker. Set stop color updates the gradient dialog draft; applying that dialog writes the complete gradient. The nested picker appears above the dialog and supports keyboard input.

Imported CSS color alpha is combined with fill/stroke/stop opacity when preparing editable values. On apply, RGB is written as a six-digit sRGB HEX value and alpha as the separate SVG opacity attribute. Advanced CSS colors are converted to sRGB only on explicit apply. This is not a wide-gamut or print-color management workflow. Recent/document/saved palettes are outside this change.

## Implementation and validation

- `EditorColorPicker.tsx` shares the precision controls and gradient-stop popup; `react-colorful` 5.8.1 provides the color area and hue strip without additional dependencies. Alpha is independent to avoid rounding it when changing hue. MIT notice is included in public licenses.
- Existing SVG-Edit paint commands provide one history transaction and preserve unrelated artwork. Reading paint with no selection now returns the current drawing opacity, instead of always displaying 100%.
- `npm run review:editor-color` uses disposable SVG copies to check imported RGBA, actual pointer dragging, keyboard hue adjustment, exact HEX/RGB/alpha input, invalid input, cancellation, undo/redo, fill/stroke independence, gradient stops, export/reload/fresh import, and 320 px layout. Evidence: `frontend/.review/editor-color/`.
- Type checking and the Pages build pass. Reviewed correctness, scope, keyboard access, local draft performance, dependency/license and narrow-screen behavior. The installation audit reports existing DOMPurify, source-map-js and Vite advisories; no advisory is attributed to the added package. No dependency updates outside the picker were performed.

References: [SVG-Edit's color picker](https://github.com/SVG-Edit/svgedit/blob/v7.4.2/src/editor/components/seColorPicker.js), [react-colorful](https://github.com/omgovich/react-colorful).
