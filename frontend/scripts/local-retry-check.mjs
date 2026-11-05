// Read-only by default. --retry explicitly spends within the existing failed job's budget.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const out = '.review/local-retry';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [], events = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => localStorage.setItem('autodraftman-language', 'zh'));
const base = 'http://127.0.0.1:5178';
let job;
try {
  await page.goto(base + '/workspace', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '查看进度', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByText('本次尚未调用模型', { exact: false }).waitFor();
  await dialog.getByRole('button', { name: '重试此图', exact: true }).waitFor();
  await page.waitForTimeout(600);
  await page.screenshot({ path: out + '/failure-recovery.png' });
  const history = await (await page.request.get(base + '/local-api/jobs')).json();
  job = history[0];
  assert.equal(job.failure.billing, 'not_started');
  if (process.argv.includes('--retry')) {
    const response = page.waitForResponse(r => r.url().endsWith('/retry') && r.request().method() === 'POST');
    await dialog.getByRole('button', { name: '重试此图', exact: true }).click();
    const accepted = await response;
    assert.equal(accepted.status(), 202);
    assert.equal((await accepted.json()).id, job.id);
    console.log('RETRY', job.id);
    await page.getByRole('button', { name: '关闭进度', exact: true }).click();
    await page.getByRole('button', { name: '查看进度', exact: true }).click();
    const deadline = Date.now() + 30 * 60_000;
    let revision = -1;
    while (Date.now() < deadline) {
      job = await (await page.request.get(base + '/local-api/jobs/' + job.id)).json();
      if (job.revision !== revision) {
        revision = job.revision; events.push(job);
        console.log(job.status, job.stage, job.error || '');
        await writeFile(out + '/run.json', JSON.stringify({ job, events, errors }, null, 2));
      }
      if (!['queued', 'running'].includes(job.status)) break;
      await page.waitForTimeout(5000);
    }
    assert.equal(job.status, 'succeeded', JSON.stringify(job.failure || job.error));
    await dialog.locator('.workspace-reconstruction-result').waitFor();
    await page.waitForTimeout(600);
    await page.screenshot({ path: out + '/recovered-result.png' });
    assert.equal((await (await page.request.get(base + '/local-api/jobs')).json()).length, history.length);
  }
  assert.deepEqual(errors, []);
} finally {
  await writeFile(out + '/run.json', JSON.stringify({ job, events, errors }, null, 2));
  await browser.close();
}
