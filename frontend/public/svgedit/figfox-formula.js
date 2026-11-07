// MathJax runs in the parent worker. Only passive vector geometry crosses here.
export function applyFormula(editor, { latex, svg, targetId }) {
  const canvas = editor.svgCanvas;
  const ns = "http://www.w3.org/2000/svg";
  if (typeof latex !== "string" || !latex.trim() || latex.length > 4000 || typeof svg !== "string" || svg.length > 2000000) throw new Error("Invalid formula");
  const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
  const rendered = parsed.documentElement;
  let box = rendered.getAttribute("viewBox")?.trim().split(/[\s,]+/).map(Number);
  if (parsed.querySelector("parsererror") || rendered.localName !== "svg" || !box || box.length !== 4 || !box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0) throw new Error("公式为空或无效 / Empty or invalid formula");
  const elements = [...rendered.querySelectorAll("*")];
  const tags = new Set(["g", "path", "rect", "text"]);
  const attributes = new Set(["d", "x", "y", "width", "height", "rx", "ry", "transform", "fill", "stroke", "stroke-width", "font-family", "font-size", "font-style", "font-weight", "text-anchor"]);
  if (elements.length > 6000) throw new Error("公式过于复杂 / Formula is too complex");
  for (const element of elements) {
    if (!tags.has(element.localName) || element.namespaceURI !== ns) throw new Error("Unsupported formula geometry");
    for (const attribute of [...element.attributes]) {
      if (!attributes.has(attribute.name) || /url\s*\(|[<>]/i.test(attribute.value)) element.removeAttribute(attribute.name);
      else if (attribute.value === "currentColor") element.removeAttribute(attribute.name);
    }
  }
  // TeX viewBoxes include side bearings. Position against actual painted bounds
  // so repeated edits do not gradually drift right or down.
  const vector = document.createElementNS(ns, "g");
  for (const child of [...rendered.children]) vector.append(document.importNode(child, true));
  const measuring = document.createElementNS(ns, "svg");
  measuring.style.cssText = "position:fixed;width:1px;height:1px;visibility:hidden;pointer-events:none";
  measuring.append(vector);
  document.body.append(measuring);
  try {
    const actual = vector.getBBox();
    box = [actual.x, actual.y, actual.width, actual.height];
    if (!box.every(Number.isFinite) || box[2] <= 0 || box[3] <= 0) throw new Error("公式没有可见内容 / Formula has no visible content");
  } finally { measuring.remove(); }
  const root = canvas.getSvgContent();
  const target = targetId ? document.getElementById(targetId) : null;
  if (targetId && (!target || !root.contains(target) || target === root || target.classList.contains("layer"))) throw new Error("请重新选择公式对象 / Select the formula object again");
  const parent = target?.parentElement || canvas.getCurrentGroup() || canvas.getCurrentDrawing().getCurrentLayer();
  const bounds = target?.getBBox();
  let scale = bounds?.height > 0 ? bounds.height / box[3] : 24 / 1000;
  // Retain the equation's typesetting size when its content changes. Resizing the
  // outer group stays independent of these local font units.
  const previousScale = Number(target?.getAttribute("data-figfox-math-scale"));
  if (target?.hasAttribute("data-figfox-latex") && previousScale > 0 && Number.isFinite(previousScale)) scale = previousScale;
  let x = bounds?.x ?? 0, y = bounds?.y ?? 0;
  if (!target) {
    const resolution = canvas.getResolution();
    const point = new DOMPoint(resolution.w / 2, resolution.h / 2).matrixTransform(parent.getScreenCTM().inverse().multiply(root.getScreenCTM()));
    x = point.x - box[2] * scale / 2; y = point.y - box[3] * scale / 2;
  }
  if (![scale, x, y].every(Number.isFinite) || scale <= 0) throw new Error("Invalid formula size");
  const group = document.createElementNS(ns, "g");
  group.id = target?.id || canvas.getNextId();
  for (const name of ["transform", "opacity", "clip-path", "mask", "filter"]) if (target?.hasAttribute(name)) group.setAttribute(name, target.getAttribute(name));
  // Preserve inline presentation overrides as resolved values, without carrying
  // text layout CSS or classes onto a new vector group.
  const styled = target && getComputedStyle(target);
  for (const name of ["opacity", "clip-path", "mask", "filter"]) if (target?.style.getPropertyValue(name)) group.setAttribute(name, styled.getPropertyValue(name));
  const painted = target?.querySelector("path,text,rect") || target;
  const fill = painted ? getComputedStyle(painted).fill : "#241b30";
  group.setAttribute("fill", fill && fill !== "none" ? fill : "#241b30");
  group.setAttribute("stroke", "none");
  group.setAttribute("data-figfox-latex", latex);
  group.setAttribute("data-figfox-math-scale", String(scale));
  const position = document.createElementNS(ns, "g");
  position.setAttribute("transform", `translate(${x} ${y}) scale(${scale}) translate(${-box[0]} ${-box[1]})`);
  position.append(vector);
  group.append(position);
  const batch = new canvas.history.BatchCommand(target ? "Edit LaTeX formula" : "Insert LaTeX formula");
  canvas.clearSelection();
  if (target) {
    const next = target.nextSibling;
    batch.addSubCommand(new canvas.history.RemoveElementCommand(target, next, parent));
    parent.replaceChild(group, target);
  } else parent.append(group);
  batch.addSubCommand(new canvas.history.InsertElementCommand(group));
  canvas.addCommandToHistory(batch);
  canvas.setMode("select");
  canvas.selectOnly([group], true);
  canvas.call("changed", [group]);
}
