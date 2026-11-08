import { useEffect, useMemo, useRef, useState } from "react";
import { CaretDown, CaretRight, Eye, EyeSlash, Plus } from "@phosphor-icons/react";
import type { SvgEditDocument, SvgEditHandle, SvgEditSelection, SvgEditState } from "./SvgEditHost";
import { InspectorNumber, InspectorLength } from "./EditorFields";
import { EditorTextField, MarkerOptions } from "./EditorNativeFields";
import { colorHex, readPaintColor } from "./EditorColorPicker";

type PanelProps = { state: SvgEditState; editor: SvgEditHandle | null; zh: boolean };
const units = ["px", "mm", "cm", "in", "pt", "pc", "em", "ex"];
const canvasPresets = ["640x480", "800x600", "1024x768", "1280x720", "1280x960", "1600x1200"];

export function DocumentPanel({ state, editor, zh }: PanelProps) {
  const doc = state.document;
  const [scale, setScale] = useState(1);
  const [quality, setQuality] = useState(95);
  if (!doc) return null;
  const update = (change: Partial<SvgEditDocument>) => editor?.execute("document-settings", { ...doc, ...change });
  const prefs = state.preferences;
  return <div className="ff-inspector-scroll">
    <section className="ff-inspector-section"><h3>{zh ? "画布" : "Canvas"}</h3>
      <EditorTextField label={zh ? "文档标题" : "Document title"} value={state.nativeControls?.title || ""} onCommit={value => editor?.execute("document-title", value)} />
      <label className="ff-inspector-select"><span>{zh ? "画布预设" : "Canvas preset"}</span><select aria-label={zh ? "画布预设" : "Canvas preset"} value={canvasPresets.includes(`${doc.w}x${doc.h}`) ? `${doc.w}x${doc.h}` : "custom"} onChange={event => { if (event.target.value === "custom") return; const [w, h] = event.target.value.split("x").map(Number); update({ w, h }); }}><option value="custom">{zh ? "自定义尺寸" : "Custom size"}</option>{canvasPresets.map(value => <option key={value} value={value}>{value.replace("x", " × ")} px</option>)}</select></label>
      <div className="ff-inspector-grid">
        <InspectorLength unit={doc.unit} label={zh ? "宽度" : "Width"} value={doc.w} min={.1} onChange={w => update({ w })} />
        <InspectorLength unit={doc.unit} label={zh ? "高度" : "Height"} value={doc.h} min={.1} onChange={h => update({ h })} />
      </div>
      <label className="ff-inspector-select"><span>{zh ? "单位" : "Units"}</span><select aria-label={zh ? "单位" : "Units"} value={doc.unit} onChange={event => update({ unit: event.target.value })}>{units.map(unit => <option key={unit}>{unit}</option>)}</select></label>
      <p className="ff-inspector-note">{Math.round(doc.w)} × {Math.round(doc.h)} px</p>
      <button type="button" className="ff-inspector-wide-action" onClick={() => editor?.execute("fit-page-content")}>{zh ? "按内容裁切画布" : "Fit page to artwork"}</button>
      <label className="ff-editor-check"><input type="checkbox" checked={doc.dynamic || false} onChange={event => update({ dynamic: event.target.checked })} />{zh ? "响应式 SVG 尺寸" : "Responsive SVG dimensions"}</label>
      <p className="ff-inspector-note">{zh ? "导出时只保留 viewBox，随容器缩放。" : "Export with a viewBox, adapting to its container."}</p>
      <label className="ff-inspector-select"><span>{zh ? "图像存储" : "Image storage"}</span><select aria-label={zh ? "图像存储" : "Image storage"} value={doc.images || "embed"} onChange={event => update({ images: event.target.value as "embed" | "ref" })}><option value="embed">{zh ? "嵌入 SVG" : "Embed in SVG"}</option><option value="ref">{zh ? "保留图片链接" : "Keep image links"}</option></select></label>
    </section>
    <section className="ff-inspector-section"><h3>{zh ? "网格与吸附" : "Grid & snapping"}</h3>
      <label className="ff-editor-check"><input type="checkbox" checked={state.gridVisible} onChange={() => editor?.execute("toggle-grid")} />{zh ? "显示网格" : "Show grid"}</label>
      <label className="ff-editor-check"><input type="checkbox" checked={state.nativeControls?.rulers || false} onChange={event => editor?.execute("toggle-rulers", event.target.checked)} />{zh ? "显示标尺" : "Show rulers"}</label>
      <label className="ff-editor-check"><input type="checkbox" checked={doc.snap} onChange={event => update({ snap: event.target.checked })} />{zh ? "吸附到网格" : "Snap to grid"}</label>
      <InspectorNumber label={zh ? "间距 px" : "Spacing px"} value={doc.snapStep} min={.1} onChange={snapStep => update({ snapStep })} />
      {prefs && <label className="ff-inspector-select"><span>{zh ? "网格颜色" : "Grid color"}</span><input aria-label={zh ? "网格颜色" : "Grid color"} type="color" value={prefs.gridColor || "#000000"} onChange={event => editor?.execute("editor-preferences", { gridColor: event.target.value })} /></label>}
    </section>
    {prefs && <section className="ff-inspector-section"><h3>{zh ? "编辑背景" : "Editor background"}</h3><label className="ff-editor-check"><input type="checkbox" checked={prefs.bkgd_color === "chessboard"} onChange={event => editor?.execute("editor-preferences", { bkgd_color: event.target.checked ? "chessboard" : "#ffffff" })} />{zh ? "透明棋盘格" : "Transparency checkerboard"}</label>{prefs.bkgd_color !== "chessboard" && <label className="ff-inspector-select"><span>{zh ? "背景颜色" : "Background color"}</span><input aria-label={zh ? "背景颜色" : "Background color"} type="color" value={colorHex(readPaintColor(prefs.bkgd_color))} onChange={event => editor?.execute("editor-preferences", { bkgd_color: event.target.value })} /></label>}<EditorTextField label={zh ? "背景图片 URL" : "Background image URL"} value={prefs.bkgd_url} onCommit={bkgd_url => editor?.execute("editor-preferences", { bkgd_url })} /><p className="ff-inspector-note">{zh ? "仅用于编辑参考，不写入作品。偏好在此浏览器中保留。" : "A reference while editing; excluded from artwork. Preferences stay in this browser."}</p></section>}
    <section className="ff-inspector-section"><h3>{zh ? "导出图片" : "Export image"}</h3>
      <label className="ff-inspector-select"><span>{zh ? "倍率" : "Scale"}</span><select value={scale} onChange={event => setScale(Number(event.target.value))}>{[1, 2, 3, 4].map(value => <option key={value} value={value}>{value}×</option>)}</select></label>
      <InspectorNumber label={zh ? "JPEG / WebP 质量 %" : "JPEG / WebP quality %"} value={quality} min={0} max={100} onChange={setQuality} />
      <div className="ff-inspector-action-grid">{["png", "jpeg", "webp", "bmp"].map(format => <button type="button" key={format} onClick={() => editor?.execute("export-raster", { format, scale, quality: quality / 100 })}>{format.toUpperCase()}</button>)}<button type="button" onClick={() => editor?.execute("export-pdf")}>PDF</button></div>
      <p className="ff-inspector-note">{zh ? "PDF 按原尺寸输出图像页面。" : "PDF uses an image page at the original size."}</p>
      <p className="ff-inspector-note">{zh ? "PNG 保留透明背景；JPEG 使用白色背景。" : "PNG preserves transparency. JPEG uses a white background."}</p>
    </section>
    <section className="ff-inspector-section"><h3>{zh ? "布局" : "Layout"}</h3>
      <button className="ff-inspector-wide-action" type="button" onClick={() => editor?.execute("native-ui", true)}>{zh ? "SVG-Edit 原生布局" : "SVG-Edit layout"}</button>
    </section>
  </div>;
}

