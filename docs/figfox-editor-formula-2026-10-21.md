# LaTeX formula editing — 2026-10-21

The inspector previously edited SVG text and paths, but had no mathematical typesetting input. The editor now has a **Formula · LaTeX** section in Properties and a **LaTeX formula** entry in the Edit menu.

## User flow

1. Select an existing formula group or text object, or leave the canvas unselected to insert a new formula.
2. Open Formula · LaTeX. Enter an expression or use the Greek letter, fraction, root, power, subscript, sum and matrix templates.
3. Check the preview, then choose Replace selection, Apply to formula, or Insert formula. Ctrl/Cmd+Enter applies to the selection, or inserts when nothing is selected.
4. Export SVG. Reopen the file in FigFox to continue editing the stored LaTeX.

Plain SVG text is copied into the input as a starting point; its layout and superscripts still need comparison with the original. Outlined paths do not contain recoverable LaTeX: select the complete old formula group and enter its expression to replace it. There is no OCR or automatic path-to-LaTeX reconstruction.

## Implementation boundaries

- MathJax 4.1.3, locally bundled with the TeX SVG font. Uses base, AMS, newcommand and boldsymbol packages, including fractions, radicals, accents, Greek letters, matrices and aligned equations. This is mathematical LaTeX input, not a complete LaTeX document compiler.
- Input may include `$…$`, `$$…$$`, `\(…\)` or `\[…\]` delimiters.
- A lazy worker handles debounced preview rendering; regular canvas editing does not load the 2.78 MB uncompressed renderer. No CDN runtime, formula uploads, require/autoload, HTML or URL extensions.
- A new parser per render isolates macros. Input length, macro expansion, output length, vector count and worker timeout are bounded. Invalid input leaves the canvas unchanged.
- Vector groups carry `data-figfox-latex` and `data-figfox-math-scale`. Both the app import sanitizer and the SVG-Edit preparation boundary preserve this metadata. Other editors may remove it, and explicitly ungrouping a formula removes its formula-level editing contract.
- Exported math uses self-contained paths, without an external glyph cache. Unsupported Unicode glyphs can fall back to SVG text and device fonts.
- Replacement retains the object's ID, parent, local upper-left position, rotation/transform, initial height, fill and applicable opacity/clipping/filter attributes. Subsequent expression changes retain typesetting scale and may change overall width/height naturally. One undo restores the original object.
- New formula groups are selected atomically, including a 6 CSS pixel hit tolerance. Their glyph paths do not flood the default layer tree.

## Verification

`npm run build:pages` passes. The formula workflow is checked against the compiled Pages build, including:

- Rotated/scaled nested text replacement; position, height, color and sibling preservation.
- One-step undo/redo and repeated formula edits without position drift.
- Invalid LaTeX and unsupported URL commands leave the canvas unchanged.
- Download, session reload, fresh SVG import, and another edit after import.
- Actual pointer selection of a formula, matrix insertion and undo.
- Desktop and narrow English/Chinese layouts, including 320 px width.

Evidence and edited copies: `frontend/.review/editor-formula/compiled/`. The existing selection checks (11) and reliability checks (8) also pass. These are disposable editor fixtures; they do not constitute D13/D14/D16 verification of any final research sample.

Reviewed correctness, boundaries, security, accessibility and performance before publication. The existing general bundle-size warning remains. The added renderer and font have no reported production advisory in the installation audit; the existing DOMPurify IN_PLACE advisories are outside this change and the app does not use IN_PLACE.

Official implementation references: [MathJax direct module usage](https://docs.mathjax.org/en/latest/server/direct.html), [MathJax font support](https://docs.mathjax.org/en/latest/output/fonts.html).
