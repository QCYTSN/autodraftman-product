import { restoreSvgDocument } from '../../svgDocument';
import type { Box, PresentationCase } from './types';
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
export function targetBox(node: SVGGraphicsElement, documentRoot: SVGGraphicsElement): Box {
  const box = node.getBBox(), relative = documentRoot.getCTM()?.inverse().multiply(node.getCTM()!);
  if (!relative) return [box.x, box.y, box.width, box.height];
  const points = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]]
    .map(([x, y]) => new DOMPoint(x, y).matrixTransform(relative));
  const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y));
  return [x, y, Math.max(...points.map(p => p.x)) - x, Math.max(...points.map(p => p.y)) - y];
}
