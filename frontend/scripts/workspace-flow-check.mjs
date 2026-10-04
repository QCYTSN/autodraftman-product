import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const base = (process.env.AUDIT_BASE_URL || "http://127.0.0.1:5173").replace(/\/$/, "");
const executablePath = process.env.CHROME_PATH || (process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/google-chrome");
const output = ".review/product/workspace-v3";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const checks = [], errors = [], apiRequests = [];
const record = name => checks.push(name);
async function watch(page) {
  await page.addInitScript(() => localStorage.setItem("autodraftman-language", "zh"));
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", request => { if (new URL(request.url()).pathname.includes("/api/")) apiRequests.push(request.url()); });
}
const open = async (page, route) => { await page.goto(base + route, { waitUntil: "networkidle" }); await page.evaluate(() => document.fonts.ready); };
const noOverflow = async page => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await watch(page);
  await page.clock.install();
  await open(page, "/workspace");
  const prompt = page.locator("#figure-prompt");
  const first = await prompt.getAttribute("placeholder");
  assert.equal(await prompt.inputValue(), "");
  await page.clock.fastForward(7200);
  assert.notEqual(await prompt.getAttribute("placeholder"), first);
  await prompt.focus();
  const focused = await prompt.getAttribute("placeholder");
  await page.clock.fastForward(15000);
  assert.equal(await prompt.getAttribute("placeholder"), focused);
  await prompt.fill("A research workflow with a feedback connection.");
  await page.locator(".workspace-start-heading h2").click();
  await page.clock.fastForward(15000);
  assert.equal(await prompt.inputValue(), "A research workflow with a feedback connection.");
  record("Suggestions rotate while empty, pause on focus and never overwrite entered text");

  await prompt.fill("");
  const beforeManual = await prompt.getAttribute("placeholder");
  await page.getByRole("button", { name: "换个提示", exact: true }).click();
  assert.notEqual(await prompt.getAttribute("placeholder"), beforeManual);
  const selected = await prompt.getAttribute("placeholder");
  await page.getByRole("button", { name: "使用这段描述", exact: true }).click();
  assert.equal(await prompt.inputValue(), selected);
  assert.equal(await prompt.evaluate(element => document.activeElement === element), true);
  record("Manual suggestions can be selected and edited as ordinary draft text");

  await page.getByRole("tab", { name: "图片转 SVG", exact: true }).click();
  assert.equal(await prompt.inputValue(), selected);
  const source = { name: "local-source.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/NhoAAAAASUVORK5CYII=", "base64") };
  await page.locator("#reference-file").setInputFiles(source);
  const sourceUrl = await page.locator(".product-workspace-source").getAttribute("src");
  assert.ok(sourceUrl.startsWith("blob:"));
  assert.ok(await page.locator(".reference-block").evaluate(element => element.compareDocumentPosition(document.querySelector(".product-prompt-field")) & Node.DOCUMENT_POSITION_FOLLOWING));
  await page.locator(".product-account").click();
  await page.waitForURL(/\/login$/);
  assert.equal(await page.locator(".product-header").count(), 0);
  assert.equal(await page.getByRole("dialog").count(), 0);
  assert.equal(await page.locator(".product-login-providers .oauth-button:disabled").count(), 3);
  assert.equal(await page.title(), "登录 · FigFox");
  await page.clock.fastForward(14000);
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await page.waitForURL(/\/workspace$/);
  assert.equal(await prompt.inputValue(), selected);
  assert.equal(await page.locator(".product-workspace-source").getAttribute("src"), sourceUrl);
  await page.locator(".product-account").click();
  await page.getByRole("button", { name: "继续使用工作台", exact: true }).click();
  await page.waitForURL(/\/workspace$/);
  assert.equal(await prompt.inputValue(), selected);
  assert.equal(await page.locator(".product-workspace-source").getAttribute("src"), sourceUrl);
  assert.equal(await page.locator(".workspace-balance").count(), 0);
  record("Independent sign-in preserves the draft and local image on Back and Continue, without creating an identity");

  await page.getByRole("button", { name: "了解处理过程", exact: true }).click();
  const process = page.locator(".figure-process-preview");
  const current = process.locator('[aria-current="step"]');
  assert.ok((await process.innerText()).includes("尚未提交你的草稿"));
  assert.ok((await current.innerText()).includes("重建 SVG"));
  await page.clock.fastForward(6700);
  assert.ok((await current.innerText()).includes("检查关系"));
  await process.getByRole("button", { name: "暂停", exact: true }).click();
  assert.equal(await process.locator(".figure-process-scan").evaluate(element => getComputedStyle(element).animationPlayState), "paused");
  await page.clock.fastForward(15000);
  assert.ok((await current.innerText()).includes("检查关系"));
  await process.getByRole("button", { name: "播放", exact: true }).click();
  await page.clock.fastForward(6700);
  assert.ok((await current.innerText()).includes("修复问题"));
  await page.clock.fastForward(6700);
  assert.ok((await current.innerText()).includes("整理结果"));
  await process.getByRole("button", { name: "重新播放", exact: true }).click();
  assert.ok((await current.innerText()).includes("重建 SVG"));
  await process.getByRole("button", { name: /检查关系/ }).click();
  assert.equal(await process.getByRole("button", { name: "播放", exact: true }).isVisible(), true);
  await process.getByRole("button", { name: "返回草稿", exact: true }).click();
  assert.equal(await prompt.inputValue(), selected);
  assert.equal(await page.locator(".product-workspace-source").getAttribute("src"), sourceUrl);
  assert.equal(await page.locator(".generate-button").isDisabled(), true);
  record("Process illustration advances, pauses its motion, supports replay and preserves the draft without submitting a task");
  await noOverflow(page);
  await page.close();

  const reduced = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  await watch(reduced);
  await reduced.clock.install();
  await open(reduced, "/workspace");
  const initialReduced = await reduced.locator("#figure-prompt").getAttribute("placeholder");
  await reduced.clock.fastForward(15000);
  assert.equal(await reduced.locator("#figure-prompt").getAttribute("placeholder"), initialReduced);
  await reduced.getByRole("button", { name: "了解处理过程", exact: true }).click();
  await reduced.clock.fastForward(15000);
  assert.equal(await reduced.getByRole("button", { name: "播放", exact: true }).isVisible(), true);
  assert.equal(await reduced.locator(".figure-process-flow").count(), 0);
  await reduced.locator(".figure-process-steps button").nth(1).click();
  assert.ok((await reduced.locator('[aria-current="step"]').innerText()).includes("生成图片"));
  record("Reduced motion disables automatic cycling and animation while retaining manual controls");
  await reduced.close();

  // Fresh sessions keep captures independent from the test drafts above.
  for (const language of ["zh", "en"]) {
    const preview = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await watch(preview);
    await open(preview, "/workspace");
    if (language === "en") await preview.getByRole("button", { name: "Switch to English", exact: true }).click();
    for (const width of [1440, 768, 390, 320]) {
      await preview.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
      await noOverflow(preview);
      await preview.waitForTimeout(650);
      await preview.screenshot({ path: `${output}/workspace-${language}-${width}.png`, fullPage: true });
      await preview.getByRole("tab", { name: language === "zh" ? "图片转 SVG" : "Image to SVG", exact: true }).click();
      await noOverflow(preview);
      const hintFits = await preview.locator(".product-prompt-suggestion").evaluate(element => element.getBoundingClientRect().bottom <= document.querySelector("#figure-prompt").getBoundingClientRect().bottom);
      assert.ok(hintFits, `The reconstruction example must fit the input at ${width}px in ${language}`);
      const uploadFits = await preview.locator(".upload-zone").evaluate(element => {
        const button = element.getBoundingClientRect(), card = element.closest(".control-panel").getBoundingClientRect();
        return button.left >= card.left && button.right <= card.right;
      });
      assert.ok(uploadFits, `The source control must fit the composer at ${width}px in ${language}`);
      await preview.screenshot({ path: `${output}/rebuild-${language}-${width}.png`, fullPage: true });
      await preview.getByRole("tab", { name: language === "zh" ? "创建图片" : "Create image", exact: true }).click();
      await preview.locator(".settings-summary").click();
      const options = await preview.locator(".settings-disclosure-body").boundingBox();
      assert.ok(options.x >= 0 && options.x + options.width <= width, JSON.stringify(options));
      await preview.keyboard.press("Escape");
      await preview.locator(".product-account").click();
      await preview.waitForURL(/\/login$/);
      await noOverflow(preview);
      await preview.waitForTimeout(650);
      await preview.screenshot({ path: `${output}/login-${language}-${width}.png`, fullPage: true });
      await preview.locator(".product-login-back").click();
      await preview.waitForURL(/\/workspace$/);
      if (width === 390) {
        await preview.getByRole("button", { name: language === "zh" ? "历史记录" : "History", exact: true }).click();
        await preview.getByRole("dialog").getByRole("button", { name: language === "zh" ? "本地工作台" : "Local workspace", exact: true }).click();
        await preview.waitForURL(/\/login$/);
        await preview.getByRole("dialog").waitFor({ state: "hidden" });
        await preview.locator(".product-login-back").click();
        await preview.waitForURL(/\/workspace$/);
        assert.equal(await preview.getByRole("dialog").isVisible(), false);
      }
    }
    await preview.close();
  }
  record("Chinese and English input and independent sign-in layouts fit desktop, tablet and narrow phones");
  assert.deepEqual(errors, []);
  assert.deepEqual(apiRequests, []);
  await writeFile(output + "/checks.json", JSON.stringify({ base, checks, errors, apiRequests }, null, 2));
  console.log(JSON.stringify({ workspaceChecks: checks.length, errors, apiRequests }));
} finally { await browser.close(); }
