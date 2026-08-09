import {
  AlignBottom,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignLeft,
  AlignRight,
  AlignTop,
  ArrowClockwise,
  ArrowCounterClockwise,
  ArrowsDownUp,
  ArrowsHorizontal,
  BoundingBox,
  CaretDown,
  Circle,
  Code,
  Copy,
  DotsThree,
  Eye,
  EyeSlash,
  Eyedropper,
  FlipHorizontal,
  FlipVertical,
  GridFour,
  Hand,
  ImageSquare,
  LineSegment,
  LinkSimple,
  MagnifyingGlass,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Minus,
  Path,
  PencilSimple,
  Plus,
  Polygon,
  Rectangle,
  Scissors,
  Selection,
  SlidersHorizontal,
  Stack,
  Star,
  TextB,
  TextItalic,
  TextT,
  Trash,
  UploadSimple,
  VectorThree,
  X,
} from "@phosphor-icons/react";
import { Dialog } from "@base-ui/react/dialog";
import { NumberField } from "@base-ui/react/number-field";
import { Popover } from "@base-ui/react/popover";
import { Slider } from "@base-ui/react/slider";
import { Tabs } from "@base-ui/react/tabs";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toolbar } from "@base-ui/react/toolbar";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type {
  SvgEditCommand,
  SvgEditHandle,
  SvgEditMode,
  SvgEditSelection,
  SvgEditState,
} from "./SvgEditHost";

type FigFoxEditorChromeProps = {
  language: "zh" | "en";
  ready: boolean;
  state: SvgEditState;
  editor: SvgEditHandle | null;
  sourceMarkup: string;
  onSourceApply: (source: string) => Promise<void> | void;
  children: ReactNode;
};

const palette = [
  "#20152b",
  "#ffffff",
  "#6b3df4",
  "#9b7cff",
  "#ef5b2a",
  "#f4b942",
  "#24a37a",
  "#2f6fe4",
  "#d9446e",
  "#697386",
  "none",
];

type EditorTool = {
  mode: SvgEditMode;
  icon: typeof Selection;
  zh: string;
  en: string;
  shortcut?: string;
};

const mainTools: EditorTool[] = [
  { mode: "select", icon: Selection, zh: "选择", en: "Select", shortcut: "V" },
  { mode: "path", icon: Path, zh: "钢笔", en: "Pen", shortcut: "B" },
  { mode: "fhpath", icon: PencilSimple, zh: "自由绘制", en: "Draw", shortcut: "P" },
  { mode: "line", icon: LineSegment, zh: "直线", en: "Line", shortcut: "L" },
  { mode: "rect", icon: Rectangle, zh: "矩形", en: "Rectangle", shortcut: "R" },
  { mode: "ellipse", icon: Circle, zh: "椭圆", en: "Ellipse", shortcut: "O" },
  { mode: "text", icon: TextT, zh: "文字", en: "Text", shortcut: "T" },
  { mode: "connector", icon: LinkSimple, zh: "连接线", en: "Connector", shortcut: "C" },
];

const extraTools: EditorTool[] = [
  { mode: "image", icon: ImageSquare, zh: "图片", en: "Image" },
  { mode: "polygon", icon: Polygon, zh: "多边形", en: "Polygon" },
  { mode: "star", icon: Star, zh: "星形", en: "Star" },
  { mode: "shapelib", icon: GridFour, zh: "形状库", en: "Shape library" },
  { mode: "eyedropper", icon: Eyedropper, zh: "吸色", en: "Eyedropper" },
  { mode: "ext-panning", icon: Hand, zh: "平移", en: "Pan" },
  { mode: "zoom", icon: MagnifyingGlass, zh: "框选缩放", en: "Zoom tool" },
];

const shapeCategories = [
  ["basic", "基础", "Basic"],
  ["arrow", "箭头", "Arrows"],
  ["flowchart", "流程图", "Flowchart"],
  ["math", "数学", "Math"],
  ["electronics", "电子", "Electronics"],
  ["symbol", "符号", "Symbols"],
  ["object", "物件", "Objects"],
  ["animal", "动物", "Animals"],
  ["dialog_balloon", "标注", "Callouts"],
  ["misc", "其他", "Misc"],
  ["music", "音乐", "Music"],
  ["game", "游戏", "Game"],
  ["raphael_1", "扩展一", "Extended 1"],
  ["raphael_2", "扩展二", "Extended 2"],
] as const;

