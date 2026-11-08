import { restoreSvgDocument } from '../../svgDocument';
import type { Box, PresentationCase, Region } from './types';
export function cleanSvg(value: string) {
  const markup = restoreSvgDocument(value, 'presentation.svg').markup;
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  // Presentation resources must be wholly self-contained, including image hrefs.
  for (const node of doc.querySelectorAll('*')) for (const attr of [...node.attributes]) {
    if (['href', 'xlink:href', 'src'].includes(attr.name) && !/^(#|data:image\/)/.test(attr.value)) node.removeAttribute(attr.name);
  }
  return new XMLSerializer().serializeToString(doc.documentElement);
}
export function instanceSvg(markup: string, prefix: string) {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const root = doc.documentElement;
  const ids = new Map<string, string>();
  for (const node of root.querySelectorAll('[id]')) {
    const original = node.id;
    ids.set(original, prefix + '-' + original);
    node.id = ids.get(original)!;
    node.setAttribute('data-original-id', original);
  }
  const url = (text: string) => text.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (all, quote, id) => ids.has(id) ? 'url(#' + ids.get(id) + ')' : all);
  for (const node of root.querySelectorAll('*')) {
    for (const attr of [...node.attributes]) {
      let value = url(attr.value);
      if ((attr.localName === 'href') && value.startsWith('#') && ids.has(value.slice(1))) value = '#' + ids.get(value.slice(1));
      if (['aria-labelledby', 'aria-describedby'].includes(attr.name)) value = value.split(/\s+/).map(id => ids.get(id) ?? id).join(' ');
      if (['begin', 'end'].includes(attr.name)) value = value.replace(/([\w-]+)\./g, (all, id) => ids.has(id) ? ids.get(id) + '.' : all);
      node.setAttributeNS(attr.namespaceURI, attr.name, value);
    }
    if (node.localName === 'style') {
      let css = url(node.textContent ?? '');
      css = css.replace(/([^{}]+)\{/g, (_, selectors: string) => selectors.split(',').map(selector => {
        const replaced = selector.trim().replace(/#([\w-]+)/g, (all, id) => ids.has(id) ? '#' + ids.get(id) : all);
        return '#' + prefix + '-document ' + replaced;
      }).join(',') + '{');
      node.textContent = css;
    }
  }
  return { html: root.innerHTML, ids };
}
export function editedSvg(markup: string, target: PresentationCase['editTarget'], text: string) {
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const element = doc.getElementById(target.elementId);
  if (!element) throw new Error('Missing editable text object');
  let node: Node = element;
  for (const index of target.textNodePath) {
    const child = node.childNodes[index];
    if (!child) throw new Error('Missing editable text node');
    node = child;
  }
  if (node.nodeType !== Node.TEXT_NODE) throw new Error('Edit target must be a text node');
  node.nodeValue = [...text].slice(0, 40).join('');
  return new XMLSerializer().serializeToString(doc.documentElement);
}
export function expandedRegion(region: Region): Box {
  const [l, t, r, b] = region.box;
  const w = Math.min(region.coordinateWidth, Math.max(180, r - l + 64));
  const h = Math.min(region.coordinateHeight, Math.max(120, b - t + 64));
  return [Math.min(region.coordinateWidth - w, Math.max(0, (l + r - w) / 2)),
    Math.min(region.coordinateHeight - h, Math.max(0, (t + b - h) / 2)), w, h];
}
// Cameras share image units per pixel; independently centered reference/draft ROIs.
export function pairedCameras(a: Region, b: Region, width = 516, height = 340): [Box, Box] {
  const one = expandedRegion(a), two = expandedRegion(b);
  const scale = Math.min(width / Math.max(one[2], two[2]), height / Math.max(one[3], two[3]));
  const w = width / scale, h = height / scale;
  const camera = (box: Box, region: Region): Box => [Math.max(0, Math.min(region.coordinateWidth - w, box[0] + box[2] / 2 - w / 2)),
    Math.max(0, Math.min(region.coordinateHeight - h, box[1] + box[3] / 2 - h / 2)), w, h];
  return [camera(one, a), camera(two, b)];
}
export function targetBox(node: SVGGraphicsElement, documentRoot: SVGGraphicsElement): Box {
  const box = node.getBBox(), relative = documentRoot.getCTM()?.inverse().multiply(node.getCTM()!);
  if (!relative) return [box.x, box.y, box.width, box.height];
  const points = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
    .map(([x, y]) => new DOMPoint(x, y).matrixTransform(relative));
  const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y));
  return [x, y, Math.max(...points.map(p => p.x)) - x, Math.max(...points.map(p => p.y)) - y];
}
