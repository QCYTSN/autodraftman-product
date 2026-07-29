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
await desktop.locator(".billing-switch button").nth(1).click();
await desktop.waitForTimeout(250);
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
await mobile.screenshot({
  path: path.join(outputDir, "workspace-mobile.png"),
  fullPage: true,
});
await recordLayout(mobile, "workspace-mobile");
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
await mobile.waitForTimeout(250);
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
await mobile.close();

await browser.close();

console.log(JSON.stringify({ results, errors }, null, 2));

if (errors.length > 0 || results.some((result) => result.horizontalOverflow)) {
  process.exitCode = 1;
}
