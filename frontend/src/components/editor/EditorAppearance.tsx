import { CaretDown } from "@phosphor-icons/react";
import { InspectorNumber } from "./EditorFields";
import { Popover } from "@base-ui/react/popover";
import { Slider } from "@base-ui/react/slider";
import type { SvgEditHandle, SvgEditPaint, SvgEditState } from "./SvgEditHost";

const palette = [
  "#20152b",
  "#ffffff",
  "#6b3df4",
  "#9b7cff",
  "#ef5b2a",
  "#f4b942",
  "#24a37a",
  "#2f6fe4",
  "#d9446e",
  "#697386",
  "none",
];

function ColorControl({
  label,
  value,
  onChange,
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
}) {
  const complexPaint = value === "mixed" || value.includes("url(");
  const gradient = paint?.stops.length ? `${paint.kind === "radial" ? "radial-gradient(circle" : "linear-gradient(90deg"}, ${paint.stops.map(stop => `${stop.color} ${stop.offset * 100}%`).join(", ")})` : "repeating-linear-gradient(135deg, #ddd 0 4px, #fff 4px 8px)";
  const visibleColor = complexPaint ? gradient : value === "none" ? "transparent" : value;

  return (
    <Popover.Root>
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
        <Popover.Positioner sideOffset={10} className="ff-editor-popover-positioner">
          <Popover.Popup className="ff-editor-popover ff-editor-palette-popover">
            <Popover.Title className="ff-editor-popover-title">{label}</Popover.Title>
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
            <label className="ff-editor-custom-color">
              <span>{zh ? "自定义" : "Custom"}</span>
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#ffffff"}
                onChange={(event) => onChange(event.target.value)}
              />
            </label>
            <Popover.Close className="ff-inspector-wide-action" onClick={onAdvanced}>{advancedLabel}</Popover.Close>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function EditorAppearance({ state, editor, zh, ready, onPaint }: { state: SvgEditState; editor: SvgEditHandle | null; zh: boolean; ready: boolean; onPaint: (type: "fill" | "stroke") => void }) {
  return <section className="ff-inspector-section ff-editor-appearance"><h3>{zh ? "外观" : "Appearance"}</h3><div className="ff-appearance-controls">
        <ColorControl zh={zh} label={zh ? "填充" : "Fill"} value={state.fill} paint={state.paints?.fill} onAdvanced={() => onPaint("fill")} advancedLabel={zh ? "渐变与透明度" : "Gradient & opacity"} onChange={(value) => editor?.setFill(value)} />
        <ColorControl zh={zh} label={zh ? "描边" : "Stroke"} value={state.stroke} paint={state.paints?.stroke} onAdvanced={() => onPaint("stroke")} advancedLabel={zh ? "渐变与透明度" : "Gradient & opacity"} onChange={(value) => editor?.setStroke(value)} />

        <InspectorNumber label={zh ? "线宽" : "Width"} ariaLabel={zh ? "线宽" : "Stroke width"} value={state.strokeWidth} min={0} max={99} onChange={value => { if (ready) editor?.setStrokeWidth(value); }} />

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
