import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type SvgEditMode =
  | "select"
  | "pathedit"
  | "path"
  | "fhpath"
  | "line"
  | "rect"
  | "square"
  | "fhrect"
  | "ellipse"
  | "circle"
  | "fhellipse"
  | "text"
  | "textedit"
  | "image"
  | "zoom"
  | "ext-panning"
  | "connector"
  | "eyedropper"
  | "polygon"
  | "star"
  | "shapelib";

export type SvgEditLayer = {
  id: string;
  label: string;
  type: string;
  depth: number;
  hidden: boolean;
  selected: boolean;
  parentId: string;
  hasChildren: boolean;
};

export type SvgEditPaint = {
  box?: { x: number; y: number; width: number; height: number };
  viewport?: { width: number; height: number };
  kind: "solid" | "linear" | "radial" | "reference" | "mixed";
  color: string;
  opacity: number;
  id?: string;
  stops: { offset: number; color: string; opacity: number }[];
  attributes: Record<string, string>;
};

export type SvgEditDocument = { w: number; h: number; unit: string; snap: boolean; snapStep: number; dynamic?: boolean; images?: "embed" | "ref" };
export type SvgEditPreferences = { baseUnit: string; showRulers: boolean; showGrid: boolean; gridSnapping: boolean; snappingStep: number; gridColor: string; bkgd_color: string; bkgd_url: string };

export type SvgEditSelection = {
  id: string;
  type: string;
  text: string;
  formula?: { id: string; latex: string } | null;
  textLatex?: { source: string; approximate: boolean } | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  radius: number;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textAnchor: string;
  strokeDasharray: string;
  strokeLinecap: string;
  strokeLinejoin: string;
  markerStart: string;
  markerMid: string;
  markerEnd: string;
  blur: number;
  letterSpacing: number;
  wordSpacing: number;
  textLength: number;
  lengthAdjust: string;
  className: string;
  textDecoration: string;
  node: { x: number; y: number; type: number } | null;
  geometry: Record<string, number>;
};

export type SvgEditState = {
  mode: SvgEditMode;
  hasSelection: boolean;
  canUndo: boolean;
  canRedo: boolean;
  zoom: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  selectionCount: number;
  selection: SvgEditSelection | null;
  layers: SvgEditLayer[];
  gridVisible: boolean;
  wireframe: boolean;
  selectedIds?: string[];
  objectCount?: number;
  paints?: { fill: SvgEditPaint; stroke: SvgEditPaint };
  document?: SvgEditDocument;
  preferences?: SvgEditPreferences;
  unitFactors?: Record<string, number>;
  documentLayers?: { name: string; active: boolean; visible: boolean }[];
  nativeUI?: boolean;
  selectionPolicy?: "object" | "group";
  nativeControls?: { rulers: boolean; title: string; shape: string | null; shapeParameters: Record<string, number>; link: string; groupTitle: string; layerView: boolean; linkedControls: boolean; addingSubPath: boolean };
  alignRelative?: string;
  context?: { id: string; label: string } | null;
};

export type SvgEditCommand =
  | "editor-preferences"
  | "formula"
  | "import-svg" | "select-next" | "select-previous"
  | "shape-parameter" | "hyperlink" | "remove-hyperlink" | "select-parent" | "group-title"
  | "document-title" | "document-properties" | "fit-page-content" | "toggle-rulers"
  | "layer-view" | "merge-all-layers" | "export-pdf"
  | "selection-policy"
  | "zoom-value"
  | "fit-layer"
  | "paste-in-place"
  | "paint"
  | "geometry"
  | "layer-action"
  | "node-attribute"
  | "node-type"
  | "align-relative"
  | "leave-context"
  | "export-raster"
  | "document-settings"
  | "preferences"
  | "native-ui"
  | "unlink-use"
  | "undo"
  | "redo"
  | "select-all"
  | "deselect"
  | "delete"
  | "cut"
  | "copy"
  | "paste"
  | "duplicate"
  | "group"
  | "ungroup"
  | "bring-forward"
  | "send-backward"
  | "bring-front"
  | "send-back"
  | "align-left"
  | "align-center"
  | "align-right"
  | "align-top"
  | "align-middle"
  | "align-bottom"
  | "distribute-horizontal"
  | "distribute-vertical"
  | "flip-horizontal"
  | "flip-vertical"
  | "rotate-left"
  | "rotate-right"
  | "convert-path"
  | "reorient-path"
  | "path-edit"
  | "path-node-clone"
  | "path-node-delete"
  | "path-open-close"
  | "path-add-subpath"
  | "path-link-controls"
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "overline"
  | "toggle-grid"
  | "toggle-wireframe"
  | "source"
  | "zoom-in"
  | "zoom-out"
  | "fit-canvas"
  | "fit-selection"
  | "fit-content"
  | "select-layer"
  | "toggle-layer"
  | "attribute"
  | "text-content"
  | "font-family"
  | "font-size"
  | "marker-start"
  | "marker-mid"
  | "marker-end"
  | "image-source"
  | "shape-library";

