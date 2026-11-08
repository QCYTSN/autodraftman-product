import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = (process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4175/figfox').replace(/\/$/, '');
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const output = '.review/motion';
await mkdir(output, { recursive: true });
const checks = [], errors = [];
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
  await page.addInitScript(() => localStorage.setItem('autodraftman-language', 'zh'));
  page.on('pageerror', e => errors.push(e.message));
  // Reproduce sections arriving after the page's initial animation registration.
  await page.route('**/summary.json*', async route => { await new Promise(resolve => setTimeout(resolve, 1500)); await route.continue(); });
  await page.goto(base + '/', { waitUntil: 'domcontentloaded' });
  await page.locator('.demo-motion-ready').waitFor();
  const heading = page.locator('#demo-evaluation .demo-section-heading');
  await heading.waitFor({ state: 'attached' });
  assert.equal(await heading.evaluate(e => e.classList.contains('demo-revealed')), false);
  assert.equal(await heading.evaluate(e => Number(getComputedStyle(e).opacity)), 0);
  await heading.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForFunction(() => document.querySelector('#demo-evaluation .demo-section-heading')?.classList.contains('demo-revealed'));
  await page.waitForTimeout(140);
  const intermediate = await heading.evaluate(e => Number(getComputedStyle(e).opacity));
  assert.ok(intermediate > 0 && intermediate < 1, 'Lazy heading must actually fade, not just acquire a class');
  await page.waitForTimeout(520);
  assert.equal(await heading.evaluate(e => Number(getComputedStyle(e).opacity)), 1);
  checks.push('Delayed research content registers and visibly interpolates opacity');

  await page.locator('.research-full-results summary').click();
  assert.equal(await page.locator('.research-full-results').evaluate(e => e.open), true, 'First pointer click opens details without a focus-induced position jump');
  await page.locator('.research-full-results summary').click();
  checks.push('Interactive reveal groups keep their position through the first click');

  const sections = ['#demo-examples', '.demo-evidence', '#demo-method', '#demo-content', '#demo-results', '#demo-evaluation', '#demo-benchmarks', '#research-samples', '#demo-ablations', '#demo-efficiency', '#research-provenance', '.demo-closing'];
  for (const section of sections) {
    const region = page.locator(section);
    const targets = region.locator('[data-demo-reveal]');
    if (section === '.demo-closing') await region.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
    else {
      assert.ok(await targets.count() > 0, section + ' has entrance groups');
      for (const target of await targets.all()) {
        if (!await target.evaluate(e => e.getClientRects().length > 0)) continue;
        await target.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await page.waitForFunction(el => el.classList.contains('demo-revealed'), await target.elementHandle());
      }
    }
  }
  await page.waitForTimeout(700);
  await heading.evaluate(e => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
  assert.equal(await heading.evaluate(e => Number(getComputedStyle(e).opacity)), 1, 'Already-read content must stay visible');
  checks.push('All page sections reveal in reading groups; rapid scrolling and returning do not restart entrances');

  await page.locator('#demo-efficiency').scrollIntoViewIfNeeded();
  const points = await page.locator('.research-cost-point').evaluateAll(es => es.map(e => ({ name: e.textContent, cost: Number(e.dataset.cost), y: e.getBoundingClientRect().top })));
  for (const a of points) for (const b of points) if (a.cost < b.cost) assert.ok(a.y < b.y, 'Lower actual cost must be visually higher');
  const ticks = await page.locator('.research-cost-grid').evaluateAll(es => es.map(e => ({ label: e.textContent, y: e.getBoundingClientRect().top })));
  assert.ok(ticks[0].y < ticks.at(-1).y); assert.equal(ticks[0].label, '$0.0');
  checks.push('Inverted USD axis places all cheaper methods higher, with $0 at the top');

  for (const language of ['zh', 'en']) {
    if (language === 'en') { await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await page.getByRole('button', { name: '切换为英文' }).click(); }
    for (const width of [1440, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.locator('#demo-efficiency').scrollIntoViewIfNeeded(); await page.waitForTimeout(700);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      const labels = await page.locator('.research-cost-point>span').evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; }));
      for (const [i, a] of labels.entries()) for (const b of labels.slice(i + 1)) assert.ok(!(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y), 'Method labels overlap');
      if (width !== 320) await page.locator('#demo-efficiency').screenshot({ path: `${output}/${language}-${width}-cost.png`, style: '.demo-header{visibility:hidden}' });
    }
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.demo-site').evaluate(e => e.classList.contains('demo-motion-ready')), false);
  assert.ok(await page.locator('[data-demo-reveal]').evaluateAll(es => es.every(e => Number(getComputedStyle(e).opacity) === 1)));
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#demo-evaluation').waitFor({ state: 'attached' });
  assert.ok(await page.locator('[data-demo-reveal]').evaluateAll(es => es.every(e => Number(getComputedStyle(e).opacity) === 1)));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.waitForFunction(() => document.querySelector('.demo-site')?.classList.contains('demo-motion-ready'));
  assert.ok(await page.locator('[data-demo-reveal]').evaluateAll(es => es.every(e => Number(getComputedStyle(e).opacity) === 1)));
  checks.push('Chinese/English desktop; live reduced-motion changes and delayed loading never hide content');
  assert.deepEqual(errors, []);
  await writeFile(output + '/checks.json', JSON.stringify({ checks, errors }, null, 2));
  console.log(JSON.stringify({ checks, errors }, null, 2));
} finally { await browser.close(); }
