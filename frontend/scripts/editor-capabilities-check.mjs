import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// A small disposable fixture exercises the changed workflows, never a research output.
const sample = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600" viewBox="0 0 960 600">
<defs><linearGradient id="test-gradient"><stop offset="0" stop-color="#6243ce"/><stop offset="1" stop-color="#f4d2c3"/></linearGradient></defs>
<g id="module-one"><rect id="test-box" x="70" y="120" width="250" height="180" fill="url(#test-gradient)"/><text id="test-text" x="100" y="220" font-family="Arial" font-size="32">H<tspan id="subscript" baseline-shift="sub" font-size="20">2</tspan>O</text></g>
<circle id="test-circle" cx="450" cy="210" r="55" fill="#24a37a"/>
<path id="test-path" d="M 580 240 C 620 100 720 320 810 180" fill="none" stroke="#6243ce" stroke-width="4"/>
</svg>`;
const output = ".review/editor-capabilities";
await mkdir(output, { recursive: true });
await writeFile(`${output}/input-copy.svg`, sample);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || (process.platform === "win32" ? "C:/Program Files/Google/Chrome/Application/chrome.exe" : "/usr/bin/google-chrome"), headless: true });
const checks = [], errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, acceptDownloads: true });
page.on("pageerror", error => { errors.push(error.message); console.error(error.stack); });
await page.addInitScript(() => {
  localStorage.setItem("autodraftman-language", "zh");
  window.editorStates = [];
  window.editorLoads = 0;
  window.addEventListener("message", event => { if (event.data?.source === "figfox-svgedit" && event.data.type === "state") window.editorStates.push(event.data.state); if (event.data?.source === "figfox-svgedit" && event.data.type === "loaded") window.editorLoads++; });
});
const frame = page.frameLocator("iframe");
const select = async id => {
  // Selecting through the same bridge as the object list avoids ambiguous group hit targets.
  await page.evaluate(id => document.querySelector("iframe").contentWindow.postMessage({ source: "figfox-app", type: "command", command: "select-layer", value: id }, location.origin), id);
  await page.waitForFunction(id => window.editorStates.at(-1)?.selection?.id === id, id);
};
const exportSvg = async name => {
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 SVG", exact: true }).click();
  await (await pending).saveAs(`${output}/${name}`);
  return readFile(`${output}/${name}`, "utf8");
};
try {
  await page.goto((process.env.AUDIT_BASE_URL || "http://127.0.0.1:5173") + "/editor", { waitUntil: "networkidle" });
  await page.locator('input[type="file"]').first().setInputFiles({ name: "capabilities-copy.svg", mimeType: "image/svg+xml", buffer: Buffer.from(sample) });
  await frame.locator("#test-circle").waitFor();
  await page.waitForFunction(() => !document.querySelector('button[aria-label="导出 SVG"]').disabled);
  await page.waitForFunction(() => !document.querySelector('.product-editor-route-content')?.inert);
  await select("test-circle");
  await page.getByLabel("W", { exact: true }).fill("160");
  await page.getByLabel("W", { exact: true }).press("Enter");
  await page.waitForFunction(() => Math.abs(window.editorStates.at(-1)?.selection?.width - 160) < .1);
  assert.equal(await frame.locator("#test-circle").getAttribute("width"), null);
  checks.push("Circle width changes its actual geometry, without adding an ineffective width attribute");

  await select("test-text");
  await page.getByRole("textbox", { name: "文字内容" }).fill("H2O gas");
  const edited = await exportSvg("edited-copy.svg");
  await page.waitForFunction(() => document.querySelector("iframe").contentDocument.getElementById("test-text").textContent === "H2O gas");
  assert.equal(await frame.locator("#subscript").textContent(), "2");
  assert.equal(await frame.locator("#subscript").getAttribute("baseline-shift"), "sub");
  assert.ok(edited.includes("O gas") && edited.includes('id="subscript"') && edited.includes("matrix("));
  checks.push("Text changes preserve tspan structure and an immediate export includes both edits");

  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("iframe").contentDocument.getElementById("test-text").textContent === "H2O");
  assert.equal(await frame.locator("#subscript").count(), 1);
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await page.waitForFunction(() => document.querySelector("iframe").contentDocument.getElementById("test-text").textContent === "H2O gas");
  checks.push("Structured text undo and redo retain the original child nodes");

  await select("test-box");
  await page.getByRole("button", { name: /^填充:/ }).click();
  await page.getByRole("button", { name: "渐变与透明度", exact: true }).click();
  await page.getByRole("dialog").waitFor();
  await page.getByRole("dialog").getByLabel("类型", { exact: true }).selectOption("radial");
  await page.getByRole("dialog").getByRole("button", { name: "添加色标" }).click();
  await page.screenshot({ path: `${output}/gradient-panel.png` });
  await page.getByRole("button", { name: "应用", exact: true }).click();
  await page.waitForFunction(() => window.editorStates.at(-1)?.paints?.fill.kind === "radial");
  assert.equal(await frame.locator("#svgcontent radialGradient stop").count(), 3);
  await page.getByRole("button", { name: "撤销", exact: true }).click();
  await select("test-box");
  await page.waitForFunction(() => window.editorStates.at(-1)?.paints?.fill.kind === "linear");
  await page.getByRole("button", { name: "重做", exact: true }).click();
  await select("test-box");
  await page.waitForFunction(() => window.editorStates.at(-1)?.paints?.fill.kind === "radial");
  checks.push("Gradient UI reads existing paint and applies a three-stop radial gradient");
  checks.push("One undo restores the previous gradient; redo restores all stops");

  await page.getByRole("tab", { name: "图层" }).click();
  await page.locator('.ff-layer-settings summary').click();
  await page.getByRole("button", { name: "新建图层", exact: true }).click();
  await page.waitForFunction(() => window.editorStates.at(-1)?.documentLayers.length === 2);
  await page.getByRole("textbox", { name: "图层名称" }).fill("Annotations");
  await page.getByRole("textbox", { name: "图层名称" }).press("Enter");
  await page.waitForFunction(() => window.editorStates.at(-1)?.documentLayers.some(layer => layer.name === "Annotations"));
  await select("test-circle");
  await page.getByLabel("移动选区到", { exact: true }).selectOption("Annotations");
  await page.waitForFunction(() => document.querySelector("iframe").contentDocument.getElementById("test-circle").parentElement.querySelector("title")?.textContent === "Annotations");
  await page.screenshot({ path: `${output}/layers-desktop.png` });
  checks.push("Layer creation, rename and moving an object to a named layer work through the UI");

  await page.getByRole("tab", { name: "页面", exact: true }).click();
  await page.getByLabel("宽度", { exact: true }).fill("1100");
  await page.getByLabel("宽度", { exact: true }).press("Enter");
  await page.waitForFunction(() => window.editorStates.at(-1)?.document.w === 1100);
  const png = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG", exact: true }).click();
  await (await png).saveAs(`${output}/edited-preview.png`);
  checks.push("Page dimensions and PNG export are available from the page panel");

  await page.getByRole("button", { name: "打开完整工具", exact: true }).click();
  await frame.locator("#tools_top").waitFor({ state: "visible" });
  await page.screenshot({ path: `${output}/native-tools.png` });
  await page.getByRole("button", { name: "返回 FigFox 工具", exact: true }).click();
  await frame.locator("#tools_top").waitFor({ state: "hidden" });
  checks.push("Full native tool panels can be opened and closed without replacing the document");

  await page.getByRole("tab", { name: "属性", exact: true }).click();
  await select("test-path");
  await page.getByRole("button", { name: "编辑节点", exact: true }).click();
  await page.waitForFunction(() => window.editorStates.at(-1)?.mode === "pathedit");
  await exportSvg("final-copy.svg");
  assert.equal(await page.evaluate(() => window.editorStates.at(-1).mode), "pathedit");
  checks.push("Exporting a snapshot does not exit path node editing");

  await select("test-circle");
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.editorStates = []; });
  await select("test-text");
  const stateOnly = await page.evaluate(() => window.editorStates.every(state => !("layers" in state)));
  assert.ok(stateOnly);
  checks.push("A selection-only change sends lightweight state without retransmitting the object tree");

  const previousLoads = await page.evaluate(() => window.editorLoads);
  const finalCopy = await readFile(`${output}/final-copy.svg`, "utf8");
  await page.locator('input[type="file"]').first().setInputFiles({ name: "reopened-copy.svg", mimeType: "image/svg+xml", buffer: Buffer.from(finalCopy) });
  await page.waitForFunction(previous => window.editorLoads > previous && !document.querySelector('button[aria-label="导出 SVG"]').disabled, previousLoads);
  assert.equal(await frame.locator("#test-text").textContent(), "H2O gas");
  await select("test-circle");
  assert.ok(Math.abs(await page.evaluate(() => window.editorStates.at(-1).selection.width) - 160) < .1);
  assert.equal(await frame.locator("#subscript").count(), 1);
  assert.equal(await frame.locator("#svgcontent radialGradient stop").count(), 3);
  checks.push("The exported SVG reopens with text structure, resized circle and gradient intact");

  const command = (command, value) => page.evaluate(({ command, value }) => document.querySelector("iframe").contentWindow.figfoxCommand(command, value), { command, value });
  await command("selection-policy", "group");
  await select("test-text");
  await frame.locator("#test-text").dblclick(); // Enter the containing group.
  await frame.locator("#test-text").dblclick(); // Enter text editing.
  assert.equal(await frame.locator("body").evaluate(() => document.activeElement.id), "text");
  await page.keyboard.press("Control+a");
  await page.keyboard.insertText("H2O vapor");
  assert.equal(await frame.locator("#test-text").textContent(), "H2O vapor");
  assert.equal(await frame.locator("#subscript").textContent(), "2");
  checks.push("Native double-click and keyboard input preserve tspan and subscript");
  const inGroupSnapshot = await page.evaluate(() => {
    const doc = new DOMParser().parseFromString(document.querySelector("iframe").contentWindow.figfoxSnapshot(), "image/svg+xml");
    return { opacity: doc.getElementById("test-path").getAttribute("opacity"), style: doc.getElementById("test-path").getAttribute("style") };
  });
  assert.equal(inGroupSnapshot.opacity, null);
  assert.ok(!inGroupSnapshot.style?.includes("pointer-events: none"));
  await exportSvg("native-input-copy.svg");
  checks.push("Export inside a group excludes temporary dimming and pointer blocking");
  await command("set-mode", "select");
  await command("toggle-layer", "test-circle");
  assert.equal(await frame.locator("#test-circle").getAttribute("display"), "none");
  await command("toggle-layer", "test-circle");
  assert.equal(await frame.locator("#test-circle").getAttribute("display"), "inline");
  await command("undo");
  assert.equal(await frame.locator("#test-circle").getAttribute("display"), "none");
  await command("redo");
  assert.equal(await frame.locator("#test-circle").getAttribute("display"), "inline");
  checks.push("Object visibility can be toggled, undone and redone");
  await command("leave-context");
  await command("native-ui", true);
  await page.waitForTimeout(350); // The layout transition resizes the iframe and closes native popups.
  await frame.locator("#main_button #popupToggle").click();
  await frame.locator("#tool_export").click();
  const nativePng = page.waitForEvent("download");
  await frame.locator("#export_ok").click();
  await (await nativePng).saveAs(`${output}/native-export.png`);
  checks.push("Native PNG export downloads without a popup");
  await command("native-ui", false);
  await page.setViewportSize({ width: 390, height: 844 });
  await command("fit-canvas");
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${output}/editor-mobile.png` });
  assert.deepEqual(errors, []);
} finally {
  await page.screenshot({ path: `${output}/last-state.png` }).catch(() => undefined);
  await writeFile(`${output}/checks.json`, JSON.stringify({ checks, errors }, null, 2));
  await writeFile(`${output}/last-states.json`, JSON.stringify(await page.evaluate(() => window.editorStates.slice(-8)), null, 2));
  await browser.close();
}
console.log(JSON.stringify({ checks, errors }, null, 2));
