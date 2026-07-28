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
await desktop.screenshot({
  path: path.join(outputDir, "workspace-desktop.png"),
  fullPage: true,
});
await recordLayout(desktop, "workspace-desktop");
await desktop.locator(".mode-switch button").nth(1).click();
await desktop.locator("#reference-file").setInputFiles(
  path.resolve("public/assets/autodraftman-showcase.png"),
);
await desktop.waitForTimeout(250);
await desktop.screenshot({
  path: path.join(outputDir, "workspace-reference-static.png"),
});

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
await desktop.close();

const mobile = await createPage({ width: 390, height: 844 });
await mobile.goto(baseUrl, { waitUntil: "networkidle" });
await mobile.waitForTimeout(550);
await mobile.screenshot({
  path: path.join(outputDir, "home-mobile.png"),
  fullPage: true,
});
await recordLayout(mobile, "home-mobile");
await mobile.click(".language-button");
await mobile.waitForTimeout(250);
await mobile.screenshot({
  path: path.join(outputDir, "home-mobile-en.png"),
  fullPage: true,
});
await recordLayout(mobile, "home-mobile-en");
await mobile.click(".language-button");
await mobile.waitForTimeout(250);
await mobile.goto(`${baseUrl}/workspace`, { waitUntil: "networkidle" });
await mobile.waitForTimeout(550);
await mobile.screenshot({
  path: path.join(outputDir, "workspace-mobile.png"),
  fullPage: true,
});
await recordLayout(mobile, "workspace-mobile");
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
await mobile.close();

await browser.close();

console.log(JSON.stringify({ results, errors }, null, 2));

if (errors.length > 0 || results.some((result) => result.horizontalOverflow)) {
  process.exitCode = 1;
}
