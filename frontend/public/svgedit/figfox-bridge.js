import { createEditorFeatures } from "./figfox-features.js";

const targetOrigin = window.location.origin;
const EditorCtor = (window.Editor && window.Editor.default) || window.Editor;
const editor = new EditorCtor(document.getElementById("container"));
let features;
let nativeUI = false;
let alignRelative = "selected";
let textInputHome;
let textInputStyle;
const lang = new URLSearchParams(window.location.search).get("lang") || "en";

const send = (type, detail = {}) => {
  window.parent.postMessage({ source: "figfox-svgedit", type, ...detail }, targetOrigin);
};

const normalizeColor = (value, fallback) => {
  if (!value) return fallback;
  return /^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? `#${value}` : value;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const byId = (id) => {
  try {
    return editor.svgCanvas.$id(id) || document.getElementById(id);
  } catch {
    return document.getElementById(id);
  }
};

const selectedElements = () =>
  editor.svgCanvas.getSelectedElements().filter(Boolean);

let editingPathId = "";
let addingSubPath = false;
let linkedControls = false;

const selectedIds = () => {
  const ids = new Set(selectedElements().map((element) => element.id));
  if (editingPathId) {
    ids.add(editingPathId);
  }
  return ids;
};

const getContentRoot = () => {
  if (typeof editor.svgCanvas.getSvgContent === "function") {
    return editor.svgCanvas.getSvgContent();
  }
  return byId("svgcontent");
};

const elementLabel = (element, index) => {
  const title = Array.from(element.children || []).find(
    (child) => child.tagName?.toLowerCase() === "title",
  );
  return (
    element.getAttribute("data-name") ||
    element.getAttribute("aria-label") ||
    title?.textContent?.trim() ||
    element.id ||
    `${element.tagName?.toLowerCase() || "object"} ${index + 1}`
  );
};

const collectLayers = () => {
  const root = getContentRoot();

  if (!root) return [];
  const items = [];
  const structuralTags = new Set([
    "defs", "title", "desc", "metadata", "style", "clippath", "mask",
    "marker", "pattern", "lineargradient", "radialgradient", "filter",
  ]);
  const drawableTags = new Set([
    "g", "a", "svg", "path", "rect", "circle", "ellipse", "line",
    "polyline", "polygon", "text", "tspan", "textpath", "image", "use",
  ]);
  const visit = (element, depth) => {
    const tag = element.tagName?.toLowerCase() || "";
    if (!tag || structuralTags.has(tag)) return;
    if (drawableTags.has(tag)) {
      if (!element.id) element.id = editor.svgCanvas.getNextId();
      items.push({
        id: element.id,
        label: elementLabel(element, items.length),
        type: tag,
        depth,
        parentId: element.parentElement?.id || "",
        hasChildren: [...element.children].some(child => drawableTags.has(child.localName)),
        hidden:
          element.getAttribute("display") === "none" ||
          element.style.display === "none" ||
          element.getAttribute("visibility") === "hidden" || element.style.visibility === "hidden",
        selected: false,
      });
    }
    Array.from(element.children || []).reverse().forEach((child) => visit(child, depth + 1));
  };
  Array.from(root.children).reverse().forEach((element) => visit(element, 0));
  return items;
};

const selectionDetail = () => {
  const element =
    selectedElements()[0] ||
    (editingPathId
      ? byId(editingPathId)
      : null);
  if (!element) return null;
  let bbox = { x: 0, y: 0, width: 0, height: 0 };
  try {
    const boxes = (selectedElements().length ? selectedElements() : [element]).map(features.bounds);
    const x = Math.min(...boxes.map(box => box.x)), y = Math.min(...boxes.map(box => box.y));
    bbox = { x, y, width: Math.max(...boxes.map(box => box.x + box.width)) - x, height: Math.max(...boxes.map(box => box.y + box.height)) - y };
  } catch {
    // Hidden and non-rendered SVG nodes may not expose a box.
  }
  const text = ["text", "tspan", "textPath"].includes(element.localName) ? features.textRuns(element).map(node => node.data).join("") : "";
  const computed = (name, fallback) => features.style(element, name, fallback);
  let node = null;
  if (editor.svgCanvas.getMode() === "pathedit") { try { node = editor.svgCanvas.pathActions.getNodePoint(); } catch { /* No active node. */ } }
  return {
    id: element.id || "",
    type: selectedElements().length > 1 ? "selection" : element.tagName.toLowerCase(),
    text,
    x: bbox.x,
    y: bbox.y,
    width: bbox.width,
    height: bbox.height,
    rotation: editor.svgCanvas.getRotationAngle(element),
    radius: toNumber(element.getAttribute("rx"), 0),
    fontFamily: computed("font-family", "sans-serif"),
    fontSize: toNumber(computed("font-size", "24"), 24),
    fontWeight: computed("font-weight", "normal"),
    fontStyle: computed("font-style", "normal"),
    textAnchor: computed("text-anchor", "start"),
    strokeDasharray: computed("stroke-dasharray", "none"),
    strokeLinecap: computed("stroke-linecap", "butt"),
    strokeLinejoin: computed("stroke-linejoin", "miter"),
    markerStart: computed("marker-start", "none"),
    markerMid: computed("marker-mid", "none"),
    markerEnd: computed("marker-end", "none"),
    letterSpacing: toNumber(computed("letter-spacing", "0")),
    wordSpacing: toNumber(computed("word-spacing", "0")),
    textLength: toNumber(element.getAttribute("textLength")),
    lengthAdjust: element.getAttribute("lengthAdjust") || "spacing",
    className: element.getAttribute("class") || "",
    textDecoration: computed("text-decoration-line", "none"),
    node,
    geometry: Object.fromEntries(["cx", "cy", "r", "rx", "ry", "x1", "y1", "x2", "y2"].filter(name => element.hasAttribute(name)).map(name => [name, toNumber(element.getAttribute(name))])),
    blur:
      typeof editor.svgCanvas.getBlur === "function"
        ? Math.round(toNumber(editor.svgCanvas.getBlur(element)) * 10)
        : 0,
  };
};

let stateFrame = 0;
let snapshotTimer = 0;
let treeDirty = true;
let documentDirty = false;
let loading = false;
let pointerDown = false;
let lastState = "";
let lastMarkup = "";
let objectCount = 0;

const flushDocument = () => {
  clearTimeout(snapshotTimer);
  if (!documentDirty || loading) return;
  const markup = features.snapshot();
  documentDirty = false;
  if (markup !== lastMarkup) { lastMarkup = markup; send("changed", { markup }); }
};
const scheduleDocument = () => {
  if (loading) return;
  if (!documentDirty) send("dirty");
  documentDirty = true;
  clearTimeout(snapshotTimer);
  if (!pointerDown) snapshotTimer = setTimeout(flushDocument, 180);
};
const sendState = () => {
  stateFrame = 0;
  if (loading) return;
  const canvas = editor.svgCanvas;
  const selection = selectedElements();
  if (editingPathId && !byId(editingPathId)) editingPathId = "";
  const detail = selectionDetail();
  const fillPaint = features.paint("fill"), strokePaint = features.paint("stroke");
  const state = {
    mode: canvas.getMode() === "pathedit" ? "pathedit" : canvas.getMode(),
    hasSelection: selection.length > 0 || Boolean(detail),
    canUndo: canvas.undoMgr.getUndoStackSize() > 0,
    canRedo: canvas.undoMgr.getRedoStackSize() > 0,
    zoom: Math.round(canvas.getZoom() * 100),
    fill: normalizeColor(fillPaint.color, "#ffffff"),
    stroke: normalizeColor(strokePaint.color, "#20152b"),
    paints: { fill: fillPaint, stroke: strokePaint },
    strokeWidth: toNumber(features.style(selection[0], "stroke-width", String(canvas.getStrokeWidth()))),
    opacity: Math.round(toNumber(features.style(selection[0], "opacity", String(canvas.getOpacity())), 1) * 100),
    selectionCount: selection.length || (detail ? 1 : 0),
    selectedIds: [...selectedIds()],
    selection: detail,
    gridVisible: Boolean(editor.configObj.curConfig.showGrid),
    wireframe: editor.workarea.classList.contains("wireframe"),
    nativeUI, alignRelative,
    context: canvas.getCurrentGroup() ? { id: canvas.getCurrentGroup().id, label: elementLabel(canvas.getCurrentGroup(), 0) } : null,
    document: { ...canvas.getResolution(), unit: editor.configObj.curConfig.baseUnit || "px", snap: Boolean(editor.configObj.curConfig.gridSnapping), snapStep: editor.configObj.curConfig.snappingStep || 10 },
    documentLayers: features.layers(),
  };
  let layers;
  if (treeDirty) { treeDirty = false; layers = collectLayers(); objectCount = layers.length; }
  state.objectCount = objectCount;
  const signature = JSON.stringify(state);
  if (signature !== lastState || layers) {
    lastState = signature;
    send("state", { state: { ...state, ...(layers ? { layers } : {}) } });
  }
};
const scheduleState = () => { if (!stateFrame) stateFrame = requestAnimationFrame(sendState); };
const changed = () => { scheduleDocument(); scheduleState(); };
window.figfoxSnapshot = () => {
  clearTimeout(snapshotTimer);
  const markup = features.snapshot();
  documentDirty = false;
  if (markup !== lastMarkup) { lastMarkup = markup; send("changed", { markup }); }
  return markup;
};

const toolIds = {
  select: "tool_select",
  path: "tool_path",
  fhpath: "tool_fhpath",
  line: "tool_line",
  rect: "tool_rect",
  ellipse: "tool_ellipse",
  text: "tool_text",
  image: "tool_image",
  zoom: "tool_zoom",
  "ext-panning": "ext-panning",
  connector: "tool_connect",
  eyedropper: "tool_eyedropper",
  polygon: "tool_polygon",
  star: "tool_star",
  shapelib: "tool_shapelib",
};

const activateMode = (mode) => {
  if (mode !== "pathedit") {
    if (addingSubPath && editingPathId) {
      editor.svgCanvas.pathActions.addSubPath(false);
    }
    editingPathId = "";
    addingSubPath = false;
    linkedControls = false;
  }
  const button = byId(toolIds[mode]);
  if (button && !button.disabled) {
    button.click();
  } else {
    editor.svgCanvas.setMode(mode);
  }
};

const enterPathEdit = () => {
  const element = selectedElements()[0];
  if (!element || element.tagName.toLowerCase() !== "path") return;
  editingPathId = element.id || editor.svgCanvas.getNextId();
  if (!element.id) element.id = editingPathId;
  addingSubPath = false;
  linkedControls = false;
  editor.svgCanvas.pathActions.toEditMode(element);
};

const resumePathEdit = () => {
  if (!editingPathId) return false;
  if (addingSubPath) {
    editor.svgCanvas.pathActions.addSubPath(false);
    addingSubPath = false;
  }
  return true;
};

const selectLayer = (id) => {
  const element = byId(String(id));
  if (!element) return;
  const canvas = editor.svgCanvas;
  const drawing = canvas.getCurrentDrawing();
  const layer = features.layers().find(layer => drawing.getLayerByName(layer.name)?.contains(element));
  if (layer && !layer.active) canvas.setCurrentLayer(layer.name);
  const group = canvas.getCurrentGroup();
  if (group && !group.contains(element)) canvas.leaveContext();
  activateMode("select");
  canvas.selectOnly([element], true);
};

const toggleLayer = (id) => {
  const element = byId(String(id));
  if (!element) return;
  const canvas = editor.svgCanvas;
  const drawing = canvas.getCurrentDrawing();
  const layer = features.layers().find(layer => drawing.getLayerByName(layer.name) === element);
  if (layer) { features.layerAction("visibility", layer.name); return; }
  const hidden =
    element.getAttribute("display") === "none" || element.style.display === "none" || element.getAttribute("visibility") === "hidden" || element.style.visibility === "hidden";
  const before = { display: element.getAttribute("display"), visibility: element.getAttribute("visibility"), style: element.getAttribute("style") };
  element.setAttribute("display", hidden ? "inline" : "none");
  element.style.removeProperty("display");
  if (hidden) { element.setAttribute("visibility", "visible"); element.style.removeProperty("visibility"); }
  canvas.addCommandToHistory(new canvas.history.ChangeElementCommand(element, before));
  treeDirty = true;
};

const changeAttribute = (payload) => {
  if (!payload || typeof payload !== "object") return;
  const name = String(payload.name || "");
  const value = payload.value;
  if (!name || value === undefined || value === null) return;
  if (["x", "y", "width", "height"].includes(name)) {
    features.geometry(name, Number(value));
  } else if (name === "rotation") {
    editor.svgCanvas.setRotationAngle(Number(value));
  } else if (name === "radius") {
    editor.svgCanvas.setRectRadius(Number(value));
  } else if (name === "blur") {
    editor.svgCanvas.setBlur(Number(value) / 10, true);
  } else {
    if (name === "id") {
      if (!/^[A-Za-z_][\w.:-]*$/.test(String(value)) || (byId(String(value)) && byId(String(value)) !== selectedElements()[0])) throw new Error("对象 ID 必须有效且唯一 / Use a valid, unique object ID");
      editor.svgCanvas.changeSelectedAttribute(name, value, selectedElements());
    } else editor.svgCanvas.changeSelectedAttribute(name, value);
  }
};

const changeMarker = (position, value) => {
  if (typeof window.figfoxSetMarker === "function") {
    window.figfoxSetMarker(position, String(value));
    return;
  }
  const list = byId(`${position}_marker_list_opts`);
  if (!list) return;
  list.setAttribute("value", String(value));
  list.dispatchEvent(
    new CustomEvent("change", { detail: { value: String(value) }, bubbles: true }),
  );
};

editor.setConfig({
  lang,
  imgPath: "./images/",
  extPath: "./extensions",
  noDefaultExtensions: true,
  extensions: [
    "ext-connector",
    "ext-eyedropper",
    "ext-grid",
    "ext-markers",
    "ext-panning",
    "ext-shapes",
    "ext-polystar",
    "ext-layer_view",
  ],
  userExtensions: [],
  showRulers: false,
  noStorageOnLoad: true,
  no_save_warning: true,
  canvas_expansion: 2,
  initFill: { color: "ffffff", opacity: 1 },
  initStroke: { color: "20152b", opacity: 1, width: 1 },
});

async function handleMessage(event) {
  if (event.source !== window.parent || event.origin !== targetOrigin) return;
  if (event.data?.source !== "figfox-app") return;

  if (event.data?.type === "command") {
    let previousSelection;
    const targetId = event.data.value?.targetId;
    if (targetId && targetId !== selectedElements()[0]?.id) {
      const target = byId(targetId);
      if (!target) return;
      previousSelection = selectedElements();
      editor.svgCanvas.selectOnly([target], true);
    }
    try {
      const canvas = editor.svgCanvas;
      switch (event.data.command) {
        case "paint": features.applyPaint(event.data.value); break;
        case "geometry": features.geometry(event.data.value.name, Number(event.data.value.value)); break;
        case "layer-action": features.layerAction(event.data.value.action, event.data.value.value); treeDirty = true; break;
        case "node-attribute": canvas.pathActions.moveNode(event.data.value.name, Number(event.data.value.value)); break;
        case "node-type": canvas.pathActions.setSegType(Number(event.data.value)); break;
        case "align-relative": alignRelative = String(event.data.value); break;
        case "leave-context": canvas.leaveContext(); canvas.setMode("select"); break;
        case "export-raster": await features.raster(event.data.value); break;
        case "document-settings": {
          const { w, h, unit, snap, snapStep } = event.data.value;
          if (!(w > 0 && h > 0 && w <= 100000 && h <= 100000)) throw new Error("请输入有效的画布尺寸 / Enter valid canvas dimensions");
          if (!["px", "mm", "cm", "in", "pt", "pc"].includes(unit)) throw new Error("Invalid unit");
          editor.configObj.curConfig.baseUnit = unit;
          editor.configObj.curConfig.gridSnapping = Boolean(snap);
          editor.configObj.curConfig.snappingStep = Math.max(.1, Number(snapStep) || 10);
          canvas.setResolution(Number(w), Number(h));
          editor.updateCanvas();
          break;
        }
        case "preferences": editor.mainMenu.showPreferences(); break;
        case "native-ui": {
          nativeUI = Boolean(event.data.value);
          document.documentElement.toggleAttribute("data-native", nativeUI);
          syncTextInput();
          if (nativeUI) styleNativeControls();
          editor.updateCanvas();
          break;
        }
        case "unlink-use": canvas.ungroupSelectedElement(); break;
        case "set-mode": activateMode(String(event.data.value)); break;
        case "undo": if (canvas.undoMgr.getUndoStackSize() > 0) canvas.undoMgr.undo(); break;
        case "redo": if (canvas.undoMgr.getRedoStackSize() > 0) canvas.undoMgr.redo(); break;
        case "select-all": canvas.selectAllInCurrentLayer(); break;
        case "deselect": canvas.clearSelection(); break;
        case "delete": canvas.deleteSelectedElements(); break;
        case "cut": canvas.cutSelectedElements(); break;
        case "copy": canvas.copySelectedElements(); break;
        case "paste": editor.pasteInCenter(); break;
        case "duplicate": canvas.cloneSelectedElements(20, 20); break;
        case "group": if (selectedElements().length > 1) canvas.groupSelectedElements(); break;
        case "ungroup": if (selectedElements().length === 1) canvas.ungroupSelectedElement(); break;
        case "bring-forward": canvas.moveUpDownSelected("Up"); break;
        case "send-backward": canvas.moveUpDownSelected("Down"); break;
        case "bring-front": canvas.moveToTopSelectedElement(); break;
        case "send-back": canvas.moveToBottomSelectedElement(); break;
        case "align-left": canvas.alignSelectedElements("left", selectedElements().length > 1 ? alignRelative : "page"); break;
        case "align-center": canvas.alignSelectedElements("center", selectedElements().length > 1 ? alignRelative : "page"); break;
        case "align-right": canvas.alignSelectedElements("right", selectedElements().length > 1 ? alignRelative : "page"); break;
        case "align-top": canvas.alignSelectedElements("top", selectedElements().length > 1 ? alignRelative : "page"); break;
        case "align-middle": canvas.alignSelectedElements("middle", selectedElements().length > 1 ? alignRelative : "page"); break;
        case "align-bottom": canvas.alignSelectedElements("bottom", selectedElements().length > 1 ? alignRelative : "page"); break;
        case "distribute-horizontal": canvas.alignSelectedElements("distrib_horiz", alignRelative); break;
        case "distribute-vertical": canvas.alignSelectedElements("distrib_verti", alignRelative); break;
        case "flip-horizontal": canvas.flipSelectedElements(-1, 1); break;
        case "flip-vertical": canvas.flipSelectedElements(1, -1); break;
        case "rotate-left": {
          const element = selectedElements()[0];
          if (element) canvas.setRotationAngle(canvas.getRotationAngle(element) - 15);
          break;
        }
        case "rotate-right": {
          const element = selectedElements()[0];
          if (element) canvas.setRotationAngle(canvas.getRotationAngle(element) + 15);
          break;
        }
        case "convert-path": canvas.convertToPath(); break;
        case "reorient-path": canvas.pathActions.reorient(); break;
        case "path-edit": enterPathEdit(); break;
        case "path-node-clone": if (resumePathEdit()) editor.topPanel.clonePathNode(); break;
        case "path-node-delete": if (resumePathEdit()) editor.topPanel.deletePathNode(); break;
        case "path-open-close": if (resumePathEdit()) editor.topPanel.opencloseSubPath(); break;
        case "path-add-subpath":
          if (editingPathId) {
            addingSubPath = !addingSubPath;
            canvas.pathActions.addSubPath(addingSubPath);
          }
          break;
        case "path-link-controls":
          if (resumePathEdit()) {
            linkedControls = !linkedControls;
            canvas.pathActions.linkControlPoints(linkedControls);
          }
          break;
        case "bold": editor.topPanel.clickBold(); break;
        case "italic": editor.topPanel.clickItalic(); break;
        case "underline": editor.topPanel.clickTextDecoration("underline"); break;
        case "strike": editor.topPanel.clickTextDecoration("line-through"); break;
        case "overline": editor.topPanel.clickTextDecoration("overline"); break;
        case "toggle-grid":
          if (typeof window.figfoxToggleGrid === "function") window.figfoxToggleGrid();
          else byId("view_grid")?.click();
          break;
        case "toggle-wireframe":
          editor.topPanel.clickWireframe();
          editor.configObj.curConfig.wireframe = editor.workarea.classList.contains("wireframe");
          break;
        case "source": editor.topPanel.showSourceEditor(); break;
        case "fill": canvas.setColor("fill", String(event.data.value)); break;
        case "stroke": canvas.setColor("stroke", String(event.data.value)); break;
        case "stroke-width": canvas.setStrokeWidth(Number(event.data.value)); break;
        case "opacity": canvas.setOpacity(Number(event.data.value) / 100); break;
        case "zoom-in": editor.bottomPanel.changeZoom(String(Math.min(800, canvas.getZoom() * 120))); break;
        case "zoom-out": editor.bottomPanel.changeZoom(String(Math.max(10, canvas.getZoom() * 80))); break;
        case "fit-canvas": editor.bottomPanel.changeZoom("canvas"); break;
        case "fit-selection": editor.bottomPanel.changeZoom("selection"); break;
        case "fit-content": editor.bottomPanel.changeZoom("content"); break;
        case "select-layer": selectLayer(event.data.value); break;
        case "toggle-layer": toggleLayer(event.data.value); break;
        case "attribute": changeAttribute(event.data.value); break;
        case "text-content": features.editText(typeof event.data.value === "object" ? String(event.data.value.text) : String(event.data.value)); break;
        case "font-family": canvas.setFontFamily(String(event.data.value)); break;
        case "font-size": canvas.setFontSize(Number(event.data.value)); break;
        case "marker-start": changeMarker("start", event.data.value); break;
        case "marker-mid": changeMarker("mid", event.data.value); break;
        case "marker-end": changeMarker("end", event.data.value); break;
        case "image-source": {
          const source = String(event.data.value?.source || "");
          const replace = Boolean(event.data.value?.replace);
          if (source && replace && selectedElements()[0]?.tagName.toLowerCase() === "image") {
            canvas.setImageURL(source);
          } else if (source) {
            canvas.lastGoodImgUrl = source;
            activateMode("image");
          }
          break;
        }
        case "shape-library": {
          const pathData = String(event.data.value || "");
          if (pathData) {
            window.figfoxShapePath = pathData;
            editingPathId = "";
            addingSubPath = false;
            canvas.setMode("shapelib");
          }
          break;
        }
      }
      // Some SVG-Edit attribute setters do not emit changed. Observe document mutations
      // as the source of truth, and notify extensions once for explicit attribute edits.
      if (["attribute", "toggle-layer"].includes(event.data.command)) canvas.call("changed", selectedElements());
      scheduleState();
    } catch (error) {
      send("command-error", { message: error instanceof Error ? error.message : "Editor command failed" });
    }
    if (previousSelection) editor.svgCanvas.selectOnly(previousSelection.filter(element => element.isConnected), true);
    return;
  }

  if (event.data?.type !== "load") return;
  try {
    loading = true;
    clearTimeout(snapshotTimer);
    documentDirty = false;
    editingPathId = "";
    addingSubPath = false;
    linkedControls = false;
    const incoming = features.prepareImport(event.data.markup);
    await editor.loadFromString(incoming.markup, { noAlert: true });
    incoming.restore();
    editor.zoomChanged(null, "canvas");
    observeDocument();
    treeDirty = true;
    loading = false;
    sendState();
    lastMarkup = features.snapshot();
    send("loaded", { markup: lastMarkup });
  } catch (error) {
    loading = false;
    send("error", { message: error instanceof Error ? error.message : "SVG load failed" });
  }
}
window.addEventListener("message", handleMessage);
// Same-origin commands run before a following click can request an export snapshot.
window.figfoxCommand = (command, value) => handleMessage({ source: window.parent, origin: targetOrigin, data: { source: "figfox-app", type: "command", command, value } });

let observer;
function observeDocument() {
  observer?.disconnect();
  observer = new MutationObserver(records => {
    if (loading) return;
    records = records.filter(record => !(record.type === "attributes" && record.target === getContentRoot() && ["x", "y", "width", "height", "viewBox"].includes(record.attributeName)));
    if (!records.length) return;
    if (records.some(record => record.type === "childList" || ["id", "data-name", "aria-label", "display", "visibility"].includes(record.attributeName) || (record.type === "characterData" && record.target.parentElement?.localName === "title"))) treeDirty = true;
    scheduleDocument();
    scheduleState();
  });
  observer.observe(getContentRoot(), { subtree: true, attributes: true, childList: true, characterData: true });
}
editor.init().then(() => {
  features = createEditorFeatures(editor);
  const textInput = byId("text");
  textInputHome = document.createComment("FigFox native text input position");
  textInput.before(textInputHome);
  textInputStyle = textInput.getAttribute("style");
  syncTextInput();
  const nativeRasterExport = editor.svgCanvas.rasterExport;
  editor.svgCanvas.rasterExport = (type = "PNG", quality = 1, ...args) => {
    if (!["PNG", "JPEG", "WEBP"].includes(type)) return nativeRasterExport(type, quality, ...args);
    // Both layouts export the same clean document, including while editing a group.
    return features.raster({ format: type.toLowerCase(), quality }).catch(error => send("command-error", { message: error.message }));
  };
  // The app downloads files directly; sandboxed native exports cannot open a popup.
  editor.svgCanvas.bind("exported", (_window, data) => {
    const link = document.createElement("a");
    link.href = data.bloburl || data.datauri;
    const mime = data.datauri?.match(/^data:image\/([^;,]+)/)?.[1] || data.type.toLowerCase();
    link.download = `figfox.${mime === "jpeg" ? "jpg" : mime}`;
    link.click();
    if (data.bloburl) setTimeout(() => URL.revokeObjectURL(data.bloburl), 1000);
  });
  editor.svgCanvas.bind("exportedPDF", (_window, data) => {
    if (typeof data.output !== "string" || !data.output.startsWith("data:")) return;
    const link = document.createElement("a");
    link.href = data.output; link.download = "figfox.pdf"; link.click();
  });
  const setTextContent = editor.svgCanvas.setTextContent;
  editor.svgCanvas.setTextContent = value => {
    const element = selectedElements()[0] || editor.selectedElement;
    if (element?.querySelector("tspan, textPath")) {
      features.editText(value, element);
      editor.svgCanvas.textActions.init(value);
      editor.svgCanvas.textActions.setCursor();
    } else setTextContent(value);
  };
  for (const event of ["changed", "selected", "contextset", "extension_added", "zoomDone"]) {
    const original = editor.svgCanvas.bind(event, (...args) => {
      original?.(...args);
      if (event === "changed") changed();
      else scheduleState();
    });
  }
  document.addEventListener("pointerdown", () => { pointerDown = true; });
  const endInteraction = () => { pointerDown = false; if (documentDirty) snapshotTimer = setTimeout(flushDocument, 100); scheduleState(); };
  window.addEventListener("pointerup", endInteraction);
  window.addEventListener("pointercancel", endInteraction);
  window.addEventListener("blur", endInteraction);
  window.addEventListener("pagehide", flushDocument);
  document.addEventListener("keydown", event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); event.stopImmediatePropagation(); flushDocument(); }
  }, true);
  send("ready");
}).catch((error) => {
  send("error", { message: error instanceof Error ? error.message : "SVG-Edit failed to initialize" });
});

function styleNativeControls() {
  for (const component of document.querySelectorAll("se-button, se-list, se-spin-input, se-select, se-text, se-menu, se-menu-item")) {
    const shadow = component.shadowRoot;
    if (!shadow || shadow.querySelector("[data-figfox-theme]")) continue;
    const style = document.createElement("style");
    style.dataset.figfoxTheme = "";
    style.textContent = ":host { color: #493956; font-family: 'Google Sans Flex', sans-serif; } img { filter: brightness(0) saturate(100%); opacity: .72; } label, span, p { color: #493956 !important; } input, select { border: 1px solid #dfd8e8; border-radius: 4px; background: white; color: #493956; }";
    shadow.append(style);
  }
}

function syncTextInput() {
  const input = byId("text");
  if (!input || !textInputHome) return;
  if (nativeUI) {
    textInputHome.after(input);
    if (textInputStyle === null) input.removeAttribute("style");
    else input.setAttribute("style", textInputStyle);
  } else {
    // display:none on the original toolbar prevents native textActions from focusing.
    document.body.append(input);
    input.style.cssText = "position:fixed;left:-10000px;top:0;width:1px;height:1px;opacity:0;pointer-events:none";
  }
}
