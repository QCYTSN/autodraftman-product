// Synthetic snapshots only; block every external request and intercept all task APIs.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

await mkdir('.review/local-audit', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
try {
  for (const unresolvedCount of [0, 3]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('autodraftman-language', 'zh'));
    const page = await context.newPage();
    const errors = [];
    let posts = 0;
    page.on('pageerror', error => errors.push(error.message));
    const id = 'b'.repeat(32);
    const job = { id, revision: 5, status: 'succeeded', stage: 'finalize', name: 'synthetic.png',
      result: { svg: `/local-api/jobs/${id}/result.svg`, png: `/local-api/jobs/${id}/result.png`, elapsedSeconds: 60, costUsd: .1, unresolvedCount, sha256: 'fixture' } };
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://127.0.0.1:5178') return route.abort();
      if (!url.pathname.startsWith('/local-api/')) return route.continue();
      if (route.request().method() !== 'GET') { posts++; return route.abort(); }
      if (url.pathname.endsWith('/result.png')) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="60"><rect width="100" height="60" fill="#ede8fb"/></svg>' });
      const body = url.pathname.endsWith('/health') ? { service: 'figfox-local-v1', available: false, problems: [] }
        : url.pathname.endsWith('/jobs') ? [job] : job;
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto('http://127.0.0.1:5178/workspace', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '查看进度', exact: true }).click();
    const result = page.getByRole('dialog').locator('.workspace-reconstruction-result');
    await result.waitFor();
    assert.equal(await result.locator('.reconstruction-unresolved').count(), unresolvedCount ? 1 : 0);
    if (unresolvedCount) assert.match(await result.innerText(), /仍有 3 项问题未解决/);
    assert.equal(await result.getByRole('link', { name: 'SVG', exact: true }).getAttribute('href'), job.result.svg);
    assert.equal(await result.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
    assert.equal(posts, 0);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `.review/local-audit/unresolved-${unresolvedCount}.png` });
    await context.close();
  }
  console.log('PASS: unresolved findings displayed, zero findings omitted, original SVG download retained, mobile layout, no submissions');
} finally { await browser.close(); }
