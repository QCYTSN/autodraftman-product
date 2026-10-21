import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { MathfieldElement } from "mathlive";
import DOMPurify from "dompurify";

export type FormulaMathFieldHandle = { insert: (latex: string) => void; focus: () => void };

export const FormulaMathField = forwardRef<FormulaMathFieldHandle, { value: string; zh: boolean; onChange: (latex: string) => void }>(
function FormulaMathField({ value, zh, onChange }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const field = useRef<MathfieldElement | null>(null);
  const latest = useRef({ value, onChange });
  latest.current = { value, onChange };
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [mode, setMode] = useState("math");
  useImperativeHandle(ref, () => ({
    insert(latex) { field.current?.focus(); field.current?.insert(latex, { format: "latex" }); },
    focus() { field.current?.focus(); },
  }), []);
  useEffect(() => {
    let active = true;
    let dispose: (() => void) | undefined;
    setReady(false); setError(false);
    import("mathlive").then(({ MathfieldElement }) => {
      if (!active || !host.current) return;
      MathfieldElement.fontsDirectory = `${import.meta.env.BASE_URL}mathlive-fonts`;
      MathfieldElement.soundsDirectory = null;
      MathfieldElement.locale = zh ? "zh-cn" : "en";
      // MathLive's keyboard sink is a contenteditable span. Retain that safe
      // attribute and local keyboard icons while sanitizing generated markup.
      const purifier = DOMPurify(window);
      purifier.addHook("uponSanitizeAttribute", (node, attribute) => {
        if (node.nodeName.toLowerCase() === "use" && /^(xlink:)?href$/.test(attribute.attrName)
          && !/^#(?:svg-[a-z-]+|circle-plus)$/.test(attribute.attrValue)) attribute.keepAttr = false;
      });
      MathfieldElement.createHTML = html => purifier.sanitize(html, { ADD_ATTR: ["contenteditable"], ADD_TAGS: ["use"] });
      const element = new MathfieldElement();
      element.mathVirtualKeyboardPolicy = "manual";
      element.smartMode = false;
      element.setAttribute("aria-label", zh ? "可视公式编辑" : "Visual formula editor");
      const change = () => latest.current.onChange(element.value);
      const modeChange = () => setMode(element.mode);
      element.addEventListener("input", change);
      element.addEventListener("mode-change", modeChange);
      host.current.append(element);
      window.mathVirtualKeyboard.container = host.current.closest<HTMLElement>(".ff-formula-dialog") || null;
      element.menuItems = [];
      element.macros = { ...element.macros, href: { args: 2, def: "#2" }, htmlData: { args: 2, def: "#2" }, htmlStyle: { args: 2, def: "#2" }, htmlClass: { args: 2, def: "#2" }, htmlId: { args: 2, def: "#2" } };
      field.current = element;
      element.setValue(latest.current.value, { silenceNotifications: true });
      setReady(true);
      dispose = () => {
        element.removeEventListener("input", change); element.removeEventListener("mode-change", modeChange);
        window.mathVirtualKeyboard.hide();
        window.mathVirtualKeyboard.container = null;
        element.remove(); field.current = null;
      };
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; dispose?.(); };
  }, [zh]);
  useEffect(() => {
    if (field.current && field.current.value !== value) field.current.setValue(value, { silenceNotifications: true });
  }, [value]);
  const switchMode = (next: "math" | "text") => { field.current?.focus(); field.current?.executeCommand(["switchMode", next]); };
  return <div className="ff-mathfield-editor">
    <div className="ff-formula-mode" aria-label={zh ? "输入类型" : "Input type"}>
      <button type="button" aria-pressed={mode === "math"} disabled={!ready} onClick={() => switchMode("math")}>{zh ? "数学" : "Math"}</button>
      <button type="button" aria-pressed={mode === "text"} disabled={!ready} onClick={() => switchMode("text")}>{zh ? "普通文字" : "Text"}</button>
    </div>
    <div ref={host} className="ff-mathfield-host" />
    {!ready && <p className="ff-inspector-note" role="status">{error ? (zh ? "可视输入暂时未能加载，可切换到 LaTeX 源码继续编辑。" : "Visual input could not load. You can still edit the LaTeX source.") : (zh ? "正在加载公式输入…" : "Loading formula input…")}</p>}
    <p className="ff-inspector-note">{zh ? "输入 \\theta 后按空格确认；_ 下标，^ 上标。标题和句子切换到「普通文字」，符号也可从键盘按钮选择。" : "Type \\theta then Space to confirm; _ for subscripts, ^ for superscripts. Switch to Text for words, or open the symbol keyboard."}</p>
  </div>;
});
