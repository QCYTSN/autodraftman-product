import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5186';
const out = '.review/paper-audit-2026-11-12';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [], checks = [];
try {
  for (const [language, width] of [['zh', 1440], ['en', 1440], ['zh', 390]]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(lang => localStorage.setItem('autodraftman-language', lang), language);
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    const summary = await (await page.request.get(base + '/assets/research/summary.json')).json();
    assert.equal(summary.provenance.version, 'paper-full80-20261110');
    assert.equal(summary.summaries.A.D15.score, 89.38);
    assert.equal(summary.summaries.AFE.D14.sampleN, 79);
    for (const scope of ['comparison', 'ablation']) {
      const panel = page.locator(`.research-aggregate-results[data-scope="${scope}"]`);
      await panel.locator('summary').click();
      for (const [measure, methods] of Object.entries(summary.aggregates[scope])) {
        for (const [method, score] of Object.entries(methods)) {
          const cell = panel.locator(`[data-measure="${measure}"] td[data-method="${method}"]`);
          assert.equal(await cell.locator('b').innerText(), score.mean.toFixed(2));
          const text = await cell.innerText();
          assert.ok(text.includes(`[${score.ci95.map(value => value.toFixed(2)).join(', ')}]`));
          assert.ok(text.includes(`N=${score.sampleN}`));
        }
      }
      await panel.screenshot({ path: `${out}/${language}-${width}-${scope}-aggregates.png` });
    }
    await page.locator('.research-cost-point[data-featured]').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.research-cost-point[data-featured]').getAttribute('data-score'), '94.22');
    assert.ok((await page.locator('.research-cost-axis').innerText()).includes(language === 'zh' ? '总体均分' : 'Overall mean'));
    await page.locator('.research-quality-cost').screenshot({ path: `${out}/${language}-${width}-quality.png` });
    const csv = await (await page.request.get(base + '/assets/research/' + encodeURIComponent('四方法评分.csv'))).text();
    assert.match(csv, /D14,[^\n]*AFE,74\.68,79/);
    assert.match(csv, /D15,[^\n]*A,89\.38,80/);
    for (const metric of ['D13', 'D14', 'D15']) {
      await page.goto(`${base}/#research?sample=sample-0062&metric=${metric}&scope=comparison&view=overview`, { waitUntil: 'networkidle' });
      await page.locator('.research-output-grid article').first().waitFor();
      await page.locator('.research-history-notice').waitFor();
      assert.equal(await page.locator('.research-output-grid article header>span').count(), 0, 'Do not present old editing scores as current');
      const details = page.locator('.research-output-grid article[data-method="A"] details');
      assert.ok((await details.locator('summary').innerText()).includes('2026-11-04'));
      await details.locator('summary').click();
      assert.match(await details.innerText(), /旧版二值|Earlier binary/);
      await page.keyboard.press('Escape');
    }
    await page.goto(`${base}/#research?sample=sample-0001&metric=D01&scope=comparison&view=overview`, { waitUntil: 'networkidle' });
    await page.locator('.research-output-grid article header>span').first().waitFor();
    assert.equal(await page.locator('.research-history-notice').count(), 0, 'Unchanged visual judgments remain available');
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    checks.push({ language, width, aggregates: 21, historyIsolation: true, downloads: true });
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${out}/paper-checks.json`, JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }));
} finally { await browser.close(); }
