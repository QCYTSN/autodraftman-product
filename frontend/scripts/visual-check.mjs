import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const outputDir = path.resolve(".review");
const executablePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath,
  headless: true,
});

const errors = [];
const results = [];

async function createPage(viewport) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 1,
    colorScheme: "light",
  });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return page;
}

async function recordLayout(page, name) {
  const metrics = await page.evaluate(() => ({
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    document: {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    },
    horizontalOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  results.push({ name, ...metrics });
}

const desktop = await createPage({ width: 1440, height: 1000 });
await desktop.goto(baseUrl, { waitUntil: "networkidle" });
await desktop.waitForTimeout(550);
await desktop.screenshot({
  path: path.join(outputDir, "home-desktop.png"),
  fullPage: true,
});
await recordLayout(desktop, "home-desktop");
if ((await desktop.locator(".header-workspace-button").count()) !== 1) {
  errors.push("Expected the homepage header to use a workspace call to action.");
}
await desktop.locator(".story-step").nth(1).scrollIntoViewIfNeeded();
await desktop.waitForTimeout(600);
await desktop.screenshot({
  path: path.join(outputDir, "home-story-reference.png"),
});
await desktop.locator(".story-step").nth(2).scrollIntoViewIfNeeded();
await desktop.waitForTimeout(600);
await desktop.screenshot({
  path: path.join(outputDir, "home-story-complete.png"),
});

await desktop.goto(`${baseUrl}/examples`, { waitUntil: "networkidle" });
await desktop.waitForTimeout(450);
await desktop.screenshot({
  path: path.join(outputDir, "examples-desktop.png"),
  fullPage: true,
});
await recordLayout(desktop, "examples-desktop");
if ((await desktop.locator(".example-case").count()) !== 3) {
  errors.push("Expected three truthful R&D example cases.");
}
await desktop.locator(".example-case").nth(1).locator("button").click();
await desktop.waitForURL(/\/workspace$/);
if ((await desktop.locator(".empty-result").count()) !== 1) {
  errors.push("Expected examples to open a blank workspace.");
}
if (
  (await desktop.locator(
    ".example-result, .example-dock, .workspace-example-context",
  ).count()) !== 0
) {
  errors.push("Expected the workspace to remain free of R&D examples.");
}

await desktop.goto(`${baseUrl}/workspace`, { waitUntil: "networkidle" });
await desktop.waitForTimeout(550);
if ((await desktop.locator(".site-header .account-button").count()) !== 0) {
  errors.push("Expected the workspace header to reserve its actions for language switching.");
}
if ((await desktop.locator(".workspace-home-link").count()) !== 1) {
  errors.push("Expected the workspace header to include an explicit return-home action.");
}
await desktop.locator(".workspace-home-link").click();
await desktop.waitForURL((url) => url.pathname === "/" || url.pathname.endsWith("/autodraftman/"));
await desktop.goto(`${baseUrl}/workspace`, { waitUntil: "networkidle" });
if (!(await desktop.locator(".workspace-account-summary").first().textContent())?.includes("登录")) {
  errors.push("Expected sign-in to appear at the bottom of the workspace history rail.");
}
await desktop.locator(".open-editor-button").click();
await desktop.waitForURL(/\/editor$/);
await desktop.waitForTimeout(450);
if ((await desktop.locator(".editor-page .svg-import-stage").count()) !== 1) {
  errors.push("Expected the empty SVG route to open as a dedicated import scene.");
}
if (
  !(await desktop.locator(".svg-import-stage").textContent())?.includes(
    "打开一个 SVG 文档",
  )
) {
  errors.push("Expected the empty SVG editor to offer a real local SVG import.");
}
if (
  (await desktop.locator(
    ".svg-editor-shell, .svg-toolrail, .svg-inspector, .svg-workbench-toolbar",
  ).count()) !== 0
) {
  errors.push("Expected editing chrome to stay hidden until an SVG document is loaded.");
}
if (await desktop.locator(".editor-export-button").isEnabled()) {
  errors.push("Expected SVG export to remain disabled before a document is loaded.");
}
await desktop.screenshot({
  path: path.join(outputDir, "editor-empty-desktop.png"),
});
const editorFileInput = desktop.locator('input[type="file"][accept*=".svg"]');
await editorFileInput.setInputFiles({
  name: "unsafe-review.svg",
  mimeType: "image/svg+xml",
  buffer: Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" onload="alert(1)"><script>alert(1)</script><rect width="120" height="80" fill="#d97757"/><image href="https://example.com/tracker.png" width="1" height="1"/></svg>',
  ),
});
await desktop.waitForSelector(".svg-document-preview img");
if (!(await desktop.locator(".svg-safety-note").isVisible())) {
  errors.push("Expected imported SVGs with unsafe content to report sanitization.");
}
const sanitizedSvg = await desktop.locator(".svg-document-preview img").evaluate(
  async (image) => fetch(image.src).then((response) => response.text()),
);
if (/script|onload|https:\/\/example\.com/i.test(sanitizedSvg)) {
  errors.push("Expected scripts, event handlers, and external image references to be removed.");
}
await editorFileInput.setInputFiles(path.resolve("public/favicon.svg"));
await desktop.waitForFunction(
  () => document.querySelector(".editor-document-title strong")?.textContent === "favicon.svg",
);
if (!(await desktop.locator(".editor-export-button").isEnabled())) {
  errors.push("Expected SVG export to become available after a safe import.");
}
if ((await desktop.locator(".svg-layer-list li").count()) < 1) {
  errors.push("Expected imported SVG structure to appear in the inspector.");
}
await editorFileInput.setInputFiles({
  name: "font-review.svg",
  mimeType: "image/svg+xml",
  buffer: Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#fffdf8"/><text x="30" y="210" font-family="Research Serif, serif" font-size="42">AutoDraftman</text></svg>',
  ),
});
await desktop.waitForSelector(".svg-font-note");
if (!(await desktop.locator(".svg-artboard").evaluate((element) =>
  element.classList.contains("aspect-square"),
))) {
  errors.push("Expected square SVGs to use the square canvas fitting rule.");
}
await editorFileInput.setInputFiles({
  name: "wide-review.svg",
  mimeType: "image/svg+xml",
  buffer: Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 400"><rect width="1800" height="400" fill="#fffdf8"/><path d="M80 200H1720" stroke="#141413" stroke-width="16"/><circle cx="900" cy="200" r="70" fill="#c86445"/></svg>',
  ),
});
await desktop.waitForFunction(
  () => document.querySelector(".editor-document-title strong")?.textContent === "wide-review.svg",
);
if (!(await desktop.locator(".svg-artboard").evaluate((element) =>
  element.classList.contains("aspect-wide"),
))) {
  errors.push("Expected very wide SVGs to use the wide canvas fitting rule.");
}
await editorFileInput.setInputFiles({
  name: "portrait-review.svg",
  mimeType: "image/svg+xml",
  buffer: Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 1000"><rect width="500" height="1000" fill="#fffdf8"/><path d="M250 80V920" stroke="#141413" stroke-width="14"/><circle cx="250" cy="500" r="72" fill="#c86445"/></svg>',
  ),
});
await desktop.waitForFunction(
  () => document.querySelector(".editor-document-title strong")?.textContent === "portrait-review.svg",
);
if (!(await desktop.locator(".svg-artboard").evaluate((element) =>
  element.classList.contains("aspect-portrait"),
))) {
  errors.push("Expected portrait SVGs to use the portrait canvas fitting rule.");
}
const canvasFit = await desktop.locator(".svg-canvas-viewport").evaluate((viewport) => {
  const canvas = viewport.getBoundingClientRect();
  const artboard = viewport.querySelector(".svg-artboard")?.getBoundingClientRect();
  return Boolean(
    artboard &&
      artboard.left >= canvas.left &&
      artboard.right <= canvas.right &&
      artboard.top >= canvas.top &&
      artboard.bottom <= canvas.bottom,
  );
});
if (!canvasFit) {
  errors.push("Expected portrait SVGs to remain fully inside the editor canvas.");
}
await editorFileInput.setInputFiles({
  name: "too-large.svg",
  mimeType: "image/svg+xml",
  buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 32),
});
await desktop.waitForSelector(".svg-canvas-alert");
if ((await desktop.locator(".editor-document-title strong").textContent()) !== "portrait-review.svg") {
  errors.push("Expected an invalid replacement to preserve the previously opened SVG.");
}
await desktop.screenshot({
  path: path.join(outputDir, "editor-desktop.png"),
});
await recordLayout(desktop, "editor-desktop");
await desktop.locator(".editor-back-button").click();
await desktop.waitForURL(/\/workspace$/);
await desktop.fill(
  "#figure-prompt",
  "绘制一个双分支编码器结构，展示均值、方差和加权采样之间的关系。",
);
await desktop.click(".generate-button");
await desktop.waitForSelector(".login-dialog");
await desktop.click(".guest-button");
await desktop.waitForSelector(".field-message", { timeout: 7000 });
const guestBalance = await desktop.locator(".workspace-balance strong").textContent();
if (guestBalance?.trim() !== "1") {
  errors.push(`Expected server guest balance 1, received ${guestBalance}`);
}
await desktop.waitForTimeout(850);
await desktop.screenshot({
  path: path.join(outputDir, "workspace-desktop.png"),
  fullPage: true,
});
await recordLayout(desktop, "workspace-desktop");
if ((await desktop.locator(".workspace-record.current").count()) !== 1) {
  errors.push("Expected the active prompt to appear as the current draft.");
}
await desktop.locator(".workspace-record.current .workspace-record-rename").click();
await desktop.locator(".workspace-record.current .draft-rename-form input").fill("双分支方法图");
await desktop.locator(".workspace-record.current .draft-rename-form").press("Enter");
await desktop.waitForTimeout(850);
if (
  (await desktop.locator(".workspace-record.current strong").textContent())?.trim() !==
  "双分支方法图"
) {
  errors.push("Expected the draft title to update inline.");
}
const expandedHistoryWidth = await desktop
  .locator(".workspace-history")
  .evaluate((element) => element.getBoundingClientRect().width);
