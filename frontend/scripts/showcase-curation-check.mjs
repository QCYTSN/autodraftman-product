import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const base = (process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5183/figfox').replace(/\/$/, '');
const output = '.review/showcase-curation';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const checks = [], errors = [], apiRequests = [];
const hash = value => createHash('sha256').update(value).digest('hex');
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('autodraftman-language', 'zh'));
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.route('**/api/**', route => { apiRequests.push(route.request().url()); return route.abort(); });
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.locator('.demo-canvas-stage').scrollIntoViewIfNeeded();
  await page.locator('.demo-svg-mount > svg').waitFor();
  assert.equal(await page.locator('.demo-case-picker button').count(), 3);
  assert.equal(await page.locator('.demo-evidence').count(), 0);
  const cases = [
    ['study', 'plus_node_34', 'assets/demo/cases/study/result.svg'],
    ['sample-0072', 'title_diffusion', 'assets/research/samples/sample-0072/A.svg'],
    ['sample-0079', 'input_caption', 'assets/research/samples/sample-0079/A.svg'],
  ];
  for (const [i, [id, target, path]] of cases.entries()) {
    const original = await (await page.request.get(base + '/' + path)).body();
    await page.locator('.demo-case-picker button').nth(i).click();
    await page.locator('.demo-svg-mount #' + target).waitFor();
    await page.locator('.demo-object-types button').first().click();
    await page.getByRole('button', { name: '修改选中文字', exact: true }).click();
    await page.getByLabel('修改案例文字', { exact: true }).fill('FigFox editable ' + id);
    await page.getByLabel('修改案例文字', { exact: true }).press('Enter');
    const edited = page.locator('.demo-svg-mount text').filter({ hasText: 'FigFox editable ' + id });
    await edited.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    const before = await edited.boundingBox();
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width / 2 + 24, before.y + before.height / 2 + 14, { steps: 6 });
    await page.mouse.up();
    const after = await edited.boundingBox();
    assert.ok(Math.abs(after.x - before.x - 24) < 2 && Math.abs(after.y - before.y - 14) < 2, id + ' drag ' + JSON.stringify({before, after}));
    await page.getByRole('button', { name: '原图对照', exact: true }).click();
    const range = page.getByLabel('原图与重建结果的分割位置');
    await range.focus(); await range.press('Home'); assert.equal(await range.inputValue(), '0');
    await range.press('End'); assert.equal(await range.inputValue(), '100');
    await range.fill('50');
    await page.getByRole('button', { name: '可编辑 SVG', exact: true }).click();
    assert.equal(await edited.count(), 1);
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: '下载 SVG', exact: true }).click();
    const file = await download;
    await file.saveAs(`${output}/${id}-edited.svg`);
    assert.ok((await readFile(`${output}/${id}-edited.svg`, 'utf8')).includes('FigFox editable ' + id));
    await page.locator('.demo-case-picker button').nth((i + 1) % 3).click();
    await page.locator('.demo-svg-mount #' + cases[(i + 1) % 3][1]).waitFor();
    await page.locator('.demo-case-picker button').nth(i).click();
    await edited.waitFor();
    assert.ok(Math.abs((await edited.boundingBox()).x - after.x) < 2, id + ' retains transform');
    await page.getByRole('button', { name: '恢复案例', exact: true }).click();
    assert.equal(await edited.count(), 0);
    assert.equal(hash(original), hash(await (await page.request.get(base + '/' + path)).body()));
  }
  checks.push('All three actual SVGs: edit, drag, compare, keyboard slider, export, case-local persistence and reset; originals unchanged');
  const vector = await (await page.request.get(base + '/assets/demo/framework-v80.svg')).body();
  assert.equal(hash(vector), 'bf708712b0ad50cf78f0c6b68f0efe11de8fba31a821c9c1a1fe47d0a8fcc55f');
  await page.getByRole('button', { name: '查看完整流程图', exact: true }).click();
  const diagram = page.locator('.demo-diagram-dialog:not(.demo-crop-dialog):not(.demo-refinement-dialog)');
  await diagram.locator('img').evaluate(img => img.decode());
  await diagram.screenshot({ path: output + '/architecture.svg.png' });
  await page.keyboard.press('Escape');
  const pipeline = await (await page.request.get(base + '/assets/research/pipeline-featured.json')).json();
  for (const [file, digest] of [['C', pipeline.receipt.initial_sha256], ['A', pipeline.receipt.final_sha256]]) {
    assert.equal(hash(await (await page.request.get(`${base}/assets/research/samples/${pipeline.sample}/${file}.svg`)).body()), digest);
  }
  await page.locator('.research-stage-tabs button').nth(1).click();
  await page.getByRole('button', { name: '蛋白质细节', exact: true }).waitFor();
  const crop = await page.locator('.pipeline-pair svg[role=img]').first().getAttribute('viewBox');
  await page.locator('.research-stage-tabs button').nth(2).click();
  assert.equal(await page.locator('.pipeline-pair svg[role=img]').first().getAttribute('viewBox'), crop);
  assert.match(await page.locator('.pipeline-stage-footer').innerText(), /5 \/ 5/);
  await page.getByRole('button', { name: '点云细节', exact: true }).click();
  assert.notEqual(await page.locator('.pipeline-pair svg[role=img]').first().getAttribute('viewBox'), crop);
  await page.getByRole('button', { name: '蛋白质细节', exact: true }).click();
  await page.locator('.pipeline-play-button').click();
  await page.waitForFunction(() => document.querySelector('.research-stage-tabs button[aria-pressed=true]')?.textContent.includes('定位差异'));
  await page.waitForTimeout(1200);
  assert.equal(await page.getByRole('button', { name: '蛋白质细节', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.locator('.pipeline-play-button').click();
  assert.equal(await page.locator('.research-pipeline').getAttribute('data-playback'), 'paused');
  await page.locator('.pipeline-play-button').click();
  await page.waitForFunction(() => document.querySelector('.research-pipeline')?.dataset.playback === 'complete', null, { timeout: 20000 });
  checks.push('Supplied vector preserved byte-for-byte; recorded draft/final hashes verified; stable detail, playback, pause and resume');

  for (const scope of ['comparison', 'ablation']) {
    await page.goto(`${base}/#research?sample=sample-0072&metric=D16&scope=${scope}&methods=source,A&view=pair`, { waitUntil: 'networkidle' });
    await page.locator('.research-output-grid article[data-method=A]').waitFor();
    assert.equal(await page.getByLabel('左侧内容', { exact: true }).inputValue(), 'source');
    assert.equal(await page.locator('.research-source').count(), 0);
    const source = page.locator('.research-output-grid article[data-method=source]');
    assert.equal(await source.locator('header span, details').count(), 0);
    const areas = await page.locator('.research-output').evaluateAll(elements => elements.map(e => { const b = e.getBoundingClientRect(); return [b.width, b.height]; }));
    assert.ok(Math.abs(areas[0][0] - areas[1][0]) < 1 && Math.abs(areas[0][1] - areas[1][1]) < 1, JSON.stringify(areas));
    await page.getByLabel('同步缩放', { exact: true }).fill('2');
    await page.getByRole('button', { name: '向右平移', exact: true }).click();
    const transforms = await page.locator('.research-output .research-preview').evaluateAll(es => es.map(e => getComputedStyle(e).transform));
    assert.equal(transforms[0], transforms[1]);
    await page.getByRole('button', { name: '重置视图', exact: true }).click();
    await page.locator('.research-dialog').screenshot({ path: `${output}/${scope}-source-comparison.png` });
    await page.getByLabel('左侧内容', { exact: true }).selectOption(scope === 'comparison' ? 'DrawAI' : 'C');
    await page.getByLabel('右侧内容', { exact: true }).selectOption('source');
    assert.equal(await page.locator('.research-source').count(), 0);
    await page.keyboard.press('Escape');
  }
  checks.push('Source selectable on either side in both scopes; equal viewports, shared zoom/pan, no invented source score and no duplicate thumbnail');

  for (const language of ['zh', 'en']) {
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    if (language === 'en') { await page.getByRole('button', { name: '切换为英文' }).click(); assert.match(await page.locator('h1').innerText(), /Reconstruct/); }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      for (const [name, selector] of [['canvas', '#demo-examples'], ['repair', '.research-pipeline'], ['scores', '.research-score-examples'], ['cost', '.research-quality-cost']]) {
        await page.locator(selector).scrollIntoViewIfNeeded();
        if (name === 'repair') { await page.locator('.research-stage-tabs button').nth(2).click(); await page.locator('.pipeline-pair').waitFor(); }
        await page.waitForTimeout(120);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${language} ${width} ${name}`);
        await page.locator(selector).screenshot({ path: `${output}/${language}-${width}-${name}.png`, style: ".demo-header, .skip-link { visibility: hidden !important; }" });
      }
    }
  }
  assert.deepEqual(errors, []); assert.deepEqual(apiRequests, []);
  checks.push('Chinese/English desktop/mobile visual evidence, no horizontal overflow, reduced motion and zero generation requests');
  await writeFile(output + '/checks.json', JSON.stringify({ checks, errors, apiRequests }, null, 2));
  console.log(JSON.stringify({ checks, errors, apiRequests }, null, 2));
} finally { await browser.close(); }
