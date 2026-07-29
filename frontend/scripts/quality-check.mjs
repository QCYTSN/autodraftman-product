import { chromium } from "playwright-core";

const baseUrl = process.env.AUDIT_BASE_URL ?? "http://127.0.0.1:4173";
const executablePath =
  process.env.CHROME_PATH ??
  (process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : "/usr/bin/google-chrome");
const routes = [
  "/",
  "/examples",
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
      if (route === "/workspace") {
        await page.locator(".mode-switch button").nth(1).click();
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

      const decorativeDocumentNumbers = [
        ...document.querySelectorAll(
          ".information-index, .information-section > span",
        ),
      ]
        .filter(visible)
        .map((element) => selector(element));

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

      const workspaceRequiresPageScroll =
        window.innerWidth >= 1024 &&
        window.location.pathname.endsWith("/workspace") &&
        document.documentElement.scrollHeight > window.innerHeight + 1;

      const workspaceHistoryMissing =
        window.innerWidth >= 1024 &&
        window.location.pathname.endsWith("/workspace") &&
        !document.querySelector(".workspace-history");

      const workspaceModeSwitchOverflow =
        window.location.pathname.endsWith("/workspace") &&
        (() => {
          const modeSwitch = document.querySelector(".mode-switch");
          if (!modeSwitch) return true;
          const switchRect = modeSwitch.getBoundingClientRect();
          return (
            modeSwitch.scrollWidth > modeSwitch.clientWidth + 1 ||
            [...modeSwitch.querySelectorAll("button")].some((button) => {
              const rect = button.getBoundingClientRect();
              return (
                rect.left < switchRect.left - 1 ||
                rect.right > switchRect.right + 1
              );
            })
          );
        })();

      return {
        horizontalOverflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
        documentWidth: document.documentElement.scrollWidth,
        interactiveWraps,
        viewportEscapes,
        unnamedControls,
        unsizedImages,
        decorativeDocumentNumbers,
        heroEssentialBelowFold,
        workspaceRequiresPageScroll,
        workspaceHistoryMissing,
        workspaceModeSwitchOverflow,
        docsNavigationMissing:
          window.innerWidth >= 1280 &&
          ![...document.querySelectorAll(".desktop-nav a")].some(
            (link) => new URL(link.href).pathname.endsWith("/docs"),
          ),
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
        audit.decorativeDocumentNumbers.length ||
        audit.heroEssentialBelowFold ||
        audit.workspaceRequiresPageScroll ||
        audit.workspaceHistoryMissing ||
        audit.workspaceModeSwitchOverflow ||
        audit.docsNavigationMissing
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