await desktop.click(".history-collapse-button");
await desktop.waitForTimeout(320);
const collapsedHistoryWidth = await desktop
  .locator(".workspace-history")
  .evaluate((element) => element.getBoundingClientRect().width);
if (expandedHistoryWidth < 200 || collapsedHistoryWidth > 80) {
  errors.push(
    `Unexpected history rail widths: expanded ${expandedHistoryWidth}, collapsed ${collapsedHistoryWidth}.`,
  );
}
await desktop.screenshot({
  path: path.join(outputDir, "workspace-collapsed.png"),
});
await desktop.reload({ waitUntil: "networkidle" });
await desktop
  .waitForFunction(
    () => document.querySelector("#figure-prompt")?.value.includes("双分支编码器"),
    undefined,
    { timeout: 4000 },
  )
  .catch(() => undefined);
const restoredPrompt = await desktop.locator("#figure-prompt").inputValue();
if (!restoredPrompt.includes("双分支编码器")) {
  errors.push("Expected the current workspace draft to persist after reload.");
}
if (!(await desktop.locator(".workspace-page").evaluate((element) =>
  element.classList.contains("history-collapsed"),
))) {
  errors.push("Expected the collapsed history preference to persist after reload.");
}
await desktop.click(".history-collapse-button");
await desktop.click(".new-draft-button");
if ((await desktop.locator("#figure-prompt").inputValue()) !== "") {
  errors.push("Expected a new workspace draft to start blank.");
}
if ((await desktop.locator(".workspace-record").count()) < 2) {
  errors.push("Expected the previous draft to remain available after creating a new one.");
}
await desktop.locator(".workspace-record-delete").last().click();
await desktop.waitForSelector(".draft-delete-dialog");
await desktop.click(".draft-delete-dialog .danger-button");
if ((await desktop.locator(".workspace-record").count()) !== 1) {
  errors.push("Expected a deleted draft to disappear from the workspace records.");
}
await desktop.fill(
  "#figure-prompt",
  "绘制一个双分支编码器结构，展示均值、方差和加权采样之间的关系。",
);
await desktop.locator(".mode-switch button").nth(1).click();
await desktop.locator("#reference-file").setInputFiles(
  path.resolve("public/assets/autodraftman-showcase.png"),
);
await desktop.waitForTimeout(250);
await desktop.screenshot({
  path: path.join(outputDir, "workspace-reference-static.png"),
});
await desktop.click(".language-button");
await desktop.waitForTimeout(120);
const referenceModeFits = await desktop.locator(".mode-switch").evaluate((element) => {
  const bounds = element.getBoundingClientRect();
  return (
    element.scrollWidth <= element.clientWidth + 1 &&
    [...element.querySelectorAll("button")].every((button) => {
      const rect = button.getBoundingClientRect();
      return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1;
    })
  );
});
if (!referenceModeFits) {
  errors.push("Expected the English reference mode switch to remain inside its frame.");
}
await desktop.screenshot({
  path: path.join(outputDir, "workspace-reference-static-en.png"),
});
await desktop.click(".language-button");

