# FigFox Presentation Mode

This is the V1 guide at commit `4d53116`. The current seven-scene interface and compatible offline download are documented in [Presentation Mode V2](figfox-presentation-visual-v2.md).

## Scope and baseline

This independent walkthrough explains saved experimental artifacts. Live generation remains in the existing workspace.

- Branch: codex/figfox-presentation-mode.
- Baseline: c67feff986f5f9de0e1a139d416eefcccf8a3b80.
- Specification: FigFox_Codex_Interactive_Demo_Prompt.md.
- Architecture: existing frontend/public/assets/demo/framework-v80.svg, SHA-256 bf708712b0ad50cf78f0c6b68f0efe11de8fba31a821c9c1a1fe47d0a8fcc55f.
- Existing homepage player remains 18 seconds and uses sample-0072. Presentation Mode independently uses sample-0001.
- No applicable AGENTS.md was found in the target frontend/docs hierarchy.
- Existing untracked figfox-film/, figfox-promo/, figfox-promo-v2/ remain outside this change.
- No models, SAM services, accounts, billing or live generation were invoked.

## One-page operating guide

From the repository root:

~~~powershell
Set-Location frontend
npm ci
npm run dev
~~~

Open http://127.0.0.1:5173/presentation. Assets decode before “开始讲解” becomes available. The homepage method heading opens this route in a new tab.

~~~powershell
npm run presentation:prepare
npm run presentation:build
npm run build:pages
npm run preview -- --mode github-pages --port 5186 --strictPort
~~~

Pages preview: http://127.0.0.1:5186/figfox/presentation.
Planned public URL: https://qcytsn.github.io/figfox/presentation. Public availability requires the existing reviewed-SHA release procedure in [deploy/README.md](../deploy/README.md).

Copy frontend/presentation-dist/FigFox-Architecture-Demo.html to another folder or computer and double-click it. No server, external font or network is required. Website builds also emit it at frontend/dist/presentation-downloads/FigFox-Architecture-Demo.html. The dev server serves the same file at that download URL.

Online language follows the website; offline defaults to Chinese. Append ?lang=en for English. Language changes preserve the cue, selection and edited SVG.

| Control | Action |
| --- | --- |
| → / PageDown / Space | Next state; stays at the final state |
| ← / PageUp | Previous state |
| Home / End | Overview / Edit |
| 1 / 2 / 3 | First state of each stage |
| B | Before / after single view in Repair |
| N | Speaker notes |
| H / ? | Help |
| F | Fullscreen |
| Escape | Close details; browser controls fullscreen exit |

Eight states require seven advances. There is no autoplay. Inputs retain editing keys; buttons retain native Enter/Space semantics. Repeat events are ignored. Effective navigation is separated by at least 250 ms.

In Edit, select the label, fill the example, apply, then download. “恢复原文” restores that text node. Navigation preserves the copy; “重置演示” in Help resets the walkthrough.

## Case provenance and labels

Manifest: frontend/public/assets/presentation/sample-0001/manifest.json. Both entry points use its generated data module and shared components.

| Material | Source and displayed meaning |
| --- | --- |
| Reference | Same-run inputs/source.png; lossless WebP with identical decoded RGB pixels |
| Draft | Same-run inputs/initial.svg; identical to public sample-0001/C.svg |
| Final | Same-run S2.svg; identical to public sample-0001/A.svg |
| SAM view | reference-crop-illustration: “素材辅助机制示意”; three rectangular crops, segmentation count null |
| Repair | transaction-snapshot: “该事务执行前 / 该事务执行后” |
| Source/final regions | author-verified after visual inspection |
| Draft regions | model-recorded, original G1 coordinates retained |
| Gap Guidance | not-recorded: “当前材料未记录此分支调用” |
| Models | Recorded G1/G2: GPT-5.5. Unavailable G0 name: role label “初稿生成模型” |

Accessible SAM preflight catalogs have another source hash. The same-run G0 proof retains a catalog hash, but actual crop/catalog bytes are absent from the accessible archive. No preflight assets are presented as this case's SAM result.

B1 fact check: F_B_pool_arrow, confirmed. Transaction: T_B_pooling_arrow_and_feature_container, targeting green_pooling_path_left and feature_dots_top. The second target also addresses the planner's associated feature-container finding. B2/D1 retain their own G1 observations; missing independent fact checks are not fabricated.

Archived executor SHA-256: 2276f55cca4d9c060064e87da47cdaea64d04a73ff1a10e97381071a16733255. It reproduced all 13 edits byte-for-byte:

