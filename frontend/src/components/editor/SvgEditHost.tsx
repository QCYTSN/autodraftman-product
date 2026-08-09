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
  | "ellipse"
  | "text"
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
};

export type SvgEditSelection = {
  id: string;
  type: string;
  text: string;
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
  markerEnd: string;
  blur: number;
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
};

export type SvgEditCommand =
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
  onStateChange?: (state: SvgEditState) => void;
};

type SvgEditFrameMessage = {
  source?: string;
  type?: string;
  markup?: string;
  message?: string;
  state?: SvgEditState;
};

export const SvgEditHost = forwardRef<SvgEditHandle, SvgEditHostProps>(
function SvgEditHost({
  language,
  markup,
  loadingLabel,
  onMarkupChange,
  onReadyChange,
  onStateChange,
}, ref) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const latestMarkupRef = useRef(markup);
  const lastEditorMarkupRef = useRef("");
  const editorMarkupQueueRef = useRef(new Set<string>());
  const onMarkupChangeRef = useRef(onMarkupChange);
  const onReadyChangeRef = useRef(onReadyChange);
  const onStateChangeRef = useRef(onStateChange);
  const [frameReady, setFrameReady] = useState(false);
  const [error, setError] = useState("");

  latestMarkupRef.current = markup;

  useEffect(() => {
    onMarkupChangeRef.current = onMarkupChange;
    onReadyChangeRef.current = onReadyChange;
    onStateChangeRef.current = onStateChange;
  }, [onMarkupChange, onReadyChange, onStateChange]);

  const sendCommand = (command: string, value?: unknown) => {
    frameRef.current?.contentWindow?.postMessage(
      { source: "figfox-app", type: "command", command, value },
      window.location.origin,
    );
  };

  useImperativeHandle(ref, () => ({
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

    function receiveMessage(event: MessageEvent<SvgEditFrameMessage>) {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (event.data?.source !== "figfox-svgedit") return;

      if (event.data.type === "ready") {
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
        lastEditorMarkupRef.current = event.data.markup ?? latestMarkupRef.current;
        onReadyChangeRef.current(true);
      }
      if (event.data.type === "changed" && event.data.markup) {
        lastEditorMarkupRef.current = event.data.markup;
        editorMarkupQueueRef.current.add(event.data.markup);
        if (editorMarkupQueueRef.current.size > 24) {
          const oldestMarkup = editorMarkupQueueRef.current.values().next().value;
          if (oldestMarkup) editorMarkupQueueRef.current.delete(oldestMarkup);
        }
        onMarkupChangeRef.current(event.data.markup);
      }
      if (event.data.type === "state" && event.data.state) {
        onStateChangeRef.current?.(event.data.state);
      }
      if (event.data.type === "error") {
        setError(event.data.message || "SVG-Edit failed to load.");
        onReadyChangeRef.current(false);
      }
    }

    window.addEventListener("message", receiveMessage);
    return () => {
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
    </section>
  );
});
