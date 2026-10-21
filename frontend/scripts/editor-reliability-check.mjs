import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const output = process.env.AUDIT_OUTPUT || '.review/editor-reliability';
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5173';
await mkdir(output, { recursive: true });
const sample = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
<rect id="box" x="60" y="60" width="140" height="100" fill="#24a37a" stroke="#222" stroke-width="2"/>
<rect id="star" x="300" y="60" width="100" height="80" fill="#6243ce"/>
<g id="rotated-parent" transform="translate(350 340) rotate(28) scale(1.4 .7)"><text id="rotated" x="0" y="0" font-size="22">Editable text</text></g>
</svg>`;
const points = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 7.5 : 30; return `${40 + r * Math.cos(a)},${40 + r * Math.sin(a)}`; }).join(' ');
const inserted = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><polygon id="star" shape="star" point="5" starRadiusMultiplier="4" points="${points}" fill="#8643ce"/><text x="10" y="70" font-size="12" letter-spacing="2" textLength="100" lengthAdjust="spacingAndGlyphs">Inserted<tspan baseline-shift="super">2</tspan></text></svg>`;
await writeFile(output + '/input-copy.svg', sample);
await writeFile(output + '/insert-copy.svg', inserted);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const checks = [], errors = [];
let page;
let releaseExtension, extensionPending = false;
async function open(markup, name, delayExtension = false) {
  if (page) { errors.push(...await page.evaluate(() => window.editorErrors || [])); await page.close(); }
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  page.setDefaultTimeout(8000);
  page.on('pageerror', e => errors.push(e.message));
  if (delayExtension) {
    const gate = new Promise(resolve => { releaseExtension = resolve; });
    await page.route('**/svgedit/extensions/ext-grid/ext-grid.js', async route => { extensionPending = true; await gate; await route.continue(); });
  }
  await page.addInitScript(() => {
    localStorage.setItem('autodraftman-language', 'zh');
    window.editorErrors = [];
    window.addEventListener('message', e => { if (e.data?.source !== 'figfox-svgedit') return; if (e.data.type === 'state') window.editorState = e.data.state; if (e.data.type === 'error') window.editorErrors.push(e.data.message); });
  });
  await page.goto(base + '/editor', { waitUntil: 'networkidle' });
  await page.locator('input[type=file]').first().setInputFiles({ name, mimeType: 'image/svg+xml', buffer: Buffer.from(markup) });
  await page.waitForFunction(() => document.querySelector('.ff-editor-stage')?.dataset.ready === 'true' && !document.querySelector('.product-editor-route-content')?.inert);
}
const frame = () => page.frameLocator('iframe');
const command = (command, value) => page.evaluate(({ command, value }) => document.querySelector('iframe').contentWindow.figfoxCommand(command, value), { command, value });
const state = () => page.evaluate(() => window.editorState);
const settle = () => page.waitForTimeout(100);
const field = async (label, value) => { await page.getByLabel(label, { exact: true }).fill(String(value)); await page.getByLabel(label, { exact: true }).press('Enter'); await settle(); };
const pick = async id => { await command('select-layer', id); await page.waitForFunction(id => window.editorState?.selection?.id === id, id); await settle(); };
const near = (actual, expected, label) => assert.ok(Math.abs(actual - expected) < .12, `${label}: expected ${expected}, got ${actual}`);
async function exported(name) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 SVG', exact: true }).click();
  await (await pending).saveAs(output + '/' + name);
  return readFile(output + '/' + name, 'utf8');
}
try {
  const opening = open(sample, 'reliability-copy.svg', true);
  opening.catch(() => {});
  const started = Date.now();
  while (!extensionPending && Date.now() - started < 15000) await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(extensionPending, true, 'Delayed extension request started');
  await page.waitForTimeout(500);
  assert.notEqual(await page.locator('.ff-editor-stage').getAttribute('data-ready'), 'true', 'Do not advertise readiness before native shortcuts/extensions are installed');
  releaseExtension(); await opening;
  await frame().locator('#rotated').click();
  const readyBefore = await frame().locator('#rotated').boundingBox();
  await page.keyboard.press('ArrowRight'); await settle();
  const readyAfter = await frame().locator('#rotated').boundingBox();
  near(readyAfter.x - readyBefore.x, 1, 'Immediate ArrowRight after delayed startup');
  near(readyAfter.y - readyBefore.y, 0, 'Immediate ArrowRight vertical drift');
  checks.push('F3 startup: Slow extension loading keeps the canvas unready; the first click and arrow key work immediately after readiness');
  for (const [zoom, button, expected] of [[1000, '放大', 1200], [5, '缩小', 4], [6400, '放大', 6400], [1, '缩小', 1]]) {
    await field('%', zoom); await page.getByRole('button', { name: button, exact: true }).click();
    await page.waitForFunction(expected => window.editorState.zoom === expected, expected);
  }
  checks.push('F5: Zoom buttons use 1–6400%, remain monotonic and stop at both boundaries');
  await field('%', 100); await pick('box');
  for (const [requested, expected] of [[90, 90], [150, 150], [0, 0], [90, 90]]) {
    await field('线宽', requested);
    assert.equal(Number(await frame().locator('#box').getAttribute('stroke-width')), expected);
    assert.equal(Number(await page.getByLabel('线宽', { exact: true }).inputValue()), expected);
  }
  checks.push('F6: Stroke width supports 90/150 and zero without an artificial 99 px cap; values agree with the displayed input');
  await page.screenshot({ path: output + '/stroke-width.png' });

  for (const zoom of [25, 100]) {
    await field('%', zoom);
    await frame().locator('#rotated').click(); await settle();
    assert.equal((await state()).selection.id, 'rotated');
    assert.equal(await frame().locator('body').evaluate(() => document.hasFocus()), true);
    const before = await frame().locator('#rotated').boundingBox();
    const transform = await frame().locator('#rotated').getAttribute('transform');
    await page.keyboard.press('ArrowRight'); await settle();
    const after = await frame().locator('#rotated').boundingBox();
    near(after.x - before.x, 1, 'ArrowRight dx'); near(after.y - before.y, 0, 'ArrowRight dy');
    await page.keyboard.press('Shift+ArrowDown'); await settle();
    const shifted = await frame().locator('#rotated').boundingBox();
    near(shifted.x - after.x, 0, 'Shift+ArrowDown dx'); near(shifted.y - after.y, 10, 'Shift+ArrowDown dy');
    await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z'); await settle();
    assert.equal(await frame().locator('#rotated').getAttribute('transform'), transform);
  }
  checks.push('F3/F4: Actual canvas clicks restore focus after zoom input; rotated/scaled text nudges in screen directions at 25/100%, with undo');
  await command('document-settings', { ...(await state()).document, snap: true, snapStep: 8 });
  await frame().locator('#rotated').click(); await settle();
  const snappedBefore = await frame().locator('#rotated').boundingBox();
  await page.keyboard.press('ArrowRight'); await settle();
  const snappedAfter = await frame().locator('#rotated').boundingBox();
  near(snappedAfter.x - snappedBefore.x, 8, 'Snapped dx'); near(snappedAfter.y - snappedBefore.y, 0, 'Snapped dy');
  await page.keyboard.press('Control+z'); await settle(); await page.keyboard.press('Control+y'); await settle();
  near((await frame().locator('#rotated').boundingBox()).x, snappedAfter.x, 'Redo position');
  await pick('rotated');
  await field('X', (await state()).selection.x);
  await page.getByLabel('X', { exact: true }).focus();
  const whileTyping = await frame().locator('#rotated').getAttribute('transform');
  await page.keyboard.press('ArrowRight');
  assert.equal(await frame().locator('#rotated').getAttribute('transform'), whileTyping);
  checks.push('F4: Grid step and redo are preserved; arrows in an inspector field do not move artwork');
  await command('document-settings', { ...(await state()).document, snap: false });

  await pick('box');
  const original = await frame().locator('#box').evaluate(e => e.outerHTML);
  const collision = await frame().locator('#star').evaluate(e => e.outerHTML);
  await page.getByLabel('插入 SVG 文件', { exact: true }).setInputFiles({ name: 'insert-copy.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(inserted) });
  await frame().locator('#svgcontent symbol polygon[shape="star"]').waitFor({ state: 'attached' }); await settle();
  const star = frame().locator('#svgcontent symbol polygon[shape="star"]');
  assert.deepEqual(await page.evaluate(() => window.editorErrors), []);
  const placed = (await state()).selection;
  near(placed.x + placed.width / 2, 400, 'Inserted horizontal center');
  near(placed.y + placed.height / 2, 300, 'Inserted vertical center');
  assert.equal(await star.getAttribute('starRadiusMultiplier'), '4');
  assert.equal(await frame().locator('#box').evaluate(e => e.outerHTML), original);
  assert.equal(await frame().locator('#star').evaluate(e => e.outerHTML), collision);
  await page.getByRole('button', { name: '撤销', exact: true }).click(); await settle();
  assert.equal(await frame().locator('#svgcontent use').count(), 0, 'One undo removes the insertion');
  await page.getByRole('button', { name: '重做', exact: true }).click(); await settle();
  assert.equal(await star.getAttribute('starRadiusMultiplier'), '4');
  await page.getByRole('button', { name: '编辑', exact: true }).click();
  const choosing = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: '按原尺寸插入', exact: true }).click();
  await (await choosing).setFiles({ name: 'insert-copy.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(inserted) });
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelectorAll('#svgcontent use').length === 2); await settle();
  const originalSize = (await state()).selection;
  near(originalSize.width / placed.width, .6, 'Original-size insert scale');
  near(originalSize.x + originalSize.width / 2, 400, 'Original-size center X');
  near(originalSize.y + originalSize.height / 2, 300, 'Original-size center Y');
  await page.getByRole('button', { name: '撤销', exact: true }).click(); await settle();
  assert.equal(await frame().locator('#svgcontent use').count(), 1);
  await pick(await frame().locator('#svgcontent use').evaluate(e => e.id));
  await page.getByRole('button', { name: '解除引用，独立编辑', exact: true }).click(); await settle();
  await pick(await frame().locator('#svgcontent > g polygon[shape="star"]').evaluate(e => e.id));
  assert.equal(await page.getByLabel('内外径比例', { exact: true }).inputValue(), '4');
  await field('星角数', 6);
  assert.equal((await state()).nativeControls.shapeParameters.ratio, 4);
  const edited = await exported('edited-copy.svg');
  assert.match(edited, /starRadiusMultiplier="4"/); assert.match(edited, /baseline-shift="super"/);
  checks.push('F2: Default/original-size inserts are centered; star/text attributes survive ID collisions, unlinking, parameter edits, one undo/redo and export');
  await open(edited, 'reopened-copy.svg');
  assert.equal(await frame().locator('polygon[shape="star"]').getAttribute('starRadiusMultiplier'), '4');
  assert.equal(await frame().locator('polygon[shape="star"]').getAttribute('point'), '6');
  assert.equal(await frame().locator('#box').getAttribute('stroke-width'), '90');
  checks.push('F2/F6: Closing and reopening the edited SVG preserves star parameters and stroke width');

  for (const unit of ['em', 'ex', 'mm']) {
    await open(sample, `${unit}-input.svg`);
    await command('preferences');
    await page.getByRole('combobox', { name: '单位', exact: true }).selectOption(unit); await page.getByRole('tab', { name: '属性', exact: true }).click(); await settle();
    await pick('box'); await field('线宽', '9px');
    const saved = await exported(`${unit}-saved.svg`);
    const size = await page.evaluate(async markup => {
      const url = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
      try { const img = new Image(); img.src = url; await img.decode(); return { w: img.naturalWidth, h: img.naturalHeight }; } finally { URL.revokeObjectURL(url); }
    }, saved);
    assert.deepEqual(size, { w: 800, h: 600 }, `${unit} export intrinsic dimensions`);
    if (unit === 'mm') assert.match(saved, /width="[\d.]+mm"/);
    await open(saved, `${unit}-reopened.svg`);
    near((await state()).document.w, 800, `${unit} reopened width`); near((await state()).document.h, 600, `${unit} reopened height`);
    assert.equal(await frame().locator('#box').getAttribute('stroke-width'), '9');
  }
  checks.push('F1: em/ex/mm preference → edit → export → close → reopen preserves 800×600 intrinsic size and the edit');
  errors.push(...await page.evaluate(() => window.editorErrors));
  assert.deepEqual(errors, []);
} finally {
  releaseExtension?.();
  if (page) await page.screenshot({ path: output + '/last-state.png' });
  await writeFile(output + '/checks.json', JSON.stringify({ checks, errors }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ checks, errors }, null, 2));
