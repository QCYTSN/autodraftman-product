import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5186';
const output = '.review/paper-audit-2026-11-12';
await mkdir(output, { recursive: true });
const cases = [
  { id: 'formula', figure: 'diffusion', object: 'plus_node_47', content: 'Add Noise' },
  { id: 'connections', figure: 'study', object: 'arr_exp1_join_vertical' },
  { id: 'layout', figure: 'vit', object: 'plus_node_103', content: 'Multi-Head Self-Attention' },
];
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [], verified = [];
try {
  for (const [language, width, height] of [['zh', 1440, 1000], ['en', 1440, 1000], ['zh', 390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(lang => localStorage.setItem('autodraftman-language', lang), language);
    const sources = [];
    page.on('request', r => { if (/cases\/.*\/(baseline|result)\.svg/.test(r.url())) sources.push(r.url()); });
    await page.goto(base.replace(/\/$/, '') + '/', { waitUntil: 'domcontentloaded' });
    await page.locator('#demo-results').scrollIntoViewIfNeeded();
    for (const item of cases) {
      await page.locator('#demo-result-tab-' + item.id).click();
      const panel = page.locator('#demo-result-panel[aria-busy="false"]');
      await panel.locator('.demo-refinement-pair img').first().waitFor();
      const images = await panel.locator('.demo-refinement-pair img').evaluateAll(async elements => Promise.all(elements.map(async img => {
        await img.decode();
        return { alt: img.alt, markup: await (await fetch(img.src)).text(), width: img.naturalWidth, height: img.naturalHeight };
      })));
      assert.equal(images.length, 2);
      assert.notEqual(images[0].markup, images[1].markup);
      assert.ok(images[1].markup.includes(`id="${item.object}"`), `${item.id}: repaired object missing`);
      if (item.content) for (const image of images) assert.ok(image.markup.includes(item.content), item.id);
      assert.ok(sources.some(url => url.includes(`/cases/${item.figure}/baseline.svg`)));
      assert.ok(sources.some(url => url.includes(`/cases/${item.figure}/result.svg`)));
      const target = await page.evaluate(({ markup, id }) => {
        const holder = document.createElement('div');
        holder.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden';
        holder.innerHTML = markup; document.body.append(holder);
        try {
          const root = holder.querySelector('svg'), node = root.querySelector(`[id="${id}"]`);
          const b = node.getBBox(), matrix = root.getCTM().inverse().multiply(node.getCTM());
          const points = [[b.x,b.y],[b.x+b.width,b.y+b.height]].map(([x,y]) => new DOMPoint(x,y).matrixTransform(matrix));
          const v = root.viewBox.baseVal;
          return { inside: points.every(p => p.x >= v.x-1 && p.x <= v.x+v.width+1 && p.y >= v.y-1 && p.y <= v.y+v.height+1), bounds: points.map(p => [p.x,p.y]), viewBox: [v.x,v.y,v.width,v.height] };
        } finally { holder.remove(); }
      }, { markup: images[1].markup, id: item.object });
      assert.ok(target.inside, JSON.stringify({ id: item.id, target }));
      await panel.screenshot({ path: `${output}/${language}-${width}-${item.id}.png` });
      verified.push({ language, width, id: item.id, figure: item.figure, target });
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(output + '/checks.json', JSON.stringify({ verified, errors }, null, 2));
  console.log(JSON.stringify({ comparisons: verified.length, errors }));
} finally { await browser.close(); }
