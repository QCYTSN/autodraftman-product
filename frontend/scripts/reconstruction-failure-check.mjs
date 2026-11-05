// Isolated browser fixtures: every local API request is intercepted; no model calls.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

await mkdir('.review/local-retry', { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const errors = [];
try {
  for (const mode of ['retry', 'resume', 'uncertain']) {
    const uncertain = mode === 'uncertain', resume = mode === 'resume';
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('autodraftman-language', 'zh'));
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    let posts = 0;
    const job = { id: 'a'.repeat(32), revision: 2, status: 'failed', stage: resume ? 'repair' : 'reconstruct', name: 'example.png', error: uncertain ? 'provider_unconfirmed' : 'input_too_large', failure: { billing: uncertain ? 'unconfirmed' : resume ? 'recorded' : 'not_started', retryable: !uncertain, resume, costUsd: resume ? .47 : 0, reservedUsd: uncertain ? 2.29 : 0 } };
    await page.route('**/local-api/**', async route => {
      const url = new URL(route.request().url());
      let body;
      if (url.pathname.endsWith('/health')) body = { service: 'figfox-local-v1', available: false, problems: ['test_limit_reached'] };
      else if (route.request().method() === 'POST') {
        posts++;
        await new Promise(resolve => setTimeout(resolve, 200));
        Object.assign(job, { revision: 3, status: 'queued', stage: null, error: null, failure: null });
        body = job;
      } else body = url.pathname.endsWith('/jobs') ? [job] : job;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto('http://127.0.0.1:5178/workspace', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '查看进度', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.locator('.reconstruction-failure').waitFor();
    const retry = dialog.getByRole('button', { name: resume ? '继续未完成的步骤' : '重试此图', exact: true });
    assert.equal(await retry.count(), uncertain ? 0 : 1);
    await page.waitForTimeout(600);
    assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
    await page.screenshot({ path: `.review/local-retry/mobile-${mode}.png` });
    if (!uncertain) {
      await retry.evaluate(el => { el.click(); el.click(); });
      await dialog.locator('[data-status="queued"]').waitFor();
      assert.equal(posts, 1);
      await page.getByRole('button', { name: '关闭进度', exact: true }).click();
      await page.getByRole('button', { name: '查看进度', exact: true }).click();
      await dialog.locator('[data-status="queued"]').waitFor();
    } else {
      assert.match(await dialog.innerText(), /费用待确认/);
      assert.equal(posts, 0);
    }
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log('PASS: mobile failure, safe retry/resume, duplicate-click guard, reopen, unconfirmed billing, reduced motion');
} finally { await browser.close(); }
