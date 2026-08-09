import DOMPurify from "dompurify";

const maxSvgBytes = 5 * 1024 * 1024;
const maxSvgElements = 12_000;
const hiddenRootTags = new Set(["defs", "title", "desc", "metadata"]);
const forbiddenTags = [
  "script",
  "foreignObject",
  "iframe",
  "object",
  "embed",
  "audio",
  "video",
  "canvas",
  "animate",
  "animateMotion",
  "animateTransform",
  "set",
];

export type SvgImportErrorCode =
  | "empty"
  | "format"
  | "invalid"
  | "large"
  | "complex";

export class SvgImportError extends Error {
  code: SvgImportErrorCode;

  constructor(code: SvgImportErrorCode) {
    super(code);
    this.name = "SvgImportError";
    this.code = code;
  }
}

export type SvgDocumentLayer = {
  id: string;
  label: string;
  tag: string;
  childCount: number;
};

export type ImportedSvgDocument = {
  fileName: string;
  markup: string;
  byteSize: number;
  elementCount: number;
  textCount: number;
  aspectRatio: number;
  fontFamilies: string[];
  layers: SvgDocumentLayer[];
  sanitized: boolean;
};

function parseSvg(source: string) {
  const parsed = new DOMParser().parseFromString(source, "image/svg+xml");
  if (parsed.querySelector("parsererror")) {
    throw new SvgImportError("invalid");
  }

  const root = parsed.documentElement as unknown as SVGSVGElement;
  if (root.localName.toLowerCase() !== "svg") {
    throw new SvgImportError("invalid");
  }

  return { parsed, root };
}

function safeDataImage(value: string) {
  return /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(value);
}

function safeReference(value: string) {
  const normalized = value.trim();
  return (
    normalized === "" ||
    normalized.startsWith("#") ||
    safeDataImage(normalized)
  );
}

function containsUnsafeCss(value: string) {
  if (/(?:javascript|vbscript|expression|@import|-moz-binding)\s*[:(]/i.test(value)) {
    return true;
  }

  return [...value.matchAll(/url\(([^)]+)\)/gi)].some((match) => {
    const target = match[1].trim().replace(/^['"]|['"]$/g, "");
    return !target.startsWith("#") && !safeDataImage(target);
  });
}

function numericLength(value: string | null) {
  if (!value) return null;
  const match = value.trim().match(/^([0-9]+(?:\.[0-9]+)?)(?:px)?$/i);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function getAspectRatio(root: SVGSVGElement) {
  const viewBox = root
    .getAttribute("viewBox")
    ?.trim()
    .split(/[\s,]+/)
    .map(Number);

  if (
    viewBox?.length === 4 &&
    viewBox.every(Number.isFinite) &&
    viewBox[2] > 0 &&
    viewBox[3] > 0
  ) {
    return viewBox[2] / viewBox[3];
  }

  const width = numericLength(root.getAttribute("width"));
  const height = numericLength(root.getAttribute("height"));
  return width && height ? width / height : 16 / 9;
}

function cleanExternalReferences(root: SVGSVGElement) {
  let removed = 0;
  const elements = [root, ...root.querySelectorAll("*")];

  for (const element of elements) {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;

      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
        removed += 1;
        continue;
      }

      if (
        (name === "href" || name === "xlink:href" || name === "src") &&
        !safeReference(value)
      ) {
        element.removeAttribute(attribute.name);
        removed += 1;
        continue;
      }

      if (
        (name === "style" || value.toLowerCase().includes("url(")) &&
        containsUnsafeCss(value)
      ) {
        element.removeAttribute(attribute.name);
        removed += 1;
      }
    }

    if (element.localName.toLowerCase() === "a") {
      element.removeAttribute("href");
      element.removeAttribute("xlink:href");
      element.removeAttribute("target");
    }
  }

  for (const style of root.querySelectorAll("style")) {
    if (containsUnsafeCss(style.textContent ?? "")) {
      style.remove();
      removed += 1;
    }
  }

  return removed;
}

function layerLabel(element: Element, index: number) {
  const explicit =
    element.getAttribute("aria-label")?.trim() ||
    element.getAttribute("id")?.trim() ||
    element.querySelector(":scope > title")?.textContent?.trim();

  return explicit || `${element.localName} ${String(index + 1).padStart(2, "0")}`;
}

function collectLayers(root: SVGSVGElement): SvgDocumentLayer[] {
  return [...root.children]
    .filter((element) => !hiddenRootTags.has(element.localName.toLowerCase()))
    .slice(0, 24)
    .map((element, index) => ({
      id: element.getAttribute("id") || `${element.localName}-${index}`,
      label: layerLabel(element, index),
      tag: element.localName,
      childCount: element.querySelectorAll("*").length,
    }));
}

const genericFontFamilies = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "emoji",
  "math",
  "fangsong",
]);