- Draft: 45f03aece4eecf326548b11eb3ff43b11f212bfd4016649ae85392f18d6650c1.
- Final: 94e9648d7481a98548eca3ce4cf95f9e6427d1913cbd107e310f3c4e77d529f3.
- Pre-B1: 7c9d8ee06541cae2ac31ee29f1f7ff40c91bb0aabf40039d2c349c637e81db71.
- Post-B1: 33e3b216d1afd2b168aeb8c68eaad611197420842a6dad8fc84a1a1f9364dda9.

Snapshots include the preceding transaction context. Outside the two declared target subtrees the before/after documents are identical. The replay journal matches the original. Counts 13 planned / 13 executed describe the full run; B1 contains two operations. Empty unresolved records and a missing visual-quality verdict remain distinct.

Original experiment files are read-only. Only selected images, SVGs, curated evidence and hashes are public. Private paths, request IDs, provider bodies, credentials and financial logs are excluded.

Optional archival regeneration, separate from ordinary npm builds:

~~~powershell
python scripts/prepare-presentation-case.py "<FigFox research archive root>"
npm run presentation:prepare
~~~

This optional step requires Pillow and the expected archived executor. It checks executor identity, whole-run output hash, journal, write scope, dimensions, editable node and image pixels. Normal builds need only checked-in resources and locked npm dependencies.

## Implementation

main.tsx chooses the independent lazy entry before importing ProductSiteRoot. Product fonts, providers, editor and API initialization stay in the product branch. SiteEntry.tsx and its business state are unchanged.

The 1600×900 canvas scales as one unit using ResizeObserver. Geometry, controls and overlays share the transform. Main content stays on one screen; details alone scroll. Layout, colors, type and transient motion follow the specification.

SVGs use the existing sanitizer. Display instances get separate ID maps with marker, clip, use, stylesheet and accessibility references rewritten. Overlays remain outside the document. Bounds account for nested transforms. Text editing changes a single recorded node, preserving sibling tspans and attributes. Exports contain original document IDs and no observation UI.

The standalone build emits a single IIFE and stylesheet. The packer escapes script terminators and Unicode separators, inlines resources and enforces 20 MiB. Runtime readiness counts actual image decodes.

## Six-act script

| Act / timing | State(s) | 中文讲稿 |
| --- | --- | --- |
| I · 0–10s | overview | FigFox 将科研图片重建为可编辑 SVG。接下来用同一个案例，展示重建、检查和修复三个阶段。 |
| II · 10–35s | assets → draft | 系统先准备局部视觉素材，为初稿重建提供参考。这里可以查看素材来自原图的哪个位置；这一画面展示素材辅助机制。初稿已经包含可操作的 SVG 对象，但还需要和原图核对。 |
| III · 35–65s | issue-map → evidence | 系统把差异定位到具体区域。重点看 B1：原图中的绿色箭头向上再向右，初稿却指向下方。对应检查记录为修复提供了视觉依据。 |
| IV · 65–85s | plan | 经过复核，问题被映射到具体 SVG 对象，并形成针对路径及关联对象的原生修改计划。 |
| V · 85–105s | repair | 本地执行器将计划落实为修改。这里展示该事务真实的修改前后，可以直接检查目标区域发生了什么变化。 |
| VI · 105–120s | edit | 最终结果仍然是 SVG。现在直接修改这段文字，并把修改后的文件导出。 |

English notes, also available in the N panel:

1. FigFox reconstructs research images as editable SVGs. One case shows reconstruction, inspection and repair.
2. Local visual assets provide references; this view illustrates the mechanism. The draft contains editable objects. It still needs checking against the reference.
3. Differences are located in specific regions. The reference arrow rises then turns right; the draft points down. The verification record grounds the repair in visual evidence.
4. Verified issues map to specific SVG objects. A native edit plan targets the path and related feature objects.
5. The local executor applies the plan. Compare the recorded transaction states to inspect changes in the target region.
6. The result is still an SVG. Edit this text and export the modified document.

## Verification and release

Run npm run review:presentation after building. It starts isolated Pages-preview/dev servers, tests online/offline entries, saves screenshots and shuts down test servers. CHROME_PATH selects another Chromium executable; AUDIT_BASE_URL optionally supplies an existing Pages preview.

The [acceptance report](reviews/figfox-presentation-mode/README.md) records results, screenshots, limitations and product regression checks. Working output is frontend/.review/presentation/.

macOS and the lecture computer remain device checks. Copy only the HTML, disable networking, walk all eight states, switch languages, enter/exit fullscreen, set browser zoom to 125%, edit/export and reopen the SVG. Record browser/OS versions and font substitution.

Delivery is the branch, commits, HTML and acceptance evidence. Public release uses the existing reviewed-full-SHA workflow; this task does not dispatch it. After approval, publish the reviewed SHA, then verify _release.json, refreshed /figfox/presentation and offline download.
