import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5173';
const out = process.env.AUDIT_OUTPUT || '.review/editor-parity-repair';
await mkdir(out, { recursive: true });
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const sample = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800" height="600"><defs><radialGradient id="rad" cx="25%" cy="35%" r="30%" fx="10%" fy="20%" spreadMethod="reflect" gradientTransform="rotate(30 .25 .35) scale(1 .5)"><stop offset="0" stop-color="#ff0000"/><stop offset="1" stop-color="#0000ff"/></radialGradient></defs><rect id="gradient" x="60" y="80" width="220" height="160" fill="url(#rad)"/><rect id="plain" x="400" y="80" width="160" height="120" fill="#6243ce"/><path id="curve" d="M80 400 C150 300 220 300 300 400 C380 500 440 500 520 400" stroke="#222222" fill="none" stroke-width="3"/><image id="photo" x="600" y="80" width="80" height="80" xlink:href="data:image/png;base64,${png}"/><polygon id="poly" shape="regularPoly" sides="4" points="550,250 500,300 450,250 500,200" fill="#f4b942"/></svg>`;
await writeFile(out + '/input-copy.svg', sample);
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
const page = await context.newPage(); page.setDefaultTimeout(15000);
const checks = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => { localStorage.setItem('autodraftman-language', 'zh'); window.addEventListener('message', e => { if (e.data?.source === 'figfox-svgedit' && e.data.type === 'state') window.repairState = { ...window.repairState, ...e.data.state }; }); });
const frame = page.frameLocator('iframe');
const cmd = (name, value) => page.evaluate(([n, v]) => document.querySelector('iframe').contentWindow.figfoxCommand(n, v), [name, value]);
const inspect = fn => frame.locator('body').evaluate(fn);
const ready = () => page.waitForFunction(() => document.querySelector('.ff-editor-stage')?.dataset.ready === 'true' && !document.querySelector('.product-editor-route-content')?.inert && document.querySelector('iframe')?.contentWindow?.svgEditor?.svgCanvas?.getSvgContent()?.querySelector('#plain'));
const open = async (markup = sample, name = 'repair-copy.svg') => { await page.locator('input[type=file]').first().setInputFiles({ name, mimeType: 'image/svg+xml', buffer: Buffer.from(markup) }); await page.waitForFunction(name => document.querySelector('.product-editor-title strong')?.textContent === name, name); await ready(); };
const select = async id => { await cmd('select-layer', id); await page.waitForFunction(id => window.repairState?.selectedIds?.includes(id), id); };
const shot = name => page.screenshot({ path: `${out}/${name}.png` });
const number = async (root, name, value) => { const input = root.getByRole('spinbutton', { name, exact: true }); await input.fill(String(value)); await input.press('Enter'); };
const download = async name => { const pending = page.waitForEvent('download'); await page.getByRole('button', { name: '导出 SVG', exact: true }).click(); await (await pending).saveAs(`${out}/${name}`); return readFile(`${out}/${name}`, 'utf8'); };
const check = async (name, action) => {
  if (process.env.AUDIT_CASES && !process.env.AUDIT_CASES.split(',').includes(name)) return;
  try { await open(sample, `${name}-copy.svg`); await action(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: error.stack }); await shot(name + '-failure'); }
  await writeFile(out + '/results.json', JSON.stringify({ browser: browser.version(), checks, errors }, null, 2));
};
try {
  await page.goto(base + '/editor');
  await check('picker-assets', async () => {
    const files = await readdir('public/svgedit/components/jgraduate/images');
    for (const file of files) { const response = await context.request.get(`${base}/svgedit/components/jgraduate/images/${file}`); assert.equal(response.status(), 200, file); assert.ok((await response.body()).length); }
    await page.evaluate(async urls => { await Promise.all(urls.map(src => { const image = new Image(); image.src = src; return image.decode(); })); }, files.map(file => `${base}/svgedit/components/jgraduate/images/${file}`));
  });
  await check('units', async () => {
    await cmd('document-settings', { w: 800, h: 600, unit: 'mm', snap: false, snapStep: 10 }); await select('plain');
    const width = page.locator('.ff-inspector-length').filter({ has: page.locator('span', { hasText: /^W$/ }) }).locator('input');
    assert.ok(Math.abs(Number(await width.inputValue()) - 160 * 25.4 / 96) < .001);
    await cmd('native-ui', true); assert.ok(Math.abs(Number(await frame.locator('#rect_width').evaluate(el => el.value)) - 160 * 25.4 / 96) < .01); await cmd('native-ui', false);
    await width.fill('2cm'); await width.press('Enter');
    await page.waitForFunction(() => Math.abs(window.repairState.selection.width - 96 / 2.54 * 2) < .01);

  });
  await check('path-state', async () => {
    await select('curve'); await page.getByRole('button', { name: '编辑节点', exact: true }).click();
    const link = page.getByRole('button', { name: '链接控制点', exact: true });
    const before = await inspect(() => window.svgEditor.svgCanvas.getLinkControlPts());
    assert.equal(await link.getAttribute('aria-pressed'), String(before));
    await link.click(); assert.equal(await inspect(() => window.svgEditor.svgCanvas.getLinkControlPts()), !before);
    assert.equal(await frame.locator('#tool_node_link').evaluate(el => el.pressed), !before);
    await link.click(); assert.equal(await inspect(() => window.svgEditor.svgCanvas.getLinkControlPts()), before);
    const subpath = page.getByRole('button', { name: '添加子路径', exact: true }); await subpath.click(); await page.waitForFunction(() => window.repairState.nativeControls.addingSubPath === true); assert.equal(await subpath.getAttribute('aria-pressed'), 'true'); await subpath.click(); await page.waitForFunction(() => window.repairState.nativeControls.addingSubPath === false); assert.equal(await subpath.getAttribute('aria-pressed'), 'false');
  });
  await check('preferences', async () => {
    await cmd('editor-preferences', { baseUnit: 'cm', bkgd_color: '#888888', gridColor: '#aa2277', showRulers: true, showGrid: true, gridSnapping: true, snappingStep: 12 });
    await download('preferences-copy.svg'); await page.reload(); await ready();
    const prefs = await inspect(() => ({ unit: window.svgEditor.configObj.curConfig.baseUnit, color: window.svgEditor.configObj.pref('bkgd_color'), grid: window.svgEditor.configObj.curConfig.gridColor, rulers: window.svgEditor.configObj.curConfig.showRulers, snap: window.svgEditor.configObj.curConfig.gridSnapping }));
    assert.deepEqual(prefs, { unit: 'cm', color: '#888888', grid: '#aa2277', rulers: true, snap: true });
    await cmd('preferences'); await page.getByRole('checkbox', { name: '响应式 SVG 尺寸' }).waitFor(); await shot('page-preferences');
    await cmd('editor-preferences', { baseUnit: 'px', bkgd_color: '#ffffff', showRulers: false, showGrid: false });
    await page.getByRole('tab', { name: '属性', exact: true }).click();
  });
  await check('dynamic-export', async () => {
    await cmd('document-settings', { w: 800, h: 600, unit: 'px', snap: false, snapStep: 10, dynamic: true, images: 'embed' });
    const svg = await download('dynamic-copy.svg'); const root = svg.match(/<svg[^>]*>/)[0]; assert.ok(root.includes('viewBox=')); assert.ok(!/\s(?:width|height)=/.test(root));
    await open(svg, 'dynamic-reopened.svg'); assert.equal(await inspect(() => window.svgEditor.configObj.curConfig.dynamicOutput), true);
    await page.getByRole('button', { name: '编辑', exact: true }).click(); await page.getByRole('button', { name: '查看源码', exact: true }).click();
    const source = page.locator('.ff-source-dialog'); assert.ok(!/\s(?:width|height)=/.test((await source.locator('textarea').inputValue()).match(/<svg[^>]*>/)[0]));
    await source.getByRole('checkbox', { name: '响应式 SVG 尺寸' }).uncheck(); await source.getByRole('button', { name: '应用修改', exact: true }).click(); await ready();
    assert.equal(await inspect(() => window.svgEditor.configObj.curConfig.dynamicOutput), false);
  });
  await check('images', async () => {
    const url = `${base}/repair-pixel.png`; await context.route(url, route => route.fulfill({ contentType: 'image/png', body: Buffer.from(png, 'base64') }));
    await select('photo'); await cmd('native-ui', true);
    const input = frame.locator('#image_url').locator('input'); await input.fill(url); await input.press('Tab');
    await page.waitForFunction(url => document.querySelector('iframe').contentWindow.svgEditor.svgCanvas.getHref(document.querySelector('iframe').contentDocument.getElementById('photo')) === url, url);
    await cmd('native-ui', false);
    const svg = await download('embedded-copy.svg'); assert.ok(!svg.match(/<image[^>]*>/)[0].includes('repair-pixel')); assert.ok(svg.match(/<image[^>]*>/)[0].includes('data:image/png;base64,'));
    await open(svg, 'embedded-reopened.svg'); assert.ok((await inspect(() => window.svgEditor.svgCanvas.getHref(document.getElementById('photo')))).startsWith('data:image/png;base64,'));
    const linked = sample.replace(`data:image/png;base64,${png}`, url).replace('<svg ', '<svg data-figfox-images="ref" ');
    await open(linked, 'linked-copy.svg'); const reference = await download('linked-export.svg'); await open(reference, 'linked-reopened.svg'); assert.equal(await inspect(() => window.svgEditor.svgCanvas.getHref(document.getElementById('photo'))), url);
  });
  await check('gradient', async () => {
    await select('gradient'); await cmd('native-ui', true); await frame.locator('#fill_color').locator('#picker').click();
    const dialog = page.locator('.ff-paint-dialog'); await dialog.waitFor();
    assert.equal(await dialog.getByRole('combobox', { name: '边缘延展' }).inputValue(), 'reflect');
    assert.ok(Math.abs(Number(await dialog.getByRole('spinbutton', { name: '椭圆比例' }).inputValue()) - .5) < .001);
    assert.ok(Math.abs(Number(await dialog.getByRole('spinbutton', { name: '角度 °' }).inputValue()) - 30) < .001);
    await dialog.getByRole('combobox', { name: '边缘延展' }).selectOption('repeat');
    await number(dialog, '椭圆比例', .7); await number(dialog, '角度 °', 60);
    await dialog.getByRole('checkbox', { name: '焦点跟随圆心' }).check();
    const handle = dialog.getByRole('slider', { name: 'cx, cy', exact: true }); await handle.focus(); await handle.press('ArrowRight');
    const beforeDrag = await handle.getAttribute('aria-valuetext'), handleBox = await handle.boundingBox(); await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2); await page.mouse.down(); await page.mouse.move(handleBox.x + handleBox.width / 2 + 12, handleBox.y + handleBox.height / 2 + 8, { steps: 4 }); await page.mouse.up(); assert.notEqual(await handle.getAttribute('aria-valuetext'), beforeDrag);
    const stop = dialog.getByRole('slider', { name: '拖动色标 1', exact: true }); await stop.focus(); await stop.press('ArrowRight');
    await shot('gradient-desktop');
    await dialog.getByRole('button', { name: '应用', exact: true }).click(); await cmd('native-ui', false);
    const gradient = await inspect(() => { const e = document.getElementById('gradient'), id = e.getAttribute('fill').match(/#([^)]*)/)[1]; return document.getElementById(id).outerHTML; });
    assert.ok(gradient.includes('spreadMethod="repeat"')); assert.ok(!gradient.includes(' fx=')); assert.ok(gradient.includes('offset="0.01"')); assert.ok(gradient.includes('gradientTransform="matrix('));
    const svg = await download('gradient-copy.svg'); await open(svg, 'gradient-reopened.svg'); assert.ok((await inspect(() => window.figfoxSnapshot())).includes('spreadMethod="repeat"'));
  });
  await check('advanced-color', async () => {
    await select('plain'); await page.getByRole('button', { name: /^填充:/ }).click(); const panel = page.locator('.ff-editor-palette-popover');
    await number(panel, 'H', 120); await number(panel, 'S', 100); await number(panel, 'V', 100); assert.equal(await panel.getByRole('textbox', { name: 'HEX', exact: true }).inputValue(), '#00ff00');
    for (const axis of ['S', 'V', 'R', 'G', 'B', 'A']) { await panel.getByRole('button', { name: axis, exact: true }).click(); await panel.locator('.ff-color-plane').focus(); await panel.locator('.ff-color-plane').press('ArrowRight'); }
    await panel.getByRole('button', { name: '原色 · 恢复', exact: true }).click(); assert.equal(await panel.getByRole('textbox', { name: 'HEX', exact: true }).inputValue(), '#6243ce');
    await panel.locator('summary').click(); assert.equal(await panel.getByRole('option').count(), 42); await shot('color-desktop'); await panel.getByRole('button', { name: '取消', exact: true }).click();
  });
  await check('inherited-gradient', async () => {
    const inherited = sample.replace('</defs>', '<radialGradient id="linked" xlink:href="#rad" cy="40%"/></defs>').replace('fill="url(#rad)"', 'fill="url(#linked)"');
    await open(inherited, 'inherited-copy.svg'); await select('gradient');
    await page.getByRole('button', { name: /^填充:/ }).click(); await page.getByRole('button', { name: '渐变与透明度', exact: true }).click();
    const dialog = page.locator('.ff-paint-dialog'); assert.equal(await dialog.getByRole('combobox', { name: '边缘延展' }).inputValue(), 'reflect');
    await dialog.getByRole('button', { name: '应用', exact: true }).click();
    const svg = await download('inherited-edited.svg'); await open(svg, 'inherited-reopened.svg');
    const gradient = await inspect(() => { const id = document.getElementById('gradient').getAttribute('fill').match(/#([^)]*)/)[1]; const el = document.getElementById(id); return { cx: el.getAttribute('cx'), cy: el.getAttribute('cy'), r: el.getAttribute('r'), spread: el.getAttribute('spreadMethod'), transform: el.getAttribute('gradientTransform'), stops: el.querySelectorAll('stop').length }; });
    assert.deepEqual(gradient, { cx: '25%', cy: '40%', r: '30%', spread: 'reflect', transform: 'rotate(30 .25 .35) scale(1 .5)', stops: 2 });
  });
  await check('shapes', async () => {
    await select('poly'); for (const count of [1, 2, 129]) { await cmd('shape-parameter', { name: 'sides', value: count }); const polygon = await frame.locator('#poly').evaluate(el => ({ sides: Number(el.getAttribute('sides')), count: el.points.numberOfItems, points: el.getAttribute('points') })); assert.equal(polygon.sides, count); assert.equal(polygon.count, count); assert.ok(!/NaN|Infinity/.test(polygon.points)); }
    const start = await frame.locator('#poly').evaluate(el => { const points = [...el.points]; return { x: points.reduce((s,p) => s+p.x,0)/points.length, y: points.reduce((s,p) => s+p.y,0)/points.length }; });
    await inspect(() => { const canvas = window.svgEditor.svgCanvas; canvas.moveSelectedElements(35 * canvas.getZoom(), 25 * canvas.getZoom(), false); });
    await cmd('shape-parameter', { name: 'sides', value: 1 });
    const svg = await download('shape-copy.svg'); await open(svg, 'shape-reopened.svg'); await select('poly'); await cmd('shape-parameter', { name: 'sides', value: 4 });
    const center = await frame.locator('#poly').evaluate(el => { const points = [...el.points]; return { x: points.reduce((s,p) => s+p.x,0)/points.length, y: points.reduce((s,p) => s+p.y,0)/points.length }; });
    assert.ok(Math.abs(center.x - start.x - 35) < .01); assert.ok(Math.abs(center.y - start.y - 25) < .01);
  });
  await check('large-reopen', async () => {
    const large = sample.replace('</svg>', `<!--${'x'.repeat(5 * 1024 * 1024)}--></svg>`); await open(large, 'over-5mb-copy.svg');
    // Keep a >5 MB payload through the export path, not just the input parser.
    await inspect(() => document.getElementById('plain').setAttribute('data-roundtrip', 'x'.repeat(5 * 1024 * 1024)));
    const svg = await download('over-5mb-export.svg'); assert.ok(Buffer.byteLength(svg) > 5 * 1024 * 1024); await open(svg, 'over-5mb-reopened.svg'); assert.equal(await frame.locator('#plain').getAttribute('width'), '160');
  });
  await check('file-save', async () => {
    // Real browser FileSystemFileHandles from OPFS exercise the write/close and
    // IndexedDB structured-clone paths. Native OS dialog selection is not automated.
    await page.evaluate(async () => { const dir = await navigator.storage.getDirectory(); window.saveHandles = await Promise.all(['first.svg', 'second.svg'].map(name => dir.getFileHandle(name, { create: true }))); window.saveCalls = 0; window.showOpenFilePicker = async () => []; window.showSaveFilePicker = async () => window.saveHandles[window.saveCalls++]; });
    const save = async label => { await page.getByRole('button', { name: '文件保存', exact: true }).click(); await page.getByRole('button', { name: label, exact: false }).click(); await page.waitForFunction(() => document.querySelector('.product-editor-title span')?.textContent.includes('已保存到文件')); };
    await save('另存为'); await cmd('attribute', { name: 'fill', value: '#112233', targetId: 'plain' }); await select('plain'); await cmd('fill', '#112233'); await save('保存到文件');
    assert.ok((await page.evaluate(async () => (await window.saveHandles[0].getFile()).text())).includes('#112233'));
    await save('另存为'); assert.equal(await page.evaluate(() => window.saveCalls), 2);
    assert.ok((await page.evaluate(async () => (await window.saveHandles[1].getFile()).text())).includes('#112233'));
    await page.reload(); await ready(); await select('plain'); await cmd('fill', '#223344'); await save('保存到文件');
    assert.ok((await page.evaluate(async () => (await (await navigator.storage.getDirectory()).getFileHandle('second.svg')).getFile().then(file => file.text()))).includes('#223344'));
  });
  await check('embedding-failure', async () => {
    const url = `${base}/blocked-image.png`; await context.route(url, route => route.fulfill({ status: 403, body: '' }));
    await open(sample.replace(`data:image/png;base64,${png}`, url), 'unavailable-image-copy.svg');
    await page.getByRole('button', { name: '导出 SVG', exact: true }).click(); await page.getByRole('alert').filter({ hasText: '无法嵌入图片' }).waitFor();
    assert.equal(await frame.locator('#plain').count(), 1);
  });
  await check('ui-layout', async () => {
    await select('plain'); await shot('editor-desktop');
    await page.setViewportSize({ width: 320, height: 740 }); await page.getByRole('button', { name: '打开属性面板', exact: true }).click(); await select('gradient');
    await page.getByRole('button', { name: /^填充:/ }).click(); await page.getByRole('button', { name: '渐变与透明度', exact: true }).click();
    const dialog = page.locator('.ff-paint-dialog'); await dialog.waitFor(); await shot('gradient-mobile');
    assert.ok(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1));
    await dialog.getByRole('button', { name: '取消', exact: true }).click();
    await page.getByRole('tab', { name: '页面', exact: true }).click(); await shot('page-mobile');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.setViewportSize({ width: 1440, height: 1000 }); await page.getByRole('button', { name: 'Switch to English', exact: true }).click(); await ready(); await shot('editor-english');
  });
} finally { await writeFile(out + '/results.json', JSON.stringify({ browser: browser.version(), checks, errors }, null, 2)); await browser.close(); }
console.log(JSON.stringify({ checks, errors }, null, 2));
assert.ok(checks.every(check => check.passed) && !errors.length, 'Parity repairs must pass all targeted checks');