function splitFontFamilies(value: string) {
  return value
    .split(",")
    .map((family) => family.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

function collectFontFamilies(root: SVGSVGElement) {
  const families = new Set<string>();
  const addFamilies = (value: string | null | undefined) => {
    if (!value) return;
    for (const family of splitFontFamilies(value)) {
      if (!genericFontFamilies.has(family.toLowerCase())) {
        families.add(family);
      }
    }
  };

  for (const element of [root, ...root.querySelectorAll("*")]) {
    addFamilies(element.getAttribute("font-family"));
    const style = element.getAttribute("style");
    const inlineFamily = style?.match(/(?:^|;)\s*font-family\s*:\s*([^;]+)/i)?.[1];
    addFamilies(inlineFamily);
  }

  for (const style of root.querySelectorAll("style")) {
    for (const match of style.textContent?.matchAll(/font-family\s*:\s*([^;}]+)/gi) ?? []) {
      addFamilies(match[1]);
    }
  }

  return [...families].slice(0, 6);
}

export async function importSvgDocument(file: File): Promise<ImportedSvgDocument> {
  if (file.size === 0) throw new SvgImportError("empty");
  if (file.size > maxSvgBytes) throw new SvgImportError("large");

  const hasSvgExtension = file.name.toLowerCase().endsWith(".svg");
  const hasSvgMime = file.type === "" || file.type === "image/svg+xml";
  if (!hasSvgExtension || !hasSvgMime) throw new SvgImportError("format");

  const source = await file.text();
  const original = parseSvg(source);
  const originalCount = original.root.querySelectorAll("*").length;
  if (originalCount > maxSvgElements) throw new SvgImportError("complex");
  const sourceHadUnsafeContent =
    /<\s*(?:script|foreignObject|iframe|object|embed|audio|video|canvas|animate|animateMotion|animateTransform|set)\b/i.test(
      source,
    ) ||
    /\son[a-z]+\s*=/i.test(source) ||
    /(?:href|xlink:href|src)\s*=\s*["']\s*(?:https?:|\/\/|javascript:|data:text)/i.test(
      source,
    ) ||
    containsUnsafeCss(source);

  const purified = DOMPurify.sanitize(source, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: forbiddenTags,
  });
  const sanitized = parseSvg(purified);
  const removedReferences = cleanExternalReferences(sanitized.root);
  const elementCount = sanitized.root.querySelectorAll("*").length;
  if (elementCount > maxSvgElements) throw new SvgImportError("complex");

  sanitized.root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const markup = new XMLSerializer().serializeToString(sanitized.root);

  return {
    fileName: file.name,
    markup,
    byteSize: new Blob([markup], { type: "image/svg+xml" }).size,
    elementCount,
    textCount: sanitized.root.querySelectorAll("text, tspan, textPath").length,
    aspectRatio: getAspectRatio(sanitized.root),
    fontFamilies: collectFontFamilies(sanitized.root),
    layers: collectLayers(sanitized.root),
    sanitized: sourceHadUnsafeContent || removedReferences > 0,
  };
}

export async function sanitizeSvgMarkup(source: string, fileName = "figure.svg") {
  const safeFileName = fileName.toLowerCase().endsWith(".svg")
    ? fileName
    : `${fileName}.svg`;
  const document = await importSvgDocument(
    new File([source], safeFileName, { type: "image/svg+xml" }),
  );
  return document.markup;
}