await desktop.goto(`${baseUrl}/pricing`, { waitUntil: "networkidle" });
await desktop.waitForTimeout(550);
await desktop.screenshot({
  path: path.join(outputDir, "pricing-desktop.png"),
  fullPage: true,
});
const monthlyPrices = await desktop
  .locator(".plan-price strong")
  .allTextContents();
if (monthlyPrices.join(",") !== "$9,$19,$39") {
  errors.push(`Unexpected monthly prices: ${monthlyPrices.join(",")}.`);
}
await desktop.locator(".billing-switch button").nth(1).click();
await desktop.waitForTimeout(500);
if (!(await desktop.locator(".billing-switch").evaluate((element) =>
  element.classList.contains("yearly"),
))) {
  errors.push("Expected the billing control to animate to the yearly state.");
}
const settledPricingCards = await desktop.locator(".pricing-card").evaluateAll((cards) =>
  cards.every((card) => {
    const style = getComputedStyle(card);
    return Number.parseFloat(style.opacity) > 0.99 && style.transform === "none";
  }),
);
if (!settledPricingCards) {
  errors.push("Expected pricing cards to reach a fully visible resting state promptly.");
}
await desktop.screenshot({
  path: path.join(outputDir, "pricing-yearly.png"),
});
await recordLayout(desktop, "pricing-desktop");
await desktop.goto(`${baseUrl}/docs`, { waitUntil: "networkidle" });
await desktop.waitForTimeout(350);
await desktop.screenshot({
  path: path.join(outputDir, "docs-desktop.png"),
  fullPage: true,
});
await recordLayout(desktop, "docs-desktop");
await desktop.goto(`${baseUrl}/feedback`, { waitUntil: "networkidle" });
await desktop.waitForTimeout(350);
await desktop.screenshot({
  path: path.join(outputDir, "feedback-desktop.png"),
  fullPage: true,
});
await recordLayout(desktop, "feedback-desktop");
await desktop.close();