export function LayerPanel({ state, editor, zh }: PanelProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [scroll, setScroll] = useState(0);
  const [height, setHeight] = useState(400);
  const viewport = useRef<HTMLDivElement>(null);
  const docLayers = state.documentLayers || [];
  const active = docLayers.find(layer => layer.active)?.name || "";
  const selected = useMemo(() => new Set(state.selectedIds || []), [state.selectedIds]);
  const action = (action: string, value?: string) => editor?.execute("layer-action", { action, value });
  useEffect(() => {
    if (!viewport.current) return;
    const observer = new ResizeObserver(entries => setHeight(entries[0].contentRect.height));
    observer.observe(viewport.current);
    return () => observer.disconnect();
  }, []);
  const rows = useMemo(() => {
    const hidden = new Set<string>();
    return state.layers.filter(layer => {
      if (query) return `${layer.label} ${layer.type}`.toLowerCase().includes(query.toLowerCase());
      const skip = hidden.has(layer.parentId);
      if (skip || collapsed.has(layer.id)) hidden.add(layer.id);
      return !skip;
    });
  }, [state.layers, collapsed, query]);
  useEffect(() => { if (viewport.current && scroll > rows.length * 42 - height) viewport.current.scrollTop = Math.max(0, rows.length * 42 - height); }, [rows.length, height, scroll]);
  const start = Math.max(0, Math.min(Math.floor(scroll / 42) - 4, rows.length - 1));
  const shown = rows.slice(start, start + Math.ceil(height / 42) + 8);
  const uniqueName = (base: string) => { let name = base, suffix = 2; while (docLayers.some(layer => layer.name === name)) name = `${base} ${suffix++}`; return name; };
  return <div className="ff-layers-panel">
    <section className="ff-inspector-section">
      <label className="ff-inspector-select"><span>{zh ? "当前图层" : "Current layer"}</span><select aria-label={zh ? "当前图层" : "Current layer"} value={active} onChange={event => action("select", event.target.value)}>{docLayers.map(layer => <option key={layer.name}>{layer.name}</option>)}</select></label>
      <details className="ff-layer-settings"><summary>{zh ? "管理图层" : "Manage layers"}</summary>
      <label className="ff-editor-check"><input type="checkbox" checked={state.nativeControls?.layerView || false} onChange={() => editor?.execute("layer-view")} />{zh ? "只显示当前图层" : "Show current layer only"}</label>
      <button className="ff-inspector-wide-action" type="button" disabled={docLayers.length < 2} onClick={() => editor?.execute("merge-all-layers")}>{zh ? "合并全部图层" : "Merge all layers"}</button>
      <label className="ff-inspector-select"><span>{zh ? "名称" : "Name"}</span><input key={active} aria-label={zh ? "图层名称" : "Layer name"} defaultValue={active} onBlur={event => { if (event.target.value !== active) action("rename", event.target.value); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>
      <div className="ff-inspector-action-grid">
        <button type="button" onClick={() => action("create", uniqueName(zh ? "图层" : "Layer"))}><Plus size={14} />{zh ? "新建图层" : "New layer"}</button>
        <button type="button" onClick={() => action("clone", uniqueName(`${active} ${zh ? "副本" : "copy"}`))}>{zh ? "复制图层" : "Duplicate"}</button>
        <button type="button" disabled={docLayers.length < 2} onClick={() => action("delete")}>{zh ? "删除图层" : "Delete layer"}</button>
        <button type="button" disabled={docLayers.at(-1)?.active} onClick={() => action("merge")}>{zh ? "向下合并" : "Merge down"}</button>
        <button type="button" disabled={docLayers[0]?.active} onClick={() => action("up")}>{zh ? "上移图层" : "Layer up"}</button>
        <button type="button" disabled={docLayers.at(-1)?.active} onClick={() => action("down")}>{zh ? "下移图层" : "Layer down"}</button>
      </div>
      <label className="ff-inspector-select"><span>{zh ? "移动选区到" : "Move selection to"}</span><select aria-label={zh ? "移动选区到" : "Move selection to"} value="" disabled={!state.hasSelection} onChange={event => action("move-selection", event.target.value)}><option value="" disabled>{zh ? "选择图层" : "Choose layer"}</option>{docLayers.map(layer => <option key={layer.name}>{layer.name}</option>)}</select></label>
      </details>
    </section>
    <label className="ff-layer-search"><input type="search" placeholder={zh ? "查找对象…" : "Find objects…"} aria-label={zh ? "查找对象" : "Find objects"} value={query} onChange={event => { setQuery(event.target.value); if (viewport.current) viewport.current.scrollTop = 0; }} /></label>
    <div ref={viewport} className="ff-object-viewport" onScroll={event => setScroll(event.currentTarget.scrollTop)} role="tree" aria-label={zh ? "对象结构" : "Object tree"}>
      <div style={{ height: rows.length * 42, position: "relative" }}>
        {shown.map((layer, index) => <div className="ff-layer-row" key={layer.id} role="treeitem" aria-level={layer.depth + 1} aria-selected={selected.has(layer.id)} aria-expanded={layer.hasChildren ? !collapsed.has(layer.id) : undefined} data-selected={selected.has(layer.id)} style={{ position: "absolute", top: (start + index) * 42, height: 42, width: "100%", paddingLeft: Math.min(layer.depth, 10) * 10 }}>
          <button className="ff-layer-expand" type="button" disabled={!layer.hasChildren} aria-label={`${collapsed.has(layer.id) ? (zh ? "展开" : "Expand") : (zh ? "折叠" : "Collapse")} ${layer.label}`} onClick={() => setCollapsed(previous => { const next = new Set(previous); if (next.has(layer.id)) next.delete(layer.id); else next.add(layer.id); return next; })}>{layer.hasChildren && (collapsed.has(layer.id) ? <CaretRight size={12} /> : <CaretDown size={12} />)}</button>
          <button className="ff-layer-select" type="button" onClick={() => editor?.execute("select-layer", layer.id)}><span className="ff-layer-type">{layer.type[0].toUpperCase()}</span><span><strong>{layer.label}</strong><small>{layer.type}</small></span></button>
          <button type="button" className="ff-layer-visibility" aria-label={`${layer.hidden ? (zh ? "显示" : "Show") : (zh ? "隐藏" : "Hide")} ${layer.label}`} onClick={() => editor?.execute("toggle-layer", layer.id)}>{layer.hidden ? <EyeSlash size={16} /> : <Eye size={16} />}</button>
        </div>)}
      </div>
      {!rows.length && <p className="ff-inspector-note">{zh ? "没有匹配的对象" : "No matching objects"}</p>}
    </div>
  </div>;
}

export function AdvancedSelectionFields({ selection, editor, zh, unit = "px" }: { unit?: string; selection: SvgEditSelection; editor: SvgEditHandle | null; zh: boolean }) {
  const attribute = (name: string, value: string | number) => editor?.execute("attribute", { name, value, targetId: selection.id });
  const text = ["text", "tspan", "textpath"].includes(selection.type);
  return <>
    {Object.keys(selection.geometry).length > 0 && <section className="ff-inspector-section"><h3>{zh ? "形状参数" : "Shape geometry"}</h3><div className="ff-inspector-grid">{Object.entries(selection.geometry).map(([name, value]) => <InspectorLength unit={unit} key={name} label={name} value={value} min={["r", "rx", "ry"].includes(name) ? 0 : undefined} onChange={next => attribute(name, next)} />)}</div></section>}
    {selection.node && <section className="ff-inspector-section"><h3>{zh ? "选中节点" : "Selected node"}</h3><div className="ff-inspector-grid">{(["x", "y"] as const).map(name => <InspectorLength unit={unit} key={name} label={`Node ${name.toUpperCase()}`} value={selection.node![name]} onChange={value => editor?.execute("node-attribute", { name, value })} />)}</div><label className="ff-inspector-select"><span>{zh ? "线段" : "Segment"}</span><select value={selection.node.type === 4 ? 4 : 6} onChange={event => editor?.execute("node-type", Number(event.target.value))}><option value={4}>{zh ? "直线" : "Straight"}</option><option value={6}>{zh ? "曲线" : "Curve"}</option></select></label></section>}
    {text && <section className="ff-inspector-section"><h3>{zh ? "文字间距" : "Text spacing"}</h3><div className="ff-inspector-grid">
      <InspectorLength unit={unit} label={zh ? "字距" : "Letters"} value={selection.letterSpacing} onChange={value => attribute("letter-spacing", value)} />
      <InspectorLength unit={unit} label={zh ? "词距" : "Words"} value={selection.wordSpacing} onChange={value => attribute("word-spacing", value)} />
      <InspectorLength unit={unit} label={zh ? "文字长度" : "Text length"} value={selection.textLength} min={0} onChange={value => attribute("textLength", value || "")} />
    </div><label className="ff-inspector-select"><span>{zh ? "长度调整" : "Length adjustment"}</span><select value={selection.lengthAdjust} onChange={event => attribute("lengthAdjust", event.target.value)}><option value="spacing">{zh ? "间距" : "Spacing"}</option><option value="spacingAndGlyphs">{zh ? "间距和字形" : "Spacing & glyphs"}</option></select></label></section>}
    {["path", "line", "polyline", "polygon"].includes(selection.type) && <section className="ff-inspector-section"><label className="ff-inspector-select"><span>{zh ? "中间标记" : "Mid marker"}</span><select aria-label={zh ? "中间标记" : "Mid marker"} value={selection.markerMid && selection.markerMid !== "none" ? "existing" : "nomarker"} onChange={event => editor?.execute("marker-mid", event.target.value)}><MarkerOptions zh={zh} /></select></label></section>}
    <section className="ff-inspector-section"><h3>{zh ? "对象属性" : "Object properties"}</h3>
      <label className="ff-inspector-select"><span>ID</span><input key={`id-${selection.id}`} defaultValue={selection.id} onBlur={event => { if (event.target.value !== selection.id) attribute("id", event.target.value); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>
      <label className="ff-inspector-select"><span>Class</span><input key={`class-${selection.id}`} defaultValue={selection.className} onBlur={event => { if (event.target.value !== selection.className) attribute("class", event.target.value); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>
      {selection.type === "use" && <button className="ff-inspector-wide-action" type="button" onClick={() => editor?.execute("unlink-use")}>{zh ? "解除引用，独立编辑" : "Unlink instance"}</button>}
    </section>
  </>;
}

export { PaintDialog } from "./EditorPaintDialog";
