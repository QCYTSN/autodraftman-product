import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const base = (process.env.AUDIT_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const output = ".review/product/editor-save";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/google-chrome"), headless: true });
const checks = [], errors = [];
const sample = '<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><rect id="export-panel" x="260" y="190" width="340" height="200" fill="#eef2ff" stroke="#6243ce"/><text x="430" y="290" text-anchor="middle" font-size="32">Saved at export</text></svg>';
const ready = page => page.waitForFunction(() => { const button = document.querySelector('button[aria-label="导出 SVG"]'); return button && !button.disabled; });
async function edit(page) {
  page.on("pageerror", error => errors.push(error.message));
  await page.addInitScript(() => { if (location.origin !== "null") localStorage.setItem("autodraftman-language", "zh"); });
  await page.goto(base + "/editor", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "新建空白画布", exact: true }).click();
  await ready(page);
  await page.locator('input[type="file"]').first().setInputFiles({ name: "export-save.svg", mimeType: "image/svg+xml", buffer: Buffer.from(sample) });
  await ready(page);
  await page.frameLocator("iframe").locator("#export-panel").click({ position: { x: 20, y: 20 } });
  await page.getByRole("button", { name: /^填充:/ }).click();
  await page.getByRole("option", { name: "#24a37a", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("iframe").contentDocument.querySelector("#export-panel").getAttribute("fill") === "#24a37a");
}
async function exportSvg(page, name) {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 SVG", exact: true }).click();
  await (await pending).saveAs(output + "/" + name);
  const contents = await readFile(output + "/" + name, "utf8");
  assert.ok(contents.includes("#24a37a") && contents.includes("Saved at export"));
}
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await edit(page);
  await exportSvg(page, "saved-export.svg");
  const saved = await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open("figfox-local-editor", 2);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const active = db.transaction("preferences", "readonly").objectStore("preferences").get("active");
      active.onerror = () => reject(active.error);
      active.onsuccess = () => {
        const document = db.transaction("documents", "readonly").objectStore("documents").get(active.result);
        document.onerror = () => reject(document.error);
        document.onsuccess = () => { db.close(); resolve(document.result); };
      };
    };
  }));
  assert.equal(saved.fileName, "export-save.svg");
  assert.ok(saved.markup.includes("#24a37a"));
  checks.push("Export commits the latest edited document before delivering its download");
  await page.reload({ waitUntil: "networkidle" });
  await ready(page);
  assert.equal(await page.frameLocator("iframe").locator("#export-panel").getAttribute("fill"), "#24a37a");
  checks.push("Refreshing immediately after export restores that document and its edits");
  await page.close();

  const blocked = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await blocked.addInitScript(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (stores, mode, ...rest) {
      if (mode === "readwrite") throw new DOMException("Local storage is full", "QuotaExceededError");
      return original.call(this, stores, mode, ...rest);
    };
  });
  await edit(blocked);
  await exportSvg(blocked, "storage-failed-export.svg");
  assert.ok((await blocked.locator(".product-editor-title [role=status]").innerText()).includes("本地保存失败"));
  assert.equal(await blocked.frameLocator("iframe").locator("#export-panel").getAttribute("fill"), "#24a37a");
  checks.push("A failed local save still exports the real edited SVG and reports the failure honestly");
  await blocked.close();
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await writeFile(output + "/checks.json", JSON.stringify({ checks, errors }, null, 2));
}
console.log(JSON.stringify({ checks, errors }, null, 2));
