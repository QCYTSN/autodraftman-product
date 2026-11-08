import { useEffect, useId, useRef, useState } from "react";
import { InspectorNumber } from "./EditorFields";
import type { SvgEditHandle, SvgEditSelection, SvgEditState } from "./SvgEditHost";

export function MarkerOptions({ zh }: { zh: boolean }) {
  const shapes = [["leftarrow", "左箭头", "Left arrow"], ["rightarrow", "右箭头", "Right arrow"], ["box", "方形", "Box"], ["mcircle", "圆形", "Circle"]];
  return <><option value="existing" disabled>{zh ? "已有标记" : "Existing marker"}</option><option value="nomarker">{zh ? "无" : "None"}</option>{shapes.flatMap(([value, cn, en]) => [<option key={value} value={value}>{zh ? cn : en}</option>, <option key={value + "_o"} value={value + "_o"}>{zh ? `空心${cn}` : `Open ${en.toLowerCase()}`}</option>])}</>;
}

export function EditorTextField({ label, value, onCommit, suggestions }: { label: string; value: string; onCommit: (value: string) => void; suggestions?: string[] }) {
  const [draft, setDraft] = useState(value);
  const listId = useId();
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(value); }, [value]);
  return <label className="ff-inspector-select"><span>{label}</span><input value={draft} list={suggestions ? listId : undefined} onFocus={() => { focused.current = true; }} onChange={event => setDraft(event.target.value)} onBlur={() => { focused.current = false; if (draft !== value) onCommit(draft); }} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />{suggestions && <datalist id={listId}>{suggestions.map(font => <option key={font} value={font} />)}</datalist>}</label>;
}

export function ShapeToolFields({ state, editor, zh }: { state: SvgEditState; editor: SvgEditHandle | null; zh: boolean }) {
  const shape = ["star", "polygon"].includes(state.mode) ? state.mode : state.nativeControls?.shape;
  if (shape !== "star" && shape !== "polygon") return null;
  const fields = shape === "star" ? [["points", "星角数", "Points"], ["ratio", "内外径比例", "Radius ratio"], ["shift", "偏移（弧度）", "Shift (radians)"]] : [["sides", "边数", "Sides"]];
  return <section className="ff-inspector-section ff-shape-parameters"><h3>{zh ? "绘图参数" : "Shape settings"}</h3><div className="ff-inspector-grid">{fields.map(([name, cn, en]) => <InspectorNumber key={name} label={zh ? cn : en} value={state.nativeControls?.shapeParameters[name] ?? 5} min={name === "shift" ? undefined : 1} onChange={value => editor?.execute("shape-parameter", { name, value })} />)}</div></section>;
}

export function NativeObjectFields({ selection, native, editor, zh }: { selection: SvgEditSelection; native?: SvgEditState["nativeControls"]; editor: SvgEditHandle | null; zh: boolean }) {
  return <section className="ff-inspector-section"><h3>{zh ? "名称与链接" : "Name & link"}</h3>
    {["g", "a", "svg"].includes(selection.type) && <EditorTextField label={zh ? "组名称" : "Group title"} value={native?.groupTitle || ""} onCommit={value => editor?.execute("group-title", value)} />}
    <EditorTextField label={zh ? "对象链接" : "Object link"} value={native?.link || ""} onCommit={value => editor?.execute("hyperlink", value)} />
    <div className="ff-inspector-action-grid"><button type="button" onClick={() => editor?.execute("select-parent")}>{zh ? "选中父组" : "Select parent group"}</button>{native?.link && <button type="button" onClick={() => editor?.execute("remove-hyperlink")}>{zh ? "解除链接" : "Remove link"}</button>}</div>
  </section>;
}
