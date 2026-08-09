import {
  ArrowClockwise,
  ArrowCounterClockwise,
  BoundingBox,
  CaretDown,
  Circle,
  LineSegment,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Minus,
  PencilSimple,
  Plus,
  Rectangle,
  Selection,
  TextT,
  Trash,
} from "@phosphor-icons/react";
import { NumberField } from "@base-ui/react/number-field";
import { Popover } from "@base-ui/react/popover";
import { Slider } from "@base-ui/react/slider";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toolbar } from "@base-ui/react/toolbar";
import type { ReactNode } from "react";
import type {
  SvgEditHandle,
  SvgEditMode,
  SvgEditState,
} from "./SvgEditHost";

type FigFoxEditorChromeProps = {
  language: "zh" | "en";
  ready: boolean;
  state: SvgEditState;
  editor: SvgEditHandle | null;
  children: ReactNode;
};

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

const toolIcons: Array<{
  mode: SvgEditMode;
  icon: typeof Selection;
  zh: string;
  en: string;
  shortcut: string;
}> = [
  { mode: "select", icon: Selection, zh: "选择", en: "Select", shortcut: "V" },
  { mode: "fhpath", icon: PencilSimple, zh: "自由绘制", en: "Draw", shortcut: "P" },
  { mode: "line", icon: LineSegment, zh: "直线", en: "Line", shortcut: "L" },
  { mode: "rect", icon: Rectangle, zh: "矩形", en: "Rectangle", shortcut: "R" },
  { mode: "ellipse", icon: Circle, zh: "椭圆", en: "Ellipse", shortcut: "O" },
  { mode: "text", icon: TextT, zh: "文字", en: "Text", shortcut: "T" },
];

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const visibleColor = value === "none" ? "transparent" : value;

  return (
    <Popover.Root>
      <Popover.Trigger className="ff-editor-color-trigger" aria-label={`${label}: ${value}`}>
        <span className="ff-editor-color-chip" style={{ background: visibleColor }} data-none={value === "none"} />
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
                  aria-label={color === "none" ? "None" : color}
                  aria-selected={value.toLowerCase() === color}
                  role="option"
                  onClick={() => onChange(color)}
                />
              ))}
            </div>
            <label className="ff-editor-custom-color">
              <span>Custom</span>
              <input
                type="color"
                value={value === "none" ? "#ffffff" : value}
                onChange={(event) => onChange(event.target.value)}
              />
            </label>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function FigFoxEditorChrome({
  language,
  ready,
  state,
  editor,
  children,
}: FigFoxEditorChromeProps) {
  const zh = language === "zh";

  return (
    <div className="ff-editor-stage" data-ready={ready}>
      {children}

      <ToggleGroup
        className="ff-editor-tools"
        value={[state.mode]}
        disabled={!ready}
        orientation="vertical"
        aria-label={zh ? "绘图工具" : "Drawing tools"}
        onValueChange={(value) => {
          const mode = value.at(-1) as SvgEditMode | undefined;
          if (mode) editor?.setMode(mode);
        }}
      >
        {toolIcons.map((tool) => {
          const Icon = tool.icon;
          const label = zh ? tool.zh : tool.en;
          return (
            <Toggle
              key={tool.mode}
              className="ff-editor-tool-button"
              value={tool.mode}
              aria-label={`${label} (${tool.shortcut})`}
              title={`${label} · ${tool.shortcut}`}
            >
              <Icon size={20} weight={state.mode === tool.mode ? "fill" : "regular"} aria-hidden="true" />
              <span>{label}</span>
            </Toggle>
          );
        })}
      </ToggleGroup>

      <Toolbar.Root className="ff-editor-properties" aria-label={zh ? "对象属性" : "Object properties"}>
        <Toolbar.Group className="ff-editor-history-group">
          <Toolbar.Button
            className="ff-editor-icon-button"
            disabled={!ready || !state.canUndo}
            onClick={() => editor?.undo()}
            aria-label={zh ? "撤销" : "Undo"}
            title={zh ? "撤销 · Ctrl Z" : "Undo · Ctrl Z"}
          >
            <ArrowCounterClockwise size={18} aria-hidden="true" />
          </Toolbar.Button>
          <Toolbar.Button
            className="ff-editor-icon-button"
            disabled={!ready || !state.canRedo}
            onClick={() => editor?.redo()}
            aria-label={zh ? "重做" : "Redo"}
            title={zh ? "重做 · Ctrl Shift Z" : "Redo · Ctrl Shift Z"}
          >
            <ArrowClockwise size={18} aria-hidden="true" />
          </Toolbar.Button>
        </Toolbar.Group>
        <Toolbar.Separator className="ff-editor-separator" />
        <ColorControl
          label={zh ? "填充" : "Fill"}
          value={state.fill}
          onChange={(value) => editor?.setFill(value)}
        />
        <ColorControl
          label={zh ? "描边" : "Stroke"}
          value={state.stroke}
          onChange={(value) => editor?.setStroke(value)}
        />
        <Toolbar.Separator className="ff-editor-separator" />
        <NumberField.Root
          className="ff-editor-number-field"
          value={state.strokeWidth}
          min={0}
          max={64}
          step={0.5}
          disabled={!ready}
          onValueChange={(value) => editor?.setStrokeWidth(value ?? 0)}
        >
          <span className="ff-editor-field-label">{zh ? "线宽" : "Width"}</span>
          <NumberField.Group className="ff-editor-number-group">
            <NumberField.Decrement className="ff-editor-step-button" aria-label={zh ? "减小线宽" : "Decrease width"}>
              <Minus size={12} weight="bold" />
            </NumberField.Decrement>
            <NumberField.Input className="ff-editor-number-input" aria-label={zh ? "线宽" : "Stroke width"} />
            <NumberField.Increment className="ff-editor-step-button" aria-label={zh ? "增大线宽" : "Increase width"}>
              <Plus size={12} weight="bold" />
            </NumberField.Increment>
          </NumberField.Group>
        </NumberField.Root>
        <Popover.Root>
          <Popover.Trigger className="ff-editor-opacity-trigger">
            <span>{zh ? "不透明度" : "Opacity"}</span>
            <strong>{state.opacity}%</strong>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={10} className="ff-editor-popover-positioner">
              <Popover.Popup className="ff-editor-popover ff-editor-opacity-popover">
                <div className="ff-editor-opacity-heading">
                  <Popover.Title className="ff-editor-popover-title">{zh ? "不透明度" : "Opacity"}</Popover.Title>
                  <strong>{state.opacity}%</strong>
                </div>
                <Slider.Root
                  className="ff-editor-slider"
                  value={state.opacity}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(value) => editor?.setOpacity(value)}
                >
                  <Slider.Control className="ff-editor-slider-control">
                    <Slider.Track className="ff-editor-slider-track">
                      <Slider.Indicator className="ff-editor-slider-indicator" />
                      <Slider.Thumb className="ff-editor-slider-thumb" />
                    </Slider.Track>
                  </Slider.Control>
                </Slider.Root>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
        <Toolbar.Separator className="ff-editor-separator" />
        <Toolbar.Button
          className="ff-editor-icon-button ff-editor-delete-button"
          disabled={!ready || !state.hasSelection}
          onClick={() => editor?.deleteSelection()}
          aria-label={zh ? "删除所选" : "Delete selection"}
          title={zh ? "删除所选" : "Delete selection"}
        >
          <Trash size={18} aria-hidden="true" />
        </Toolbar.Button>
      </Toolbar.Root>

      <Toolbar.Root className="ff-editor-zoom" aria-label={zh ? "画布缩放" : "Canvas zoom"}>
        <Toolbar.Button className="ff-editor-icon-button" disabled={!ready} onClick={() => editor?.zoomOut()} aria-label={zh ? "缩小" : "Zoom out"}>
          <MagnifyingGlassMinus size={17} aria-hidden="true" />
        </Toolbar.Button>
        <span className="ff-editor-zoom-value">{state.zoom}%</span>
        <Toolbar.Button className="ff-editor-icon-button" disabled={!ready} onClick={() => editor?.zoomIn()} aria-label={zh ? "放大" : "Zoom in"}>
          <MagnifyingGlassPlus size={17} aria-hidden="true" />
        </Toolbar.Button>
        <Toolbar.Separator className="ff-editor-separator" />
        <Toolbar.Button className="ff-editor-icon-button" disabled={!ready} onClick={() => editor?.fitCanvas()} aria-label={zh ? "适合画布" : "Fit canvas"} title={zh ? "适合画布" : "Fit canvas"}>
          <BoundingBox size={18} aria-hidden="true" />
        </Toolbar.Button>
      </Toolbar.Root>
    </div>
  );
}
