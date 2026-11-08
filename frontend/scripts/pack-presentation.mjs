import { readFile, writeFile, mkdir, readdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const build = path.join(root, '.presentation-build'), out = path.join(root, 'presentation-dist');
await mkdir(out, { recursive: true });
const js = (await readFile(path.join(build, 'presentation.js'), 'utf8')).replace(/<\/script/gi, '<\\/script').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
const css = (await Promise.all((await readdir(build)).filter(n => n.endsWith('.css')).map(n => readFile(path.join(build, n), 'utf8')))).join('\n').replace(/<\/style/gi, '<\\/style');
assert(js && css);
const html = '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>FigFox · Architecture walkthrough</title><style>' + css + '</style></head><body><div id="root"></div><script>' + js + '</script></body></html>';
assert(Buffer.byteLength(html) < 20 * 1024 * 1024, 'Offline HTML exceeds 20 MiB');
const name = 'FigFox-Architecture-Demo.html';
await writeFile(path.join(out, name), html);
const data = JSON.parse(await readFile(path.join(root, 'public/assets/presentation/sample-0001/manifest.json'), 'utf8'));
await writeFile(path.join(out, 'manifest.json'), JSON.stringify({ file: name, bytes: Buffer.byteLength(html), sha256: createHash('sha256').update(html).digest('hex'), case: data }, null, 2) + '\n');
await writeFile(path.join(out, 'README.md'), '# FigFox Architecture Demo\n\nDouble-click FigFox-Architecture-Demo.html. It contains all resources and needs no server or network.\n\n中文默认；append ?lang=en to the file URL for English. Arrow keys or visible buttons advance. N: notes; H: help; F: fullscreen; B: before/after in repair; Home/End: overview/edit. Inputs keep normal editing keys.\n\nSee ../../docs/figfox-presentation-mode.md in the repository for provenance and acceptance evidence.\n');
if (process.argv.includes('--pages')) {
  const downloads = path.join(root, 'dist/presentation-downloads');
  await mkdir(downloads, { recursive: true });
  await copyFile(path.join(out, name), path.join(downloads, name));
}
console.log('Offline presentation: ' + Buffer.byteLength(html) + ' bytes');
