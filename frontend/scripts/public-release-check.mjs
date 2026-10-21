import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const base = (process.env.AUDIT_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const executablePath = process.env.CHROME_PATH || (process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/google-chrome");
const output = ".review/product/public-release";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const checks = [], errors = [], apiRequests = [], externalDrafts = [];
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(base).origin });
  await context.addInitScript(origin => {
    if (location.origin === origin) localStorage.setItem("autodraftman-language", "zh");
  }, new URL(base).origin);
  // Intercept all draft links; these checks must never publish or send test feedback.
  await context.route("https://github.com/**", async route => {
    externalDrafts.push(route.request().url());
    await route.fulfill({ contentType: "text/html", body: "<title>Feedback destination</title>Review before publishing" });
  });
  context.on("page", page => {
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => { if (new URL(request.url()).pathname.includes("/api/")) apiRequests.push(request.url()); });
  });
  const page = await context.newPage();
  await page.goto(base + "/feedback", { waitUntil: "networkidle" });
  assert.equal(await page.locator(".product-feedback a.product-button-primary").isEnabled(), true);
  await page.locator(".product-feedback a.product-button-primary").click();
  assert.ok((await page.getByRole("status").innerText()).includes("10"));
  assert.equal(externalDrafts.length, 0);
  checks.push("Empty feedback cannot navigate or submit a report");

  const details = "调整文字后，导出的 SVG 仍需要保留颜色。\nSymbols: & + # ? <text> \"quotes\" 🦊";
  await page.locator("#feedback-message").fill(details);
  const link = new URL(await page.locator(".product-feedback a.product-button-primary").getAttribute("href"));
  assert.equal(link.origin, "https://github.com");
  assert.equal(link.pathname, "/QCYTSN/figfox/issues/new");
  assert.ok(link.searchParams.get("body").includes(details));
  assert.equal(link.searchParams.get("labels"), null);
  assert.ok((await page.locator("#feedback-public-note").innerText()).includes("公开"));
  await page.getByRole("button", { name: "复制内容", exact: true }).click();
  await page.getByRole("button", { name: "已复制", exact: true }).waitFor();
  assert.equal((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n"), link.searchParams.get("body"));
  const popupReady = page.waitForEvent("popup");
  await page.locator(".product-feedback a.product-button-primary").click();
  const popup = await popupReady;
  await popup.waitForLoadState();
  assert.equal(new URL(popup.url()).searchParams.get("body"), link.searchParams.get("body"));
  assert.equal(await page.locator("#feedback-message").inputValue(), details);
  await popup.close();
  checks.push("Public feedback preserves encoded details and opens a review page without automatic submission");

  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("#feedback-message").inputValue(), details);
  await page.getByRole("button", { name: "Switch to English" }).click();
  assert.equal(await page.locator("#feedback-message").inputValue(), details);
  assert.ok((await page.locator("#feedback-public-note").innerText()).includes("publicly"));
  checks.push("Feedback draft survives refresh and language changes");
  await page.screenshot({ path: output + "/feedback-desktop.png", fullPage: true });

  const longDetails = "这是完整的较长反馈。".repeat(300);
  await page.locator("#feedback-message").fill(longDetails);
  assert.equal(new URL(await page.locator(".product-feedback a.product-button-primary").getAttribute("href")).searchParams.has("body"), false);
  assert.ok((await page.getByRole("status").innerText()).includes("Copy it first"));
  await page.getByRole("button", { name: "Copy details", exact: true }).click();
  await page.getByRole("button", { name: "Copied", exact: true }).waitFor();
  assert.ok((await page.evaluate(() => navigator.clipboard.readText())).includes(longDetails));
  checks.push("Long feedback uses a short destination URL and copies the entire message");

  const fallback = await context.newPage();
  await fallback.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new Error("Clipboard denied"); } } }));
  await fallback.goto(base + "/feedback", { waitUntil: "networkidle" });
  await fallback.locator("#feedback-message").fill(details);
  await fallback.getByRole("button", { name: "复制内容", exact: true }).click();
  assert.ok((await fallback.getByRole("status").innerText()).includes("手动复制"));
  assert.equal(await fallback.locator("#feedback-message").evaluate(field => field.selectionEnd - field.selectionStart), details.length);
  assert.equal(await fallback.getByRole("button", { name: "已复制", exact: true }).count(), 0);
  checks.push("Clipboard denial selects the message without claiming a successful copy");
  await fallback.close();

  await page.setViewportSize({ width: 320, height: 760 });
  await page.locator("#feedback-message").fill(details);
  await page.screenshot({ path: output + "/feedback-mobile.png", fullPage: true });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  for (const route of ["/privacy", "/terms", "/content-policy"]) {
    await page.goto(base + route, { waitUntil: "networkidle" });
    assert.ok((await page.locator(".public-release-policy").innerText()).includes("当前公开版本"));
    assert.equal(await page.locator(".retention-ruler").count(), 0);
  }
  checks.push("Mobile feedback and policy pages accurately describe the public local version");
  assert.deepEqual(errors, []);
  assert.deepEqual(apiRequests, []);
  await context.close();
} finally {
  await browser.close();
  await writeFile(output + "/checks.json", JSON.stringify({ checks, errors, apiRequests, interceptedExternalDrafts: externalDrafts.length }, null, 2));
}
console.log(JSON.stringify({ checks, errors, apiRequests }, null, 2));
