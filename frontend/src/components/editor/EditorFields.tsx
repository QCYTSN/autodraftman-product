import { createContext, useContext, useEffect, useRef, useState } from "react";

export const lengthUnits: Record<string, number> = { px: 1, mm: 96 / 25.4, cm: 96 / 2.54, in: 96, pt: 96 / 72, pc: 16, em: 16, ex: 8 };
export const LengthUnitsContext = createContext(lengthUnits);

// Values crossing the editor boundary are always user-space pixels. A suffix
// overrides the display unit, so typing "10mm" works even in a px document.
export function InspectorLength({ label, value, unit = "px", onChange, min, ariaLabel }: { label: string; value: number; unit?: string; onChange: (value: number) => void; min?: number; ariaLabel?: string }) {
  const factors = useContext(LengthUnitsContext);
  const format = (next: number) => String(Number((next / (factors[unit] || 1)).toFixed(4)));
  const [draft, setDraft] = useState(format(value));
  const [invalid, setInvalid] = useState(false);
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) { setDraft(format(value)); setInvalid(false); } }, [value, unit]);
  const commit = () => {
    focused.current = false;
    const match = draft.trim().match(/^([+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(px|mm|cm|in|pt|pc|em|ex)?$/i);
    const next = match ? Number(match[1]) * (factors[(match[2] || unit).toLowerCase()] || 1) : NaN;
    if (!Number.isFinite(next) || next < (min ?? -Infinity)) { setInvalid(true); return; }
    setInvalid(false); setDraft(format(next));
    if (Math.abs(next - value) > .00001) onChange(next);
  };
  return <label className="ff-inspector-number ff-inspector-length"><span>{label}</span><input aria-label={ariaLabel || label} type="text" inputMode="decimal" value={draft} aria-invalid={invalid} title={invalid ? "Enter a valid length, e.g. 10mm" : undefined} onFocus={() => { focused.current = true; }} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(format(value)); setInvalid(false); } }} /><small aria-hidden="true">{unit}</small></label>;
}

export function InspectorNumber({
  label,
  value,
  onChange,
  min,
  max,
  ariaLabel,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(String(Math.round(value * 100) / 100)); }, [value]);
  const commit = () => {
    focused.current = false;
    const next = Number(draft);
    if (draft.trim() && Number.isFinite(next) && next !== value) { const limited = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, next)); setDraft(String(limited)); onChange(limited); }
    else setDraft(String(Math.round(value * 100) / 100));
  };
  return (
    <label className="ff-inspector-number">
      <span>{label}</span>
      <input
        type="number"
        aria-label={ariaLabel}
        value={draft}
        min={min}
        max={max}
        step="0.5"
        onFocus={() => { focused.current = true; }}
        onChange={event => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(String(value)); focused.current = false; } }}
      />
    </label>
  );
}
