import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const base = (process.env.AUDIT_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const output = ".review/product/documents";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/google-chrome"), headless: true });
const checks = [], errors = [], apiRequests = [];
const record = name => checks.push(name);
const ready = page => page.waitForFunction(() => { const exportButton = document.querySelector('button[aria-label="导出 SVG"]'); return exportButton && !exportButton.disabled; });
const card = (page, name) => page.locator(".product-document-card").filter({ has: page.getByRole("heading", { name, exact: true }) });
const figure = (id, title) => `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect id="${id}" x="110" y="90" width="280" height="150" fill="#eef2ff" stroke="#6243ce"/><text x="140" y="170" font-size="24" font-family="Arial">${title}</text></svg>`;

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await page.addInitScript(() => localStorage.setItem("autodraftman-language", "zh"));
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  page.on("request", request => { if (new URL(request.url()).pathname.includes("/api/")) apiRequests.push(request.url()); });

  await page.goto(base + "/docs", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "用示例开始编辑" }).click();
  await ready(page);
  assert.equal(await page.frameLocator("iframe").locator("#svgcontent text").count(), 49);
  assert.equal(await page.locator(".product-editor-title strong").innerText(), "FigFox-example.svg");
  record("Guide opens the real, editable experiment example");
  await page.locator(".product-editor-back").click();
  await card(page, "FigFox-example.svg").waitFor();
  record("An example becomes a saved workspace document");

  for (const [name, id, title] of [["chart-a.svg", "document-a", "Study A"], ["chart-b.svg", "document-b", "Study B"]]) {
    await page.getByLabel("导入 SVG 文档", { exact: true }).setInputFiles({ name, mimeType: "image/svg+xml", buffer: Buffer.from(figure(id, title)) });
    await ready(page);
    assert.equal(await page.frameLocator("iframe").locator(`#svgcontent #${id}`).count(), 1);
    await page.locator(".product-editor-back").click();
    await card(page, name).waitFor();
  }
  assert.equal(await page.locator(".product-document-card").count(), 3);
  record("Importing multiple documents preserves each SVG separately");

  await card(page, "chart-a.svg").getByRole("button", { name: "打开 chart-a.svg" }).click();
  await ready(page);
  const frame = page.frameLocator("iframe");
  await frame.locator("#svgcontent #document-a").click({ position: { x: 20, y: 20 } });
  await page.getByRole("button", { name: /^填充:/ }).click();
  await page.getByRole("option", { name: "#24a37a", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("iframe").contentDocument.querySelector("#document-a").getAttribute("fill") === "#24a37a");
  await page.locator(".product-editor-back").click();
  await card(page, "chart-a.svg").waitFor();
  await card(page, "chart-b.svg").getByRole("button", { name: "打开 chart-b.svg" }).click();
  await ready(page);
  assert.equal(await page.frameLocator("iframe").locator("#document-b").getAttribute("fill"), "#eef2ff");
  await page.locator(".product-editor-back").click();
  await card(page, "chart-a.svg").getByRole("button", { name: "打开 chart-a.svg" }).click();
  await ready(page);
  assert.equal(await page.frameLocator("iframe").locator("#document-a").getAttribute("fill"), "#24a37a");
  record("Editing one SVG does not modify another, including immediate navigation");

  await page.locator(".product-editor-back").click();
  await card(page, "chart-a.svg").getByRole("button", { name: "重命名 SVG" }).click();
  await page.getByLabel("文档名称", { exact: true }).fill("study-revised");
  await page.getByRole("button", { name: "保存文档名称" }).click();
  await card(page, "study-revised.svg").waitFor();
  const downloaded = page.waitForEvent("download");
  await card(page, "study-revised.svg").getByRole("button", { name: "下载 SVG 文档" }).click();
  const file = await downloaded;
  await file.saveAs(output + "/study-revised.svg");
  assert.equal(file.suggestedFilename(), "study-revised.svg");
  assert.ok((await readFile(output + "/study-revised.svg", "utf8")).includes("#24a37a"));
  record("Renaming and gallery downloads use the saved, edited document");

  await page.getByLabel("搜索 SVG 文档").fill("revised");
  assert.equal(await page.locator(".product-document-card").count(), 1);
  await page.getByLabel("搜索 SVG 文档").fill("nothing-matches");
  assert.equal(await page.locator(".product-document-card").count(), 0);
  assert.equal(await page.getByText("没有找到匹配的文档。", { exact: true }).count(), 1);
  await page.getByLabel("搜索 SVG 文档").fill("");
  record("Search filters document names and reports no matches");

  await page.getByRole("button", { name: /新建画布/ }).click();
  await ready(page);
  assert.equal(await page.frameLocator("iframe").locator("#svgcontent #document-a").count(), 0);
  await page.locator(".product-editor-back").click();
  await card(page, "未命名图像.svg").waitFor();
  assert.equal(await page.locator(".product-document-card").count(), 4);
  record("New canvases are separate documents and preserve previous work");

  await page.getByLabel("导入 SVG 文档", { exact: true }).setInputFiles({ name: "broken.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg><unclosed>") });
  await page.getByRole("alert").waitFor();
  assert.equal(await page.locator(".product-document-card").count(), 4);
  assert.ok(new URL(page.url()).pathname.endsWith("/workspace"));
  record("Failed imports neither create a document nor replace saved work");

  await card(page, "chart-b.svg").getByRole("button", { name: "删除 SVG 文档" }).click();
  await page.getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("alertdialog").waitFor({ state: "hidden" });
  assert.equal(await card(page, "chart-b.svg").count(), 1);
  await card(page, "chart-b.svg").getByRole("button", { name: "删除 SVG 文档" }).click();
  await page.getByRole("button", { name: "删除文档", exact: true }).click();
  await page.getByRole("alertdialog").waitFor({ state: "hidden" });
  assert.equal(await page.locator(".product-document-card").count(), 3);
  assert.equal(await card(page, "chart-b.svg").count(), 0);
  await page.reload({ waitUntil: "networkidle" });
  await card(page, "study-revised.svg").waitFor();
  assert.equal(await page.locator(".product-document-card").count(), 3);
  record("Delete confirmation removes only the selected document and persists after reload");

  await card(page, "study-revised.svg").getByRole("button", { name: "打开 study-revised.svg" }).click();
  await ready(page);
  assert.equal(await page.locator(".product-editor-title strong").innerText(), "study-revised.svg");
  assert.equal(await page.frameLocator("iframe").locator("#document-a").getAttribute("fill"), "#24a37a");
  await page.locator(".product-editor-back").click();
  await page.getByRole("tab", { name: "重建", exact: true }).click();
  await page.locator("#reference-file").setInputFiles({ name: "reference.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/NhoAAAAASUVORK5CYII=", "base64") });
  await page.locator(".product-workspace-source").waitFor();
  const referenceUrl = await page.locator(".product-workspace-source").getAttribute("src");
  await page.getByRole("button", { name: "我的 SVG", exact: true }).click();
  await card(page, "study-revised.svg").waitFor();
  assert.equal(await page.locator(".product-document-card").count(), 3);
  await page.getByRole("button", { name: "原图预览", exact: true }).click();
  assert.equal(await page.locator(".product-workspace-source").getAttribute("src"), referenceUrl);
  await page.getByRole("tab", { name: "创建", exact: true }).click();
  record("The source preview and saved SVG library switch without discarding either");
  await page.waitForFunction(() => getComputedStyle(document.querySelector(".workspace-page")).opacity === "1");
  await page.locator(".product-document-preview img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.screenshot({ path: output + "/library-desktop.png" });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.screenshot({ path: output + `/library-${width}.png`, fullPage: true });
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      libraryTop: document.querySelector(".product-documents-heading").getBoundingClientRect().top,
      escaped: [...document.querySelectorAll("main *, .workspace-layout *")].filter(element => { const rect = element.getBoundingClientRect(); return rect.width && rect.right > innerWidth + 1; }).map(element => element.tagName + "." + element.className).slice(0, 12),
    }));
    assert.equal(layout.documentWidth > width, false, JSON.stringify(layout));
    assert.ok(layout.libraryTop < 400, "Available SVG actions should appear before the pending preparation form");
  }
  record("Saved documents reopen with their new names; populated layouts fit desktop and mobile");

  const migrationContext = await browser.newContext();
  const legacyTab = await migrationContext.newPage();
  await legacyTab.goto(base + "/pricing", { waitUntil: "networkidle" });
  await legacyTab.evaluate(async markup => {
    localStorage.setItem("autodraftman-language", "zh");
    await new Promise((resolve, reject) => {
      const request = indexedDB.open("figfox-local-editor", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("documents");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        window.legacyEditorDatabase = request.result;
        const transaction = request.result.transaction("documents", "readwrite");
        transaction.objectStore("documents").put({ fileName: "legacy-figure.svg", markup, updatedAt: new Date().toISOString() }, "current");
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, figure("legacy-panel", "Retained legacy document"));
  const updatedTab = await migrationContext.newPage();
  updatedTab.on("pageerror", error => errors.push(error.message));
  await updatedTab.goto(base + "/workspace", { waitUntil: "networkidle" });
  await updatedTab.getByRole("alert").waitFor();
  assert.ok((await updatedTab.getByRole("alert").innerText()).includes("关闭其他 FigFox 标签页"));
  await legacyTab.close();
  await updatedTab.reload({ waitUntil: "networkidle" });
  await card(updatedTab, "legacy-figure.svg").waitFor();
  await card(updatedTab, "legacy-figure.svg").getByRole("button", { name: "打开 legacy-figure.svg" }).click();
  await ready(updatedTab);
  assert.equal(await updatedTab.frameLocator("iframe").locator("#legacy-panel").count(), 1);
  await migrationContext.close();
  record("An older open tab gets an actionable upgrade message; closing it preserves and migrates the old SVG");

  assert.deepEqual(errors, []);
  assert.deepEqual(apiRequests, []);
  await writeFile(output + "/checks.json", JSON.stringify({ base, checks, errors, apiRequests }, null, 2));
  console.log(JSON.stringify({ checks: checks.length, errors, apiRequests }));
} finally { await browser.close(); }
