import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type SvgEditMode =
  | "select"
  | "fhpath"
  | "line"
  | "rect"
  | "ellipse"
  | "text";

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
};

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

  const sendCommand = (command: string, value?: string | number) => {
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
  }));

  useEffect(() => {
    setFrameReady(false);
    setError("");
    lastEditorMarkupRef.current = "";
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
    if (!frameReady || markup === lastEditorMarkupRef.current) return;
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
