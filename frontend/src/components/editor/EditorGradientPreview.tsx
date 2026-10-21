import { useId, useRef, type PointerEvent } from "react";
import type { SvgEditPaint } from "./SvgEditHost";
export const gradientDefault = (name: string, attributes: Record<string, string>) => attributes[name] ?? (name === "fx" ? attributes.cx ?? "50%" : name === "fy" ? attributes.cy ?? "50%" : name === "x2" ? "100%" : ["x1", "y1", "y2"].includes(name) ? "0%" : "50%");
export function gradientMatrix(value = "") {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g"); group.setAttribute("transform", value);
  const m = group.transform.baseVal.consolidate()?.matrix;
  return m ? new DOMMatrix([m.a, m.b, m.c, m.d, m.e, m.f]) : new DOMMatrix();
}
export function gradientNumber(name: string, attributes: Record<string, string>, viewport = { width: 100, height: 100 }) {
  const value = gradientDefault(name, attributes);
  const reference = attributes.gradientUnits !== "userSpaceOnUse" ? 1 : ["y1", "y2", "cy", "fy"].includes(name) ? viewport.height : name === "r" ? Math.hypot(viewport.width, viewport.height) / Math.SQRT2 : viewport.width;
  return parseFloat(value) * (value.endsWith("%") ? reference / 100 : 1);
}
type Props = { kind: string; matchFocus: boolean; stops: SvgEditPaint["stops"]; attributes: Record<string, string>; opacity: number; paint?: SvgEditPaint; zh: boolean; onCoordinates: (value: Record<string, string>) => void };
export function EditorGradientPreview({ kind, matchFocus, stops, attributes, opacity, paint, zh, onCoordinates }: Props) {
  const id = useId().replaceAll(":", "");
  const svg = useRef<SVGSVGElement>(null);
  const box = paint?.box || { x: 0, y: 0, width: 100, height: 100 };
  const viewport = paint?.viewport || { width: 100, height: 100 };
  const object = attributes.gradientUnits !== "userSpaceOnUse";
  const matrix = gradientMatrix(attributes.gradientTransform);
  const bbox = object ? new DOMMatrix().translate(box.x, box.y).scale(box.width, box.height) : new DOMMatrix();
  const map = bbox.multiply(matrix);
  const coordinate = (name: string) => gradientNumber(name, attributes, viewport);
  const point = (x: string, y: string) => new DOMPoint(coordinate(x), coordinate(y)).matrixTransform(map);
  const handles = kind === "linear" ? [["x1", "y1"], ["x2", "y2"]] : matchFocus ? [["cx", "cy"]] : [["cx", "cy"], ["fx", "fy"]];
  const move = (names: string[], event: PointerEvent<SVGCircleElement>) => {
    const screen = svg.current?.getScreenCTM(); if (!screen) return;
    const world = new DOMPoint(event.clientX, event.clientY).matrixTransform(screen.inverse()).matrixTransform(map.inverse());
    if (Number.isFinite(world.x) && Number.isFinite(world.y)) onCoordinates({ [names[0]]: String(Number(world.x.toFixed(4))), [names[1]]: String(Number(world.y.toFixed(4))) });
  };
  // Percentages in user space are relative to the artwork viewport, not the
  // preview's cropped viewBox. Resolve them before rendering this preview.
  const attr = { ...attributes };
  if (!object) for (const name of kind === "linear" ? ["x1", "y1", "x2", "y2"] : ["cx", "cy", "r", "fx", "fy"]) attr[name] = String(coordinate(name));
  const common = { id, gradientUnits: attr.gradientUnits as "objectBoundingBox" | "userSpaceOnUse" | undefined, gradientTransform: attr.gradientTransform, spreadMethod: attr.spreadMethod as "pad" | "reflect" | "repeat" | undefined };
  const stopNodes = [...stops].sort((a, b) => a.offset - b.offset).map((stop, i) => <stop key={i} offset={stop.offset} stopColor={stop.color} stopOpacity={stop.opacity} />);
  const radius = Math.min(box.width, box.height) * .025;
  const positions = handles.map(([x, y]) => point(x, y));
  return <div className="ff-gradient-preview"><svg ref={svg} viewBox={`${box.x} ${box.y} ${box.width} ${box.height}`} aria-label={zh ? "渐变预览，可拖动控制点" : "Gradient preview; drag control points"}>
    <defs>{kind === "linear" ? <linearGradient {...common} x1={attr.x1} y1={attr.y1} x2={attr.x2} y2={attr.y2}>{stopNodes}</linearGradient> : <radialGradient {...common} cx={attr.cx} cy={attr.cy} r={attr.r} fx={attr.fx} fy={attr.fy}>{stopNodes}</radialGradient>}</defs>
    <rect {...box} fill={`url(#${id})`} opacity={opacity} />
    {positions[1] && <path d={`M${positions[0].x},${positions[0].y} L${positions[1].x},${positions[1].y}`} fill="none" stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
    {handles.map((names, i) => <circle key={names[0]} tabIndex={0} role="slider" aria-label={`${names[0]}, ${names[1]}`} aria-valuetext={`${gradientDefault(names[0], attributes)}, ${gradientDefault(names[1], attributes)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={coordinate(names[0])} cx={positions[i].x} cy={positions[i].y} r={radius * (i ? .7 : 1)} fill={i ? "#6243ce" : "white"} stroke={i ? "white" : "#6243ce"} strokeWidth={2} vectorEffect="non-scaling-stroke" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus(); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) move(names, event); }} onKeyDown={event => { if (!event.key.startsWith("Arrow")) return; event.preventDefault(); const step = (object ? .01 : 1) * (event.shiftKey ? 10 : 1); onCoordinates({ [names[0]]: String(coordinate(names[0]) + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0)), [names[1]]: String(coordinate(names[1]) + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0)) }); }} />)}
  </svg><p className="ff-inspector-note">{zh ? "拖动控制点调整方向与焦点；方向键可微调。" : "Drag controls to adjust direction or focus. Arrow keys fine-tune."}</p></div>;
}
