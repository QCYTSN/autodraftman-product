import { useEffect, useId, useRef, useState } from "react";
import { ColorPlane, hsvToRgb, rgbToHsv, type ColorAxis, type Hsv } from "./EditorColorPlane";
import { Popover } from "@base-ui/react/popover";
import { RgbColorPicker, type RgbaColor } from "react-colorful";
import { InspectorNumber } from "./EditorFields";
import "./editor-color.css";

export const colorHex = (color: RgbaColor) => `#${[color.r, color.g, color.b].map(value => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
export const colorCss = (color: RgbaColor) => `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;

// Resolve imported CSS colors to editable sRGB channels, retaining color alpha
// separately from SVG's fill/stroke/stop opacity. No artwork is changed here.
export function readPaintColor(color: string, opacity = 1): RgbaColor {
  const context = document.createElement("canvas").getContext("2d")!;
  context.fillStyle = "#6243ce";
  context.fillStyle = color;
  const resolved = context.fillStyle;
  if (/^#[\da-f]{6}$/i.test(resolved)) return { r: parseInt(resolved.slice(1, 3), 16), g: parseInt(resolved.slice(3, 5), 16), b: parseInt(resolved.slice(5, 7), 16), a: opacity };
  if (/^rgba?\(/.test(resolved)) {
    const [r, g, b, a = 1] = resolved.match(/[\d.]+/g)!.map(Number);
    return { r, g, b, a: a * opacity };
  }
  context.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a / 255 * opacity };
}

export function PrecisionColorPicker({ value, onChange, onValidityChange, zh }: {
  value: RgbaColor; onChange: (value: RgbaColor) => void; onValidityChange: (valid: boolean) => void; zh: boolean;
}) {
  const hex = colorHex(value);
  const [draft, setDraft] = useState(hex);
  const valid = /^#?(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(draft.trim());
  const hintId = useId();
  const original = useRef(value);
  const [axis, setAxis] = useState<ColorAxis>("H");
  const [hsv, setHsv] = useState(() => rgbToHsv(value));
  useEffect(() => { setHsv(previous => { const next = rgbToHsv(value); return { ...next, h: next.s ? next.h : previous.h, s: next.v ? next.s : previous.s }; }); }, [value.r, value.g, value.b]);
  const changeHsv = (next: Hsv) => { setHsv(next); onChange(hsvToRgb(next, value.a)); };
  useEffect(() => { setDraft(hex); }, [hex]);
  useEffect(() => { onValidityChange(valid); }, [valid, onValidityChange]);
  const commitHex = () => {
    if (!valid) return;
    const raw = draft.trim().replace(/^#/, "");
    const next = readPaintColor(`#${raw}`);
    onChange({ ...next, a: [4, 8].includes(raw.length) ? next.a : value.a });
    setDraft(colorHex(next));
  };
  return <div className="ff-precision-color">
    <div className="ff-color-axis" role="group" aria-label={zh ? "调色通道" : "Color channel"}>{(["H", "S", "V", "R", "G", "B", "A"] as ColorAxis[]).map(channel => <button key={channel} type="button" aria-pressed={channel === axis} onClick={() => setAxis(channel)}>{channel}</button>)}</div>
    {axis === "H" ? <RgbColorPicker color={{ r: value.r, g: value.g, b: value.b }} onChange={rgb => onChange({ ...rgb, a: value.a })} aria-label={zh ? "连续色域与色相" : "Color area and hue"} /> : <ColorPlane axis={axis} value={value} hsv={hsv} onChange={(color, next) => { if (next) setHsv(next); onChange(color); }} zh={zh} />}
    <div className="ff-color-alpha"><input type="range" aria-label={zh ? "不透明度滑块" : "Alpha slider"} min={0} max={100} step={.01} value={Math.round(value.a * 10000) / 100}
      style={{ background: `linear-gradient(to right, transparent, ${colorHex(value)})` }} onChange={event => onChange({ ...value, a: Number(event.target.value) / 100 })} /></div>
    <div className="ff-color-value-row">
      <span className="ff-color-preview" aria-label={zh ? "颜色预览" : "Color preview"}><span style={{ background: colorCss(value) }} /></span>
      <label className="ff-color-hex"><span>HEX</span><input aria-label="HEX" value={draft} spellCheck={false} autoComplete="off" maxLength={9} aria-invalid={!valid} aria-describedby={!valid ? hintId : undefined}
        onChange={event => setDraft(event.target.value)} onBlur={commitHex} onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } if (event.key === "Escape") { event.stopPropagation(); setDraft(hex); } }} /></label>
      <InspectorNumber label={zh ? "不透明度 %" : "Alpha %"} ariaLabel={zh ? "颜色不透明度" : "Color alpha"} value={Math.round(value.a * 10000) / 100} min={0} max={100} onChange={a => onChange({ ...value, a: a / 100 })} />
    </div>
    {!valid && <p id={hintId} className="ff-color-error" role="alert">{zh ? "请输入 3、4、6 或 8 位 HEX 色值，例如 #2F6FE4。" : "Enter 3, 4, 6 or 8 HEX digits, e.g. #2F6FE4."}</p>}
    <div className="ff-color-rgb">{(["r", "g", "b"] as const).map(channel => <InspectorNumber key={channel} label={channel.toUpperCase()} ariaLabel={channel.toUpperCase()} value={value[channel]} min={0} max={255} onChange={next => onChange({ ...value, [channel]: Math.round(next) })} />)}</div>
    <div className="ff-color-rgb">{(["h", "s", "v"] as const).map(channel => <InspectorNumber key={channel} label={`${channel.toUpperCase()} ${channel === "h" ? "°" : "%"}`} ariaLabel={channel.toUpperCase()} value={hsv[channel]} min={0} max={channel === "h" ? 360 : 100} onChange={next => changeHsv({ ...hsv, [channel]: next })} />)}</div>
    <div className="ff-color-comparison"><button type="button" onClick={() => { onChange(original.current); setDraft(colorHex(original.current)); }} title={zh ? "恢复原色" : "Restore original"}><i style={{ background: colorCss(original.current) }} />{zh ? "原色 · 恢复" : "Original · restore"}</button><span><i style={{ background: colorCss(value) }} />{zh ? "当前" : "Current"}</span></div>
  </div>;
}

export function GradientStopColor({ color, opacity, onChange, label, zh }: {
  color: string; opacity: number; onChange: (color: string, opacity: number) => void; label: string; zh: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => readPaintColor(color, opacity));
  const [valid, setValid] = useState(true);
  return <Popover.Root open={open} onOpenChange={next => { if (next) { setDraft(readPaintColor(color, opacity)); setValid(true); } setOpen(next); }}>
    <Popover.Trigger className="ff-gradient-color-trigger ff-color-preview" aria-label={label}><span style={{ background: colorCss(readPaintColor(color, opacity)) }} /></Popover.Trigger>
    <Popover.Portal><Popover.Positioner sideOffset={8} collisionPadding={12} className="ff-color-positioner"><Popover.Popup className="ff-editor-popover ff-color-popover">
      <Popover.Title className="ff-editor-popover-title">{label}</Popover.Title>
      <PrecisionColorPicker value={draft} onChange={setDraft} onValidityChange={setValid} zh={zh} />
      <div className="ff-color-actions"><Popover.Close>{zh ? "取消" : "Cancel"}</Popover.Close><button type="button" disabled={!valid} onClick={() => { onChange(colorHex(draft), draft.a); setOpen(false); }}>{zh ? "确定色标" : "Set stop color"}</button></div>
    </Popover.Popup></Popover.Positioner></Popover.Portal>
  </Popover.Root>;
}
