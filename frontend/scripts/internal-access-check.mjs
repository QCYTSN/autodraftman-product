// Browser interaction fixture. Every API call is intercepted; no live image jobs are sent.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const base = process.env.AUDIT_BASE_URL || "http://127.0.0.1:5179";
const out = ".review/internal-access";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
await context.addInitScript(() => { try { localStorage.setItem("autodraftman-language", "zh"); } catch { /* Sandboxed SVG previews have no storage. */ } });
let current = null;
let submissions = 0;
let serviceBusy = false;
const jobs = [];
const identities = Object.fromEntries([1, 2, 3, 4].map(number => [`figfox0${number}`, {
  kind: "user", id: `00000000-0000-4000-8000-00000000000${number}`, display_name: `figfox0${number}`,
  providers: ["password"], avatar_url: null, expires_at: null, default_visibility: "private", balance: { available: 0, reserved: 0 },
}]));
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7WQAAAAASUVORK5CYII=", "base64");
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="90"><rect width="160" height="90" fill="#7155cf"/><text x="20" y="50" fill="white">Test SVG</text></svg>';
const errors = [];
const checks = [];
context.on("page", page => page.on("pageerror", error => errors.push(error.message)));
await context.route("**/local-api/**", () => { throw new Error("Forbidden local API bypass"); });
await context.route("**/api/v1/**", async route => {
  const request = route.request(), path = new URL(request.url()).pathname, method = request.method();
  const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  if (path.endsWith("/auth/providers")) return json({ providers: [], password_enabled: true });
  if (path.endsWith("/auth/password")) {
    const { username, password } = request.postDataJSON();
    if (password !== "synthetic-test-only-2026" || !identities[username]) return json({ detail: "账号或密码不正确。" }, 401);
    current = identities[username]; return json({ signed_in: true });
  }
  if (path.endsWith("/auth/logout")) { current = null; return route.fulfill({ status: 204 }); }
  if (path.endsWith("/identity/me")) return json(current || { detail: "Sign in required" }, current ? 200 : 401);
  if (!current) return json({ detail: "Sign in required" }, 401);
  if (path.endsWith("/auth/identities")) return json({ identities: [] });
  if (path.includes("/credits/transactions")) return json({ items: [], limit: 8, offset: 0 });
  if (path.endsWith("/reconstructions/health")) return json({ accountId: current.id, available: !serviceBusy, problems: serviceBusy ? ["worker_busy"] : [], supportsUserPrompt: false, remainingBudgetUsd: 5 });
  if (path === "/api/v1/reconstructions" && method === "POST") {
    submissions++;
    const id = crypto.randomUUID().replaceAll("-", "");
    const job = { id, owner: current.id, revision: 1, status: "running", stage: "reconstruct", name: "team-source.png", result: null };
    jobs.push(job); return json(job);
  }
  if (path === "/api/v1/reconstructions") return json(jobs.filter(job => job.owner === current.id));
  const job = jobs.find(job => path.includes(job.id) && job.owner === current.id);
  if (!job) return json({ detail: "Task not found" }, 404);
  if (path.endsWith("result.svg")) return route.fulfill({ contentType: "image/svg+xml", body: svg });
  if (path.endsWith("result.png")) return route.fulfill({ contentType: "image/png", body: png });
  job.revision++;
  job.stage = ["reconstruct", "inspect", "repair", "finalize"][Math.min(3, job.revision - 1)];
  if (job.revision >= 5) {
    job.status = "succeeded";
    job.result = { svg: `/api/v1/reconstructions/${job.id}/result.svg`, png: `/api/v1/reconstructions/${job.id}/result.png`, costUsd: 0, elapsedSeconds: 4, unresolvedCount: 0, sha256: "synthetic" };
  }
  return json(job);
});

