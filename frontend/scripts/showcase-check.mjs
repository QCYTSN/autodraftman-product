import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const base = (process.env.AUDIT_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const output = ".review/demo/release";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/google-chrome"), headless: true });
const checks = [], errors = [], requests = [];
const record = name => checks.push(name);
const hash = value => createHash("sha256").update(value).digest("hex");

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
  await page.addInitScript(() => localStorage.setItem("autodraftman-language", "zh"));
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("response", response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  page.on("request", request => requests.push(request.url()));
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.locator(".demo-svg-mount > svg").waitFor();
  assert.equal(await page.locator("main h2").count(), 10);
  for (const id of ["demo-examples", "demo-method", "demo-content", "demo-results", "demo-evaluation", "demo-benchmarks", "demo-ablations", "demo-efficiency"]) {
    assert.equal(await page.locator("#" + id).count(), 1);
  }
  assert.equal(await page.locator('.demo-hero-actions a[href="#demo-examples"]').count(), 1);
  record("The release contains the full showcase, including editing, comparison and repair sections");

  const manifestResponse = await page.request.get(base + "/assets/demo/cases/manifest.json");
  assert.ok(manifestResponse.ok());
  const manifest = await manifestResponse.json();
  const allowed = [
    ...["study", "diffusion", "vit"].flatMap(id => ["input.png", "result.png", "result.svg", "baseline.svg"].map(file => `${id}/${file}`)),
    ...["wages", "privacy", "vgg"].map(id => `${id}/input.png`),
    ...["crop-original.png", "crop-draft.png", "sam-reading.png", "sam-restudy.png", "sam-recall.png", "repair-receipt.json"].map(file => "study/" + file),
  ];
  assert.deepEqual(manifest.files.map(item => item.file).sort(), allowed.sort());
  await Promise.all(manifest.files.map(async item => {
    const response = await page.request.get(base + "/assets/demo/cases/" + item.file);
    assert.ok(response.ok(), item.file);
    const bytes = await response.body();
    assert.equal(bytes.length, item.bytes, item.file);
    assert.equal(hash(bytes), item.sha256, item.file);
  }));
  const receipt = await (await page.request.get(base + "/assets/demo/cases/study/repair-receipt.json")).json();
  assert.deepEqual(Object.keys(receipt).sort(), ["checks", "geometryStatus", "status", "visualAcceptance", "visualPassed"]);
  assert.equal(receipt.visualAcceptance, "pending");
  record("Every selected published asset matches its manifest; repair receipts contain only display fields");

  const sourceBefore = await (await page.request.get(base + "/assets/demo/cases/study/result.svg")).text();
  const title = page.locator(".demo-svg-mount text").filter({ hasText: "Experiment 1: Restudy vs. Prior Test" });
  const originalMarkup = await title.evaluate(element => element.innerHTML);
  await title.dblclick();
  await page.getByRole("textbox", { name: "修改案例文字" }).fill("FigFox release editing check");
  await page.getByRole("textbox", { name: "修改案例文字" }).press("Enter");
  const edited = page.locator(".demo-svg-mount text").filter({ hasText: "FigFox release editing check" });
  const before = await edited.boundingBox();
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + before.width / 2 + 40, before.y + before.height / 2 + 24, { steps: 8 });
  await page.mouse.up();
  const after = await edited.boundingBox();
  assert.ok(Math.abs(after.x - before.x - 40) < 2 && Math.abs(after.y - before.y - 24) < 2);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载 SVG", exact: true }).click();
  await (await downloaded).saveAs(output + "/edited.svg");
  assert.ok((await readFile(output + "/edited.svg", "utf8")).includes("FigFox release editing check"));
  await page.getByRole("button", { name: "恢复案例", exact: true }).click();
  assert.equal(await title.evaluate(element => element.innerHTML), originalMarkup);
  assert.equal(hash(sourceBefore), hash(await (await page.request.get(base + "/assets/demo/cases/study/result.svg")).text()));
  record("Visitors can edit, drag, download and reset the actual SVG without changing the source asset");

  for (const [index, id, count] of [[1, "diffusion", 91], [2, "vit", 167], [0, "study", 49]]) {
    await page.locator(".demo-case-picker button").nth(index).click();
    await page.waitForFunction(total => document.querySelectorAll(".demo-svg-mount text").length === total, count);
    assert.ok((await page.locator(".demo-comparison-original img").getAttribute("src")).endsWith(`/${id}/input.png`));
  }
  const slider = page.getByRole("slider");
  await slider.focus();
  await slider.press("Home");
  assert.equal(await slider.inputValue(), "0");
  await slider.press("End");
  assert.equal(await slider.inputValue(), "100");
  await slider.fill("50");
  await page.getByRole("button", { name: "放大流程图", exact: true }).click();
  assert.equal(await page.locator(".demo-diagram-dialog:not(.demo-crop-dialog):not(.demo-refinement-dialog)").evaluate(dialog => dialog.open), true);
  await page.keyboard.press("Escape");
  record("All three examples, the native comparison slider and the architecture diagram remain interactive");

  await page.locator("#demo-content").scrollIntoViewIfNeeded();
  for (const kind of ["perception", "relations", "crops", "representation", "execution"]) {
    await page.locator("#demo-tab-" + kind).click();
    await page.locator('#demo-mechanism-panel[aria-busy="false"] .demo-mechanism-preview').waitFor();
    assert.ok(await page.locator(".demo-mechanism-preview img, .demo-mechanism-preview image").count());
    if (kind === "perception") {
      await page.locator(".demo-sam-crops button").nth(2).click();
      assert.equal(await page.locator(".demo-sam-crops button").nth(2).getAttribute("aria-pressed"), "true");
    }
    if (kind === "crops") {
      await page.locator("#demo-mechanism-panel").getByLabel("显示目标框", { exact: true }).uncheck();
      await page.getByRole("button", { name: "放大局部对照", exact: true }).click();
      assert.equal(await page.locator(".demo-crop-dialog").evaluate(dialog => dialog.open), true);
      await page.keyboard.press("Escape");
    }
    if (kind === "representation") {
      await page.getByRole("button", { name: "公式", exact: true }).click();
      await page.locator(".demo-formula-preview img").evaluate(image => image.decode());
    }
    if (kind === "execution") assert.ok((await page.locator(".demo-repair-receipt").innerText()).includes("视觉验收待完成"));
  }
  record("Five architecture modules expose actual crops, relationships, SVG layers and the repair receipt");

  await page.locator("#demo-results").scrollIntoViewIfNeeded();
  for (const id of ["formula", "connections", "layout"]) {
    await page.locator("#demo-result-tab-" + id).click();
    await page.locator('#demo-result-panel[aria-busy="false"] .demo-refinement-pair').waitFor();
    assert.equal(await page.locator("#demo-result-panel .demo-refinement-image img").count(), 2);
    await page.getByRole("button", { name: "完整图", exact: true }).click();
    await page.locator('#demo-result-panel[aria-busy="false"] .demo-refinement-pair').waitFor();
    await page.getByRole("button", { name: "重点局部", exact: true }).click();
    await page.locator('#demo-result-panel[aria-busy="false"] .demo-refinement-pair').waitFor();
    await page.getByRole("button", { name: "查看原图", exact: true }).click();
    await page.locator(".demo-refinement-original").waitFor();
    await page.keyboard.press("Escape");
  }
  await page.getByRole("button", { name: "放大对照", exact: true }).click();
  await page.getByRole("button", { name: "放大图像", exact: true }).click();
  assert.equal(await page.locator(".demo-refinement-dialog-canvas").evaluate(canvas => canvas.style.width), "150%");
  await page.keyboard.press("Escape");
  record("Three repair comparisons support full figures, detail regions, original references and zoom");

  await page.locator("#demo-evaluation").scrollIntoViewIfNeeded();
  await page.locator(".demo-evaluation-thumbnail img").evaluateAll(images => Promise.all(images.map(image => image.decode())));
  assert.equal(await page.locator(".demo-evaluation-thumbnail img").count(), 6);
  assert.deepEqual(await page.locator(".demo-research-placeholder > span").allTextContents(), ["占位", "占位", "占位", "占位"]);
  for (const id of ["demo-benchmarks", "demo-ablations", "demo-efficiency"]) {
    await page.locator(`.demo-research-index a[href="#${id}"]`).click();
    await page.waitForTimeout(750);
    const top = await page.locator("#" + id + "-title").evaluate(element => element.getBoundingClientRect().top);
    assert.ok(top > 60 && top < 200);
  }
  record("Six source samples are published; only the four unmeasured result charts use placeholders");

  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.getByRole("button", { name: "切换为英文" }).click();
  assert.ok((await page.locator("h1").innerText()).includes("Reconstruct"));
  assert.equal(await page.locator("main h2").count(), 10);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator("#demo-results").scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.equal(await page.locator("#demo-results .demo-section-heading").evaluate(element => getComputedStyle(element).opacity), "1");
  await page.screenshot({ path: output + "/showcase-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.getByRole("button", { name: "Switch to Chinese" }).click();
  await page.screenshot({ path: output + "/showcase-desktop.png", fullPage: true });
  await page.locator(".demo-header").getByRole("link", { name: "开始使用" }).click();
  await page.waitForURL(/\/workspace$/);
  await page.locator("#figure-prompt").waitFor();
  assert.equal(await page.locator(".product-documents").count(), 0);
  record("The complete showcase supports both languages, small screens, reduced motion and product entry");

  assert.deepEqual(errors, []);
  assert.deepEqual(requests.filter(url => url.includes("/__demo-assets/") || new URL(url).pathname.includes("/api/")), []);
  await writeFile(output + "/checks.json", JSON.stringify({ base, checks, errors, apiRequests: [], assetCount: allowed.length }, null, 2));
  console.log(JSON.stringify({ checks: checks.length, errors, assetCount: allowed.length }));
} finally { await browser.close(); }
