import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const output = '.review/editor-parity';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const checks = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => { localStorage.setItem('autodraftman-language', 'zh'); window.addEventListener('message', e => { if (e.data?.type === 'state' && e.data?.source === 'figfox-svgedit') window.state = e.data.state; }); });
const frame = page.frameLocator('iframe');
const input = async (label, value) => { await page.getByLabel(label, { exact: true }).fill(String(value)); await page.getByLabel(label, { exact: true }).press('Enter'); };
const download = async (label, name) => {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: label, exact: true }).click();
  const file = await pending; await file.saveAs(output + '/' + name);
  return { bytes: await readFile(output + '/' + name), filename: file.suggestedFilename() };
};
const sample = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><g id="module"><rect id="box" x="60" y="60" width="140" height="100" fill="#24a37a"/><text x="80" y="115" font-size="22">FigFox</text></g><a href="javascript:alert(1)"><circle id="safe-circle" cx="700" cy="100" r="20" fill="#6243ce"/></a></svg>';
try {
  await page.goto((process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5173') + '/editor', { waitUntil: 'networkidle' });
  await page.locator('input[type=file]').first().setInputFiles({ name: 'parity-copy.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(sample) });
  await page.waitForFunction(() => document.querySelector('.ff-editor-stage')?.dataset.ready === 'true');
  await page.waitForFunction(() => !document.querySelector('.product-editor-route-content')?.inert);
  assert.equal(await frame.locator('#safe-circle').count(), 1);
  assert.equal(await frame.locator('#svgcontent').evaluate(el => [...el.querySelectorAll('a')].some(a => /javascript:/i.test(a.getAttribute('href') || a.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || ''))), false);
  checks.push('Importing hyperlinks still strips executable URLs while keeping the artwork');
  for (const name of ['正方形', '圆形', '手绘矩形', '手绘椭圆']) {
    await page.getByRole('button', { name: '更多绘图工具' }).click();
    await page.getByRole('button', { name, exact: true }).click();
    const expected = { 正方形: 'square', 圆形: 'circle', 手绘矩形: 'fhrect', 手绘椭圆: 'fhellipse' }[name];
    await page.waitForFunction(mode => window.state?.mode === mode, expected);
  }
  checks.push('All four omitted native drawing modes are available in the FigFox toolbar');
  await page.getByRole('button', { name: '更多绘图工具' }).click();
  await page.getByRole('button', { name: '星形', exact: true }).click();
  await input('星角数', 7);
  const coords = await frame.locator('#svgcontent').evaluate(el => {
    const m = el.getScreenCTM(), rect = window.frameElement.getBoundingClientRect();
    return [[350, 300], [450, 390]].map(([x, y]) => { const p = new DOMPoint(x, y).matrixTransform(m); return { x: p.x + rect.x, y: p.y + rect.y }; });
  });
  await page.mouse.move(coords[0].x, coords[0].y); await page.mouse.down(); await page.mouse.move(coords[1].x, coords[1].y, { steps: 8 }); await page.mouse.up();
  await frame.locator('polygon[shape="star"]').waitFor();
  await page.getByRole('button', { name: '选择 (V)', exact: true }).click();
  await frame.locator('polygon[shape="star"]').click();
  const star = frame.locator('polygon[shape="star"]');
  assert.equal(await star.getAttribute('point'), '7');
  const originalPoints = await star.getAttribute('points');
  await input('内外径比例', 4);
  assert.notEqual(await star.getAttribute('points'), originalPoints);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  assert.equal(await star.getAttribute('points'), originalPoints);
  await page.getByRole('button', { name: '重做', exact: true }).click();
  await star.click();
  checks.push('Star creation uses the chosen point count; radius edits change geometry with one undo/redo');
  await input('对象链接', 'https://example.org/figure');
  await page.getByLabel('选择方式').selectOption('group');
  await frame.locator('#box').click({ position: { x: 12, y: 12 } });
  await input('组名称', 'Editable module');
  assert.equal(await frame.locator('#module > title').textContent(), 'Editable module');
  checks.push('Hyperlinks and group titles are editable in the FigFox inspector');
  await page.getByRole('tab', { name: '页面', exact: true }).click();
  await input('文档标题', 'FigFox parity');
  await page.getByLabel('显示标尺', { exact: true }).check();
  await page.waitForFunction(() => window.state?.nativeControls?.rulers === true);
  assert.equal(await frame.locator('#ruler_x').isVisible(), true);
  assert.equal(await frame.locator('#ruler_y').isVisible(), true);
  await page.getByLabel('显示标尺', { exact: true }).click();
  await page.waitForFunction(() => window.state?.nativeControls?.rulers === false);
  assert.equal(await page.getByLabel('显示标尺', { exact: true }).isChecked(), false);
  checks.push('Document title and real horizontal/vertical rulers are available without changing layouts');
  for (const format of ['WEBP', 'BMP', 'PDF']) {
    const file = await download(format, 'export.' + format.toLowerCase());
    if (format === 'WEBP') { assert.equal(file.bytes.subarray(8, 12).toString(), 'WEBP'); assert.ok(file.filename.endsWith('.webp')); }
    if (format === 'BMP') assert.equal(file.bytes.subarray(0, 2).toString(), 'BM');
    if (format === 'PDF') assert.equal(file.bytes.subarray(0, 5).toString(), '%PDF-');
  }
  checks.push('WEBP, BMP and PDF downloads have the expected real file signatures');
  const exported = (await download('导出 SVG', 'edited-copy.svg')).bytes;
  await page.locator('input[type=file]').first().setInputFiles({ name: 'reopened-copy.svg', mimeType: 'image/svg+xml', buffer: exported });
  await page.waitForFunction(() => document.querySelector('.ff-editor-stage')?.dataset.ready === 'true');
  await frame.locator('polygon[shape="star"]').waitFor();
  assert.equal(await frame.locator('polygon[shape="star"]').getAttribute('starRadiusMultiplier'), '4');
  assert.equal(await frame.locator('polygon[shape="star"]').getAttribute('point'), '7');
  assert.equal(await frame.locator('#module > title').textContent(), 'Editable module');
  assert.ok(await frame.locator('#svgcontent a:has(polygon[shape="star"])').evaluate(el => (el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href')) === 'https://example.org/figure'));
  checks.push('Saved SVG reopens with star parameters, hyperlink and group title intact');
  await page.getByRole('tab', { name: '属性', exact: true }).click();
  await page.getByLabel('选择方式').selectOption('object');
  await frame.locator('polygon[shape="star"]').click();
  await input('内外径比例', 2);
  assert.ok(await frame.locator('polygon[shape="star"]').evaluate(el => el.getBBox().width > 10));
  checks.push('Reopened parametric shapes remain editable without collapsing');
  await page.getByLabel('起点', { exact: true }).selectOption('leftarrow_o');
  await page.waitForFunction(() => document.querySelector('iframe').contentDocument.querySelector('polygon[shape="star"]').hasAttribute('marker-start'));
  assert.equal(await page.getByLabel('起点', { exact: true }).locator('option:not([disabled])').count(), 9);
  checks.push('All eight native marker shapes and None are exposed, including open arrows');
  await page.getByLabel('插入 SVG 文件', { exact: true }).setInputFiles({ name: 'insert.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#6243ce"/></svg>') });
  await frame.locator('#svgcontent use').waitFor();
  await page.getByRole('button', { name: '解除引用，独立编辑', exact: true }).click();
  await frame.locator('#svgcontent g.layer rect[fill="#6243ce"]').waitFor();
  assert.equal(await frame.locator('#box').count(), 1);
  checks.push('Inserting another SVG keeps the current drawing and can be unlinked for object editing');
  await page.screenshot({ path: output + '/desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: output + '/mobile.png' });
  assert.deepEqual(errors, []);
} finally {
  await writeFile(output + '/checks.json', JSON.stringify({ checks, errors }, null, 2));
  await page.screenshot({ path: output + '/last-state.png' });
  await browser.close();
}
console.log(JSON.stringify({ checks, errors }, null, 2));
