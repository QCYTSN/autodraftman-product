import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const output = '.review/editor-selection';
await mkdir(output, { recursive: true });
const sample = `<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1600">
<g id="module"><rect x="100" y="100" width="900" height="600" fill="#eee"/>
<rect id="nested-box" x="200" y="200" width="120" height="60" fill="#7952df"/>
<g id="inner"><text id="tiny" x="480" y="400" font-family="Arial" font-size="12">Small editable label</text>
<text id="neighbor" x="480" y="425" font-family="Arial" font-size="12">Adjacent label</text></g></g>
<g transform="translate(1150 350) rotate(28)"><text id="rotated" x="0" y="0" font-family="Arial" font-size="16">Rotated label</text></g>
<text id="hidden" x="480" y="400" font-size="20" visibility="hidden">Hidden</text>
<text id="covered" x="1200" y="900" font-size="14">Covered label</text><rect id="cover" x="1190" y="870" width="180" height="50" fill="#abc"/>
</svg>`;
await writeFile(output + '/input-copy.svg', sample);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const checks = [], errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => {
  localStorage.setItem('autodraftman-language', 'zh');
  window.addEventListener('message', event => { if (event.data?.type === 'state' && event.data?.source === 'figfox-svgedit') window.editorState = event.data.state; });
});
const point = async (id, halo = false) => page.evaluate(({ id, halo }) => {
  const frame = document.querySelector('iframe'), el = frame.contentDocument.getElementById(id);
  const bounds = el.getBBox(), matrix = el.getScreenCTM(), offset = frame.getBoundingClientRect();
  const p = new DOMPoint(bounds.x + bounds.width * (halo ? 0 : .5), bounds.y + bounds.height * .5).matrixTransform(matrix);
  return { x: offset.x + p.x - (halo ? 4 : 0), y: offset.y + p.y };
}, { id, halo });
const click = async (id, halo = false, options = {}) => { const p = await point(id, halo); await page.mouse.click(p.x, p.y, options); };
const selected = id => page.waitForFunction(id => window.editorState?.selection?.id === id, id, { timeout: 5000 });
try {
  await page.goto((process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5173') + '/editor', { waitUntil: 'networkidle' });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'selection-copy.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(sample) });
  await page.waitForFunction(() => document.querySelector('.ff-editor-stage')?.dataset.ready === 'true');
  await page.waitForFunction(() => !document.querySelector('.product-editor-route-content')?.inert);
  for (const zoom of [25, 50, 100]) {
    await page.getByLabel('%', { exact: true }).fill(String(zoom));
    await page.getByLabel('%', { exact: true }).press('Enter');
    await page.waitForFunction(zoom => window.editorState?.zoom === zoom, zoom);
    // Scroll the label into view without changing canvas zoom.
    await page.frameLocator('iframe').locator('#tiny').evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center' }));
    await click('tiny', true);
    await selected('tiny');
    checks.push(`Mouse click 4 CSS px outside tiny text selects the text at ${zoom}%`);
  }
  await page.getByLabel('%', { exact: true }).fill('50');
  await page.getByLabel('%', { exact: true }).press('Enter');
  await page.frameLocator('iframe').locator('#tiny').evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center' }));
  await click('neighbor'); await selected('neighbor');
  checks.push('Adjacent text wins over the nearby label and hidden text is ignored');
  await page.getByLabel('选择方式').selectOption('group');
  await click('tiny'); await selected('module');
  await page.keyboard.down('Control'); await click('tiny'); await page.keyboard.up('Control'); await selected('tiny');
  checks.push('Group mode selects the entire module; Ctrl click selects its nested text');
  await page.getByLabel('选择方式').selectOption('object');
  await page.frameLocator('iframe').locator('#nested-box').evaluate(el => { el.style.mixBlendMode = 'multiply'; });
  const boxPoint = await point('nested-box');
  await page.mouse.dblclick(boxPoint.x, boxPoint.y);
  await selected('nested-box');
  assert.equal(await page.evaluate(() => window.editorState.context), null);
  assert.equal(await page.frameLocator('iframe').locator('#nested-box').evaluate(el => el.style.mixBlendMode), 'multiply');
  checks.push('Double clicking a nested shape keeps a valid edit scope and preserves inline styles');
  await click('tiny', true);
  await page.keyboard.down('Shift'); await click('neighbor', true); await page.keyboard.up('Shift');
  await page.waitForFunction(() => window.editorState?.selectionCount === 2);
  await page.keyboard.down('Shift'); await click('neighbor', true); await page.keyboard.up('Shift');
  await selected('tiny');
  checks.push('Shift clicking nearby text adds and removes it from the selection');
  await page.frameLocator('iframe').locator('#rotated').evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center' }));
  await click('rotated'); await selected('rotated');
  checks.push('Rotated nested text can be selected directly');
  const beforeDrag = await page.frameLocator('iframe').locator('#rotated').boundingBox();
  const drag = await point('rotated');
  await page.mouse.move(drag.x, drag.y); await page.mouse.down(); await page.mouse.move(drag.x + 24, drag.y + 16, { steps: 5 }); await page.mouse.up();
  const afterDrag = await page.frameLocator('iframe').locator('#rotated').boundingBox();
  assert.ok(Math.abs(afterDrag.x - beforeDrag.x - 24) < 1 && Math.abs(afterDrag.y - beforeDrag.y - 16) < 1, 'Dragging a nested rotated text must follow the pointer');
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  const undone = await page.frameLocator('iframe').locator('#rotated').boundingBox();
  assert.ok(Math.abs(undone.x - beforeDrag.x) < 1 && Math.abs(undone.y - beforeDrag.y) < 1, 'One undo restores the original screen position');
  checks.push('Dragging rotated nested text follows the pointer and supports undo');
  await page.frameLocator('iframe').locator('#cover').evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center' }));
  await click('covered'); await selected('cover');
  checks.push('An opaque foreground object is not bypassed by the text hit halo');
  await page.frameLocator('iframe').locator('#tiny').evaluate(el => el.scrollIntoView({ block: 'center', inline: 'center' }));
  const p = await point('tiny', true);
  await page.mouse.move(p.x, p.y);
  await page.frameLocator('iframe').locator('#figfox-hit-preview[data-target="tiny"]').waitFor();
  await page.screenshot({ path: output + '/text-hover.png' });
  await page.mouse.dblclick(p.x, p.y);
  await page.waitForFunction(() => window.editorState?.mode === 'textedit', null, { timeout: 5000 });
  const textCenter = await point('tiny');
  await page.mouse.dblclick(textCenter.x, textCenter.y);
  await page.keyboard.press('Control+End'); await page.keyboard.type(' edited');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.getElementById('tiny').textContent.endsWith(' edited'));
  checks.push('Double click in the halo starts native text editing; another double click keeps keyboard editing usable');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 SVG', exact: true }).click();
  await (await download).saveAs(output + '/edited-copy.svg');
  assert.ok(!(await readFile(output + '/edited-copy.svg', 'utf8')).includes('figfox-hit-preview'));
  assert.deepEqual(errors, []);
} finally {
  await page.screenshot({ path: output + '/last-state.png' });
  await writeFile(output + '/checks.json', JSON.stringify({ checks, errors }, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ checks, errors }, null, 2));
