// Production Pages build, synthetic gateway only. No request reaches a model or server.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5183/figfox';
const api = 'https://34.143.155.158';
const out = '.review/pages-workspace';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
const errors = [], checks = [], sessions = new Map(), jobs = [];
let sequence = 0, submissions = 0, apiCalls = 0;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7WQAAAAASUVORK5CYII=', 'base64');
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#7155cf"/><text x="20" y="50" fill="white">Test SVG</text></svg>';
await context.addInitScript(() => {
  try { localStorage.setItem('autodraftman-language', 'zh'); } catch { /* sandboxed editor */ }
  // Prove that authentication and result images work with cookies unavailable.
  Object.defineProperty(Document.prototype, 'cookie', { get: () => '', set: () => {} });
});
context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url());
  if (url.origin !== api) {
    assert.equal(request.headers().authorization, undefined, 'Never send credentials to assets');
    if (url.origin !== new URL(base).origin && url.protocol.startsWith('http')) return route.abort();
    return route.continue();
  }
  apiCalls++;
  assert.ok(url.pathname.startsWith('/api/v1/'));
  assert.equal(request.headers().cookie, undefined);
  const headers = { 'Access-Control-Allow-Origin': new URL(base).origin, 'Access-Control-Allow-Headers': 'authorization,content-type,idempotency-key', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Cache-Control': 'no-store' };
  const json = (body, status = 200) => route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) });
  const path = url.pathname;
  if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
  if (path.endsWith('/auth/providers')) return json({ providers: [], password_enabled: true });
  if (path.endsWith('/auth/password')) {
    const body = request.postDataJSON();
    assert.equal(body.session_transport, 'bearer');
    if (body.password !== 'synthetic-only') return json({ detail: '账号或密码不正确。' }, 401);
    const token = String(++sequence).padStart(64, '0');
    sessions.set(token, body.username);
    return json({ signed_in: true, session_token: token });
  }
  const token = request.headers().authorization?.slice(7), username = sessions.get(token);
  if (path.endsWith('/auth/logout')) { sessions.delete(token); return route.fulfill({ status: 204, headers }); }
  if (!username) return json({ detail: 'Sign in required' }, 401);
  const id = `00000000-0000-4000-8000-00000000000${username.at(-1)}`;
  if (path.endsWith('/identity/me')) return json({ id, kind: 'user', display_name: username, providers: ['password'], default_visibility: 'private', balance: { available: 0, reserved: 0 } });
  if (path.endsWith('/auth/identities')) return json({ identities: [] });
  if (path.endsWith('/credits/transactions')) return json({ items: [], limit: 8, offset: 0 });
  if (path.endsWith('/reconstructions/health')) return json({ accountId: id, available: true, problems: [], supportsUserPrompt: false, remainingBudgetUsd: 5 });
  if (path === '/api/v1/reconstructions' && request.method() === 'POST') {
    submissions++;
    jobs.push({ id: 'a'.repeat(32), owner: id, name: 'synthetic-source.png', status: 'running', stage: 'reconstruct', revision: 1, result: null });
    return json(jobs.at(-1));
  }
  if (path === '/api/v1/reconstructions') return json(jobs.filter(job => job.owner === id));
  const job = jobs.find(job => path.includes(job.id) && job.owner === id);
  if (!job) return json({ detail: 'Task not found' }, 404);
  if (path.endsWith('result.svg')) return route.fulfill({ headers, contentType: 'image/svg+xml', body: svg });
  if (path.endsWith('result.png')) return route.fulfill({ headers, contentType: 'image/png', body: png });
  job.revision++; job.stage = 'finalize'; job.status = 'succeeded';
  job.result = { svg: `/api/v1/reconstructions/${job.id}/result.svg`, png: `/api/v1/reconstructions/${job.id}/result.png`, costUsd: 0, elapsedSeconds: 1, unresolvedCount: 0 };
  return json(job);
});
const page = await context.newPage();
async function signIn(tab, username) {
  await tab.goto(base + '/login');
  await tab.locator('#internal-username').fill(username);
  await tab.locator('#internal-password').fill('synthetic-only');
  await tab.getByRole('button', { name: '登录并进入工作台' }).click();
  await tab.waitForURL(/\/workspace\/?$/);
  await tab.getByText(username, { exact: true }).first().waitFor();
  assert.ok(tab.url().startsWith(base));
}
try {
  await page.goto(base + '/');
  await page.locator('a[href="/figfox/workspace"]').first().waitFor();
  assert.equal(apiCalls, 0, 'Showcase loads independently of the API');
  await page.locator('a[href="/figfox/workspace"]').first().click();
  await page.locator('#reference-file').waitFor({ state: 'attached' });
  assert.ok(page.url().startsWith(base));
  assert.equal(await page.getByText(/正在连接工作台|正在进入 FigFox|正在连接云服务器/).count(), 0);
  checks.push('Showcase and workspace remain on Pages without redirect or connection message');
  await signIn(page, 'figfox01');
  await page.reload();
  await page.getByText('figfox01', { exact: true }).first().waitFor();
  await page.locator('#reference-file').setInputFiles({ name: 'synthetic-source.png', mimeType: 'image/png', buffer: png });
  await page.waitForFunction(() => !document.querySelector('.generate-button')?.disabled);
  await page.getByRole('button', { name: '重建 SVG', exact: true }).click();
  await page.locator('.reconstruction-progress[data-status="succeeded"]').waitFor();
  await page.waitForFunction(() => [...document.querySelectorAll('.workspace-reconstruction-result img')].some(image => image.complete && image.naturalWidth > 0 && image.src.startsWith('blob:')));
  const result = page.locator('.reconstruction-progress .workspace-reconstruction-result');
  for (const kind of ['SVG', 'PNG']) {
    const downloadPromise = page.waitForEvent('download');
    await result.getByRole('button', { name: kind, exact: true }).click();
    const download = await downloadPromise;
    assert.deepEqual(await readFile(await download.path()), kind === 'SVG' ? Buffer.from(svg) : png);
  }
  await page.screenshot({ path: out + '/result.png', fullPage: true });
  checks.push('Tab session survives refresh; authenticated preview and both downloads work without cookies');
  await result.getByRole('button', { name: '打开 SVG 编辑' }).click();
  await page.waitForURL(/\/editor\/?$/);
  await page.locator('iframe').first().waitFor();
  checks.push('Authenticated SVG opens in editor on the same Pages address');
  const second = await context.newPage();
  await signIn(second, 'figfox02');
  await page.goto(base + '/workspace');
  await page.getByText('figfox01', { exact: true }).first().waitFor();
  assert.equal(await second.locator('.workspace-reconstruction-result').count(), 0);
  checks.push('Tabs keep separate account sessions and results');
  sessions.clear();
  await page.reload();
  await page.getByRole('button', { name: '登录内测账号', exact: true }).waitFor();
  assert.equal(await page.locator('.generate-button').isDisabled(), true);
  checks.push('Revoked session returns to signed-out workspace and disables generation');
  await page.goto(base + '/login');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#internal-username').waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: out + '/login-mobile.png', fullPage: true });
  assert.deepEqual(errors, []); assert.equal(submissions, 1);
  const evidence = { checks, errors, syntheticSubmissions: submissions, realGenerationSubmissions: 0 };
  await writeFile(out + '/result.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} catch (error) {
  await page.screenshot({ path: out + '/failure.png', fullPage: true });
  console.error(error.message, { errors, url: page.url() }); process.exitCode = 1;
} finally { await browser.close(); }
