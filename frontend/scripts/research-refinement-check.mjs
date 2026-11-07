import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import ts from 'typescript';

const base = (process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4175/figfox').replace(/\/$/, '');
const output = '.review/desktop-refinement/after';
await mkdir(output, { recursive: true });
const code = ts.transpileModule(await readFile('src/features/demo/research/display.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { ablationText, differenceText, judgmentText, scoreComparison, costComparison } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
const metric = { name: '连接', en: 'Connections', direction: 'higher' };
assert.match(ablationText(metric, { A: 81, B: 85, C: 75 }, true), /改善 6.0/);
assert.match(ablationText(metric, { A: 80, B: 85, C: 80 }, true), /前后.*均为 80.0/);
assert.match(ablationText(metric, { A: 80, B: 80, C: 80 }, true), /三种配置/);
assert.match(ablationText(metric, { A: 70, B: 85, C: 75 }, false), /decline of 5.0/);
assert.match(ablationText({ ...metric, direction: 'lower' }, { A: 70, B: 85, C: 75 }, false), /improvement of 5.0/);
assert.match(ablationText(metric, { A: 80.00001, B: 85, C: 80 }, true), /改善 <0.1/);
assert.equal(differenceText(-.0001), '<0.1');
assert.match(scoreComparison(95, 95, 'DrawAI', true), /同分/);
assert.match(scoreComparison(95, 96, 'DrawAI', false), /below DrawAI/);
assert.match(costComparison(1, .25, true), /高 300.0%/);
assert.match(costComparison(1, 2, false), /50.0% lower/);
assert.match(costComparison(1, 1, false), /Same/);
assert.match(costComparison(1, 0, false), /unavailable/);
for (const [status, text] of [['pass', 'Pass'], ['fail', 'Fail'], ['unknown', 'Needs review'], ['NA', 'Not applicable']]) assert.equal(judgmentText({ score: null, counts: { [status]: 1 } }, false), text);
assert.equal(judgmentText({ score: 50, counts: { pass: 1, fail: 1 } }, false), '50.0 / 100 · 2 judgments');
const summary = JSON.parse(await readFile('public/assets/research/summary.json', 'utf8'));
const observations = JSON.parse(await readFile('public/assets/research/example-observations.json', 'utf8'));
for (const [scope, criteria] of Object.entries(observations)) for (const [id, observation] of Object.entries(criteria)) {
  const sample = JSON.parse(await readFile(`public/assets/research/sample-meta/${observation.sample}.json`, 'utf8'));
  assert.ok(sample.eligible[scope].includes(id));
  assert.equal(summary.examples[scope][id], observation.sample);
  assert.ok(observation.note.zh && observation.note.en && observation.regions.source);
}
const checks = ['Raw-precision increase/tie/three-way tie/decline, lower-is-better, tiny gaps, relative cost and single/multiple judgments', 'Twelve bilingual observations map to eligible examples in their own experiment scope'];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.addInitScript(() => localStorage.setItem('autodraftman-language', 'zh'));
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  async function criterion(name, id) {
    await page.getByRole('combobox', { name, exact: true }).click();
    await page.locator(`.research-criterion-popup[data-open] [data-value="${id}"]`).click();
  }
  for (const [id, text] of [['D05', /75.0.*85.3.*改善 10.3/], ['D07', /前后.*均为 91.3/], ['D13', /三种配置.*100.0/], ['D15', /2.5.*1.3.*降低 1.3/]]) {
    await criterion('消融指标', id);
    assert.match(await page.locator('#demo-ablations .demo-section-heading p').innerText(), text);
  }
  await page.locator('#demo-ablations').screenshot({ path: output + '/ablation-1440.png', style: '.demo-header{visibility:hidden}' });
  checks.push('Ablation narrative follows increase, A/C tie, three-way tie and decline in actual data');
  for (const [index, id] of [[1, 'DrawAI'], [2, 'AFE'], [3, 'Crafter']]) {
    await page.locator('.research-cost-point').nth(index).click();
    const name = summary.methods.find(method => method.id === id).name;
    assert.match(await page.locator('.research-cost-insights h3').innerText(), new RegExp(name));
    assert.match(await page.locator('.research-cost-insight').last().innerText(), id === 'AFE' ? /费用高/ : /费用低/);
    await page.locator('.research-cost-point').first().click();
    assert.match(await page.locator('.research-reference-readout').innerText(), new RegExp(name));
    assert.equal(await page.locator('.research-cost-point[data-reference]').count(), 1);
  }
  await page.locator('.research-cost-point').nth(2).click();
  await criterion('效果对比指标', 'D04');
  assert.match(await page.locator('.research-cost-insight').first().innerText(), /同分/);
  await criterion('效果对比指标', 'D01');
  assert.match(await page.locator('.research-insight-values').innerText(), /95.2/);
  await page.locator('#demo-efficiency').screenshot({ path: output + '/cost-1440.png', style: '.demo-header{visibility:hidden}' });
  checks.push('Every reference updates costs and scores; selecting FigFox preserves the reference; switching criteria updates both sides');
  for (const id of ['D01', 'D08', 'D11']) {
    await page.locator(`.research-score-example[data-metric="${id}"] button`).click();
    assert.equal(await page.locator('.research-profile-card[data-located]').getAttribute('id'), 'profile-' + id);
    const r = await page.locator('#profile-' + id).boundingBox(); assert.ok(r.y > 70 && r.y < 900);
  }
  checks.push('Each highlight links directly to its corresponding metric and marks that comparison');
  for (const id of ['D01', 'D02', 'D05', 'D08', 'D11', 'D13']) {
    await page.locator('.research-metric-map button').filter({ has: page.locator('small', { hasText: id }) }).click();
    await page.locator('.research-definition button').click();
    await page.locator('.research-dialog [data-sample]').waitFor();
    assert.equal(await page.locator('.research-dialog [data-sample]').getAttribute('data-sample'), summary.examples.comparison[id]);
    assert.equal(await page.locator('.research-output-grid article').count(), 4);
    await page.locator('.research-observation').waitFor();
    assert.equal(await page.locator('.research-observation p').innerText(), observations.comparison[id].note.zh);
    assert.ok(await page.locator('.research-observation-box').count() >= 2);
    assert.equal(await page.locator('.research-output-grid [data-cropped]').count(), 0);
    await page.getByRole('button', { name: '放大观察点', exact: true }).click();
    assert.equal(await page.locator('.research-output-grid [data-cropped]').count(), 4);
    if (id === 'D02') await page.screenshot({ path: output + '/formula-observation-1440.png' });
    await page.getByRole('button', { name: '隐藏标注', exact: true }).click();
    assert.equal(await page.locator('.research-observation-box').count(), 0);
    assert.equal(await page.locator('.research-output-grid [data-cropped]').count(), 0);
    await page.getByRole('button', { name: '恢复全图', exact: true }).click();
    await page.keyboard.press('Escape');
  }
  checks.push('Six applicable representative examples open in overview, show verified observation regions, zoom and restore cleanly');
  for (const language of ['zh', 'en']) {
    if (language === 'en') { await page.evaluate(() => scrollTo(0, 0)); await page.getByRole('button', { name: '切换为英文' }).click(); }
    for (const [width, height] of [[1440, 900], [1280, 720], [1920, 1080]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => scrollTo(0, 0)); await page.screenshot({ path: `${output}/${language}-hero-${width}.png` });
      for (const target of ['demo-examples', 'demo-method', 'demo-benchmarks', 'demo-ablations', 'demo-efficiency', 'research-provenance']) {
        await page.locator(`.demo-nav a[href="#${target}"]`).click();
        await page.waitForTimeout(80);
        const r = await page.locator(`#${target} h2`).boundingBox();
        // The final section may stop above the document's natural bottom limit.
        assert.ok(r.y >= 64 && r.y < (target === 'research-provenance' ? height * .55 : 260), `${language}/${width}/${target}: ${r.y}`);
      }
      await page.locator('.research-definition button').scrollIntoViewIfNeeded();
      const scroll = await page.evaluate(() => scrollY);
      await page.locator('.research-definition button').click();
      await page.locator('.research-dialog [data-sample]').waitFor();
      await page.locator('.research-observation').waitFor();
      const frames = await page.locator('.research-output-grid article').evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, overflow: e.scrollHeight - e.clientHeight }; }));
      assert.equal(frames.length, 4);
      for (const f of frames) assert.ok(f.top > 0 && f.bottom < height && f.left > 0 && f.right < width && f.overflow < 2, `${language}/${width}: ${JSON.stringify(f)}`);
      const rail = await page.locator('.research-source-rail').boundingBox(); assert.ok(rail.width >= 180 && rail.width <= 240);
      const dialog = await page.locator('.research-dialog').boundingBox(); assert.ok(dialog.width <= 1361 && dialog.height <= height * .94 + 1);
      await page.screenshot({ path: `${output}/${language}-inspector-${width}.png` });
      await page.getByRole('button', { name: language === 'zh' ? '放大原图' : 'Enlarge reference', exact: false }).click();
      assert.equal(await page.locator('.research-source-dialog').evaluate(e => e.open), true);
      await page.keyboard.press('Escape'); assert.equal(await page.locator('.research-dialog').evaluate(e => e.open), true);
      await page.getByRole('button', { name: language === 'zh' ? '两方法对照' : 'Two-method comparison', exact: true }).click();
      assert.equal(await page.locator('.research-output-grid article').count(), 2);
      await page.keyboard.press('Escape'); await page.locator('.research-dialog').waitFor({ state: 'detached' });
      assert.ok(Math.abs(await page.evaluate(() => scrollY) - scroll) < 2);
      assert.equal(await page.locator('.research-definition button').evaluate(e => e === document.activeElement), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
  }
  checks.push('Both languages at 1440/1280/1920: four complete previews in the first viewport, compact rail, two-view mode, independent source zoom, navigation, scroll and focus restoration');
  await page.locator('#demo-results').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Show change region', exact: true }).click();
  for (const id of ['formula', 'connections', 'layout']) {
    await page.locator('#demo-result-tab-' + id).click();
    await page.locator('#demo-result-panel[aria-busy="false"] .demo-region-label').first().click();
    assert.equal(await page.locator('#demo-result-panel .demo-change-region').count(), 2);
    await page.locator('#demo-result-panel[aria-busy="false"]').waitFor();
    await page.waitForTimeout(250);
    assert.equal(await page.getByRole('button', { name: 'Key detail', exact: true }).getAttribute('aria-pressed'), 'true');
  }
  await page.getByRole('button', { name: 'Show change region', exact: true }).click();
  assert.equal(await page.locator('#demo-result-panel .demo-region-label').count(), 0);
  checks.push('Repair labels locate formula, join and title regions; overlays switch off without changing originals');
  assert.deepEqual(errors, []);
  await writeFile(output + '/checks.json', JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally { await browser.close(); }