function ShapeLibraryDialog({
  open,
  zh,
  onClose,
  onPick,
}: {
  open: boolean;
  zh: boolean;
  onClose: () => void;
  onPick: (pathData: string) => void;
}) {
  const [category, setCategory] = useState<(typeof shapeCategories)[number][0]>("basic");
  const [shapes, setShapes] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetch(`${import.meta.env.BASE_URL}svgedit/extensions/ext-shapes/shapelib/${category}.json`)
      .then((response) => {
        if (!response.ok) throw new Error("Shape library could not be loaded");
        return response.json() as Promise<{ data: Record<string, string> }>;
      })
      .then((payload) => {
        if (!cancelled) setShapes(payload.data || {});
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, open]);

  const visibleShapes = Object.entries(shapes).filter(([name]) =>
    name.replaceAll("_", " ").toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="ff-editor-dialog-backdrop" />
        <Dialog.Viewport className="ff-editor-dialog-viewport">
          <Dialog.Popup className="ff-editor-dialog ff-shape-dialog">
            <header className="ff-editor-dialog-header">
              <div>
                <span>SVG-EDIT / SHAPES</span>
                <Dialog.Title>{zh ? "形状库" : "Shape library"}</Dialog.Title>
                <Dialog.Description>{zh ? "选择形状后，在画布上拖拽放置。" : "Choose a shape, then drag on the canvas to place it."}</Dialog.Description>
              </div>
              <Dialog.Close className="ff-editor-dialog-close" aria-label={zh ? "关闭" : "Close"}><X size={18} /></Dialog.Close>
            </header>
            <div className="ff-shape-dialog-body">
              <nav className="ff-shape-categories" aria-label={zh ? "形状分类" : "Shape categories"}>
                {shapeCategories.map(([value, zhLabel, enLabel]) => (
                  <button key={value} type="button" data-active={category === value} onClick={() => setCategory(value)}>
                    <span>{zh ? zhLabel : enLabel}</span>
                  </button>
                ))}
              </nav>
              <div className="ff-shape-browser">
                <label className="ff-shape-search">
                  <MagnifyingGlass size={17} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={zh ? "搜索当前分类" : "Search this category"} />
                  <span>{visibleShapes.length}</span>
                </label>
                {loading ? (
                  <div className="ff-shape-status">{zh ? "正在读取形状…" : "Loading shapes…"}</div>
                ) : loadError ? (
                  <div className="ff-shape-status">{zh ? "形状库暂时无法读取。" : "The shape library could not be loaded."}</div>
                ) : (
                  <div className="ff-shape-grid">
                    {visibleShapes.map(([name, pathData]) => (
                      <button key={name} type="button" onClick={() => onPick(pathData)} title={name.replaceAll("_", " ")}>
                        <svg viewBox="0 0 300 300" aria-hidden="true"><path d={pathData} /></svg>
                        <span>{name.replaceAll("_", " ")}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SourceEditorDialog({
  open,
  zh,
  source,
  onClose,
  onApply,
}: {
  open: boolean;
  zh: boolean;
  source: string;
  onClose: () => void;
  onApply: (source: string) => Promise<void> | void;
}) {
  const [draft, setDraft] = useState(source);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setDraft(source);
      setError("");
    }
  }, [open, source]);

  const apply = async () => {
    setBusy(true);
    setError("");
    try {
      await onApply(draft);
      onClose();
    } catch {
      setError(zh ? "这段代码不是有效的 SVG，或包含不安全内容。" : "This is not valid SVG, or it contains unsafe content.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="ff-editor-dialog-backdrop" />
        <Dialog.Viewport className="ff-editor-dialog-viewport">
          <Dialog.Popup className="ff-editor-dialog ff-source-dialog">
            <header className="ff-editor-dialog-header">
              <div>
                <span>SVG-EDIT / SOURCE</span>
                <Dialog.Title>{zh ? "SVG 源代码" : "SVG source"}</Dialog.Title>
                <Dialog.Description>{zh ? "修改后会先检查并清理不安全内容，再放回画布。" : "Changes are checked and unsafe content is removed before returning to the canvas."}</Dialog.Description>
              </div>
              <Dialog.Close className="ff-editor-dialog-close" aria-label={zh ? "关闭" : "Close"}><X size={18} /></Dialog.Close>
            </header>
            <textarea className="ff-source-editor" value={draft} onChange={(event) => setDraft(event.target.value)} spellCheck={false} />
            <footer className="ff-editor-dialog-actions">
              <span>{error || `${draft.length.toLocaleString()} ${zh ? "个字符" : "characters"}`}</span>
              <div>
                <button type="button" className="ff-dialog-secondary" onClick={onClose}>{zh ? "取消" : "Cancel"}</button>
                <button type="button" className="ff-dialog-primary" disabled={busy} onClick={apply}>{busy ? (zh ? "检查中…" : "Checking…") : (zh ? "应用修改" : "Apply changes")}</button>
              </div>
            </footer>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ImageSourceDialog({
  open,
  zh,
  replace,
  onClose,
  onPick,
}: {
  open: boolean;
  zh: boolean;
  replace: boolean;
  onClose: () => void;
  onPick: (source: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSource("");
    setFileName("");
    setError("");
  }, [open]);

  const readFile = (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|gif)$/i.test(file.type)) {
      setError(zh ? "请选择 PNG、JPEG、WebP 或 GIF 图片。" : "Choose a PNG, JPEG, WebP, or GIF image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(zh ? "图片不能超过 10 MB。" : "Images must be 10 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") return;
      setSource(reader.result);
      setFileName(file.name);
      setError("");
    });
    reader.addEventListener("error", () => setError(zh ? "图片读取失败，请换一张重试。" : "That image could not be read."));
    reader.readAsDataURL(file);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="ff-editor-dialog-backdrop" />
        <Dialog.Viewport className="ff-editor-dialog-viewport">
          <Dialog.Popup className="ff-editor-dialog ff-image-dialog">
            <header className="ff-editor-dialog-header">
              <div>
                <span>SVG-EDIT / IMAGE</span>
                <Dialog.Title>{replace ? (zh ? "替换图片" : "Replace image") : (zh ? "放置图片" : "Place image")}</Dialog.Title>
                <Dialog.Description>{replace ? (zh ? "新图片会保留当前对象的位置和尺寸。" : "The new image keeps the current object's position and size.") : (zh ? "选择图片后，回到画布拖拽出需要的尺寸。" : "Choose an image, then drag its size on the canvas.")}</Dialog.Description>
              </div>
              <Dialog.Close className="ff-editor-dialog-close" aria-label={zh ? "关闭" : "Close"}><X size={18} /></Dialog.Close>
            </header>
            <div className="ff-image-dialog-body">
              <input
                ref={inputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={(event) => readFile(event.target.files?.[0])}
              />
              <button type="button" className="ff-image-dropzone" onClick={() => inputRef.current?.click()}>
                {source ? <img src={source} alt="" /> : <UploadSimple size={28} weight="duotone" />}
                <strong>{source ? fileName : (zh ? "选择一张图片" : "Choose an image")}</strong>
                <span>{zh ? "PNG、JPEG、WebP 或 GIF · 最大 10 MB" : "PNG, JPEG, WebP, or GIF · up to 10 MB"}</span>
              </button>
              {error && <p className="ff-image-dialog-error">{error}</p>}
            </div>
            <footer className="ff-editor-dialog-actions">
              <span>{zh ? "文件只在当前浏览器中读取。" : "The file is read only in this browser."}</span>
              <div>
                <button type="button" className="ff-dialog-secondary" onClick={onClose}>{zh ? "取消" : "Cancel"}</button>
                <button
                  type="button"
                  className="ff-dialog-primary"
                  disabled={!source}
                  onClick={() => {
                    onPick(source);
                    onClose();
                  }}
                >
                  {replace ? (zh ? "替换图片" : "Replace image") : (zh ? "开始放置" : "Place on canvas")}
                </button>
              </div>
            </footer>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const visibleColor = value === "none" ? "transparent" : value;

  return (
    <Popover.Root>
      <Popover.Trigger className="ff-editor-color-trigger" aria-label={`${label}: ${value}`}>
        <span
          className="ff-editor-color-chip"
          style={{ background: visibleColor }}
          data-none={value === "none"}
        />
        <span>{label}</span>
        <CaretDown size={12} weight="bold" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={10} className="ff-editor-popover-positioner">
          <Popover.Popup className="ff-editor-popover ff-editor-palette-popover">
            <Popover.Title className="ff-editor-popover-title">{label}</Popover.Title>
            <div className="ff-editor-palette" role="listbox" aria-label={label}>
              {palette.map((color) => (
                <Popover.Close
                  key={color}
                  type="button"
                  className="ff-editor-swatch"
                  data-active={value.toLowerCase() === color}
                  data-none={color === "none"}
                  style={{ background: color === "none" ? "transparent" : color }}
                  aria-label={color === "none" ? "None" : color}
                  aria-selected={value.toLowerCase() === color}
                  role="option"
                  onClick={() => onChange(color)}
                />
              ))}
            </div>
            <label className="ff-editor-custom-color">
              <span>Custom</span>
              <input
                type="color"
                value={value === "none" ? "#ffffff" : value}
                onChange={(event) => onChange(event.target.value)}
              />
            </label>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function MenuAction({
  label,
  icon: Icon,
  disabled,
  active,
  onClick,
}: {
  label: string;
  icon: typeof Selection;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <Popover.Close
      className="ff-editor-menu-action"
      type="button"
      disabled={disabled}
      data-active={active}
      onClick={onClick}
    >
      <Icon size={17} aria-hidden="true" />
      <span>{label}</span>
    </Popover.Close>
  );
}

function InspectorNumber({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  return (
    <label className="ff-inspector-number">
      <span>{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        min={min}
        step="0.5"
        onChange={(event) => {
          if (event.target.value !== "") onChange(Number(event.target.value));
        }}
      />
    </label>
  );
}

function SelectionInspector({
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
    editor?.execute("attribute", { name, value });

  if (!selection) {
    return (
      <div className="ff-inspector-empty">
        <Selection size={24} weight="duotone" aria-hidden="true" />
        <strong>{zh ? "还没有选中对象" : "Nothing selected"}</strong>
        <p>{zh ? "选择画布中的对象后，这里会显示尺寸、样式和文字属性。" : "Select an object to edit its size, style, and text."}</p>
      </div>
    );
  }

  const isText = selection.type === "text";
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

      <section className="ff-inspector-section">
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
      </section>

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
          <textarea
            className="ff-inspector-textarea"
            value={selection.text}
            rows={3}
            onChange={(event) => editor?.execute("text-content", event.target.value)}
          />
          <label className="ff-inspector-select">
            <span>{zh ? "字体" : "Font"}</span>
            <select value={selection.fontFamily} onChange={(event) => editor?.execute("font-family", event.target.value)}>
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
              <select onChange={(event) => editor?.execute("marker-start", event.target.value)}>
                <option value="nomarker">{zh ? "无" : "None"}</option>
                <option value="leftarrow">Arrow</option>
                <option value="box">Box</option>
                <option value="mcircle">Circle</option>
              </select>
            </label>
            <label className="ff-inspector-select compact">
              <span>{zh ? "终点" : "End"}</span>
              <select onChange={(event) => editor?.execute("marker-end", event.target.value)}>
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

export function FigFoxEditorChrome({
  language,
  ready,
  state,
  editor,
  sourceMarkup,
  onSourceApply,
  children,
}: FigFoxEditorChromeProps) {
  const zh = language === "zh";
  const [inspectorOpen, setInspectorOpen] = useState(
    () => typeof window === "undefined" || !window.matchMedia("(max-width: 1180px)").matches,
  );
  const [inspectorTab, setInspectorTab] = useState<"layers" | "properties">("properties");
  const [shapeLibraryOpen, setShapeLibraryOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [replaceImage, setReplaceImage] = useState(false);
  const run = (command: SvgEditCommand, value?: unknown) => editor?.execute(command, value);
  const canArrange = ready && state.hasSelection;
  const canAlign = ready && state.hasSelection;

  useEffect(() => {
    const compactViewport = window.matchMedia("(max-width: 1180px)");
    const collapseInspector = (event: MediaQueryListEvent) => {
      if (event.matches) setInspectorOpen(false);
    };
    compactViewport.addEventListener("change", collapseInspector);
    return () => compactViewport.removeEventListener("change", collapseInspector);
  }, []);

  return (
    <div className="ff-editor-stage" data-ready={ready} data-panel={inspectorOpen ? "open" : "closed"}>
      {children}

      <div className="ff-editor-left-dock">
        <ToggleGroup
          className="ff-editor-tools"
          value={[state.mode]}
          disabled={!ready}
          orientation="vertical"
          aria-label={zh ? "绘图工具" : "Drawing tools"}
          onValueChange={(value) => {
            const mode = value.at(-1) as SvgEditMode | undefined;
            if (mode) editor?.setMode(mode);
          }}
        >
          {mainTools.map((tool) => {
            const Icon = tool.icon;
            const label = zh ? tool.zh : tool.en;
            return (
              <Toggle
                key={tool.mode}
                className="ff-editor-tool-button"
                value={tool.mode}
                aria-label={`${label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`}
                title={`${label}${tool.shortcut ? ` · ${tool.shortcut}` : ""}`}
              >
                <Icon size={20} weight={state.mode === tool.mode ? "fill" : "regular"} aria-hidden="true" />
                <span>{label}</span>
              </Toggle>
            );
          })}
        </ToggleGroup>

        <Popover.Root>
          <Popover.Trigger className="ff-editor-tool-button ff-editor-extra-trigger" aria-label={zh ? "更多绘图工具" : "More drawing tools"}>
            <DotsThree size={21} weight="bold" />
            <span>{zh ? "更多" : "More"}</span>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner side="right" sideOffset={10} className="ff-editor-popover-positioner">
              <Popover.Popup className="ff-editor-popover ff-editor-tool-popover">
                <Popover.Title className="ff-editor-popover-title">{zh ? "更多工具" : "More tools"}</Popover.Title>
                <div className="ff-editor-tool-grid">
                  {extraTools.map((tool) => {
                    const Icon = tool.icon;
                    const label = zh ? tool.zh : tool.en;
                    return (
                      <Popover.Close
                        key={tool.mode}
                        type="button"
                        className="ff-editor-extra-tool"
                        data-active={state.mode === tool.mode}
                        onClick={() => {
                          if (tool.mode === "image") {
                            setReplaceImage(false);
                            setImageDialogOpen(true);
                          } else if (tool.mode === "shapelib") setShapeLibraryOpen(true);
                          else editor?.setMode(tool.mode);
                        }}
                      >
                        <Icon size={19} />
                        <span>{label}</span>
                      </Popover.Close>
                    );
                  })}
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>

      <Toolbar.Root className="ff-editor-properties" aria-label={zh ? "对象属性" : "Object properties"}>
        <Toolbar.Group className="ff-editor-history-group">
          <Toolbar.Button className="ff-editor-icon-button" disabled={!ready || !state.canUndo} onClick={() => editor?.undo()} aria-label={zh ? "撤销" : "Undo"} title={zh ? "撤销 · Ctrl Z" : "Undo · Ctrl Z"}>
            <ArrowCounterClockwise size={18} />
          </Toolbar.Button>
          <Toolbar.Button className="ff-editor-icon-button" disabled={!ready || !state.canRedo} onClick={() => editor?.redo()} aria-label={zh ? "重做" : "Redo"} title={zh ? "重做 · Ctrl Shift Z" : "Redo · Ctrl Shift Z"}>
            <ArrowClockwise size={18} />
          </Toolbar.Button>
        </Toolbar.Group>

        <Toolbar.Separator className="ff-editor-separator" />

        <Popover.Root>
          <Popover.Trigger className="ff-editor-toolbar-trigger" disabled={!ready}>
            <Copy size={17} />
            <span>{zh ? "编辑" : "Edit"}</span>
            <CaretDown size={11} />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={10} className="ff-editor-popover-positioner">
              <Popover.Popup className="ff-editor-popover ff-editor-action-popover">
                <Popover.Title className="ff-editor-popover-title">{zh ? "编辑对象" : "Edit object"}</Popover.Title>
                <div className="ff-editor-menu-grid">
                  <MenuAction label={zh ? "全选" : "Select all"} icon={Selection} onClick={() => run("select-all")} />
                  <MenuAction label={zh ? "取消选择" : "Deselect"} icon={X} disabled={!state.hasSelection} onClick={() => run("deselect")} />
                  <MenuAction label={zh ? "剪切" : "Cut"} icon={Scissors} disabled={!state.hasSelection} onClick={() => run("cut")} />
                  <MenuAction label={zh ? "复制" : "Copy"} icon={Copy} disabled={!state.hasSelection} onClick={() => run("copy")} />
                  <MenuAction label={zh ? "粘贴" : "Paste"} icon={Stack} onClick={() => run("paste")} />
                  <MenuAction label={zh ? "创建副本" : "Duplicate"} icon={Copy} disabled={!state.hasSelection} onClick={() => run("duplicate")} />
                  <MenuAction label={zh ? "编组" : "Group"} icon={BoundingBox} disabled={state.selectionCount < 2} onClick={() => run("group")} />
                  <MenuAction label={zh ? "取消编组" : "Ungroup"} icon={VectorThree} disabled={!state.hasSelection} onClick={() => run("ungroup")} />
                  <MenuAction label={zh ? "删除" : "Delete"} icon={Trash} disabled={!state.hasSelection} onClick={() => run("delete")} />
                  <MenuAction label={zh ? "查看源码" : "SVG source"} icon={Code} onClick={() => setSourceOpen(true)} />
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>

        <Popover.Root>
          <Popover.Trigger className="ff-editor-toolbar-trigger" disabled={!ready}>
            <AlignCenterHorizontal size={17} />
            <span>{zh ? "排列" : "Arrange"}</span>
            <CaretDown size={11} />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={10} className="ff-editor-popover-positioner">
              <Popover.Popup className="ff-editor-popover ff-editor-arrange-popover">
                <Popover.Title className="ff-editor-popover-title">{zh ? "对齐与层级" : "Align & order"}</Popover.Title>
                <div className="ff-arrange-label">{zh ? "对齐" : "Align"}</div>
                <div className="ff-arrange-row">
                  {[
                    ["align-left", AlignLeft, zh ? "左对齐" : "Align left"],
                    ["align-center", AlignCenterHorizontal, zh ? "水平居中" : "Center horizontally"],
                    ["align-right", AlignRight, zh ? "右对齐" : "Align right"],
                    ["align-top", AlignTop, zh ? "顶对齐" : "Align top"],
                    ["align-middle", AlignCenterVertical, zh ? "垂直居中" : "Center vertically"],
                    ["align-bottom", AlignBottom, zh ? "底对齐" : "Align bottom"],
                  ].map(([command, Icon, label]) => (
                    <button key={String(command)} type="button" disabled={!canAlign} title={String(label)} onClick={() => run(command as SvgEditCommand)}>
                      <Icon size={18} />
                    </button>
                  ))}
                </div>
                <div className="ff-arrange-label">{zh ? "分布与层级" : "Distribute & order"}</div>
                <div className="ff-editor-menu-grid compact">
                  <MenuAction label={zh ? "水平分布" : "Horizontal"} icon={ArrowsHorizontal} disabled={state.selectionCount < 3} onClick={() => run("distribute-horizontal")} />
                  <MenuAction label={zh ? "垂直分布" : "Vertical"} icon={ArrowsDownUp} disabled={state.selectionCount < 3} onClick={() => run("distribute-vertical")} />
                  <MenuAction label={zh ? "上移一层" : "Bring forward"} icon={Stack} disabled={!canArrange} onClick={() => run("bring-forward")} />
                  <MenuAction label={zh ? "下移一层" : "Send backward"} icon={Stack} disabled={!canArrange} onClick={() => run("send-backward")} />
                  <MenuAction label={zh ? "置于顶层" : "Bring to front"} icon={Stack} disabled={!canArrange} onClick={() => run("bring-front")} />
                  <MenuAction label={zh ? "置于底层" : "Send to back"} icon={Stack} disabled={!canArrange} onClick={() => run("send-back")} />
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>

        <Toolbar.Separator className="ff-editor-separator" />
        <ColorControl label={zh ? "填充" : "Fill"} value={state.fill} onChange={(value) => editor?.setFill(value)} />
        <ColorControl label={zh ? "描边" : "Stroke"} value={state.stroke} onChange={(value) => editor?.setStroke(value)} />

        <NumberField.Root className="ff-editor-number-field" value={state.strokeWidth} min={0} max={64} step={0.5} disabled={!ready} onValueChange={(value) => editor?.setStrokeWidth(value ?? 0)}>
          <span className="ff-editor-field-label">{zh ? "线宽" : "Width"}</span>
          <NumberField.Group className="ff-editor-number-group">
            <NumberField.Decrement className="ff-editor-step-button" aria-label={zh ? "减小线宽" : "Decrease width"}><Minus size={12} weight="bold" /></NumberField.Decrement>
            <NumberField.Input className="ff-editor-number-input" aria-label={zh ? "线宽" : "Stroke width"} />
            <NumberField.Increment className="ff-editor-step-button" aria-label={zh ? "增大线宽" : "Increase width"}><Plus size={12} weight="bold" /></NumberField.Increment>
          </NumberField.Group>
        </NumberField.Root>

        <Popover.Root>
          <Popover.Trigger className="ff-editor-opacity-trigger"><span>{zh ? "不透明度" : "Opacity"}</span><strong>{state.opacity}%</strong></Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={10} className="ff-editor-popover-positioner">
              <Popover.Popup className="ff-editor-popover ff-editor-opacity-popover">
                <div className="ff-editor-opacity-heading"><Popover.Title className="ff-editor-popover-title">{zh ? "不透明度" : "Opacity"}</Popover.Title><strong>{state.opacity}%</strong></div>
                <Slider.Root className="ff-editor-slider" value={state.opacity} min={0} max={100} step={1} onValueChange={(value) => editor?.setOpacity(value)}>
                  <Slider.Control className="ff-editor-slider-control"><Slider.Track className="ff-editor-slider-track"><Slider.Indicator className="ff-editor-slider-indicator" /><Slider.Thumb className="ff-editor-slider-thumb" /></Slider.Track></Slider.Control>
                </Slider.Root>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>

        <Toolbar.Separator className="ff-editor-separator" />
        <Popover.Root>
          <Popover.Trigger className="ff-editor-toolbar-trigger" disabled={!ready}>
            <GridFour size={17} />
            <span>{zh ? "视图" : "View"}</span>
            <CaretDown size={11} />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={10} className="ff-editor-popover-positioner">
              <Popover.Popup className="ff-editor-popover ff-editor-action-popover">
                <Popover.Title className="ff-editor-popover-title">{zh ? "画布视图" : "Canvas view"}</Popover.Title>
                <div className="ff-editor-menu-grid">
                  <MenuAction label={zh ? "网格" : "Grid"} icon={GridFour} active={state.gridVisible} onClick={() => run("toggle-grid")} />
                  <MenuAction label={zh ? "线框模式" : "Wireframe"} icon={Eye} active={state.wireframe} onClick={() => run("toggle-wireframe")} />
                  <MenuAction label={zh ? "适合画布" : "Fit canvas"} icon={BoundingBox} onClick={() => run("fit-canvas")} />
                  <MenuAction label={zh ? "适合选区" : "Fit selection"} icon={Selection} disabled={!state.hasSelection} onClick={() => run("fit-selection")} />
                  <MenuAction label={zh ? "适合内容" : "Fit content"} icon={MagnifyingGlass} onClick={() => run("fit-content")} />
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
        <Toolbar.Button className="ff-editor-icon-button" data-active={inspectorOpen} disabled={!ready} onClick={() => setInspectorOpen((value) => !value)} aria-label={zh ? "打开属性面板" : "Toggle inspector"} title={zh ? "属性与图层" : "Inspector and layers"}><SlidersHorizontal size={18} /></Toolbar.Button>
      </Toolbar.Root>

      {inspectorOpen && (
        <aside className="ff-editor-inspector" aria-label={zh ? "属性与图层" : "Inspector and layers"}>
          <Tabs.Root value={inspectorTab} onValueChange={(value) => setInspectorTab(value as "layers" | "properties")}>
            <Tabs.List className="ff-inspector-tabs">
              <Tabs.Tab value="properties"><SlidersHorizontal size={16} />{zh ? "属性" : "Properties"}</Tabs.Tab>
              <Tabs.Tab value="layers"><Stack size={16} />{zh ? "图层" : "Layers"}<span>{state.layers.length}</span></Tabs.Tab>
              <Tabs.Indicator className="ff-inspector-tab-indicator" />
            </Tabs.List>
          </Tabs.Root>
          {inspectorTab === "properties" ? (
            <SelectionInspector
              zh={zh}
              selection={state.selection}
              mode={state.mode}
              editor={editor}
              onReplaceImage={() => {
                setReplaceImage(true);
                setImageDialogOpen(true);
              }}
            />
          ) : (
            <div className="ff-layer-list">
              {state.layers.length ? state.layers.map((layer) => (
                <div className="ff-layer-row" data-selected={layer.selected} key={layer.id}>
                  <button
                    type="button"
                    className="ff-layer-select"
                    style={{ paddingLeft: `${0.45 + layer.depth * 0.55}rem` }}
                    onClick={() => run("select-layer", layer.id)}
                  >
                    <span className="ff-layer-type">{layer.type.slice(0, 1).toUpperCase()}</span>
                    <span><strong>{layer.label}</strong><small>{layer.type}</small></span>
                  </button>
                  <button type="button" className="ff-layer-visibility" onClick={() => run("toggle-layer", layer.id)} aria-label={layer.hidden ? (zh ? "显示图层" : "Show layer") : (zh ? "隐藏图层" : "Hide layer")}>
                    {layer.hidden ? <EyeSlash size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              )) : (
                <div className="ff-inspector-empty"><Stack size={24} weight="duotone" /><strong>{zh ? "文档里还没有对象" : "No objects yet"}</strong><p>{zh ? "绘制或导入内容后，图层会显示在这里。" : "Draw or import content to create layers."}</p></div>
              )}
            </div>
          )}
        </aside>
      )}

      <Toolbar.Root className="ff-editor-zoom" aria-label={zh ? "画布缩放" : "Canvas zoom"}>
        <Toolbar.Button className="ff-editor-icon-button" disabled={!ready} onClick={() => editor?.zoomOut()} aria-label={zh ? "缩小" : "Zoom out"}><MagnifyingGlassMinus size={17} /></Toolbar.Button>
        <span className="ff-editor-zoom-value">{state.zoom}%</span>
        <Toolbar.Button className="ff-editor-icon-button" disabled={!ready} onClick={() => editor?.zoomIn()} aria-label={zh ? "放大" : "Zoom in"}><MagnifyingGlassPlus size={17} /></Toolbar.Button>
        <Toolbar.Separator className="ff-editor-separator" />
        <Toolbar.Button className="ff-editor-icon-button" disabled={!ready} onClick={() => editor?.fitCanvas()} aria-label={zh ? "适合画布" : "Fit canvas"} title={zh ? "适合画布" : "Fit canvas"}><BoundingBox size={18} /></Toolbar.Button>
      </Toolbar.Root>

      <ShapeLibraryDialog
        open={shapeLibraryOpen}
        zh={zh}
        onClose={() => setShapeLibraryOpen(false)}
        onPick={(pathData) => {
          run("shape-library", pathData);
          setShapeLibraryOpen(false);
        }}
      />
      <SourceEditorDialog
        open={sourceOpen}
        zh={zh}
        source={sourceMarkup}
        onClose={() => setSourceOpen(false)}
        onApply={onSourceApply}
      />
      <ImageSourceDialog
        open={imageDialogOpen}
        zh={zh}
        replace={replaceImage}
        onClose={() => setImageDialogOpen(false)}
        onPick={(source) => run("image-source", { source, replace: replaceImage })}
      />
    </div>
  );
}
