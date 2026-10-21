import { useEffect, useRef, type PointerEvent } from "react";
import type { RgbaColor } from "react-colorful";
export type Hsv = { h: number; s: number; v: number };
export type ColorAxis = "H" | "S" | "V" | "R" | "G" | "B" | "A";
export function rgbToHsv({ r, g, b }: RgbaColor): Hsv {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const h = !d ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: max ? d / max * 100 : 0, v: max * 100 };
}
export function hsvToRgb({ h, s, v }: Hsv, a: number): RgbaColor {
  s /= 100; v /= 100;
  const f = (n: number) => { const k = (n + h / 60) % 6; return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255); };
  return { r: f(5), g: f(3), b: f(1), a };
}
export function ColorPlane({ axis, value, hsv, onChange, zh }: { axis: ColorAxis; value: RgbaColor; hsv: Hsv; onChange: (color: RgbaColor, hsv?: Hsv) => void; zh: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const rgbAxes = axis === "R" ? ["b", "g", "r"] : axis === "G" ? ["b", "r", "g"] : ["r", "g", "b"];
  const rgb = "RGB".includes(axis);
  const max = rgb ? 255 : axis === "H" ? 360 : 100;
  const selected = rgb ? value[rgbAxes[2] as "r"] : axis === "A" ? value.a * 100 : hsv[axis.toLowerCase() as keyof Hsv];
  const point = rgb ? [value[rgbAxes[0] as "r"] / 255, 1 - value[rgbAxes[1] as "r"] / 255] : axis === "H" ? [hsv.s / 100, 1 - hsv.v / 100] : axis === "V" ? [hsv.h / 360, 1 - hsv.s / 100] : [hsv.h / 360, 1 - hsv.v / 100];
  const sample = (x: number, y: number, fixed = selected): [RgbaColor, Hsv?] => {
    if (rgb) return [{ ...value, [rgbAxes[0]]: Math.round(x * 255), [rgbAxes[1]]: Math.round((1 - y) * 255), [rgbAxes[2]]: fixed }];
    const next = axis === "H" ? { h: fixed, s: x * 100, v: (1 - y) * 100 } : axis === "V" ? { h: x * 360, s: (1 - y) * 100, v: fixed } : { h: x * 360, s: axis === "S" ? fixed : hsv.s, v: (1 - y) * 100 };
    return [hsvToRgb(next, axis === "A" ? fixed / 100 : value.a), next];
  };
  useEffect(() => {
    const ctx = canvas.current!.getContext("2d")!, width = 192, height = 128;
    const pixels = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const color = sample(x / (width - 1), y / (height - 1)); const i = (y * width + x) * 4;
      pixels.data.set([color[0].r, color[0].g, color[0].b, 255], i);
    }
    ctx.putImageData(pixels, 0, 0);
  }, [axis, selected, hsv.s]);
  const pointer = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    onChange(...sample(Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)), Math.max(0, Math.min(1, (event.clientY - box.top) / box.height))));
  };
  const gradient = Array.from({ length: 13 }, (_, i) => { const [c] = sample(point[0], point[1], i / 12 * max); return `rgba(${c.r},${c.g},${c.b},${c.a})`; }).join(",");
  return <div className="ff-color-plane-control"><div className="ff-color-plane" role="slider" tabIndex={0} aria-label={zh ? `${axis} 色域，方向键调整` : `${axis} color area, use arrow keys`} aria-valuetext={`R ${value.r}, G ${value.g}, B ${value.b}`} aria-valuemin={0} aria-valuemax={255} aria-valuenow={value.r} onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); event.currentTarget.focus(); pointer(event); }} onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) pointer(event); }} onKeyDown={event => { if (!event.key.startsWith("Arrow")) return; event.preventDefault(); const step = event.shiftKey ? .1 : .01; onChange(...sample(Math.max(0, Math.min(1, point[0] + (event.key === "ArrowRight" ? step : event.key === "ArrowLeft" ? -step : 0))), Math.max(0, Math.min(1, point[1] + (event.key === "ArrowDown" ? step : event.key === "ArrowUp" ? -step : 0))))); }}><canvas ref={canvas} width={192} height={128} /><i style={{ left: `${point[0] * 100}%`, top: `${point[1] * 100}%` }} /></div><input type="range" min={0} max={max} step={rgb ? 1 : .1} value={selected} aria-label={`${axis} ${zh ? "通道" : "channel"}`} style={{ background: `linear-gradient(to right, ${gradient})` }} onChange={event => onChange(...sample(point[0], point[1], Number(event.target.value)))} /></div>;
}
