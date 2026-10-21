import { SelectionInspector } from "./SelectionInspector";
import { FormulaEditor } from "./FormulaEditor";
import { InspectorNumber } from "./EditorFields";
import { ShapeToolFields } from "./EditorNativeFields";
import { importSvgDocument } from "../../svgDocument";
import { DocumentPanel, LayerPanel, PaintDialog } from "./EditorPanels";
import "./editor-controls.css";
import "./editor-layout.css";
import { EditorAppearance } from "./EditorAppearance";
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
  Eyedropper,
  GridFour,
  Hand,
  ImageSquare,
  LineSegment,
  LinkSimple,
  MagnifyingGlass,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Path,
  PencilSimple,
  Polygon,
  Rectangle,
  Scissors,
  Selection,
  SlidersHorizontal,
  Stack,
  Star,
  TextT,
  Trash,
  UploadSimple,
  VectorThree,
  X,
} from "@phosphor-icons/react";
import { Dialog } from "@base-ui/react/dialog";
import { Popover } from "@base-ui/react/popover";
import { Tabs } from "@base-ui/react/tabs";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toolbar } from "@base-ui/react/toolbar";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type {
  SvgEditCommand,
  SvgEditHandle,
  SvgEditMode,
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

type EditorTool = {
  mode: SvgEditMode;
  icon: typeof Selection;
  zh: string;
  en: string;
  shortcut?: string;
};

const mainTools: EditorTool[] = [
  { mode: "select", icon: Selection, zh: "选择", en: "Select", shortcut: "V" },
  { mode: "path", icon: Path, zh: "钢笔", en: "Pen", shortcut: "P" },
  { mode: "fhpath", icon: PencilSimple, zh: "自由绘制", en: "Draw", shortcut: "Q" },
  { mode: "line", icon: LineSegment, zh: "直线", en: "Line", shortcut: "L" },
  { mode: "rect", icon: Rectangle, zh: "矩形", en: "Rectangle", shortcut: "R" },
  { mode: "ellipse", icon: Circle, zh: "椭圆", en: "Ellipse", shortcut: "E" },
  { mode: "text", icon: TextT, zh: "文字", en: "Text", shortcut: "T" },
  { mode: "connector", icon: LinkSimple, zh: "连接线", en: "Connector" },
];

const extraTools: EditorTool[] = [
  { mode: "square", icon: Rectangle, zh: "正方形", en: "Square" },
  { mode: "circle", icon: Circle, zh: "圆形", en: "Circle" },
  { mode: "fhrect", icon: Rectangle, zh: "手绘矩形", en: "Freehand rectangle" },
  { mode: "fhellipse", icon: Circle, zh: "手绘椭圆", en: "Freehand ellipse" },
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
  const [imageUrl, setImageUrl] = useState("");
  const [loadingImage, setLoadingImage] = useState(false);
  const imageRequest = useRef<AbortController | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setSource("");
    setFileName("");
    setImageUrl("");
    setError("");
    setLoadingImage(false);
    return () => imageRequest.current?.abort();
  }, [open]);

  const placeImage = async () => {
    if (source) { onPick(source); onClose(); return; }
    const url = imageUrl.trim();
    if (!/^https?:\/\//i.test(url)) { setError(zh ? "请输入 http 或 https 图片网址。" : "Enter an HTTP or HTTPS image URL."); return; }
    const request = new AbortController();
    imageRequest.current?.abort();
    imageRequest.current = request;
    setLoadingImage(true);
    setError("");
    try {
      const response = await fetch(url, { signal: request.signal, credentials: "omit" });
      const type = response.headers.get("content-type")?.split(";")[0] || "";
      if (!response.ok || !/^image\/(png|jpeg|webp|gif)$/i.test(type) || !response.body) throw new Error("image");
      const reader = response.body.getReader();
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 10 * 1024 * 1024) { await reader.cancel(); throw new Error("large"); }
        chunks.push(value);
      }
      const blob = new Blob(chunks, { type });
      const decoded = await createImageBitmap(blob);
      decoded.close();
      const embedded = await new Promise<string>((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = () => resolve(String(fileReader.result));
        fileReader.onerror = reject;
        fileReader.readAsDataURL(blob);
      });
      if (request.signal.aborted) return;
      onPick(embedded);
      onClose();
    } catch (reason) {
      if (!request.signal.aborted) setError(reason instanceof Error && reason.message === "large" ? (zh ? "图片不能超过 10 MB。" : "Images must be 10 MB or smaller.") : (zh ? "无法读取图片。请检查网址与跨域权限，或下载后从本地选择。" : "Could not read the image. Check the URL and cross-origin permissions, or choose a local file."));
    } finally {
      if (!request.signal.aborted) setLoadingImage(false);
    }
  };

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
      setImageUrl("");
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
              <button type="button" className="ff-image-dropzone" disabled={loadingImage} onClick={() => inputRef.current?.click()}>
                {source ? <img src={source} alt="" /> : <UploadSimple size={28} weight="duotone" />}
                <strong>{source ? fileName : (zh ? "选择一张图片" : "Choose an image")}</strong>
                <span>{zh ? "PNG、JPEG、WebP 或 GIF · 最大 10 MB" : "PNG, JPEG, WebP, or GIF · up to 10 MB"}</span>
              </button>
              <label className="ff-inspector-select"><span>{zh ? "或使用图片网址" : "Or use an image URL"}</span><input type="url" disabled={loadingImage} value={imageUrl} placeholder="https://…" onChange={event => { setImageUrl(event.target.value); setSource(""); setFileName(""); setError(""); }} /></label>
              <p className="ff-inspector-note">{zh ? "网址图片会嵌入文档，最大 10 MB；原站需允许跨域读取。" : "Images are embedded in the document, up to 10 MB. The source must allow cross-origin access."}</p>
              {error && <p className="ff-image-dialog-error">{error}</p>}
            </div>
            <footer className="ff-editor-dialog-actions">
              <span>{zh ? "本地文件只在当前浏览器中读取。" : "Local files are read only in this browser."}</span>
              <div>
                <button type="button" className="ff-dialog-secondary" onClick={onClose}>{zh ? "取消" : "Cancel"}</button>
                <button
                  type="button"
                  className="ff-dialog-primary"
                  disabled={loadingImage || (!source && !imageUrl.trim())}
                  onClick={() => void placeImage()}
                >
                  {loadingImage ? (zh ? "读取中…" : "Loading…") : replace ? (zh ? "替换图片" : "Replace image") : (zh ? "开始放置" : "Place on canvas")}
                </button>
              </div>
            </footer>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
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
    () => typeof window === "undefined" || !window.matchMedia("(max-width: 900px)").matches,
  );
  const [inspectorTab, setInspectorTab] = useState<"layers" | "properties" | "document">("properties");
  const [shapeLibraryOpen, setShapeLibraryOpen] = useState(false);
  const [sourceDraft, setSourceDraft] = useState(sourceMarkup);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [paintType, setPaintType] = useState<"fill" | "stroke" | null>(null);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [replaceImage, setReplaceImage] = useState(false);
  const [formulaFocus, setFormulaFocus] = useState(0);
  const insertSvgInput = useRef<HTMLInputElement>(null);
  const originalInsertSize = useRef(false);
  const [insertError, setInsertError] = useState("");
  const run = (command: SvgEditCommand, value?: unknown) => editor?.execute(command, value);
  const canArrange = ready && state.hasSelection;
  const canAlign = ready && state.hasSelection;

  useEffect(() => {
    const compactViewport = window.matchMedia("(max-width: 900px)");
    const collapseInspector = (event: MediaQueryListEvent) => {
      if (event.matches) setInspectorOpen(false);
    };
    compactViewport.addEventListener("change", collapseInspector);
    return () => compactViewport.removeEventListener("change", collapseInspector);
  }, []);

  return (
    <div className="ff-editor-stage ff-editor-workspace" data-ready={ready} data-panel={inspectorOpen && !state.nativeUI ? "open" : "closed"} data-native={state.nativeUI || undefined}>
      {children}
      <input ref={insertSvgInput} type="file" accept=".svg,image/svg+xml" aria-label={zh ? "插入 SVG 文件" : "Insert SVG file"} hidden onChange={async event => {
        const file = event.target.files?.[0]; event.target.value = "";
        if (!file) return;
        try { setInsertError(""); const imported = await importSvgDocument(file); run("import-svg", { markup: imported.markup, originalSize: originalInsertSize.current }); }
        catch { setInsertError(zh ? "无法插入此 SVG，请检查文件格式、大小与复杂度。" : "Could not insert this SVG. Check its format, size and complexity."); }
      }} />
      {insertError && <div className="ff-editor-command-error" role="alert"><span>{insertError}</span><button type="button" onClick={() => setInsertError("")}>×</button></div>}
      {state.nativeUI && <button className="ff-native-return" type="button" onClick={() => run("native-ui", false)}>{zh ? "返回 FigFox 工具" : "Return to FigFox tools"}</button>}


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
                          else { editor?.setMode(tool.mode); if (["star", "polygon"].includes(tool.mode)) { setInspectorTab("properties"); setInspectorOpen(true); } }
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
                  <MenuAction label={zh ? "下一个对象" : "Next object"} icon={Selection} onClick={() => run("select-next")} />
                  <MenuAction label={zh ? "上一个对象" : "Previous object"} icon={Selection} onClick={() => run("select-previous")} />
                  <MenuAction label={zh ? "剪切" : "Cut"} icon={Scissors} disabled={!state.hasSelection} onClick={() => run("cut")} />
                  <MenuAction label={zh ? "复制" : "Copy"} icon={Copy} disabled={!state.hasSelection} onClick={() => run("copy")} />
                  <MenuAction label={zh ? "粘贴" : "Paste"} icon={Stack} onClick={() => run("paste")} />
                  <MenuAction label={zh ? "原位粘贴" : "Paste in place"} icon={Stack} onClick={() => run("paste-in-place")} />
                  <MenuAction label={zh ? "插入 SVG" : "Insert SVG"} icon={UploadSimple} onClick={() => { originalInsertSize.current = false; insertSvgInput.current?.click(); }} />
                  <MenuAction label={zh ? "LaTeX 公式" : "LaTeX formula"} icon={Code} onClick={() => { setInspectorOpen(true); setInspectorTab("properties"); setFormulaFocus(value => value + 1); }} />
                  <MenuAction label={zh ? "按原尺寸插入" : "Insert at original size"} icon={UploadSimple} onClick={() => { originalInsertSize.current = true; insertSvgInput.current?.click(); }} />
                  <MenuAction label={zh ? "创建副本" : "Duplicate"} icon={Copy} disabled={!state.hasSelection} onClick={() => run("duplicate")} />
                  <MenuAction label={zh ? "编组" : "Group"} icon={BoundingBox} disabled={state.selectionCount < 2} onClick={() => run("group")} />
                  <MenuAction label={zh ? "取消编组" : "Ungroup"} icon={VectorThree} disabled={!state.hasSelection} onClick={() => run("ungroup")} />
                  <MenuAction label={zh ? "删除" : "Delete"} icon={Trash} disabled={!state.hasSelection} onClick={() => run("delete")} />
                  <MenuAction label={zh ? "查看源码" : "SVG source"} icon={Code} onClick={() => { const source = editor?.getMarkup(); if (source !== undefined) { setSourceDraft(source); setSourceOpen(true); } }} />
                  <MenuAction label={zh ? "完整工具" : "All tools"} icon={SlidersHorizontal} onClick={() => run("native-ui", true)} />
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
                <label className="ff-inspector-select"><span>{zh ? "对齐参照" : "Relative to"}</span><select aria-label={zh ? "对齐参照" : "Align relative to"} value={state.alignRelative || "selected"} onChange={event => run("align-relative", event.target.value)}><option value="selected">{zh ? "选中对象" : "Selection"}</option><option value="page">{zh ? "画布" : "Page"}</option><option value="largest">{zh ? "最大对象" : "Largest object"}</option><option value="smallest">{zh ? "最小对象" : "Smallest object"}</option></select></label>
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
                    <button key={String(command)} type="button" disabled={!canAlign} aria-label={String(label)} title={String(label)} onClick={() => run(command as SvgEditCommand)}>
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
                  <MenuAction label={zh ? "标尺" : "Rulers"} icon={Rectangle} active={state.nativeControls?.rulers} onClick={() => run("toggle-rulers")} />
                  <MenuAction label={zh ? "线框模式" : "Wireframe"} icon={Eye} active={state.wireframe} onClick={() => run("toggle-wireframe")} />
                  <MenuAction label={zh ? "适合画布" : "Fit canvas"} icon={BoundingBox} onClick={() => run("fit-canvas")} />
                  <MenuAction label={zh ? "适合选区" : "Fit selection"} icon={Selection} disabled={!state.hasSelection} onClick={() => run("fit-selection")} />
                  <MenuAction label={zh ? "适合内容" : "Fit content"} icon={MagnifyingGlass} onClick={() => run("fit-content")} />
                  <MenuAction label={zh ? "适合当前图层" : "Fit current layer"} icon={Stack} onClick={() => run("fit-layer")} />
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
        <Toolbar.Button className="ff-editor-icon-button ff-inspector-toggle" aria-expanded={inspectorOpen} aria-controls="figfox-inspector" data-active={inspectorOpen} disabled={!ready} onClick={() => setInspectorOpen((value) => !value)} aria-label={zh ? "打开属性面板" : "Toggle inspector"} title={zh ? "属性与图层" : "Inspector and layers"}><SlidersHorizontal size={18} /><span>{zh ? "面板" : "Panels"}</span></Toolbar.Button>
      </Toolbar.Root>

      {inspectorOpen && ready && (
        <aside id="figfox-inspector" className="ff-editor-inspector" aria-label={zh ? "属性与图层" : "Inspector and layers"}>
          <div className="ff-inspector-heading"><Tabs.Root value={inspectorTab} onValueChange={(value) => setInspectorTab(value as "layers" | "properties" | "document")}>
            <Tabs.List className="ff-inspector-tabs">
              <Tabs.Tab value="properties"><SlidersHorizontal size={16} />{zh ? "属性" : "Properties"}</Tabs.Tab>
              <Tabs.Tab value="layers"><Stack size={16} />{zh ? "图层" : "Layers"}</Tabs.Tab>
              <Tabs.Tab value="document"><Rectangle size={16} />{zh ? "页面" : "Page"}</Tabs.Tab>
              <Tabs.Indicator className="ff-inspector-tab-indicator" />
            </Tabs.List>
          </Tabs.Root><button className="ff-inspector-close" type="button" aria-label={zh ? "关闭面板" : "Close panels"} onClick={() => setInspectorOpen(false)}><X size={16} /></button></div>
          {inspectorTab === "properties" ? (
            <div className="ff-inspector-scroll"><EditorAppearance state={state} editor={editor} zh={zh} ready={ready} onPaint={setPaintType} /><FormulaEditor zh={zh} selection={state.selection} editor={editor} focusRequest={formulaFocus} /><ShapeToolFields state={state} editor={editor} zh={zh} /><SelectionInspector
              key={state.selection?.id || "empty"}
              zh={zh}
              selection={state.selection}
              mode={state.mode}
              editor={editor}
              native={state.nativeControls}
              onReplaceImage={() => {
                setReplaceImage(true);
                setImageDialogOpen(true);
              }}
            /></div>
          ) : (
            inspectorTab === "layers" ? <LayerPanel state={state} editor={editor} zh={zh} /> : <DocumentPanel state={state} editor={editor} zh={zh} />
          )}
        </aside>
      )}

      <footer className="ff-editor-statusbar">
        <label className="ff-selection-policy" title={zh ? "文字附近可点选；双击编辑；Shift 多选；Ctrl / ⌘ 穿透分组" : "Click near text; double-click to edit; Shift to multi-select; Ctrl / ⌘ to select inside groups"}>
          <Selection size={16} />
          <select aria-label={zh ? "选择方式" : "Selection mode"} disabled={!ready} value={state.selectionPolicy || "object"} onChange={event => run("selection-policy", event.target.value)}>
            <option value="object">{zh ? "选对象" : "Objects"}</option><option value="group">{zh ? "选整组" : "Groups"}</option>
          </select>
        </label>
      {!state.nativeUI && state.context && <button className="ff-editor-context" type="button" onClick={() => run("leave-context")} title={zh ? "退出组内编辑" : "Leave group editing"}><X size={14} /><span>{zh ? "正在编辑组" : "Editing group"} · {state.context.label}</span></button>}
      <Toolbar.Root className="ff-editor-zoom" aria-label={zh ? "画布缩放" : "Canvas zoom"}>
        <Toolbar.Button className="ff-editor-icon-button" disabled={!ready} onClick={() => editor?.zoomOut()} aria-label={zh ? "缩小" : "Zoom out"}><MagnifyingGlassMinus size={17} /></Toolbar.Button>
        <InspectorNumber label="%" value={state.zoom} min={1} max={6400} onChange={value => run("zoom-value", value)} />
        <Toolbar.Button className="ff-editor-icon-button" disabled={!ready} onClick={() => editor?.zoomIn()} aria-label={zh ? "放大" : "Zoom in"}><MagnifyingGlassPlus size={17} /></Toolbar.Button>
        <Toolbar.Separator className="ff-editor-separator" />
        <Toolbar.Button className="ff-editor-icon-button" disabled={!ready} onClick={() => editor?.fitCanvas()} aria-label={zh ? "适合画布" : "Fit canvas"} title={zh ? "适合画布" : "Fit canvas"}><BoundingBox size={18} /></Toolbar.Button>
      </Toolbar.Root>
      </footer>

      <ShapeLibraryDialog
        open={shapeLibraryOpen}
        zh={zh}
        onClose={() => setShapeLibraryOpen(false)}
        onPick={(pathData) => {
          run("shape-library", pathData);
          setShapeLibraryOpen(false);
        }}
      />
      {paintType && <PaintDialog key={paintType} type={paintType} paint={state.paints?.[paintType]} editor={editor} zh={zh} onClose={() => setPaintType(null)} />}
      <SourceEditorDialog
        open={sourceOpen}
        zh={zh}
        source={sourceDraft}
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