const page = await context.newPage();
async function signIn(tab, name) {
  await tab.goto(`${base}/login`);
  await tab.locator("#internal-username").fill(name);
  await tab.locator("#internal-password").fill("synthetic-test-only-2026");
  await tab.getByRole("button", { name: "登录并进入工作台" }).click();
  await tab.waitForURL("**/workspace");
  await tab.getByText(name, { exact: true }).first().waitFor();
}
try {
  await page.goto(`${base}/login`);
  await page.locator("#internal-username").fill("figfox01");
  await page.locator("#internal-password").fill("incorrect-password");
  await page.getByRole("button", { name: "登录并进入工作台" }).click();
  await page.getByRole("alert").filter({ hasText: "账号或密码不正确" }).waitFor();
  await page.locator("#internal-password").fill("");
  await page.screenshot({ path: `${out}/login-desktop.png`, fullPage: true });
  checks.push("Incorrect credentials stay on the login page");

  await page.goto(`${base}/workspace`);
  await page.locator("#reference-file").setInputFiles({ name: "team-source.png", mimeType: "image/png", buffer: png });
  await page.getByText("team-source.png", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "登录内测账号", exact: true }).click();
  await page.locator("#internal-username").fill("figfox01");
  await page.locator("#internal-password").fill("synthetic-test-only-2026");
  await page.getByRole("button", { name: "登录并进入工作台" }).click();
  await page.waitForURL("**/workspace");
  await page.getByText("figfox01", { exact: true }).first().waitFor();
  await page.getByText("team-source.png", { exact: true }).first().waitFor();
  const submit = page.getByRole("button", { name: "重建 SVG", exact: true });
  await submit.waitFor();
  await page.waitForFunction(() => !document.querySelector(".generate-button")?.disabled);
  checks.push("Explicit anonymous draft survives sign-in; authenticated submit becomes available");
  await page.screenshot({ path: `${out}/workspace-ready.png`, fullPage: true });
  serviceBusy = true;
  await page.locator("#workspace-submit-reason").filter({ hasText: "正在处理重建任务，请稍候" }).waitFor({ timeout: 15000 });
  assert.equal(await submit.isDisabled(), true);
  assert.equal(await page.locator(".workspace-service-status").getByText("重建服务未开放", { exact: true }).count(), 0);
  await page.locator(".workspace-service-status").getByText(/当前一次处理一项任务/).waitFor();
  await page.screenshot({ path: `${out}/workspace-busy.png`, fullPage: true });
  serviceBusy = false;
  await page.waitForFunction(() => !document.querySelector(".generate-button")?.disabled, null, { timeout: 15000 });
  await page.getByText("team-source.png", { exact: true }).first().waitFor();
  assert.equal(submissions, 0);
  checks.push("Shared worker busy state explains the wait; idle health restores submission and preserves the draft without auto-submitting");
  await submit.click();
  await page.locator(".reconstruction-progress[data-status='running']").waitFor();
  await page.screenshot({ path: `${out}/mock-progress.png`, fullPage: true });
  await page.locator(".reconstruction-progress[data-status='succeeded']").waitFor({ timeout: 20000 });
  assert.equal(submissions, 1);
  checks.push("Mock job passes through progress and success; one manual submit");
  await page.evaluate(async () => {
    const { saveEditorDocument } = await import("/src/features/product/editorStorage.ts");
    await saveEditorDocument({ id: "account-a-document", fileName: "Account-A-private.svg", markup: '<svg xmlns="http://www.w3.org/2000/svg"/>', updatedAt: new Date().toISOString() });
  });

  const secondTab = await context.newPage();
  await signIn(secondTab, "figfox02");
  await page.getByText("figfox02", { exact: true }).first().waitFor({ timeout: 20000 });
  assert.equal(await page.getByText("team-source.png", { exact: true }).count(), 0);
  assert.equal(await page.evaluate(async () => (await (await import("/src/features/product/editorStorage.ts")).readEditorDocuments()).length), 0);
  assert.equal(await page.locator(".workspace-reconstruction-result").count(), 0);
  checks.push("Cross-tab account switch clears prior tasks, image and SVG documents");
  await page.screenshot({ path: `${out}/account-isolation.png`, fullPage: true });
  await secondTab.evaluate(async () => {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    (await import("/src/api.ts")).notifyIdentityChanged();
  });
  await page.getByRole("button", { name: "登录内测账号", exact: true }).waitFor({ timeout: 20000 });
  assert.equal(await page.locator(".generate-button").isDisabled(), true);
  checks.push("Cross-tab logout disables submission");
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (sessionStorage.getItem("test-transfer-quota") === "1" && key === "autodraftman-workspace-drafts-v1:00000000-0000-4000-8000-000000000001") throw new DOMException("Synthetic quota failure", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await page.goto(`${base}/workspace`);
  await page.evaluate(() => {
    const descriptor = Object.getOwnPropertyDescriptor(IDBTransaction.prototype, "oncomplete");
    Object.defineProperty(IDBTransaction.prototype, "oncomplete", { ...descriptor, set(handler) {
      if (this.db.name === "figfox-workspace-images" && this.mode === "readwrite" && handler) {
        descriptor.set.call(this, event => setTimeout(() => handler.call(this, event), 1000));
      } else descriptor.set.call(this, handler);
    } });
  });
  await page.locator("#reference-file").setInputFiles({ name: "delayed-source.png", mimeType: "image/png", buffer: png });
  const carry = page.getByRole("button", { name: "登录内测账号", exact: true });
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some(button => button.textContent === "登录内测账号" && button.disabled));
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some(button => button.textContent === "登录内测账号" && !button.disabled));
  checks.push("Sign-in transfer waits for the source image to finish saving");
  await carry.click();
  await page.evaluate(() => sessionStorage.setItem("test-transfer-quota", "1"));
  await page.locator("#internal-username").fill("figfox01");
  await page.locator("#internal-password").fill("synthetic-test-only-2026");
  await page.getByRole("button", { name: "登录并进入工作台" }).click();
  await page.getByRole("alert").filter({ hasText: "匿名草稿仍保留" }).waitFor();
  assert.equal(await page.evaluate(() => {
    const id = sessionStorage.getItem("figfox-transfer-draft");
    return !!id && JSON.parse(localStorage.getItem("autodraftman-workspace-drafts-v1:anonymous")).some(draft => draft.id === id);
  }), true);
  await page.evaluate(() => sessionStorage.removeItem("test-transfer-quota"));
  await page.getByRole("button", { name: "重新载入草稿" }).click();
  await page.getByText("delayed-source.png", { exact: true }).first().waitFor();
  assert.equal(await page.evaluate(() => sessionStorage.getItem("figfox-transfer-draft")), null);
  checks.push("Quota failure keeps the anonymous source and retry marker; retry restores the image");
  await page.goto(`${base}/login`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#internal-username").waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: `${out}/login-mobile.png`, fullPage: true });
  checks.push("Mobile login has no horizontal overflow");
  assert.deepEqual(errors, []);
  await writeFile(`${out}/result.json`, JSON.stringify({ checks, errors, submissions, liveModelCalls: 0 }, null, 2));
  console.log(JSON.stringify({ checks, errors, submissions, liveModelCalls: 0 }, null, 2));
} catch (error) {
  await page.screenshot({ path: `${out}/failure.png`, fullPage: true });
  console.error("Fixture transfer state:", await page.evaluate(async () => {
    const state = { marker: sessionStorage.getItem("figfox-transfer-draft"), quota: sessionStorage.getItem("test-transfer-quota") };
    try { await (await import("/src/features/product/transferInternalDraft.ts")).transferInternalDraft("00000000-0000-4000-8000-000000000001"); }
    catch (error) { state.error = error.message; }
    return state;
  }));
  console.error("Browser errors:", errors);
  throw error;
} finally { await browser.close(); }
