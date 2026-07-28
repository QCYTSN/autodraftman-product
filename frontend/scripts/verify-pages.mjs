import { chromium } from "playwright-core";

const baseUrl =
  process.env.PREVIEW_URL ?? "http://127.0.0.1:4175/autodraftman";
const executablePath =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/usr/bin/google-chrome");
const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1000 },
  colorScheme: "light",
});
const errors = [];
const failedResources = [];

page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.status() >= 400) {
    failedResources.push(`${response.status()} ${response.url()}`);
  }
});

const checks = [];

for (const route of [
  "/",
  "/pricing",
  "/workspace",
  "/docs",
  "/privacy",
  "/terms",
  "/content-policy",
]) {
  const response = await page.goto(`${baseUrl}${route}`, {
    waitUntil: "networkidle",
  });
  checks.push({
    route,
    status: response?.status() ?? null,
    title: await page.title(),
    horizontalOverflow: await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    ),
  });
}

await browser.close();

console.log(JSON.stringify({ checks, errors, failedResources }, null, 2));

if (
  errors.length > 0 ||
  failedResources.length > 0 ||
  checks.some((check) => check.status !== 200 || check.horizontalOverflow)
) {
  process.exitCode = 1;
}
