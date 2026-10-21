import { CaretDown } from "@phosphor-icons/react";
import { useState } from "react";
import { InspectorLength } from "./EditorFields";
import { Popover } from "@base-ui/react/popover";
import { Slider } from "@base-ui/react/slider";
import type { SvgEditHandle, SvgEditPaint, SvgEditState } from "./SvgEditHost";
import { colorHex, PrecisionColorPicker, readPaintColor } from "./EditorColorPicker";

const palette = [
  // Todo: Make into configuration item?
  'none',
  '#000000',
  '#3f3f3f',
  '#7f7f7f',
  '#bfbfbf',
  '#ffffff',
  '#ff0000',
  '#ff7f00',
  '#ffff00',
  '#7fff00',
  '#00ff00',
  '#00ff7f',
  '#00ffff',
  '#007fff',
  '#0000ff',
  '#7f00ff',
  '#ff00ff',
  '#ff007f',
  '#7f0000',
  '#7f3f00',
  '#7f7f00',
  '#3f7f00',
  '#007f00',
  '#007f3f',
  '#007f7f',
  '#003f7f',
  '#00007f',
  '#3f007f',
  '#7f007f',
  '#7f003f',
  '#ffaaaa',
  '#ffd4aa',
  '#ffffaa',
  '#d4ffaa',
  '#aaffaa',
  '#aaffd4',
  '#aaffff',
  '#aad4ff',
  '#aaaaff',
  '#d4aaff',
  '#ffaaff',
  '#ffaad4'
];

function ColorControl({
  label,
  value,
  onChange,
  onApply,
  onAdvanced,
  advancedLabel,
  paint,
  zh,
}: {
  zh: boolean;
  paint?: SvgEditPaint;
  onAdvanced: () => void;
  advancedLabel: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onApply: (color: string, opacity: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => readPaintColor(value, paint?.opacity ?? 1));
  const [valid, setValid] = useState(true);
  const complexPaint = value === "mixed" || value.includes("url(");
  const gradient = paint?.stops.length ? `${paint.kind === "radial" ? "radial-gradient(circle" : "linear-gradient(90deg"}, ${paint.stops.map(stop => `${stop.color} ${stop.offset * 100}%`).join(", ")})` : "repeating-linear-gradient(135deg, #ddd 0 4px, #fff 4px 8px)";
  const visibleColor = complexPaint ? gradient : value === "none" ? "transparent" : value;

  return (
    <Popover.Root open={open} onOpenChange={next => { if (next) { setDraft(readPaintColor(value, paint?.opacity ?? 1)); setValid(true); } setOpen(next); }}>
      <Popover.Trigger className="ff-editor-color-trigger" aria-label={`${label}: ${value}`}>
        <span
          className="ff-editor-color-chip"
          style={{ background: visibleColor }}
          data-none={value === "none"}
        />
        <span>{label}</span>
        <CaretDown size={12} weight="bold" aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={10} collisionPadding={12} className="ff-editor-popover-positioner ff-color-positioner">
          <Popover.Popup className="ff-editor-popover ff-editor-palette-popover ff-color-popover">
            <Popover.Title className="ff-editor-popover-title">{label}</Popover.Title>
            <PrecisionColorPicker value={draft} onChange={setDraft} onValidityChange={setValid} zh={zh} />
            {complexPaint && <p className="ff-inspector-note">{zh ? "应用颜色会改为纯色。编辑原有渐变请打开下方「渐变与透明度」。" : "Applying a color replaces this paint with a solid color. Use Gradient & opacity to edit the existing gradient."}</p>}
            <div className="ff-color-actions"><Popover.Close>{zh ? "取消" : "Cancel"}</Popover.Close><button type="button" disabled={!valid} onClick={() => { onApply(colorHex(draft), draft.a); setOpen(false); }}>{zh ? "应用颜色" : "Apply color"}</button></div>
            <details className="ff-color-quick"><summary>{zh ? "快捷色板" : "Quick colors"}</summary>
            <div className="ff-editor-palette" role="listbox" aria-label={label}>
              {palette.map((color) => (
                <Popover.Close
                  key={color}
                  type="button"
                  className="ff-editor-swatch"
                  data-active={value.toLowerCase() === color}
                  data-none={color === "none"}
                  style={{ background: color === "none" ? "transparent" : color }}
                  aria-label={color === "none" ? (zh ? "无" : "None") : color}
                  aria-selected={value.toLowerCase() === color}
                  role="option"
                  onClick={() => onChange(color)}
                />
              ))}
            </div>
            </details>
            <Popover.Close className="ff-inspector-wide-action" onClick={onAdvanced}>{advancedLabel}</Popover.Close>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function EditorAppearance({ state, editor, zh, ready, onPaint }: { state: SvgEditState; editor: SvgEditHandle | null; zh: boolean; ready: boolean; onPaint: (type: "fill" | "stroke") => void }) {
  return <section className="ff-inspector-section ff-editor-appearance"><h3>{zh ? "外观" : "Appearance"}</h3><div className="ff-appearance-controls">
        <ColorControl key={`fill-${state.selection?.id}`} zh={zh} label={zh ? "填充" : "Fill"} value={state.fill} paint={state.paints?.fill} onAdvanced={() => onPaint("fill")} advancedLabel={zh ? "渐变与透明度" : "Gradient & opacity"} onChange={(value) => editor?.setFill(value)} onApply={(color, opacity) => editor?.execute("paint", { type: "fill", kind: "solid", color, opacity })} />
        <ColorControl key={`stroke-${state.selection?.id}`} zh={zh} label={zh ? "描边" : "Stroke"} value={state.stroke} paint={state.paints?.stroke} onAdvanced={() => onPaint("stroke")} advancedLabel={zh ? "渐变与透明度" : "Gradient & opacity"} onChange={(value) => editor?.setStroke(value)} onApply={(color, opacity) => editor?.execute("paint", { type: "stroke", kind: "solid", color, opacity })} />

        <InspectorLength unit={state.document?.unit} label={zh ? "线宽" : "Width"} ariaLabel={zh ? "线宽" : "Stroke width"} value={state.strokeWidth} min={0} onChange={value => { if (ready) editor?.setStrokeWidth(value); }} />

        <Popover.Root>
          <Popover.Trigger className="ff-editor-opacity-trigger"><span>{zh ? "不透明度" : "Opacity"}</span><strong>{state.opacity}%</strong></Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={10} className="ff-editor-popover-positioner">
              <Popover.Popup className="ff-editor-popover ff-editor-opacity-popover">
                <div className="ff-editor-opacity-heading"><Popover.Title className="ff-editor-popover-title">{zh ? "不透明度" : "Opacity"}</Popover.Title><strong>{state.opacity}%</strong></div>
                <Slider.Root className="ff-editor-slider" value={state.opacity} min={0} max={100} step={1} onValueChange={(value) => editor?.setOpacity(value)}>
                  <Slider.Control className="ff-editor-slider-control"><Slider.Track className="ff-editor-slider-track"><Slider.Indicator className="ff-editor-slider-indicator" /><Slider.Thumb aria-label={zh ? "不透明度" : "Opacity"} className="ff-editor-slider-thumb" /></Slider.Track></Slider.Control>
                </Slider.Root>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>

  </div></section>;
}
