// Remaining SVG-Edit controls exposed through the FigFox UI.
export function createNativeControls(editor, features) {
  const canvas = editor.svgCanvas;
  const fields = { points: "starNumPoints", ratio: "RadiusMultiplier", shift: "radialShift", sides: "polySides" };
  const selected = () => canvas.getSelectedElements().filter(Boolean);
  const anchor = () => selected()[0]?.closest("a");
  const rulers = visible => {
    editor.configObj.curConfig.showRulers = visible;
    document.documentElement.toggleAttribute("data-rulers", visible);
    editor.rulers.display(visible);
    if (visible) editor.rulers.updateRulers();
    editor.updateCanvas();
  };
  function shapeParameter({ name, value }) {
    const control = document.getElementById(fields[name]);
    if (!control || !Number.isFinite(Number(value))) return;
    const limited = name === "shift" ? Number(value) : name === "ratio" ? Math.max(1, Number(value)) : Math.round(Math.max(1, Number(value)));
    if (["points", "sides"].includes(name) && limited > 12000) throw new Error("单个形状最多支持 12,000 个顶点 / A shape supports up to 12,000 vertices");
    control.value = limited;
    const batch = new canvas.history.BatchCommand("Change shape parameters");
    for (const element of selected()) {
      const shape = element.getAttribute("shape");
      if (!["star", "regularPoly"].includes(shape)) continue;
      const list = [...element.points];
      if (shape === "star" && list.length >= 4 && Math.hypot(list[0].x - list.at(-2).x, list[0].y - list.at(-2).y) < .001 && Math.hypot(list[1].x - list.at(-1).x, list[1].y - list.at(-1).y) < .001) list.splice(-2);
      if (shape !== "star" && list.length > 1 && Math.hypot(list[0].x - list.at(-1).x, list[0].y - list.at(-1).y) < .001) list.pop();
      if (!list.length) continue;
      const outer = shape === 'star' ? list.filter((_, i) => i % 2 === 0) : list;
      let cx = outer.reduce((sum, p) => sum + p.x, 0) / outer.length, cy = outer.reduce((sum, p) => sum + p.y, 0) / outer.length;
      if (outer.length === 1) {
        // A single vertex has no intrinsic center. Retain a vector relative to
        // that vertex only for this degenerate case; it follows later moves.
        cx = list[0].x + Number(element.getAttribute('data-figfox-center-dx') ?? -40);
        cy = list[0].y + Number(element.getAttribute('data-figfox-center-dy') ?? 0);
        if (shape === 'star' && list[1]) {
          const oldRatio = Number(element.getAttribute('starRadiusMultiplier')) || 3;
          const angle = Math.PI + (Number(element.getAttribute('radialshift')) || 0);
          const a = Math.cos(angle) / oldRatio - 1, b = Math.sin(angle) / oldRatio;
          const determinant = a * a + b * b;
          if (determinant > 1e-12) {
            const dx = list[1].x - list[0].x, dy = list[1].y - list[0].y;
            cx = list[0].x - (a * dx + b * dy) / determinant;
            cy = list[0].y - (a * dy - b * dx) / determinant;
          }
        }
      }
      const attribute = { points: "point", ratio: "starRadiusMultiplier", shift: "radialshift", sides: "sides" }[name];
      const before = Object.fromEntries([attribute, 'points', 'data-figfox-center-dx', 'data-figfox-center-dy'].map(key => [key, element.getAttribute(key)]));
      element.setAttribute(attribute, limited);
      const count = Math.max(1, Math.round(Number(element.getAttribute(shape === "star" ? "point" : "sides")) || 5));
      const radius = Math.hypot(list[0].x - cx, list[0].y - cy);
      const ratio = Number(element.getAttribute("starRadiusMultiplier")) || 3, shift = Number(element.getAttribute("radialshift")) || 0;
      const orientation = Math.atan2(list[0].y - cy, list[0].x - cx);
      if (count === 1) { element.setAttribute('data-figfox-center-dx', cx - list[0].x); element.setAttribute('data-figfox-center-dy', cy - list[0].y); }
      else { element.removeAttribute('data-figfox-center-dx'); element.removeAttribute('data-figfox-center-dy'); }
      const points = [];
      for (let i = 0; i < count; i++) {
        const angle = 2 * Math.PI * i / count + orientation;
        points.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
        if (shape === "star") points.push(`${cx + radius / ratio * Math.cos(angle + Math.PI / count + shift)},${cy + radius / ratio * Math.sin(angle + Math.PI / count + shift)}`);
      }
      element.setAttribute("points", points.join(" "));
      batch.addSubCommand(new canvas.history.ChangeElementCommand(element, before));
      canvas.selectorManager.requestSelector(element).resize();
    }
    if (!batch.isEmpty()) canvas.addCommandToHistory(batch);
    canvas.call("changed", selected());
  }
  function link(value) {
    const url = String(value).trim();
    if (url && !/^(?:https?:\/\/|mailto:|#)/i.test(url)) throw new Error("请输入 https、http、mailto 或 # 开头的链接 / Enter an HTTPS, HTTP, mailto or fragment link");
    if (anchor()) canvas.setLinkURL(url);
    else if (url) canvas.makeHyperlink(url);
    canvas.call("changed", selected());
  }
  function parent() {
    const group = selected()[0]?.parentElement;
    if (group && group !== canvas.getCurrentDrawing().getCurrentLayer() && ["g", "a"].includes(group.localName)) {
      canvas.leaveContext(); canvas.setMode("select"); canvas.selectOnly([group], true);
    }
  }
  function state() {
    const shape = selected()[0]?.getAttribute("shape");
    const attributes = { points: "point", ratio: "starRadiusMultiplier", shift: "radialshift", sides: "sides" };
    return {
      rulers: Boolean(editor.configObj.curConfig.showRulers),
      title: canvas.getDocumentTitle(),
      shape: shape === "regularPoly" ? "polygon" : shape,
      shapeParameters: Object.fromEntries(Object.entries(fields).map(([name, id]) => [name, Number(shape ? selected()[0]?.getAttribute(attributes[name]) : document.getElementById(id)?.value) || (name === "shift" ? 0 : name === "ratio" ? 3 : 5)])),
      link: anchor() ? canvas.getHref(anchor()) || "" : "",
      groupTitle: selected()[0]?.querySelector(":scope > title")?.textContent || "",
      layerView: Boolean(document.getElementById("tool_layerView")?.pressed),
    };
  }
  async function execute(command, value) {
    switch (command) {
      case "select-next": canvas.cycleElement(0); break;
      case "select-previous": canvas.cycleElement(1); break;
      case "import-svg": {
        const parsed = new DOMParser().parseFromString(value.markup, "image/svg+xml");
        if (parsed.querySelectorAll("*").length + canvas.getSvgContent().querySelectorAll("*").length > 12000) throw new Error("插入后的对象数量过多 / Too many objects after insertion");
        const element = canvas.importSvgString(value.markup, Boolean(value.originalSize));
        if (!element) throw new Error("无法插入 SVG / Could not insert SVG");
        canvas.selectOnly([element], true);
        // A new <use> needs its referenced tree resolved before measuring. Place
        // this node directly so centering stays part of the single import undo.
        await new Promise(requestAnimationFrame);
        if (!canvas.getSvgContent().contains(element)) break;
        const box = features.bounds(element), { w, h } = canvas.getResolution();
        const local = element.parentElement.getScreenCTM().inverse().multiply(canvas.getSvgContent().getScreenCTM());
        const origin = new DOMPoint(0, 0).matrixTransform(local);
        const target = new DOMPoint(w / 2 - box.x - box.width / 2, h / 2 - box.y - box.height / 2).matrixTransform(local);
        element.setAttribute("transform", `translate(${target.x - origin.x} ${target.y - origin.y}) ${element.getAttribute("transform") || ""}`);
        const selection = selected();
        canvas.call("changed", [element]);
        canvas.selectOnly(selection.filter(item => item.isConnected), true); break;
      }
      case "shape-parameter": shapeParameter(value); break;
      case "hyperlink": link(value); break;
      case "remove-hyperlink": { const element = anchor(); if (element) { canvas.selectOnly([element], true); canvas.ungroupSelectedElement(); } break; }
      case "select-parent": parent(); break;
      case "group-title": canvas.setGroupTitle(String(value)); break;
      case "document-title": canvas.setDocumentTitle(String(value)); break;
      case "document-properties": editor.mainMenu.showDocProperties(); break;
      case "fit-page-content": canvas.setResolution("fit", "fit"); editor.updateCanvas(); break;
      case "toggle-rulers": rulers(typeof value === "boolean" ? value : !editor.configObj.curConfig.showRulers); break;
      case "layer-view": document.getElementById("tool_layerView").click(); break;
      case "merge-all-layers": canvas.mergeAllLayers(); break;
      case "export-pdf": {
        const { w, h } = canvas.getResolution();
        if (w * h > 32_000_000) throw new Error("导出尺寸过大 / Export dimensions are too large");
        await canvas.exportPDF("figfox.pdf", "save");
        break;
      }
      default: return false;
    }
    return true;
  }
  return { state, execute, rulers };
}