const mobile = await createPage({ width: 390, height: 844 });
await mobile.goto(baseUrl, { waitUntil: "networkidle" });
await mobile.waitForTimeout(550);
await mobile.screenshot({
  path: path.join(outputDir, "home-mobile.png"),
  fullPage: true,
});
await recordLayout(mobile, "home-mobile");
await mobile.click(".mobile-menu-button");
const docsMenuEntry = mobile.locator('.mobile-nav a[href$="/docs"]');
if ((await docsMenuEntry.count()) !== 1) {
  errors.push("Expected one user guide entry in the mobile navigation.");
}
await mobile.screenshot({
  path: path.join(outputDir, "home-mobile-menu.png"),
});
await mobile.click(".mobile-menu-button");
await mobile.click(".language-button");
await mobile.waitForTimeout(250);
await mobile.screenshot({
  path: path.join(outputDir, "home-mobile-en.png"),
  fullPage: true,
});
await recordLayout(mobile, "home-mobile-en");
await mobile.click(".language-button");
await mobile.waitForTimeout(250);
await mobile.goto(`${baseUrl}/examples`, { waitUntil: "networkidle" });
await mobile.waitForTimeout(350);
await mobile.screenshot({
  path: path.join(outputDir, "examples-mobile.png"),
  fullPage: true,
});
await recordLayout(mobile, "examples-mobile");
await mobile.goto(`${baseUrl}/workspace`, { waitUntil: "networkidle" });
await mobile.waitForTimeout(550);
if ((await mobile.locator(".workspace-home-link").count()) !== 1) {
  errors.push("Expected the mobile workspace header to retain the return-home action.");
}
await mobile.screenshot({
  path: path.join(outputDir, "workspace-mobile.png"),
  fullPage: true,
});
await recordLayout(mobile, "workspace-mobile");
await mobile.locator(".open-editor-button").click();
await mobile.waitForURL(/\/editor$/);
await mobile.waitForTimeout(450);
if (!(await mobile.locator(".svg-mobile-note").isVisible())) {
  errors.push("Expected mobile SVG view to explain its review-only role.");
}
if (
  (await mobile.locator(".svg-toolrail:visible, .svg-inspector:visible").count()) !== 0
) {
  errors.push("Expected mobile SVG view to hide desktop editing rails.");
}
await mobile
  .locator('input[type="file"][accept*=".svg"]')
  .setInputFiles(path.resolve("public/favicon.svg"));
