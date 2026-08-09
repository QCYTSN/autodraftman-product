import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../tokens.css", import.meta.url), "utf8");
const tokens = new Map(
  [...css.matchAll(/--([\w-]+):\s*#([0-9a-f]{6})/gi)].map((match) => [
    match[1],
    match[2]
      .match(/../g)
      .map((channel) => Number.parseInt(channel, 16) / 255),
  ]),
);

function luminance(rgb) {
  const linear = rgb.map((channel) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function ratio(foreground, background) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

const pairs = [
  ["ff-ink", "ff-canvas", 4.5],
  ["ff-ink-soft", "ff-canvas", 4.5],
  ["ff-muted", "ff-canvas", 4.5],
  ["ff-violet-strong", "ff-surface", 4.5],
  ["ff-orange-strong", "ff-surface", 4.5],
  ["ff-danger", "ff-surface", 4.5],
  ["ff-surface", "ff-ink", 4.5],
  ["ff-ink", "ff-orange-soft", 4.5],
];

const results = pairs.map(([foregroundName, backgroundName, threshold]) => {
  const foreground = tokens.get(foregroundName);
  const background = tokens.get(backgroundName);
  if (!foreground || !background) {
    return {
      pair: `${foregroundName}/${backgroundName}`,
      threshold,
      ratio: null,
      pass: false,
      reason: "missing token",
    };
  }
  const contrast = ratio(foreground, background);
  return {
    pair: `${foregroundName}/${backgroundName}`,
    threshold,
    ratio: Number(contrast.toFixed(2)),
    pass: contrast >= threshold,
  };
});

console.log(JSON.stringify(results, null, 2));
if (results.some((result) => !result.pass)) process.exitCode = 1;
