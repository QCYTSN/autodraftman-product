import { chromium } from "playwright-core";

const baseUrl = process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const executablePath =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/usr/bin/google-chrome");
const routes = [
  "/",
  "/workspace",
  "/pricing",
  "/docs",
  "/privacy",
  "/terms",
  "/content-policy",
];
const widths = [320, 375, 414, 768, 1280, 1440, 1920];
const languages = ["zh", "en"];
const browser = await chromium.launch({ executablePath, headless: true });
const browserErrors = [];
const failures = [];
const results = [];

for (const language of languages) {
  for (const route of routes) {
    for (const width of widths) {
    const page = await browser.newPage({
      viewport: { width, height: width < 768 ? 844 : 800 },
      colorScheme: "light",
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        browserErrors.push(`${route} @ ${width}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => {
      browserErrors.push(`${route} @ ${width}: ${error.message}`);
    });

      await page.goto(`${baseUrl}${route}`, { waitUntil: "networkidle" });
      if (language === "en") {
        await page.click(".language-button");
      }
      await page.waitForTimeout(180);

      const audit = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.width > 0 &&
          rect.height > 0
        );
      };
      const selector = (element) => {
        if (element.id) return `#${element.id}`;
        const className =
          typeof element.className === "string"
            ? element.className.trim().split(/\s+/).slice(0, 2).join(".")
            : "";
        return `${element.tagName.toLowerCase()}${className ? `.${className}` : ""}`;
      };
      const textLineCount = (element) => {
        const tops = [];
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
        );
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (!node.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of range.getClientRects()) {
            if (rect.width < 1 || rect.height < 1) continue;
            if (!tops.some((top) => Math.abs(top - rect.top) < 2)) {
              tops.push(rect.top);
            }
          }
        }
        return tops.length;
      };
      const isClippedByAncestor = (element) => {
        let parent = element.parentElement;
        while (parent) {
          const overflow = getComputedStyle(parent).overflowX;
          if (overflow === "hidden" || overflow === "clip") return true;
          parent = parent.parentElement;
        }
        return false;
      };

      const interactiveWraps = [
        ...document.querySelectorAll(
          "a, button, [role='button'], summary, [role='tab']",
        ),
      ]
        .filter(visible)
        .filter((element) => element.dataset.allowWrap !== "true")
        .filter((element) => {
          if (!element.textContent?.trim()) return false;
          return textLineCount(element) > 1;
        })
        .map((element) => ({
          selector: selector(element),
          text: element.textContent.trim().replace(/\s+/g, " ").slice(0, 80),
          height: Math.round(element.getBoundingClientRect().height),
        }));

      const viewportEscapes = [...document.querySelectorAll("h1, h2, h3, img")]
        .filter(visible)
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return (
            (rect.left < -1 || rect.right > window.innerWidth + 1) &&
            !isClippedByAncestor(element)
          );
        })
        .map((element) => selector(element));

      const unnamedControls = [
        ...document.querySelectorAll("button, a, input, textarea, select"),
      ]
        .filter(visible)
        .filter((element) => {
          const label =
            element.getAttribute("aria-label") ||
            element.getAttribute("title") ||
            element.textContent?.trim() ||
            element.getAttribute("placeholder");
          return !label;
        })
        .map((element) => selector(element));

      const unsizedImages = [...document.images]
        .filter((image) => !image.hasAttribute("width") || !image.hasAttribute("height"))
        .map((image) => selector(image));

      const heroEssentialBelowFold =
        window.innerWidth === 1280 && document.querySelector(".map-hero")
          ? [
              document.querySelector(".map-hero h1"),
              document.querySelector(".map-hero .hero-body"),
              document.querySelector(".map-hero .primary-button"),
            ]
              .filter(Boolean)
              .some((element) => element.getBoundingClientRect().bottom > innerHeight) ||
            (() => {
              const focal = document.querySelector(".research-constellation");
              if (!focal) return false;
              const rect = focal.getBoundingClientRect();
              return rect.top + rect.height / 2 > innerHeight;
            })()
          : false;

      return {
        horizontalOverflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        interactiveWraps,
        viewportEscapes,
        unnamedControls,
        unsizedImages,
        heroEssentialBelowFold,
      };
      });

      const record = { language, route, width, ...audit };
      results.push(record);
      if (
        audit.horizontalOverflow ||
        audit.interactiveWraps.length ||
        audit.viewportEscapes.length ||
        audit.unnamedControls.length ||
        audit.unsizedImages.length ||
        audit.heroEssentialBelowFold
      ) {
        failures.push(record);
      }
      await page.close();
    }
  }
}

await browser.close();

console.log(
  JSON.stringify(
    {
      checked: results.length,
      widths,
      routes,
      languages,
      failures,
      browserErrors,
    },
    null,
    2,
  ),
);

if (failures.length || browserErrors.length) process.exitCode = 1;