await mobile.waitForSelector(".svg-document-preview img");
await mobile.screenshot({
  path: path.join(outputDir, "editor-mobile.png"),
  fullPage: true,
});
await recordLayout(mobile, "editor-mobile");
await mobile.locator(".editor-back-button").click();
await mobile.waitForURL(/\/workspace$/);
await mobile.locator(".mode-switch button").nth(1).click();
await mobile.waitForTimeout(120);
const mobileReferenceModeFits = await mobile
  .locator(".mode-switch")
  .evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return (
      element.scrollWidth <= element.clientWidth + 1 &&
      [...element.querySelectorAll("button")].every((button) => {
        const rect = button.getBoundingClientRect();
        return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1;
      })
    );
  });
if (!mobileReferenceModeFits) {
  errors.push("Expected the mobile reference mode switch to remain inside its frame.");
}
await mobile.screenshot({
  path: path.join(outputDir, "workspace-mobile-reference.png"),
  fullPage: true,
});
await mobile.click(".workspace-mobile-history");
await mobile.waitForSelector(".history-drawer");
if ((await mobile.locator(".history-drawer .workspace-account-summary").count()) !== 1) {
  errors.push("Expected the mobile history drawer to include the account entry.");
}
await mobile.screenshot({
  path: path.join(outputDir, "workspace-mobile-history.png"),
});
await mobile.click(".drawer-heading button");
await mobile.goto(`${baseUrl}/pricing`, { waitUntil: "networkidle" });
await mobile.waitForTimeout(550);
await mobile.screenshot({
  path: path.join(outputDir, "pricing-mobile.png"),
  fullPage: true,
});
await recordLayout(mobile, "pricing-mobile");
await mobile.locator(".billing-switch button").nth(1).click();
await mobile.waitForTimeout(500);
await mobile.screenshot({
  path: path.join(outputDir, "pricing-mobile-yearly.png"),
  fullPage: true,
});
await mobile.goto(`${baseUrl}/docs`, { waitUntil: "networkidle" });
await mobile.waitForTimeout(350);
await mobile.screenshot({
  path: path.join(outputDir, "docs-mobile.png"),
  fullPage: true,
});
await recordLayout(mobile, "docs-mobile");
await mobile.goto(`${baseUrl}/feedback`, { waitUntil: "networkidle" });
await mobile.waitForTimeout(350);
await mobile.screenshot({
  path: path.join(outputDir, "feedback-mobile.png"),
  fullPage: true,
});
await recordLayout(mobile, "feedback-mobile");
await mobile.close();

await browser.close();

console.log(JSON.stringify({ results, errors }, null, 2));

if (errors.length > 0 || results.some((result) => result.horizontalOverflow)) {
  process.exitCode = 1;
}
