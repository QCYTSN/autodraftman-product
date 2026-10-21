import { useEffect, useRef, useState } from "react";
import type { SvgEditHandle, SvgEditSelection } from "./SvgEditHost";
import { renderFormula } from "./formula";

const snippets = [
  ["α", "\\alpha "], ["β", "\\beta "], ["θ", "\\theta "],
  ["分数", "\\frac{a}{b}"], ["根号", "\\sqrt{x}"], ["上标", "x^{2}"],
  ["下标", "x_{i}"], ["求和", "\\sum_{i=1}^{n} x_i"], ["矩阵", "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}"],
];
const english = ["α", "β", "θ", "Fraction", "Root", "Power", "Subscript", "Sum", "Matrix"];

export function FormulaEditor({ zh, selection, editor, focusRequest }: {
  zh: boolean; selection: SvgEditSelection | null; editor: SvgEditHandle | null; focusRequest: number;
}) {
  const formula = selection?.formula;
  const textSource = selection && ["text", "tspan", "textpath"].includes(selection.type) ? selection.text : "";
  const [open, setOpen] = useState(Boolean(formula));
  const [draft, setDraft] = useState(formula?.latex || textSource);
  const [preview, setPreview] = useState<{ latex: string; svg: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const section = useRef<HTMLDetailsElement>(null);
  const lastFocusRequest = useRef(0);

  useEffect(() => { setDraft(formula?.latex || textSource); }, [selection?.id, formula?.id, formula?.latex, textSource]);
  useEffect(() => { setOpen(Boolean(formula)); }, [selection?.id, formula?.id]);
  useEffect(() => {
    if (!focusRequest || focusRequest === lastFocusRequest.current) return;
    lastFocusRequest.current = focusRequest;
    setOpen(true);
    requestAnimationFrame(() => { section.current?.scrollIntoView({ block: "nearest" }); input.current?.focus(); });
  }, [focusRequest]);
  useEffect(() => {
    setPreview(null); setError(""); setBusy(false);
    if (!open || composing || !draft.trim()) return;
    let current = true;
    setBusy(true);
    const timer = setTimeout(() => {
      renderFormula(draft).then(svg => { if (current) setPreview({ latex: draft, svg }); })
        .catch(error => { if (current) setError(error.message); })
        .finally(() => { if (current) setBusy(false); });
    }, 350);
    return () => { current = false; clearTimeout(timer); };
  }, [draft, open, composing]);

  const single = selection && selection.type !== "selection";
  const apply = (replace: boolean) => {
    if (!preview || preview.latex !== draft || busy) return;
    editor?.execute("formula", { latex: draft, svg: preview.svg, targetId: replace ? formula?.id || selection?.id : undefined });
  };
  const insert = (value: string) => {
    const start = input.current?.selectionStart ?? draft.length, end = input.current?.selectionEnd ?? start;
    setDraft(draft.slice(0, start) + value + draft.slice(end));
    requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(start + value.length, start + value.length); });
  };
  const valid = Boolean(preview && preview.latex === draft && !busy);
  return <details ref={section} className="ff-inspector-section ff-formula-editor" open={open} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>{zh ? "公式 · LaTeX" : "Formula · LaTeX"}</summary>
    <div className="ff-formula-body">
      <p className="ff-inspector-note">{formula
        ? (zh ? "编辑源码后应用到公式。源码会随 SVG 一起保存。" : "Edit the source, then apply. LaTeX is saved with your SVG.")
        : textSource ? (zh ? "已读入选中文字。可用 LaTeX 修改；上下标和排版请对照原图检查。" : "Selected text is loaded. Edit with LaTeX; check superscripts and layout against the original.")
        : (zh ? "输入 LaTeX 可新建公式，或替换选中对象。旧的路径公式没有源码；替换前请先选中完整公式组。" : "Enter LaTeX to insert a formula or replace the selection. Outlined formulas have no source; select the whole formula group before replacing.")}</p>
      <label className="ff-formula-label">{zh ? "LaTeX 源码" : "LaTeX source"}
        <textarea ref={input} aria-label={zh ? "LaTeX 源码" : "LaTeX source"} value={draft} rows={4} maxLength={4000} spellCheck={false}
          placeholder={"\\frac{\\alpha}{\\sqrt{1+\\beta^2}}"} onChange={event => setDraft(event.target.value)}
          onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)}
          onKeyDown={event => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); apply(Boolean(single)); } }} />
      </label>
      <div className="ff-formula-snippets" aria-label={zh ? "常用公式" : "Formula templates"}>
        {snippets.map(([label, value], index) => <button type="button" key={value} title={value} onClick={() => insert(value)}>{zh ? label : english[index]}</button>)}
      </div>
      <div className="ff-formula-preview" aria-busy={busy} aria-label={zh ? "公式预览" : "Formula preview"}>
        {preview ? <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(preview.svg.replaceAll("currentColor", "#241b30"))}`} alt={draft} />
          : <span>{busy ? (zh ? "正在排版…" : "Typesetting…") : (zh ? "输入表达式后在这里预览" : "Your expression preview appears here")}</span>}
      </div>
      {error && <p className="ff-formula-error" role="alert">{zh ? "请检查 LaTeX：" : "Check your LaTeX: "}{error}</p>}
      <div className="ff-formula-actions">
        {single && <button type="button" className="ff-formula-apply" disabled={!valid} onClick={() => apply(true)}>{formula ? (zh ? "应用到公式" : "Apply to formula") : (zh ? "替换选中对象" : "Replace selection")}</button>}
        <button type="button" disabled={!valid} onClick={() => apply(false)}>{zh ? "插入新公式" : "Insert formula"}</button>
      </div>
    </div>
  </details>;
}
