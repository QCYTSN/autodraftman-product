import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { CaretDown, CaretRight, Eye, EyeSlash, Plus, X } from "@phosphor-icons/react";
import type { SvgEditDocument, SvgEditHandle, SvgEditPaint, SvgEditSelection, SvgEditState } from "./SvgEditHost";
import { InspectorNumber } from "./EditorFields";

type PanelProps = { state: SvgEditState; editor: SvgEditHandle | null; zh: boolean };
const units: Record<string, number> = { px: 1, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, pt: 96 / 72, pc: 16 };

export function DocumentPanel({ state, editor, zh }: PanelProps) {
  const doc = state.document;
  const [scale, setScale] = useState(1);
  if (!doc) return null;
  const update = (change: Partial<SvgEditDocument>) => editor?.execute("document-settings", { ...doc, ...change });
  const factor = units[doc.unit] || 1;
  return <div className="ff-inspector-scroll">
    <section className="ff-inspector-section"><h3>{zh ? "画布" : "Canvas"}</h3>
      <div className="ff-inspector-grid">
        <InspectorNumber label={zh ? "宽度" : "Width"} value={doc.w / factor} min={.1} onChange={value => update({ w: value * factor })} />
        <InspectorNumber label={zh ? "高度" : "Height"} value={doc.h / factor} min={.1} onChange={value => update({ h: value * factor })} />
      </div>
      <label className="ff-inspector-select"><span>{zh ? "单位" : "Units"}</span><select aria-label={zh ? "单位" : "Units"} value={doc.unit} onChange={event => update({ unit: event.target.value })}>{Object.keys(units).map(unit => <option key={unit}>{unit}</option>)}</select></label>
      <p className="ff-inspector-note">{Math.round(doc.w)} × {Math.round(doc.h)} px</p>
    </section>
    <section className="ff-inspector-section"><h3>{zh ? "网格与吸附" : "Grid & snapping"}</h3>
      <label className="ff-editor-check"><input type="checkbox" checked={state.gridVisible} onChange={() => editor?.execute("toggle-grid")} />{zh ? "显示网格" : "Show grid"}</label>
      <label className="ff-editor-check"><input type="checkbox" checked={doc.snap} onChange={event => update({ snap: event.target.checked })} />{zh ? "吸附到网格" : "Snap to grid"}</label>
      <InspectorNumber label={zh ? "间距 px" : "Spacing px"} value={doc.snapStep} min={.1} onChange={snapStep => update({ snapStep })} />
      <button type="button" className="ff-inspector-wide-action" onClick={() => editor?.execute("preferences")}>{zh ? "背景、标尺与偏好设置" : "Background, rulers & preferences"}</button>
    </section>
    <section className="ff-inspector-section"><h3>{zh ? "导出图片" : "Export image"}</h3>
      <label className="ff-inspector-select"><span>{zh ? "倍率" : "Scale"}</span><select value={scale} onChange={event => setScale(Number(event.target.value))}>{[1, 2, 3, 4].map(value => <option key={value} value={value}>{value}×</option>)}</select></label>
      <div className="ff-inspector-action-grid">{["png", "jpeg"].map(format => <button type="button" key={format} onClick={() => editor?.execute("export-raster", { format, scale })}>{format.toUpperCase()}</button>)}</div>
      <p className="ff-inspector-note">{zh ? "PNG 保留透明背景；JPEG 使用白色背景。" : "PNG preserves transparency. JPEG uses a white background."}</p>
    </section>
    <section className="ff-inspector-section"><h3>{zh ? "完整工具" : "All tools"}</h3>
      <p className="ff-inspector-note">{zh ? "打开完整工具布局，使用更多绘图、对象属性和渐变操作。" : "Open the complete layout for additional drawing, object and paint controls."}</p>
      <button className="ff-inspector-wide-action" type="button" onClick={() => editor?.execute("native-ui", true)}>{zh ? "打开完整工具" : "Open all tools"}</button>
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

export function AdvancedSelectionFields({ selection, editor, zh }: { selection: SvgEditSelection; editor: SvgEditHandle | null; zh: boolean }) {
  const attribute = (name: string, value: string | number) => editor?.execute("attribute", { name, value, targetId: selection.id });
  const text = ["text", "tspan", "textpath"].includes(selection.type);
  return <>
    {Object.keys(selection.geometry).length > 0 && <section className="ff-inspector-section"><h3>{zh ? "形状参数" : "Shape geometry"}</h3><div className="ff-inspector-grid">{Object.entries(selection.geometry).map(([name, value]) => <InspectorNumber key={name} label={name} value={value} min={["r", "rx", "ry"].includes(name) ? 0 : undefined} onChange={next => attribute(name, next)} />)}</div></section>}
    {selection.node && <section className="ff-inspector-section"><h3>{zh ? "选中节点" : "Selected node"}</h3><div className="ff-inspector-grid">{(["x", "y"] as const).map(name => <InspectorNumber key={name} label={`Node ${name.toUpperCase()}`} value={selection.node![name]} onChange={value => editor?.execute("node-attribute", { name, value })} />)}</div><label className="ff-inspector-select"><span>{zh ? "线段" : "Segment"}</span><select value={selection.node.type === 4 ? 4 : 6} onChange={event => editor?.execute("node-type", Number(event.target.value))}><option value={4}>{zh ? "直线" : "Straight"}</option><option value={6}>{zh ? "曲线" : "Curve"}</option></select></label></section>}
    {text && <section className="ff-inspector-section"><h3>{zh ? "文字间距" : "Text spacing"}</h3><div className="ff-inspector-grid">
      <InspectorNumber label={zh ? "字距" : "Letters"} value={selection.letterSpacing} onChange={value => attribute("letter-spacing", value)} />
      <InspectorNumber label={zh ? "词距" : "Words"} value={selection.wordSpacing} onChange={value => attribute("word-spacing", value)} />
      <InspectorNumber label={zh ? "文字长度" : "Text length"} value={selection.textLength} min={0} onChange={value => attribute("textLength", value || "")} />
    </div><label className="ff-inspector-select"><span>{zh ? "长度调整" : "Length adjustment"}</span><select value={selection.lengthAdjust} onChange={event => attribute("lengthAdjust", event.target.value)}><option value="spacing">{zh ? "间距" : "Spacing"}</option><option value="spacingAndGlyphs">{zh ? "间距和字形" : "Spacing & glyphs"}</option></select></label></section>}
    {["path", "line", "polyline", "polygon"].includes(selection.type) && <section className="ff-inspector-section"><label className="ff-inspector-select"><span>{zh ? "中间标记" : "Mid marker"}</span><select value={selection.markerMid && selection.markerMid !== "none" ? "existing" : "nomarker"} onChange={event => editor?.execute("marker-mid", event.target.value)}><option value="existing" disabled>{zh ? "已有标记" : "Existing marker"}</option><option value="nomarker">{zh ? "无" : "None"}</option><option value="rightarrow">Arrow</option><option value="box">Box</option><option value="mcircle">Circle</option></select></label></section>}
    <section className="ff-inspector-section"><h3>{zh ? "对象属性" : "Object properties"}</h3>
      <label className="ff-inspector-select"><span>ID</span><input key={`id-${selection.id}`} defaultValue={selection.id} onBlur={event => { if (event.target.value !== selection.id) attribute("id", event.target.value); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>
      <label className="ff-inspector-select"><span>Class</span><input key={`class-${selection.id}`} defaultValue={selection.className} onBlur={event => { if (event.target.value !== selection.className) attribute("class", event.target.value); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} /></label>
      {selection.type === "use" && <button className="ff-inspector-wide-action" type="button" onClick={() => editor?.execute("unlink-use")}>{zh ? "解除引用，独立编辑" : "Unlink instance"}</button>}
    </section>
  </>;
}

function hex(color: string) {
  const context = document.createElement("canvas").getContext("2d")!;
  context.fillStyle = color;
  const resolved = context.fillStyle;
  if (/^#[0-9a-f]{6}$/i.test(resolved)) return resolved;
  if (/^#[0-9a-f]{3}$/i.test(resolved)) return `#${resolved.slice(1).split("").map(c => c + c).join("")}`;
  return "#000000";
}

export function PaintDialog({ type, paint, editor, zh, onClose }: { type: "fill" | "stroke"; paint?: SvgEditPaint; editor: SvgEditHandle | null; zh: boolean; onClose: () => void }) {
  const [kind, setKind] = useState(paint?.kind === "radial" ? "radial" : paint?.kind === "linear" ? "linear" : "solid");
  const [color, setColor] = useState(hex(paint?.color || "#6243ce"));
  const [opacity, setOpacity] = useState(Math.round((paint?.opacity ?? 1) * 100));
  const [stops, setStops] = useState(paint?.stops.length ? paint.stops.map(stop => ({ ...stop, color: hex(stop.color) })) : [{ offset: 0, color: "#6243ce", opacity: 1 }, { offset: 1, color: "#f4d2c3", opacity: 1 }]);
  const [attributes, setAttributes] = useState<Record<string, string>>(paint?.attributes || {});
  const title = type === "fill" ? (zh ? "填充" : "Fill") : (zh ? "描边" : "Stroke");
  const gradient = `${kind === "radial" ? "radial-gradient(circle" : "linear-gradient(90deg"}, ${[...stops].sort((a, b) => a.offset - b.offset).map(stop => `${stop.color} ${stop.offset * 100}%`).join(", ")})`;
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose(); }}><Dialog.Portal><Dialog.Backdrop className="modal-backdrop" /><Dialog.Viewport className="dialog-viewport"><Dialog.Popup className="ff-editor-dialog ff-paint-dialog">
    <div className="ff-editor-dialog-heading"><div><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{zh ? "颜色、渐变与独立透明度" : "Color, gradient and paint opacity"}</Dialog.Description></div><Dialog.Close aria-label={zh ? "关闭" : "Close"}><X size={20} /></Dialog.Close></div>
    <div className="ff-paint-preview" style={{ background: kind === "solid" ? color : gradient, opacity: opacity / 100 }} />
    <label className="ff-inspector-select"><span>{zh ? "类型" : "Type"}</span><select aria-label={zh ? "类型" : "Type"} value={kind} onChange={event => setKind(event.target.value)}><option value="solid">{zh ? "纯色" : "Solid"}</option><option value="linear">{zh ? "线性渐变" : "Linear gradient"}</option><option value="radial">{zh ? "径向渐变" : "Radial gradient"}</option></select></label>
    {kind === "solid" ? <label className="ff-inspector-select"><span>{zh ? "颜色" : "Color"}</span><input type="color" value={color} onChange={event => setColor(event.target.value)} /></label> : <>
      <div className="ff-gradient-stops">{stops.map((stop, index) => <div className="ff-gradient-stop" key={index}><input aria-label={`${zh ? "色标颜色" : "Stop color"} ${index + 1}`} type="color" value={stop.color} onChange={event => setStops(previous => previous.map((item, i) => i === index ? { ...item, color: event.target.value } : item))} /><label><span>{zh ? "位置 %" : "Position %"}</span><input type="number" min={0} max={100} value={Math.round(stop.offset * 100)} onChange={event => setStops(previous => previous.map((item, i) => i === index ? { ...item, offset: Math.max(0, Math.min(100, Number(event.target.value))) / 100 } : item))} /></label><label><span>{zh ? "透明度 %" : "Opacity %"}</span><input type="number" min={0} max={100} value={Math.round(stop.opacity * 100)} onChange={event => setStops(previous => previous.map((item, i) => i === index ? { ...item, opacity: Math.max(0, Math.min(100, Number(event.target.value))) / 100 } : item))} /></label><button type="button" aria-label={zh ? "删除色标" : "Delete stop"} disabled={stops.length <= 2} onClick={() => setStops(previous => previous.filter((_, i) => i !== index))}><X size={14} /></button></div>)}</div>
      <button className="ff-inspector-wide-action" type="button" disabled={stops.length >= 64} onClick={() => setStops(previous => [...previous, { offset: .5, color: "#b4a0eb", opacity: 1 }])}><Plus size={14} />{zh ? "添加色标" : "Add stop"}</button>
      <div className="ff-inspector-grid">{(kind === "linear" ? ["x1", "y1", "x2", "y2"] : ["cx", "cy", "r", "fx", "fy"]).map(name => <label className="ff-inspector-select" key={name}><span>{name}</span><input value={attributes[name] ?? (name === "x2" ? "100%" : ["x1", "y1", "y2"].includes(name) ? "0%" : "50%")} onChange={event => setAttributes(previous => ({ ...previous, [name]: event.target.value }))} /></label>)}</div>
      <label className="ff-inspector-select"><span>{zh ? "坐标单位" : "Coordinates"}</span><select value={attributes.gradientUnits || "objectBoundingBox"} onChange={event => setAttributes(previous => ({ ...previous, gradientUnits: event.target.value }))}><option value="objectBoundingBox">{zh ? "相对对象" : "Object bounds"}</option><option value="userSpaceOnUse">{zh ? "画布坐标" : "Canvas coordinates"}</option></select></label>
    </>}
    <label className="ff-inspector-select"><span>{zh ? "透明度" : "Opacity"} {opacity}%</span><input type="range" min={0} max={100} value={opacity} onChange={event => setOpacity(Number(event.target.value))} /></label>
    <div className="ff-editor-dialog-actions"><Dialog.Close className="product-button product-button-secondary">{zh ? "取消" : "Cancel"}</Dialog.Close><button className="product-button product-button-primary" type="button" onClick={() => { editor?.execute("paint", { type, kind, color, opacity: opacity / 100, stops, attributes }); onClose(); }}>{zh ? "应用" : "Apply"}</button></div>
  </Dialog.Popup></Dialog.Viewport></Dialog.Portal></Dialog.Root>;
}
