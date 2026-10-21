// Hit testing uses CSS pixels, so small labels remain selectable when zoomed out.
// All affordances live outside svgcontent and never enter saved artwork.
export function installSelection(editor, onStateChange) {
  const canvas = editor.svgCanvas;
  const nativeTarget = canvas.getMouseTarget.bind(canvas);
  const container = canvas.getDOMContainer();
  let policy = "object";
  let cache = null;
  let hoverFrame = 0;
  let pointer;
  let pressed = false;
  let textDown;
  let pendingText;
  const guardedText = new WeakSet();
  let drag;
  let dragFrame = 0;
  const originalStyles = new Map();
  const restoreStyles = () => {
    for (const [element, style] of originalStyles) if (element.isConnected && element.getAttribute("style") !== style) element.setAttribute("style", style);
    originalStyles.clear();
  };
  const ns = "http://www.w3.org/2000/svg";
  const overlay = document.createElementNS(ns, "svg");
  overlay.id = "figfox-hit-preview";
  overlay.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9;overflow:visible";
  const outline = document.createElementNS(ns, "polygon");
  outline.setAttribute("fill", "#7952df0a");
  outline.setAttribute("stroke", "#7952df");
  outline.setAttribute("stroke-width", "1");
  outline.setAttribute("stroke-dasharray", "3 2");
  overlay.append(outline);
  document.body.append(overlay);
  const hide = () => { outline.removeAttribute("points"); overlay.removeAttribute("data-target"); };
  const invalidate = () => { cache = null; hide(); };
  const scope = () => canvas.getCurrentGroup() || canvas.getCurrentDrawing().getCurrentLayer();
  const leaf = element => element?.closest?.("text") || element;
  const selectable = element => {
    if (!element?.getBBox || !scope().contains(element) || element === scope()) return false;
    if (element.closest("defs,clipPath,mask,pattern,marker")) return false;
    for (let node = element; node && node !== canvas.getSvgContent(); node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === "none" || style.visibility !== "visible" || Number(style.opacity) === 0 || style.pointerEvents === "none") return false;
    }
    return true;
  };
  function quad(element) {
    const box = element.getBBox(), matrix = element.getScreenCTM();
    if (!matrix || (!box.width && !box.height)) return null;
    return [[box.x, box.y], [box.x + box.width, box.y], [box.x + box.width, box.y + box.height], [box.x, box.y + box.height]]
      .map(([x, y]) => new DOMPoint(x, y).matrixTransform(matrix));
  }
  function distance(points, x, y) {
    let inside = false, nearest = Infinity;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const a = points[j], b = points[i];
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside;
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      nearest = Math.min(nearest, Math.hypot(x - a.x - t * dx, y - a.y - t * dy));
    }
    return inside ? 0 : nearest;
  }
  function textTargets() {
    if (!cache || cache.scope !== scope()) {
      const targets = [];
      for (const element of scope().querySelectorAll("text")) {
        if (!selectable(element)) continue;
        const points = quad(element);
        if (!points) continue;
        targets.push({ element, points, left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) });
      }
      cache = { scope: scope(), targets: targets.reverse() };
    }
    return cache.targets;
  }
  function resolve(event) {
    const target = event.target;
    if (!target?.closest || target.closest("#selectorParentGroup")) return nativeTarget(event);
    if (!["select", "textedit"].includes(canvas.getMode()) || canvas.spaceKey || event.button === 1) return nativeTarget(event);
    const direct = leaf(target);
    const chooseObjects = policy === "object" || event.ctrlKey || event.metaKey;
    // A 6 px halo is independent of SVG units and canvas zoom. Painted objects in
    // front of a label still win; hidden labels and other layers are excluded.
    let best = direct?.localName === "text" && selectable(direct) ? direct : null;
    let nearest = best ? 0 : 6.01;
    if (!best) for (const item of textTargets()) {
      if (event.clientX < item.left - 6 || event.clientX > item.right + 6 || event.clientY < item.top - 6 || event.clientY > item.bottom + 6) continue;
      if (selectable(direct) && direct !== item.element && !direct.contains(item.element) && (item.element.compareDocumentPosition(direct) & Node.DOCUMENT_POSITION_FOLLOWING)) continue;
      const gap = distance(item.points, event.clientX, event.clientY);
      if (gap < nearest) { best = item.element; nearest = gap; }
    }
    const candidate = best || (selectable(direct) ? direct : null);
    if (!candidate) return nativeTarget(event);
    if (chooseObjects) return candidate;
    let group = candidate;
    while (group.parentElement !== scope() && scope().contains(group.parentElement)) group = group.parentElement;
    return group;
  }
  canvas.getMouseTarget = resolve;

  const topSelection = () => {
    const elements = canvas.getSelectedElements().filter(Boolean);
    return elements.filter(element => !elements.some(parent => parent !== element && parent.contains(element)));
  };
  const transforms = elements => elements.map(element => {
    const inverse = element.parentElement.getScreenCTM()?.inverse();
    if (!inverse || ![inverse.a, inverse.b, inverse.c, inverse.d, inverse.e, inverse.f].every(Number.isFinite)) return null;
    let matrix = new DOMMatrix();
    for (const transform of element.transform.baseVal) {
      const m = transform.matrix;
      matrix = matrix.multiply(new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]));
    }
    return { element, before: element.getAttribute("transform"), inverse, matrix };
  }).filter(Boolean);
  function translate(items, from, to) {
    for (const item of items) {
      const start = from.matrixTransform(item.inverse), end = to.matrixTransform(item.inverse);
      const matrix = new DOMMatrix().translate(end.x - start.x, end.y - start.y).multiply(item.matrix);
      item.element.setAttribute("transform", `matrix(${[matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f].join(" ")})`);
      canvas.selectorManager.requestSelector(item.element).resize();
    }
  }
  const nativeMove = editor.moveSelected.bind(editor);
  editor.moveSelected = (dx, dy) => {
    if (canvas.getMode() !== "select") return nativeMove(dx, dy);
    const elements = topSelection();
    if (!elements.length || (!dx && !dy)) return;
    const items = transforms(elements), screen = canvas.getSvgContent().getScreenCTM();
    if (!items.length || !screen) return;
    const step = editor.configObj.curConfig.gridSnapping ? editor.configObj.curConfig.snappingStep || 10 : 1 / canvas.getZoom();
    translate(items, new DOMPoint(0, 0).matrixTransform(screen), new DOMPoint(dx * step, dy * step).matrixTransform(screen));
    const batch = new canvas.history.BatchCommand("Move selection");
    for (const { element, before } of items) batch.addSubCommand(new canvas.history.ChangeElementCommand(element, { transform: before }));
    canvas.addCommandToHistory(batch);
    canvas.call("changed", elements);
    onStateChange();
  };

  container.addEventListener("mousemove", event => {
    pointer = event;
    if (hoverFrame) return;
    hoverFrame = requestAnimationFrame(() => {
      hoverFrame = 0;
      if (pressed || pointer.buttons || canvas.getMode() !== "select" || canvas.spaceKey) { hide(); return; }
      const target = resolve(pointer);
      if (!selectable(target)) { hide(); return; }
      const points = quad(target);
      if (!points) { hide(); return; }
      outline.setAttribute("points", points.map(p => `${p.x},${p.y}`).join(" "));
      overlay.dataset.target = target.id;
    });
  });
  container.addEventListener("mouseleave", hide);
  container.addEventListener("mousedown", event => {
    pressed = true;
    hide();
    // SVG-Edit prevents the default mousedown focus change. Restore keyboard
    // ownership after an outer FigFox field, without stealing text-edit focus.
    if (canvas.getMode() === "select") {
      window.focus();
      if (document.activeElement?.matches("input, textarea, [contenteditable]")) document.activeElement.blur();
    }
    // Native mouseup removes whole style attributes while cleaning its temporary
    // pointer styles. Preserve authored styles on the affected selection.
    restoreStyles();
    if (canvas.getMode() === "select") for (const element of [...canvas.getSelectedElements(), resolve(event)]) {
      if (!element || !canvas.getSvgContent().contains(element)) continue;
      for (const node of [element, ...element.querySelectorAll("[style]")]) if (node.hasAttribute("style")) originalStyles.set(node, node.getAttribute("style"));
    }
    if (event.button !== 0 || canvas.getMode() !== "select") return;
    if (!event.shiftKey && event.detail === 2 && textDown && performance.now() - textDown.time < 600 && Math.hypot(event.clientX - textDown.x, event.clientY - textDown.y) < 6) {
      // New resize grips change the second click's DOM target, so the browser
      // may never emit dblclick. Complete this gesture on mouseup instead.
      event.preventDefault(); event.stopImmediatePropagation();
      pendingText = textDown.target;
      return;
    }
    const target = resolve(event);
    textDown = target?.localName === "text" ? { target, x: event.clientX, y: event.clientY, time: performance.now() } : null;
    if (!event.shiftKey) return;
    // Native mouseup compares evt.target, which can be a tspan or the label halo.
    if (canvas.getSelectedElements().includes(target)) {
      event.preventDefault(); event.stopImmediatePropagation();
      canvas.removeFromSelection([target]);
    }
  }, true);
  // Native movement adds a world-space translation to local transforms. Direct
  // selection inside rotated/scaled groups needs the delta in each parent's space.
  container.addEventListener("mousedown", event => {
    if (event.button !== 0 || canvas.spaceKey || canvas.getMode() !== "select" || event.target.closest?.("#selectorParentGroup")) return;
    const elements = transforms(topSelection());
    if (!elements.length) return;
    drag = { x: event.clientX, y: event.clientY, clientX: event.clientX, clientY: event.clientY, moved: false, screen: canvas.getSvgContent().getScreenCTM(), elements };
  });
  function previewDrag() {
    dragFrame = 0;
    if (!drag?.moved) return;
    let end = new DOMPoint(drag.clientX, drag.clientY);
    if (editor.configObj.curConfig.gridSnapping) {
      const inverse = drag.screen.inverse(), step = editor.configObj.curConfig.snappingStep || 10;
      const start = new DOMPoint(drag.x, drag.y).matrixTransform(inverse), point = end.matrixTransform(inverse);
      end = new DOMPoint(start.x + Math.round((point.x - start.x) / step) * step, start.y + Math.round((point.y - start.y) / step) * step).matrixTransform(drag.screen);
    }
    translate(drag.elements, new DOMPoint(drag.x, drag.y), end);
    canvas.call("transition", drag.elements.map(item => item.element));
  }
  container.addEventListener("mousemove", event => {
    if (!drag || !event.buttons) return;
    event.preventDefault(); event.stopImmediatePropagation();
    drag.clientX = event.clientX; drag.clientY = event.clientY;
    drag.moved ||= Math.hypot(event.clientX - drag.x, event.clientY - drag.y) >= 4;
    if (!dragFrame && drag.moved) dragFrame = requestAnimationFrame(previewDrag);
  }, true);
  function finishDrag(event) {
    if (!drag) return false;
    cancelAnimationFrame(dragFrame); dragFrame = 0;
    if (!drag.moved) { drag = null; return false; }
    if (event) { drag.clientX = event.clientX; drag.clientY = event.clientY; }
    previewDrag();
    const batch = new canvas.history.BatchCommand("Move selection");
    for (const { element, before } of drag.elements) batch.addSubCommand(new canvas.history.ChangeElementCommand(element, { transform: before }));
    canvas.addCommandToHistory(batch);
    canvas.setStarted(false); canvas.setJustSelected(null);
    const elements = drag.elements.map(item => item.element);
    drag = null; pressed = false;
    restoreStyles();
    canvas.call("changed", elements); invalidate(); onStateChange();
    return true;
  }
  container.addEventListener("mouseup", event => {
    if (finishDrag(event)) { event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  container.addEventListener("mouseleave", () => {
    finishDrag(); restoreStyles(); pressed = false;
  }, true);
  function editText(target, event) {
    if (!guardedText.has(target)) {
      guardedText.add(target);
      // Word selection can bubble to SVG-Edit's group-entry handler, which assumes
      // a group target. Keep the text's own word-selection listener active.
      target.addEventListener("dblclick", event => { if (canvas.getMode() === "textedit") event.stopPropagation(); });
      const start = target.getStartPositionOfChar.bind(target), end = target.getEndPositionOfChar.bind(target);
      // SVG-Edit measures UTF-16 text length, including collapsed trailing spaces.
      // Browser SVG metrics expose only rendered characters. Keep end-caret
      // measurements within that range without rewriting the document's text.
      for (const [name, measure] of [["getStartPositionOfChar", start], ["getEndPositionOfChar", end]]) {
        target[name] = index => {
          const count = target.getNumberOfChars();
          if (!count) { const box = target.getBBox(); return new DOMPoint(box.x, box.y); }
          return index >= count ? end(count - 1) : measure(index);
        };
      }
    }
    canvas.selectOnly([target], true);
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(canvas.getrootSctm());
    canvas.textActions.select(target, point.x, point.y);
    onStateChange();
  }
  container.addEventListener("mouseup", event => {
    if (!pendingText) return;
    const target = pendingText; pendingText = null; pressed = false;
    event.preventDefault(); event.stopImmediatePropagation();
    restoreStyles();
    editText(target, event);
  }, true);
  window.addEventListener("mouseup", () => { finishDrag(); restoreStyles(); pressed = false; invalidate(); });
  window.addEventListener("blur", () => { finishDrag(); restoreStyles(); pendingText = null; pressed = false; hide(); });
  container.addEventListener("dblclick", event => {
    if (canvas.spaceKey || !["select", "pathedit"].includes(canvas.getMode())) return;
    // Selecting a very small label brings resize grips under the second click.
    // Keep the double-click associated with the text from its first click.
    const recentText = textDown && performance.now() - textDown.time < 600 && Math.hypot(event.clientX - textDown.x, event.clientY - textDown.y) < 6;
    const target = recentText ? textDown.target : resolve(event);
    if (target?.localName !== "text" || !selectable(target)) {
      // Native group entry assumes getMouseTarget always promoted a leaf to its
      // group. Direct-object selection must not make a rect/path the edit scope.
      if (selectable(target) && !["g", "a"].includes(target.localName)) event.stopImmediatePropagation();
      return;
    }
    event.preventDefault(); event.stopImmediatePropagation();
    editText(target, event);
  }, true);
  editor.workarea.addEventListener("scroll", invalidate, { passive: true });
  window.addEventListener("resize", invalidate);
  document.fonts.ready.then(invalidate);
  return { invalidate, get policy() { return policy; }, setPolicy(value) { policy = value === "group" ? "group" : "object"; textDown = null; invalidate(); } };
}
