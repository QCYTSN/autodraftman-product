// Explicit opt-in: this check submits ONE real, paid reconstruction. Never retries.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const input = process.argv[process.argv.indexOf('--image') + 1];
if (!process.argv.includes('--submit') || !process.argv.includes('--image') || !input) throw new Error('Use --submit --image <source> to authorize one real reconstruction.');
const base = 'http://127.0.0.1:5178';
const output = '.review/local-kernel';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [], events = [];
page.on('pageerror', error => errors.push(error.message));
await page.addInitScript(() => localStorage.setItem('autodraftman-language', 'zh'));
let job;
try {
  await page.goto(base + '/workspace', { waitUntil: 'networkidle' });
  await page.locator('#reference-file').setInputFiles(input);
  await page.locator('#figure-prompt').fill('保留原图的文字、颜色和连接关系。');
  const button = page.getByRole('button', { name: '重建 SVG', exact: true });
  await page.waitForFunction(() => !document.querySelector('.generate-button')?.disabled);
  await page.screenshot({ path: output + '/01-ready.png' });
  const response = page.waitForResponse(response => response.url().endsWith('/local-api/jobs') && response.request().method() === 'POST');
  await button.click();
  const submitted = await response;
  assert.equal(submitted.status(), 202);
  job = await submitted.json();
  console.log('SUBMITTED', job.id);
  await page.getByRole('button', { name: '关闭进度', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  assert.equal(await page.getByRole('dialog').count(), 0);
  await page.getByRole('button', { name: '查看进度', exact: true }).click();
  await page.screenshot({ path: output + '/02-running.png' });
  let lastRevision = -1;
  const deadline = Date.now() + 35 * 60_000;
  while (Date.now() < deadline) {
    const response = await page.request.get(base + '/local-api/jobs/' + job.id);
    job = await response.json();
    if (job.revision !== lastRevision) {
      events.push({ time: new Date().toISOString(), ...job }); lastRevision = job.revision;
      console.log(job.status, job.stage, job.error || '');
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${output}/stage-${job.revision}-${job.status}.png` });
      await writeFile(output + '/run.json', JSON.stringify({ job, events, errors }, null, 2));
    }
    if (!['queued', 'running'].includes(job.status)) break;
    await page.waitForTimeout(5000);
  }
  assert.equal(job.status, 'succeeded', `Real kernel did not complete: ${job.error}`);
  await page.locator('.reconstruction-progress .workspace-reconstruction-result').waitFor();
  assert.equal(await page.locator('.reconstruction-progress img').evaluate(image => image.complete && image.naturalWidth > 0), true);
  await page.screenshot({ path: output + '/03-result.png' });
  await page.getByRole('dialog').getByRole('button', { name: '打开 SVG 编辑', exact: true }).click();
  await page.waitForURL(/\/editor/);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: output + '/04-editor.png' });
  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('PASSED: real upload, close/reopen progress, kernel result, editor handoff', JSON.stringify(job.result));
} finally {
  await writeFile(output + '/run.json', JSON.stringify({ job, events, errors }, null, 2));
  await browser.close();
}
