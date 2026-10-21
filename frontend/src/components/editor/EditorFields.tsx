import { useEffect, useRef, useState } from "react";

export function InspectorNumber({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
}) {
  const [draft, setDraft] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(String(Math.round(value * 100) / 100)); }, [value]);
  const commit = () => {
    focused.current = false;
    const next = Number(draft);
    if (draft.trim() && Number.isFinite(next) && next !== value) onChange(min === undefined ? next : Math.max(min, next));
    else setDraft(String(Math.round(value * 100) / 100));
  };
  return (
    <label className="ff-inspector-number">
      <span>{label}</span>
      <input
        type="number"
        value={draft}
        min={min}
        step="0.5"
        onFocus={() => { focused.current = true; }}
        onChange={event => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") { setDraft(String(value)); focused.current = false; } }}
      />
    </label>
  );
}
