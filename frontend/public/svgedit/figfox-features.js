// Keep document operations separate from iframe transport and UI scheduling.
export function createEditorFeatures(editor) {
  const canvas = editor.svgCanvas;
  const ns = "http://www.w3.org/2000/svg";
  const selected = () => canvas.getSelectedElements().filter(Boolean);
  const root = () => canvas.getSvgContent();
  const number = (value, fallback = 0) => Number.isFinite(parseFloat(value)) ? parseFloat(value) : fallback;
  const style = (element, name, fallback = "") => element ? getComputedStyle(element).getPropertyValue(name) || element.getAttribute(name) || fallback : fallback;
  const reference = (value) => value?.match(/#([^\s)'"]+)/)?.[1] || "";
  const definition = (value) => value?.includes("url(") ? document.getElementById(reference(value)) : null;

  // SVG-Edit temporarily replaces sibling styles/opacity during in-group editing.
  // Preserve styles at its existing context boundary, including calls inside the engine.
  const contextStyles = new Map();
  const data = canvas.getDataStorage();
  const put = data.put.bind(data), remove = data.remove.bind(data);
  const restoreAttribute = (element, name, value) => value === null || value === undefined ? element.removeAttribute(name) : element.setAttribute(name, value);
  data.put = (element, key, value) => {
    if (key === "orig_opac") contextStyles.set(element, element.getAttribute("style"));
    return put(element, key, value);
  };
  data.remove = (element, key) => {
    if (key === "orig_opac" && contextStyles.has(element)) {
      restoreAttribute(element, "style", contextStyles.get(element));
      contextStyles.delete(element);
    }
    return remove(element, key);
  };

  // Restore passive attributes before import IDs are remapped. This common engine
  // boundary covers opening, inserting and native source edits, including undo/redo.
  const prepareSvg = canvas.prepareSvg.bind(canvas);
  canvas.prepareSvg = parsed => {
    const retained = [];
    const names = ["baseline-shift", "alignment-baseline", "vector-effect", "paint-order", "letter-spacing", "word-spacing", "lengthAdjust", "textLength", "visibility", "shape-rendering", "text-rendering", "shape", "point", "sides", "edge", "starRadiusMultiplier", "starradiusmultiplier", "radialshift", "r", "r2", "cx", "cy", "orient"];
    for (const element of parsed.querySelectorAll("*")) {
      const attributes = names.filter(name => element.hasAttribute(name)).map(name => [name, element.getAttribute(name)]);
      if (!attributes.length) continue;
      retained.push({ element, attributes });
    }
    prepareSvg(parsed);
    for (const { element, attributes } of retained) {
      if (parsed.documentElement.contains(element)) for (const [name, value] of attributes) {
        if (name === "starradiusmultiplier") element.removeAttribute(name);
        element.setAttribute(name === "starradiusmultiplier" ? "starRadiusMultiplier" : name, value);
      }
    }
  };

  const fixedUnits = { px: 1, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, pt: 96 / 72, pc: 16 };
  // em/ex are native editor display preferences. A standalone document must not
  // acquire a different intrinsic size from its viewer's font, so use pixels.
  const documentUnit = () => Object.hasOwn(fixedUnits, editor.configObj.curConfig.baseUnit) ? editor.configObj.curConfig.baseUnit : "px";

  function snapshot() {
    // Serialize a detached copy: getSvgString() mutates live path/group editing state.
    const copy = root().cloneNode(true);
    if (contextStyles.size) {
      const originals = [root(), ...root().querySelectorAll("*")];
      const copies = [copy, ...copy.querySelectorAll("*")];
      originals.forEach((element, index) => {
        if (!contextStyles.has(element)) return;
        restoreAttribute(copies[index], "opacity", data.get(element, "orig_opac"));
        restoreAttribute(copies[index], "style", contextStyles.get(element));
      });
    }
    const { w, h } = canvas.getResolution();
    copy.removeAttribute("id");
    copy.removeAttribute("x");
    copy.removeAttribute("y");
    copy.removeAttribute("overflow");
    copy.setAttribute("xmlns", ns);
    const unit = documentUnit();
    const factor = fixedUnits[unit];
    copy.setAttribute("width", unit === "px" ? w : `${w / factor}${unit}`);
    copy.setAttribute("height", unit === "px" ? h : `${h / factor}${unit}`);
    copy.setAttribute("viewBox", `0 0 ${w} ${h}`);
    for (const layer of copy.querySelectorAll("g.layer")) {
      layer.style.removeProperty("pointer-events");
      if (!layer.getAttribute("style")) layer.removeAttribute("style");
    }
    return new XMLSerializer().serializeToString(copy);
  }

  // This command preserves child nodes (tspan/textPath), unlike a #text attribute change.
  class TextRunsCommand extends canvas.history.Command {
    constructor(element, runs, before, after) {
      super();
      this.elem = element;
      this.runs = runs;
      this.before = before;
      this.after = after;
      this.text = "Edit text";
    }
    apply(handler) { super.apply(handler, () => this.runs.forEach((node, i) => { node.data = this.after[i]; })); }
    unapply(handler) { super.unapply(handler, () => this.runs.forEach((node, i) => { node.data = this.before[i]; })); }
  }

  function textRuns(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: node => node.parentElement.closest("title, desc") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
    });
    const runs = [];
    while (walker.nextNode()) runs.push(walker.currentNode);
    return runs;
  }

  function editText(value, element = selected()[0] || editor.selectedElement) {
    if (!element || !["text", "tspan", "textPath"].includes(element.localName)) return;
    const runs = textRuns(element);
    if (!runs.length) runs.push(element.appendChild(document.createTextNode("")));
    const before = runs.map(node => node.data);
    const previous = before.join("");
    if (previous === value) return;
    let start = 0, end = previous.length, nextEnd = value.length;
    while (start < end && start < nextEnd && previous[start] === value[start]) start++;
    while (end > start && nextEnd > start && previous[end - 1] === value[nextEnd - 1]) { end--; nextEnd--; }
    let offset = 0, inserted = false;
    const after = before.map((text, i) => {
      const runStart = offset, runEnd = offset + text.length;
      offset = runEnd;
      if (runEnd < start || runStart > end) return text;
      let result = text.slice(0, Math.max(0, start - runStart));
      if (!inserted && (runEnd > start || i === before.length - 1)) {
        result += value.slice(start, nextEnd);
        inserted = true;
      }
      result += text.slice(Math.max(0, end - runStart));
      return result;
    });
    runs.forEach((node, i) => { node.data = after[i]; });
    canvas.addCommandToHistory(new TextRunsCommand(element, runs, before, after));
    canvas.call("changed", [element]);
    canvas.selectorManager.requestSelector(element).resize();
  }

  function bounds(element) {
    const box = element.getBBox();
    const matrix = root().getScreenCTM().inverse().multiply(element.getScreenCTM());
    const corners = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
      .map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
    const x = Math.min(...corners.map(p => p.x)), y = Math.min(...corners.map(p => p.y));
    return { x, y, width: Math.max(...corners.map(p => p.x)) - x, height: Math.max(...corners.map(p => p.y)) - y };
  }

  function geometry(name, value) {
    const elements = selected();
    if (!elements.length || !Number.isFinite(value)) return;
    const boxes = elements.map(bounds);
    const x = Math.min(...boxes.map(b => b.x)), y = Math.min(...boxes.map(b => b.y));
    const width = Math.max(...boxes.map(b => b.x + b.width)) - x;
    const height = Math.max(...boxes.map(b => b.y + b.height)) - y;
    if ((name === "width" || name === "height") && value <= 0) throw new Error("尺寸必须大于零 / Size must be positive");
    if ((name === "width" && !width) || (name === "height" && !height)) throw new Error("请调整直线端点 / Edit the line endpoints");
    let change = new DOMMatrix();
    if (name === "x" || name === "y") change = change.translate(name === "x" ? value - x : 0, name === "y" ? value - y : 0);
    else change = change.translate(x, y).scale(name === "width" ? value / width : 1, name === "height" ? value / height : 1).translate(-x, -y);
    const batch = new canvas.history.BatchCommand("Transform selection");
    for (const element of elements) {
      const old = element.getAttribute("transform");
      const domMatrix = matrix => new DOMMatrix([matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f]);
      const parent = domMatrix(root().getScreenCTM()).inverse().multiply(domMatrix(element.parentElement.getScreenCTM()));
      const existing = element.transform.baseVal.consolidate()?.matrix;
      const local = existing ? domMatrix(existing) : new DOMMatrix();
      const matrix = parent.inverse().multiply(change).multiply(parent).multiply(local);
      element.setAttribute("transform", `matrix(${[matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].join(" ")})`);
      batch.addSubCommand(new canvas.history.ChangeElementCommand(element, { transform: old }));
      canvas.selectorManager.requestSelector(element).resize();
    }
    canvas.addCommandToHistory(batch);
    canvas.call("changed", elements);
  }

  function paint(type) {
    const elements = selected();
    const values = elements.map(el => style(el, type, type === "fill" ? "#000000" : "none"));
    const value = values[0] || canvas.getColor(type) || "none";
    const opacity = number(style(elements[0], `${type}-opacity`, "1"), 1);
    if (values.some(v => v !== value)) return { kind: "mixed", color: "mixed", opacity, stops: [], attributes: {} };
    const gradient = definition(value);
    const kind = gradient?.localName === "linearGradient" ? "linear" : gradient?.localName === "radialGradient" ? "radial" : value.includes("url(") ? "reference" : "solid";
    let stops = gradient ? [...gradient.querySelectorAll("stop")].map(stop => ({
      offset: stop.getAttribute("offset")?.includes("%") ? number(stop.getAttribute("offset")) / 100 : number(stop.getAttribute("offset")),
      color: style(stop, "stop-color", "#000000"), opacity: number(style(stop, "stop-opacity", "1"), 1),
    })) : [];
    const href = gradient?.getAttribute("href") || gradient?.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (!stops.length && href?.startsWith("#")) stops = paintStops(document.getElementById(href.slice(1)));
    return { kind, color: value, opacity, id: gradient?.id || "", stops, attributes: gradient ? Object.fromEntries([...gradient.attributes].filter(a => a.name !== "id").map(a => [a.name, a.value])) : {} };
  }
  function paintStops(element) {
    return element ? [...element.querySelectorAll("stop")].map(s => ({ offset: s.offset.baseVal, color: style(s, "stop-color", "#000000"), opacity: number(style(s, "stop-opacity", "1"), 1) })) : [];
  }

  class PaintCommand extends canvas.history.BatchCommand {
    constructor(type) {
      super("Change paint");
      this.paintType = type;
      this.before = { color: canvas.getColor(type), opacity: canvas.getPaintOpacity(type), paint: canvas.getCurProperties(`${type}_paint`) };
    }
    restore(value) {
      canvas.setCurShape(this.paintType, value.color);
      canvas.setCurShape(`${this.paintType}_opacity`, value.opacity);
      canvas.setCurProperties(this.paintType, value.color);
      canvas.setCurProperties(`${this.paintType}_opacity`, value.opacity);
      canvas.setCurProperties(`${this.paintType}_paint`, value.paint);
    }
    apply(handler) { super.apply(handler); this.restore(this.after); }
    unapply(handler) { super.unapply(handler); this.restore(this.before); }
  }

  function applyPaint({ type, kind, color, opacity, stops, attributes = {} }) {
    if (!["fill", "stroke"].includes(type)) return;
    const batch = new PaintCommand(type);
    let value = color;
    if (["linear", "radial"].includes(kind)) {
      if (!Array.isArray(stops) || stops.length < 2 || stops.length > 64) throw new Error("渐变至少需要两个色标 / A gradient needs at least two stops");
      const gradient = document.createElementNS(ns, kind === "linear" ? "linearGradient" : "radialGradient");
      gradient.id = canvas.getNextId();
      const allowed = ["x1", "x2", "y1", "y2", "cx", "cy", "r", "fx", "fy", "gradientUnits", "gradientTransform", "spreadMethod"];
      for (const [name, value] of Object.entries(attributes)) if (allowed.includes(name)) gradient.setAttribute(name, value);
      for (const item of [...stops].sort((a, b) => a.offset - b.offset)) {
        const stop = document.createElementNS(ns, "stop");
        stop.setAttribute("offset", Math.max(0, Math.min(1, number(item.offset))));
        stop.setAttribute("stop-color", item.color);
        stop.setAttribute("stop-opacity", Math.max(0, Math.min(1, number(item.opacity, 1))));
        gradient.append(stop);
      }
      let defs = root().querySelector("defs");
      if (!defs) { defs = document.createElementNS(ns, "defs"); root().prepend(defs); }
      defs.append(gradient);
      batch.addSubCommand(new canvas.history.InsertElementCommand(gradient));
      value = `url(#${gradient.id})`;
    }
    const elements = [...new Set(selected().flatMap(element => element.localName === "g" ? [...element.querySelectorAll("path,rect,circle,ellipse,line,polyline,polygon,text,use")] : [element]))].filter(element => !element.closest("defs, clipPath, mask, marker, pattern"));
    for (const element of elements) {
      const before = { [type]: element.getAttribute(type), [`${type}-opacity`]: element.getAttribute(`${type}-opacity`), style: element.getAttribute("style") };
      element.setAttribute(type, value);
      // An explicit style may override the presentation attribute on imported artwork.
      if (element.style.getPropertyValue(type)) element.style.setProperty(type, value);
      if (opacity !== undefined) {
        element.setAttribute(`${type}-opacity`, Math.max(0, Math.min(1, Number(opacity))));
        if (element.style.getPropertyValue(`${type}-opacity`)) element.style.setProperty(`${type}-opacity`, opacity);
      }
      batch.addSubCommand(new canvas.history.ChangeElementCommand(element, before));
    }
    canvas.setCurShape(type, value);
    canvas.setCurProperties(type, value);
    if (opacity !== undefined) canvas.setCurShape(`${type}_opacity`, Math.max(0, Math.min(1, Number(opacity))));
    if (opacity !== undefined) canvas.setCurProperties(`${type}_opacity`, Math.max(0, Math.min(1, Number(opacity))));
    canvas.setCurProperties(`${type}_paint`, { type: "solidColor" });
    batch.after = { color: value, opacity: canvas.getPaintOpacity(type), paint: canvas.getCurProperties(`${type}_paint`) };
    if (!batch.isEmpty()) canvas.addCommandToHistory(batch);
    canvas.call("changed", selected());
  }

  function layers() {
    const drawing = canvas.getCurrentDrawing();
    return Array.from({ length: drawing.getNumLayers() }, (_, i) => {
      const name = drawing.getLayerName(i);
      return { name, active: name === drawing.getCurrentLayerName(), visible: drawing.getLayerVisibility(name) };
    }).reverse();
  }

  function layerAction(action, value) {
    const drawing = canvas.getCurrentDrawing();
    if (["create", "rename", "clone"].includes(action)) {
      const name = String(value || "").trim();
      if (!name || drawing.hasLayer(name)) throw new Error("请输入不重复的图层名称 / Enter a unique layer name");
      ({ create: canvas.createLayer, rename: canvas.renameCurrentLayer, clone: canvas.cloneLayer })[action](name);
    } else if (action === "select") canvas.setCurrentLayer(String(value));
    else if (action === "move-selection") canvas.moveSelectedToLayer(String(value));
    else if (action === "delete") {
      if (drawing.getNumLayers() < 2) throw new Error("至少保留一个图层 / Keep at least one layer");
      canvas.deleteCurrentLayer();
    } else if (action === "up" || action === "down") {
      const next = canvas.indexCurrentLayer() + (action === "up" ? 1 : -1);
      if (next >= 0 && next < drawing.getNumLayers()) canvas.setCurrentLayerPosition(next);
    } else if (action === "merge") {
      if (canvas.indexCurrentLayer() > 0) canvas.mergeLayer();
    } else if (action === "visibility") canvas.setLayerVisibility(value, !drawing.getLayerVisibility(value));
    canvas.call("changed", []);
  }

  async function raster({ format = "png", scale = 1, quality = .95 }) {
    const { w, h } = canvas.getResolution();
    const width = Math.round(w * scale), height = Math.round(h * scale);
    if (width * height > 32_000_000 || !width || !height) throw new Error("导出尺寸过大 / Export dimensions are too large");
    await document.fonts.ready;
    const url = URL.createObjectURL(new Blob([snapshot()], { type: "image/svg+xml" }));
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const surface = document.createElement("canvas");
      surface.width = width; surface.height = height;
      const context = surface.getContext("2d");
      if (format === "jpeg" || format === "bmp") { context.fillStyle = "white"; context.fillRect(0, 0, width, height); }
      context.drawImage(img, 0, 0, width, height);
      const blob = format === "bmp" ? bitmap(surface) : await new Promise(resolve => surface.toBlob(resolve, `image/${format}`, Math.max(0, Math.min(1, quality))));
      if (!blob) throw new Error("无法导出图片 / Image export failed");
      const download = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = download; link.download = `figfox.${format === "jpeg" ? "jpg" : format}`; link.click();
      setTimeout(() => URL.revokeObjectURL(download), 1000);
    } finally { URL.revokeObjectURL(url); }
  }

  return { snapshot, documentUnit, editText, textRuns, bounds, geometry, paint, applyPaint, layers, layerAction, raster, style, number, reference };
}

// Canvas falls back to PNG for image/bmp. Write a real bottom-up 24-bit BMP.
function bitmap(surface) {
  const { width, height } = surface;
  const stride = Math.ceil(width * 3 / 4) * 4;
  const bytes = new Uint8Array(54 + stride * height);
  const header = new DataView(bytes.buffer);
  bytes.set([0x42, 0x4d]);
  header.setUint32(2, bytes.length, true); header.setUint32(10, 54, true);
  header.setUint32(14, 40, true); header.setInt32(18, width, true); header.setInt32(22, height, true);
  header.setUint16(26, 1, true); header.setUint16(28, 24, true); header.setUint32(34, stride * height, true);
  const pixels = surface.getContext("2d").getImageData(0, 0, width, height).data;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const source = (y * width + x) * 4, target = 54 + (height - 1 - y) * stride + x * 3;
    bytes[target] = pixels[source + 2]; bytes[target + 1] = pixels[source + 1]; bytes[target + 2] = pixels[source];
  }
  return new Blob([bytes], { type: "image/bmp" });
}
