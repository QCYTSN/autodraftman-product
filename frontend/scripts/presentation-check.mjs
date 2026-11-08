import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(root);
const output = path.join(root, '.review/presentation');
await mkdir(output, { recursive: true });
const cues = ['overview', 'assets', 'draft', 'issue-map', 'evidence', 'plan', 'repair', 'edit'];
const checks = [], errors = [], servers = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function serve(mode, port) {
  const args = [path.join(root, 'node_modules/vite/bin/vite.js')];
  if (mode === 'pages') args.push('preview', '--mode', 'github-pages');
  args.push('--host', '127.0.0.1', '--port', String(port), '--strictPort');
  const child = spawn(process.execPath, args, { cwd: root, stdio: 'pipe', windowsHide: true });
  servers.push(child);
  let stderr = ''; child.stderr.on('data', data => { stderr += data; });
  const base = 'http://127.0.0.1:' + port + (mode === 'pages' ? '/figfox' : '');
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error('Server exited: ' + stderr);
    try { if ((await fetch(base + '/presentation')).ok) return base; } catch {}
    await pause(100);
  }
  throw new Error('Server timed out: ' + stderr);
}
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
async function opened(context, url, online = true) {
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  if (online) await page.getByRole('button', { name: '开始讲解', exact: true }).click();
  await page.locator('.ffp-canvas').waitFor();
  await pause(750);
  return page;
}
async function go(page, cue) {
  await pause(260);
  await page.locator('[data-cue-button="' + cue + '"]').click();
  await page.waitForFunction(cue => document.querySelector('.ffp-canvas')?.getAttribute('data-cue') === cue, cue);
  await pause(750);
}
async function cueIs(page, expected) { assert.equal(await page.locator('.ffp-canvas').getAttribute('data-cue'), expected); }
async function layout(page) {
  return page.evaluate(() => {
    const scale = Number(document.querySelector('.ffp-canvas').dataset.scale);
    const issues = [];
    const pane = document.querySelector('.ffp-evidence-panel').getBoundingClientRect();
    for (const child of document.querySelector('.ffp-evidence-panel').children) {
      const box = child.getBoundingClientRect();
      if (box.bottom > pane.bottom - 14 * scale || box.right > pane.right - 14 * scale) issues.push('Panel overflow: ' + child.className + ' ' + child.textContent);
    }
    for (const el of document.querySelectorAll('.ffp-host button,.ffp-host input,.ffp-main h1,.ffp-evidence-panel h2')) {
      if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) issues.push('Text overflow: ' + el.textContent);
    }
    const h2 = document.querySelector('.ffp-evidence-panel h2');
    if (h2.getBoundingClientRect().height / scale > 133) issues.push('Conclusion exceeds 3 lines: ' + h2.textContent);
    if (document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight) issues.push('Page scrollbars');
    return issues;
  });
}
try {
  const base = process.env.AUDIT_BASE_URL || await serve('pages', 5196);
  const dev = await serve('dev', 5197);
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true });
  const requests = [];
  context.on('request', request => requests.push(request.url()));
  const page = await opened(context, base + '/presentation');
  for (let i = 1; i < 8; i++) { await page.keyboard.press('ArrowRight'); await pause(280); await cueIs(page, cues[i]); }
  await page.keyboard.press('ArrowRight'); await cueIs(page, 'edit');
  for (let i = 6; i >= 0; i--) { await pause(260); await page.keyboard.press('ArrowLeft'); await cueIs(page, cues[i]); }
  checks.push('Seven forward steps, bounded final state, seven reverse steps');
  await pause(300); await page.keyboard.press('1'); await pause(300); await cueIs(page, 'assets');
  await page.keyboard.press('2'); await pause(300); await cueIs(page, 'issue-map');
  await page.keyboard.press('3'); await pause(300); await cueIs(page, 'plan');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowLeft'); await cueIs(page, 'evidence');
  await pause(270); await page.keyboard.press('ArrowRight'); await cueIs(page, 'plan');
  checks.push('Stage hotkeys, navigation throttle and interrupted transitions');
  await go(page, 'assets');
  for (const asset of ['point-cloud', 'vehicle', 'graph']) {
    await page.locator('[data-asset="' + asset + '"]').click();
    assert.equal(await page.locator('.ffp-region.is-active').getAttribute('data-region'), asset);
  }
  checks.push('All three illustrative assets map to their own source regions');
  await go(page, 'issue-map');
  const issueHit = await page.getByRole('button', { name: 'B1', exact: true }).locator('rect').first().boundingBox();
  assert(issueHit.width >= 48 && issueHit.height >= 36);
  for (const issue of ['B2', 'D1']) {
    await page.getByRole('button', { name: issue, exact: true }).click();
    assert((await page.locator('.ffp-evidence-panel').innerText()).includes(issue));
    await page.getByRole('button', { name: '查看原图证据' }).click();
    await pause(750);
    assert((await page.locator('.ffp-evidence-panel').innerText()).includes(issue));
    await go(page, 'issue-map');
  }
  await page.getByRole('button', { name: 'D1', exact: true }).click();
  await page.locator('[data-action="next"]').click(); await pause(750);
  assert((await page.locator('.ffp-evidence-panel').innerText()).includes('B1'));
  const cameras = await page.locator('.ffp-evidence-pair svg.ffp-document-viewport').evaluateAll(nodes => nodes.map(n => n.getAttribute('data-camera').split(' ').map(Number)));
  assert.equal(cameras[0][2], cameras[1][2]); assert.equal(cameras[0][3], cameras[1][3]); assert.notDeepEqual(cameras[0].slice(0, 2), cameras[1].slice(0, 2));
  await page.getByRole('button', { name: '查看完整图' }).click();
  await page.getByRole('button', { name: '返回局部' }).click();
  checks.push('B2/D1 evidence, fixed B1 main route, independently located equal-scale ROIs');
  await go(page, 'plan');
  assert((await page.locator('.ffp-plan-leader path').getAttribute('d')).length > 10, 'Initial target leader exists');
  await page.locator('[data-plan-target="feature_dots_top"]').click();
  assert.equal(await page.locator('[data-target="feature_dots_top"]').getAttribute('stroke-width'), '2.5');
  await page.getByRole('button', { name: '按需辅助：Gap Guidance' }).click();
  assert((await page.getByRole('dialog').innerText()).includes('当前材料未记录'));
  await page.keyboard.press('Escape'); await cueIs(page, 'plan');
  assert.equal(await page.getByRole('dialog').count(), 0);
  checks.push('Real plan targets, guidance provenance and Escape restoration');
  await go(page, 'repair');
  await page.getByRole('button', { name: '仅修改前', exact: true }).click();
  await page.keyboard.press('b'); assert.equal(await page.getByRole('button', { name: '仅修复后', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: '前后对照', exact: true }).click();
  assert.equal(await page.locator('.ffp-repair-pair figure').count(), 2);
  assert.deepEqual(await page.locator('.ffp-repair-pair figcaption').allTextContents(), ['该事务执行前', '该事务执行后']);
  checks.push('All repair views and B shortcut; transaction label');
  await go(page, 'edit');
  await page.getByRole('button', { name: '选中标签', exact: true }).last().click();
  await page.getByRole('button', { name: '填入示例文字' }).click();
  await page.getByLabel('标签文字（最多 40 字）').press('Enter');
  assert((await page.locator('.ffp-edit-preview').innerText()).includes('Demo Pooling'));
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载修改后的 SVG' }).click();
  const download = await downloadEvent, svg = await readFile(await download.path(), 'utf8');
  assert.equal(download.suggestedFilename(), 'FigFox-sample-0001-edited.svg');
  assert(svg.includes('Demo Pooling')); assert(!svg.includes('ffp-observation-layer')); assert(!svg.includes('data-original-id'));
  await writeFile(path.join(output, download.suggestedFilename()), svg);
  const parsed = await page.evaluate(async svg => {
    const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
    const ids = new Set([...doc.querySelectorAll('[id]')].map(n => n.id));
    const refs = [...svg.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1]);
    const image = new Image(); image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); await image.decode();
    return { valid: !doc.querySelector('parsererror'), refs: refs.every(id => ids.has(id)), attributes: Object.fromEntries([...doc.getElementById('plus_node_49').attributes].map(a => [a.name, a.value])) };
  }, svg);
  assert(parsed.valid && parsed.refs); assert.equal(parsed.attributes.x, '636'); assert.equal(parsed.attributes.y, '118');
  await page.getByLabel('标签文字（最多 40 字）').fill('Focus');
  await page.getByLabel('标签文字（最多 40 字）').press('Space');
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('n'); await cueIs(page, 'edit');
  assert.equal(await page.getByRole('dialog').count(), 0);
  await page.getByRole('button', { name: 'Switch to English' }).click();
  assert((await page.locator('.ffp-edit-preview').innerText()).includes('Demo Pooling'));
  await page.getByRole('button', { name: '切换中文' }).click();
  await go(page, 'overview'); await go(page, 'edit');
  assert((await page.locator('.ffp-edit-preview').innerText()).includes('Demo Pooling'));
  await page.getByRole('button', { name: '恢复原文' }).click();
  assert((await page.locator('.ffp-edit-preview').innerText()).includes('Global Pooling'));
  checks.push('Actual text-node edit, export parsing/rendering/references, input semantics, language and navigation persistence, restore');
  for (const drawer of ['讲稿', '帮助']) {
    await page.getByRole('button', { name: drawer, exact: true }).click();
    await page.keyboard.press('Escape'); await cueIs(page, 'edit');
  }
  await page.getByRole('button', { name: '帮助', exact: true }).click();
  await page.getByRole('button', { name: '重置演示' }).click(); await cueIs(page, 'overview');
  checks.push('Speaker notes, help and whole-demo reset');

  const layoutIssues = [];
  for (const viewport of [{ width: 1600, height: 900 }, { width: 1366, height: 768 }, { width: 1920, height: 1080 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    for (const cue of cues) {
      await go(page, cue);
      const findings = await layout(page);
      layoutIssues.push(...findings.map(f => ({ viewport, cue, language: 'zh', finding: f })));
      if ([1600, 1366].includes(viewport.width)) await page.screenshot({ path: path.join(output, viewport.width + 'x' + viewport.height + '-' + cue + '.png') });
    }
  }
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.getByRole('button', { name: 'Switch to English' }).click();
  for (const cue of cues) {
    await go(page, cue);
    layoutIssues.push(...(await layout(page)).map(f => ({ cue, language: 'en', finding: f })));
    await page.screenshot({ path: path.join(output, 'en-' + cue + '.png') });
  }
  await writeFile(path.join(output, 'layout.json'), JSON.stringify(layoutIssues, null, 2));
  assert.deepEqual(layoutIssues, [], 'Layout errors; inspect .review/presentation/layout.json');
  checks.push('Five viewport sizes, 16 Chinese and 8 English state screenshots; layout and three-line conclusions');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const cue of cues) await go(page, cue);
  checks.push('All states with reduced motion');
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await pause(300);
  assert(await page.evaluate(() => Boolean(document.fullscreenElement)));
  await page.getByRole('button', { name: 'Fullscreen', exact: true }).click();
  await pause(300);
  assert.equal(await page.evaluate(() => Boolean(document.fullscreenElement)), false);
  checks.push('Browser fullscreen enter and exit');
  const zoomContext = await chromium.launchPersistentContext(path.join(output, 'zoom-profile'), {
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true, viewport: { width: 1600, height: 900 },
  });
  try {
    const settings = await zoomContext.newPage();
    await settings.goto('chrome://settings/appearance');
    await settings.locator('#zoomLevel').selectOption('1.25');
    const zoomPage = await opened(zoomContext, base + '/presentation');
    assert.deepEqual(await zoomPage.evaluate(() => ({ width: innerWidth, height: innerHeight, dpr: devicePixelRatio })), { width: 1280, height: 720, dpr: 1.25 });
    for (const cue of cues) { await go(zoomPage, cue); assert.deepEqual(await layout(zoomPage), []); }
    await zoomPage.screenshot({ path: path.join(output, 'zoom-125-layout.png') });
  } finally { await zoomContext.close(); }
  checks.push('Native Chrome 125% zoom selected in browser settings; all eight states');
  await page.reload(); await page.getByRole('button', { name: '开始讲解', exact: true }).click(); await page.locator('.ffp-canvas').waitFor();
  assert(!requests.some(url => /\/api\/|session|auth\/|reconstruct/i.test(url)));
  assert(!requests.some(url => /\.woff2?(?:$|\?)/i.test(url)));
  checks.push('Pages deep-link refresh; no auth, session, generation or font requests');
  const devPage = await opened(context, dev + '/presentation');
  await devPage.reload(); await devPage.getByRole('button', { name: '开始讲解', exact: true }).click(); await devPage.locator('.ffp-canvas').waitFor();
  checks.push('Development /presentation and refresh');
  for (const entry of [base, dev]) {
    const response = await fetch(entry + '/presentation-downloads/FigFox-Architecture-Demo.html');
    assert(response.ok);
    assert.equal(await response.text(), await readFile(path.join(root, 'presentation-dist/FigFox-Architecture-Demo.html'), 'utf8'));
  }
  checks.push('Online offline-download links return the exact standalone file in dev and Pages');
  const svgHelpers = await devPage.evaluate(async () => {
    const { cleanSvg, instanceSvg, editedSvg, targetBox } = await import('/src/features/presentation/svg.ts');
    const raw = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><defs><marker id="arrow"><path d="M0 0L5 5"/></marker><clipPath id="crop"><rect width="50" height="50"/></clipPath></defs><g transform="translate(50 60) rotate(30)"><text id="label" x="0" y="0" style="fill:red">one<tspan x="4" dy="20">two</tspan></text><rect id="box" x="0" y="0" width="30" height="20"/></g><path id="path" d="M0 0L30 30" marker-end="url(#arrow)" clip-path="url(#crop)"/><use href="#path"/><image href="https://example.invalid/image.png" onload="alert(1)"/><script>alert(1)</script></svg>';
    const clean = cleanSvg(raw), instance = instanceSvg(clean, 'test-instance');
    const changed = editedSvg(clean, { elementId: 'label', textNodePath: [1, 0] }, 'changed');
    const document = new DOMParser().parseFromString(changed, 'image/svg+xml');
    const mount = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mount.setAttribute('viewBox', '0 0 300 200'); mount.style.width = '300px'; mount.style.height = '200px';
    mount.innerHTML = '<g id="test-instance-document">' + instance.html + '</g>'; window.document.body.append(mount);
    const box = targetBox(mount.querySelector('#test-instance-box'), mount.querySelector('#test-instance-document'));
    mount.remove();
    return { one: document.getElementById('label').firstChild.nodeValue, two: document.querySelector('tspan').textContent, attrs: document.querySelector('tspan').getAttribute('dy'),
      safe: !clean.includes('https://') && !clean.includes('<script') && !clean.includes('onload'),
      references: instance.html.includes('url(#test-instance-arrow)') && instance.html.includes('href="#test-instance-path"'),
      box };
  });
  assert(svgHelpers.safe && svgHelpers.references);
  assert.deepEqual([svgHelpers.one, svgHelpers.two, svgHelpers.attrs], ['one', 'changed', '20']);
  assert(Math.abs(svgHelpers.box[0] - 40) < .01 && Math.abs(svgHelpers.box[1] - 60) < .01);
  assert(Math.abs(svgHelpers.box[2] - 35.980762) < .01 && Math.abs(svgHelpers.box[3] - 32.320508) < .01);
  checks.push('SVG sanitization, marker/clip/use references, nested tspan preservation and rotated-object bounds');
  const offlineContext = await browser.newContext({ offline: true, viewport: { width: 1600, height: 900 }, acceptDownloads: true });
  const offlineRequests = []; offlineContext.on('request', request => { if (/^https?:/.test(request.url())) offlineRequests.push(request.url()); });
  const offlinePage = await opened(offlineContext, pathToFileURL(path.join(root, 'presentation-dist/FigFox-Architecture-Demo.html')).href, false);
  for (const cue of cues) await go(offlinePage, cue);
  await offlinePage.getByRole('button', { name: '填入示例文字' }).click();
  await offlinePage.getByRole('button', { name: '应用修改' }).click();
  const offlineDownload = offlinePage.waitForEvent('download');
  await offlinePage.getByRole('button', { name: '下载修改后的 SVG' }).click();
  assert((await readFile(await (await offlineDownload).path(), 'utf8')).includes('Demo Pooling'));
  await offlinePage.getByRole('button', { name: 'Switch to English' }).click();
  await offlinePage.screenshot({ path: path.join(output, 'offline-edit.png') });
  assert.deepEqual(offlineRequests, []);
  checks.push('Offline file://, all states, language, actual edit/export, zero HTTP/HTTPS attempts');
  assert.deepEqual(errors, []);
  await writeFile(path.join(output, 'checks.json'), JSON.stringify({ passed: checks, errors, requests, offlineHttpRequests: offlineRequests, browser: await browser.version() }, null, 2));
  console.log(JSON.stringify({ passed: checks.length, errors }, null, 2));
} catch (error) {
  await writeFile(path.join(output, 'failure.json'), JSON.stringify({ passed: checks, errors, failure: String(error) }, null, 2));
  throw error;
} finally {
  await browser.close();
  for (const server of servers) server.kill();
}
