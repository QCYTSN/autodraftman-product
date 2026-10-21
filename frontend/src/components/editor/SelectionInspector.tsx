import { InspectorNumber } from "./EditorFields";
import { ArrowClockwise, ArrowCounterClockwise, FlipHorizontal, FlipVertical, ImageSquare, Selection, TextB, TextItalic, Trash } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import type { SvgEditHandle, SvgEditMode, SvgEditSelection } from "./SvgEditHost";
import { AdvancedSelectionFields } from "./EditorPanels";

export function SelectionInspector({
  zh,
  selection,
  mode,
  editor,
  onReplaceImage,
}: {
  zh: boolean;
  selection: SvgEditSelection | null;
  mode: SvgEditMode;
  editor: SvgEditHandle | null;
  onReplaceImage: () => void;
}) {
  const setAttribute = (name: string, value: string | number) =>
    editor?.execute("attribute", { name, value, targetId: selection?.id });

  if (!selection) {
    return (
      <div className="ff-inspector-empty">
        <Selection size={24} weight="duotone" aria-hidden="true" />
        <strong>{zh ? "还没有选中对象" : "Nothing selected"}</strong>
        <p>{zh ? "选择画布中的对象后，这里会显示尺寸、样式和文字属性。" : "Select an object to edit its size, style, and text."}</p>
      </div>
    );
  }

  const isText = ["text", "tspan", "textpath"].includes(selection.type);
  const isImage = selection.type === "image";
  const isPath = ["path", "line", "polyline", "polygon"].includes(selection.type);
  const isEditablePath = selection.type === "path";
  const isNodeEditing = isEditablePath && mode === "pathedit";
  const canConvertToPath = ["rect", "circle", "ellipse", "line", "polyline", "polygon"].includes(selection.type);
  const isRect = selection.type === "rect";

  return (
    <div className="ff-inspector-scroll">
      <section className="ff-inspector-section ff-selection-summary">
        <div>
          <span>{selection.type}</span>
          <strong>{selection.id || (zh ? "未命名对象" : "Unnamed object")}</strong>
        </div>
        <button
          type="button"
          className="ff-inspector-danger"
          onClick={() => editor?.deleteSelection()}
          aria-label={zh ? "删除对象" : "Delete object"}
        >
          <Trash size={16} />
        </button>
      </section>

      {!isNodeEditing && <section className="ff-inspector-section">
        <h3>{zh ? "位置与尺寸" : "Position & size"}</h3>
        <div className="ff-inspector-grid">
          <InspectorNumber label="X" value={selection.x} onChange={(value) => setAttribute("x", value)} />
          <InspectorNumber label="Y" value={selection.y} onChange={(value) => setAttribute("y", value)} />
          <InspectorNumber label="W" value={selection.width} min={0} onChange={(value) => setAttribute("width", value)} />
          <InspectorNumber label="H" value={selection.height} min={0} onChange={(value) => setAttribute("height", value)} />
          <InspectorNumber label={zh ? "旋转" : "Rotate"} value={selection.rotation} onChange={(value) => setAttribute("rotation", value)} />
          {isRect && (
            <InspectorNumber label={zh ? "圆角" : "Radius"} value={selection.radius} min={0} onChange={(value) => setAttribute("radius", value)} />
          )}
        </div>
        <div className="ff-inspector-icon-row">
          <button type="button" onClick={() => editor?.execute("rotate-left")} title={zh ? "向左旋转 15°" : "Rotate left 15°"}><ArrowCounterClockwise size={17} /></button>
          <button type="button" onClick={() => editor?.execute("rotate-right")} title={zh ? "向右旋转 15°" : "Rotate right 15°"}><ArrowClockwise size={17} /></button>
          <button type="button" onClick={() => editor?.execute("flip-horizontal")} title={zh ? "水平翻转" : "Flip horizontal"}><FlipHorizontal size={17} /></button>
          <button type="button" onClick={() => editor?.execute("flip-vertical")} title={zh ? "垂直翻转" : "Flip vertical"}><FlipVertical size={17} /></button>
        </div>
      </section>}

      {isImage && (
        <section className="ff-inspector-section">
          <h3>{zh ? "图片" : "Image"}</h3>
          <button type="button" className="ff-inspector-wide-action" onClick={onReplaceImage}>
            <ImageSquare size={17} />
            <span>{zh ? "替换图片内容" : "Replace image source"}</span>
          </button>
          <p className="ff-inspector-note">{zh ? "会保留当前对象的位置、尺寸和变换。" : "Position, size, and transforms stay unchanged."}</p>
        </section>
      )}

      {isText && (
        <section className="ff-inspector-section">
          <h3>{zh ? "文字" : "Type"}</h3>
          <TextContent value={selection.text} onCommit={text => editor?.execute("text-content", { text, targetId: selection.id })} zh={zh} />
          <label className="ff-inspector-select">
            <span>{zh ? "字体" : "Font"}</span>
            <select value={selection.fontFamily} onChange={(event) => editor?.execute("font-family", event.target.value)}>
              <option value={selection.fontFamily}>{selection.fontFamily}</option>
              <option value="Figtree">Figtree</option>
              <option value="Noto Sans SC">Noto Sans SC</option>
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="serif">Serif</option>
              <option value="monospace">Monospace</option>
            </select>
          </label>
          <div className="ff-type-controls">
            <InspectorNumber label={zh ? "字号" : "Size"} value={selection.fontSize} min={1} onChange={(value) => editor?.execute("font-size", value)} />
            <button type="button" data-active={selection.fontWeight === "bold"} onClick={() => editor?.execute("bold")}><TextB size={18} /></button>
            <button type="button" data-active={selection.fontStyle === "italic"} onClick={() => editor?.execute("italic")}><TextItalic size={18} /></button>
            <button type="button" onClick={() => editor?.execute("underline")}><span className="ff-underlined">U</span></button>
            <button type="button" onClick={() => editor?.execute("strike")}><span className="ff-struck">S</span></button>
            <button type="button" onClick={() => editor?.execute("overline")}><span className="ff-overlined">O</span></button>
          </div>
          <label className="ff-inspector-select">
            <span>{zh ? "对齐" : "Anchor"}</span>
            <select value={selection.textAnchor} onChange={(event) => setAttribute("text-anchor", event.target.value)}>
              <option value="start">{zh ? "左对齐" : "Left"}</option>
              <option value="middle">{zh ? "居中" : "Center"}</option>
              <option value="end">{zh ? "右对齐" : "Right"}</option>
            </select>
          </label>
        </section>
      )}

      <section className="ff-inspector-section">
        <h3>{zh ? "描边细节" : "Stroke detail"}</h3>
        <div className="ff-inspector-grid">
          <label className="ff-inspector-select compact">
            <span>{zh ? "端点" : "Cap"}</span>
            <select value={selection.strokeLinecap} onChange={(event) => setAttribute("stroke-linecap", event.target.value)}>
              <option value="butt">Butt</option>
              <option value="round">Round</option>
              <option value="square">Square</option>
            </select>
          </label>
          <label className="ff-inspector-select compact">
            <span>{zh ? "转角" : "Join"}</span>
            <select value={selection.strokeLinejoin} onChange={(event) => setAttribute("stroke-linejoin", event.target.value)}>
              <option value="miter">Miter</option>
              <option value="round">Round</option>
              <option value="bevel">Bevel</option>
            </select>
          </label>
        </div>
        <label className="ff-inspector-select">
          <span>{zh ? "线型" : "Dash"}</span>
          <select value={selection.strokeDasharray} onChange={(event) => setAttribute("stroke-dasharray", event.target.value)}>
            <option value="none">{zh ? "实线" : "Solid"}</option>
            <option value="2,2">····</option>
            <option value="5,5">- - -</option>
            <option value="10,5">— —</option>
            <option value="10,5,2,5">— · —</option>
          </select>
        </label>
        {isPath && (
          <div className="ff-marker-grid">
            <label className="ff-inspector-select compact">
              <span>{zh ? "起点" : "Start"}</span>
              <select value={markerValue(selection.markerStart)} onChange={(event) => editor?.execute("marker-start", event.target.value)}>
                <option value="existing" disabled>{zh ? "已有标记" : "Existing marker"}</option>
                <option value="nomarker">{zh ? "无" : "None"}</option>
                <option value="leftarrow">Arrow</option>
                <option value="box">Box</option>
                <option value="mcircle">Circle</option>
              </select>
            </label>
            <label className="ff-inspector-select compact">
              <span>{zh ? "终点" : "End"}</span>
              <select value={markerValue(selection.markerEnd)} onChange={(event) => editor?.execute("marker-end", event.target.value)}>
                <option value="existing" disabled>{zh ? "已有标记" : "Existing marker"}</option>
                <option value="nomarker">{zh ? "无" : "None"}</option>
                <option value="rightarrow">Arrow</option>
                <option value="box">Box</option>
                <option value="mcircle">Circle</option>
              </select>
            </label>
          </div>
        )}
        <InspectorNumber label={zh ? "模糊" : "Blur"} value={selection.blur} min={0} onChange={(value) => setAttribute("blur", value)} />
      </section>

      {selection.type !== "selection" && <AdvancedSelectionFields selection={selection} editor={editor} zh={zh} />}

      {(isEditablePath || canConvertToPath) && (
        <section className="ff-inspector-section">
          <h3>{zh ? "路径" : "Path"}</h3>
          <div className="ff-inspector-action-grid">
            {canConvertToPath && (
              <button type="button" onClick={() => editor?.execute("convert-path")}>{zh ? "转为路径" : "Convert to path"}</button>
            )}
            {isEditablePath && (
              <>
                <button type="button" data-active={isNodeEditing} onClick={() => editor?.execute("path-edit")}>{zh ? "编辑节点" : "Edit nodes"}</button>
                <button type="button" onClick={() => editor?.execute("reorient-path")}>{zh ? "重置方向" : "Reorient"}</button>
              </>
            )}
            {isNodeEditing && (
              <>
                <button type="button" onClick={() => editor?.execute("path-node-clone")}>{zh ? "复制节点" : "Clone node"}</button>
                <button type="button" onClick={() => editor?.execute("path-node-delete")}>{zh ? "删除节点" : "Delete node"}</button>
                <button type="button" onClick={() => editor?.execute("path-open-close")}>{zh ? "打开 / 闭合" : "Open / close"}</button>
                <button type="button" onClick={() => editor?.execute("path-add-subpath")}>{zh ? "添加子路径" : "Add subpath"}</button>
                <button type="button" onClick={() => editor?.execute("path-link-controls")}>{zh ? "链接控制点" : "Link controls"}</button>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}


function markerValue(value: string) { return !value || value === "none" ? "nomarker" : "existing"; }

function TextContent({ value, onCommit, zh }: { value: string; onCommit: (value: string) => void; zh: boolean }) {
  const [draft, setDraft] = useState(value);
  const composing = useRef(false);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focused = useRef(false);
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;
  useEffect(() => { if (!focused.current) setDraft(value); }, [value]);
  useEffect(() => () => { if (pending.current) clearTimeout(pending.current); }, []);
  const flush = (text: string) => { if (pending.current) clearTimeout(pending.current); if (text !== value) commitRef.current(text); };
  return <><textarea aria-label={zh ? "文字内容" : "Text content"} className="ff-inspector-textarea" rows={3} value={draft}
    onFocus={() => { focused.current = true; }}
    onChange={event => { const text = event.target.value; setDraft(text); if (pending.current) clearTimeout(pending.current); if (!composing.current) pending.current = setTimeout(() => flush(text), 250); }}
    onCompositionStart={() => { composing.current = true; if (pending.current) clearTimeout(pending.current); }}
    onCompositionEnd={event => { composing.current = false; flush(event.currentTarget.value); }}
    onBlur={event => { focused.current = false; flush(event.currentTarget.value); }} />
    <p className="ff-inspector-note">{zh ? "保留原有分段、上下标与沿路径文字。" : "Preserves text runs, superscripts and text paths."}</p></>;
}