export type SvgEditHandle = {
  getMarkup: () => string;
  getSourceMarkup: () => string;
  getExportMarkup: () => Promise<string>;
  setMode: (mode: SvgEditMode) => void;
  undo: () => void;
  redo: () => void;
  deleteSelection: () => void;
  setFill: (color: string) => void;
  setStroke: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  setOpacity: (opacity: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitCanvas: () => void;
  execute: (command: SvgEditCommand, value?: unknown) => void;
};

type SvgEditHostProps = {
  language: "zh" | "en";
  markup: string;
  loadingLabel: string;
  onMarkupChange: (markup: string) => void;
  onReadyChange: (ready: boolean) => void;
  onLoadError?: () => void;
  onStateChange?: (state: SvgEditState) => void;
  onDirty?: () => void;
  onRequest?: (request: SvgEditRequest) => void;
};

export type SvgEditRequest = { type: string; paintType?: "fill" | "stroke"; saveAs?: boolean; language?: "zh" | "en" };

type SvgEditFrameMessage = {
  source?: string;
  type?: string;
  markup?: string;
  message?: string;
  state?: SvgEditState;
  paintType?: "fill" | "stroke";
  saveAs?: boolean;
  language?: "zh" | "en";
};

export const SvgEditHost = forwardRef<SvgEditHandle, SvgEditHostProps>(
function SvgEditHost({
  language,
  markup,
  loadingLabel,
  onMarkupChange,
  onReadyChange,
  onLoadError,
  onStateChange,
  onDirty,
  onRequest,
}, ref) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const latestMarkupRef = useRef(markup);
  const lastEditorMarkupRef = useRef("");
  const editorMarkupQueueRef = useRef(new Set<string>());
  const onMarkupChangeRef = useRef(onMarkupChange);
  const onReadyChangeRef = useRef(onReadyChange);
  const onLoadErrorRef = useRef(onLoadError);
  const onStateChangeRef = useRef(onStateChange);
  const onDirtyRef = useRef(onDirty);
  const onRequestRef = useRef(onRequest);
  onRequestRef.current = onRequest;
  const lastStateRef = useRef<SvgEditState | null>(null);
  const [frameReady, setFrameReady] = useState(false);
  const [error, setError] = useState("");
  const [commandError, setCommandError] = useState("");

  latestMarkupRef.current = markup;

  useEffect(() => {
    onMarkupChangeRef.current = onMarkupChange;
    onReadyChangeRef.current = onReadyChange;
    onLoadErrorRef.current = onLoadError;
    onStateChangeRef.current = onStateChange;
    onDirtyRef.current = onDirty;
  }, [onMarkupChange, onReadyChange, onStateChange, onLoadError, onDirty]);

  const rememberMarkup = (value: string) => {
    lastEditorMarkupRef.current = value;
    editorMarkupQueueRef.current.add(value);
    if (editorMarkupQueueRef.current.size > 3) {
      const oldest = editorMarkupQueueRef.current.values().next().value;
      if (oldest) editorMarkupQueueRef.current.delete(oldest);
    }
  };

  const sendCommand = (command: string, value?: unknown) => {
    setCommandError("");
    const frame = frameRef.current?.contentWindow as (Window & { figfoxCommand?: (command: string, value?: unknown) => void }) | null;
    if (frame?.figfoxCommand) { frame.figfoxCommand(command, value); return; }
    frame?.postMessage(
      { source: "figfox-app", type: "command", command, value },
      window.location.origin,
    );
  };

  useImperativeHandle(ref, () => ({
    getSourceMarkup: () => {
      const frame = frameRef.current?.contentWindow as (Window & { figfoxSource?: () => string }) | null;
      if (!frame?.figfoxSource) throw new Error("Editor is not ready");
      return frame.figfoxSource();
    },
    getExportMarkup: async () => {
      const frame = frameRef.current?.contentWindow as (Window & { figfoxExport?: () => Promise<string> }) | null;
      if (!frame?.figfoxExport) throw new Error("Editor is not ready");
      return frame.figfoxExport();
    },
    getMarkup: () => {
      const frame = frameRef.current?.contentWindow as (Window & { figfoxSnapshot?: () => string }) | null;
      if (!frame?.figfoxSnapshot) throw new Error("Editor is not ready");
      const value = frame.figfoxSnapshot();
      rememberMarkup(value);
      return value;
    },
    setMode: (mode) => sendCommand("set-mode", mode),
    undo: () => sendCommand("undo"),
    redo: () => sendCommand("redo"),
    deleteSelection: () => sendCommand("delete"),
    setFill: (color) => sendCommand("fill", color),
    setStroke: (color) => sendCommand("stroke", color),
    setStrokeWidth: (width) => sendCommand("stroke-width", width),
    setOpacity: (opacity) => sendCommand("opacity", opacity),
    zoomIn: () => sendCommand("zoom-in"),
    zoomOut: () => sendCommand("zoom-out"),
    fitCanvas: () => sendCommand("fit-canvas"),
    execute: (command, value) => sendCommand(command, value),
  }));

  useEffect(() => {
    setFrameReady(false);
    setError("");
    lastEditorMarkupRef.current = "";
    editorMarkupQueueRef.current.clear();
    onReadyChangeRef.current(false);
    const startupTimeout = window.setTimeout(() => {
      setError(language === "zh" ? "编辑器未能完成加载，请返回工作台后重试。" : "The editor could not finish loading. Return to the workspace and try again.");
      onReadyChangeRef.current(false);
      onLoadErrorRef.current?.();
    }, 15000);

    function receiveMessage(event: MessageEvent<SvgEditFrameMessage>) {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.origin !== window.location.origin) return;
      if (event.data?.source !== "figfox-svgedit") return;
      if (["paint-dialog", "save-file", "language", "document-panel"].includes(event.data.type || "")) onRequestRef.current?.({ ...event.data, type: event.data.type! });

      if (event.data.type === "ready") {
        rememberMarkup(latestMarkupRef.current);
        setFrameReady(true);
        frameRef.current?.contentWindow?.postMessage(
          {
            source: "figfox-app",
            type: "load",
            markup: latestMarkupRef.current,
          },
          window.location.origin,
        );
      }
      if (event.data.type === "loaded") {
        window.clearTimeout(startupTimeout);
        setError("");
        lastEditorMarkupRef.current = event.data.markup ?? latestMarkupRef.current;
        if (event.data.markup) {
          rememberMarkup(event.data.markup);
          onMarkupChangeRef.current(event.data.markup);
        }
        onReadyChangeRef.current(true);
      }
      if (event.data.type === "changed" && event.data.markup) {
        rememberMarkup(event.data.markup);
        onMarkupChangeRef.current(event.data.markup);
      }
      if (event.data.type === "state" && event.data.state) {
        const state = { ...lastStateRef.current, ...event.data.state };
        lastStateRef.current = state;
        onStateChangeRef.current?.(state);
      }
      if (event.data.type === "dirty") onDirtyRef.current?.();
      if (event.data.type === "command-error") {
        setCommandError(event.data.message || (language === "zh" ? "操作未能完成" : "The operation could not be completed"));
      }
      if (event.data.type === "error") {
        window.clearTimeout(startupTimeout);
        setError(event.data.message || "SVG-Edit failed to load.");
        onReadyChangeRef.current(false);
        onLoadErrorRef.current?.();
      }
    }

    window.addEventListener("message", receiveMessage);
    return () => {
      window.clearTimeout(startupTimeout);
      window.removeEventListener("message", receiveMessage);
      onReadyChangeRef.current(false);
    };
  }, [language]);

  useEffect(() => {
    if (!frameReady) return;
    if (editorMarkupQueueRef.current.delete(markup)) {
      lastEditorMarkupRef.current = markup;
      return;
    }
    if (markup === lastEditorMarkupRef.current) return;
    onReadyChangeRef.current(false);
    frameRef.current?.contentWindow?.postMessage(
      { source: "figfox-app", type: "load", markup },
      window.location.origin,
    );
  }, [frameReady, markup]);

  const frameSrc = `${import.meta.env.BASE_URL}svgedit/figfox-editor.html?lang=${
    language === "zh" ? "zh-CN" : "en"
  }`;

  return (
    <section className="figfox-svgedit-host" aria-label="SVG editor">
      <iframe
        ref={frameRef}
        className="figfox-svgedit-frame"
        src={frameSrc}
        title="FigFox SVG editor"
        sandbox="allow-scripts allow-same-origin allow-downloads allow-modals"
      />
      {!frameReady && !error && (
        <div className="figfox-svgedit-loading" role="status">
          <span aria-hidden="true" />
          <strong>{loadingLabel}</strong>
        </div>
      )}
      {error && (
        <div className="figfox-svgedit-error" role="alert">
          {error}
        </div>
      )}
      {commandError && <div className="ff-editor-command-error" role="alert"><span>{commandError}</span><button type="button" onClick={() => setCommandError("")} aria-label={language === "zh" ? "关闭提示" : "Dismiss"}>×</button></div>}
    </section>
  );
});
