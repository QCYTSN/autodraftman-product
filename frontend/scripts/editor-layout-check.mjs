import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5173';
const output = process.env.AUDIT_OUTPUT || '.review/editor-layout';
await mkdir(output, { recursive: true });
const sample = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600">
<rect id="box" x="50" y="50" width="700" height="400" rx="16" fill="#f0ecfa"/>
<text id="text-with-a-very-long-identifier-to-check-overflow" x="100" y="200" font-size="36" font-weight="700" text-decoration="underline" fill="#6243ce">FigFox editable text</text>
<path id="dashed-line" d="M100 300 H600" stroke="#6243ce" stroke-width="4" stroke-dasharray="5 5"/>
<polygon id="star" shape="star" point="5" starRadiusMultiplier="3" points="650,350 660,377 688,377 667,394 674,421 650,405 626,421 633,394 612,377 640,377" fill="#6243ce"/>
</svg>`;
await writeFile(output + '/layout-input-copy.svg', sample);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const checks = [], errors = [], issues = [];
let page;
const command = (command, value) => page.evaluate(({ command, value }) => document.querySelector('iframe').contentWindow.figfoxCommand(command, value), { command, value });
const pick = async id => { await command('select-layer', id); await page.waitForFunction(id => window.editorState?.selection?.id === id, id); };
const field = async (label, value) => { await page.getByLabel(label, { exact: true }).fill(String(value)); await page.getByLabel(label, { exact: true }).press('Enter'); };
async function measure(name) {
  const found = await page.evaluate(() => {
    const problems = [];
    if (document.documentElement.scrollWidth > innerWidth + 1 || document.documentElement.scrollHeight > innerHeight + 1) problems.push('Page overflows viewport');
    for (const selector of ['.ff-editor-properties', '.ff-editor-inspector', '.ff-inspector-scroll', '.ff-editor-statusbar', '.ff-editor-popover', '.ff-editor-dialog']) {
      for (const el of document.querySelectorAll(selector)) {
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height) continue;
        if (el.scrollWidth > el.clientWidth + 2) problems.push(`${selector} horizontal overflow: ${el.scrollWidth}/${el.clientWidth}`);
        if (b.left < -1 || b.right > innerWidth + 1 || b.top < -1 || b.bottom > innerHeight + 1) problems.push(`${selector} outside viewport`);
      }
    }
    for (const el of document.querySelectorAll('.ff-inspector-number input')) {
      if (el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().width < 30) problems.push(`Narrow numeric input: ${el.closest('label').textContent}`);
    }
    for (const el of document.querySelectorAll('.ff-inspector-tabs button, .ff-editor-properties button, .ff-inspector-section h3, .ff-inspector-select > span, .ff-inspector-number > span')) {
      const b = el.getBoundingClientRect();
      if (!b.width || !b.height) continue;
      if (el.scrollWidth > el.clientWidth + 2) problems.push(`Text clipped: ${el.textContent}`);
    }
    const frame = document.querySelector('.figfox-svgedit-host').getBoundingClientRect();
    const top = document.querySelector('.ff-editor-properties').getBoundingClientRect();
    const bottom = document.querySelector('.ff-editor-statusbar').getBoundingClientRect();
    if (frame.top < top.bottom - 1 || frame.bottom > bottom.top + 1) problems.push('Commands overlap canvas');
    const panel = document.querySelector('.ff-editor-inspector')?.getBoundingClientRect();
    if (innerWidth > 900 && panel && frame.right > panel.left + 1) problems.push('Inspector overlaps desktop canvas');
    return problems;
  });
  issues.push(...found.map(issue => ({ name, issue })));
}
try {
  for (const [width, height, lang] of [[1440,900,'en'], [1440,900,'zh'], [1024,768,'en'], [820,700,'en'], [1280,600,'zh'], [390,844,'en'], [390,844,'zh'], [320,640,'en']]) {
    page = await browser.newPage({ viewport: { width, height }, acceptDownloads: true });
    page.setDefaultTimeout(20000);
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(lang => {
      localStorage.setItem('autodraftman-language', lang);
      window.editorErrors = [];
      window.addEventListener('message', e => { if (e.data?.source !== 'figfox-svgedit') return; if (e.data.type === 'state') window.editorState = e.data.state; if (['error','command-error'].includes(e.data.type)) window.editorErrors.push(e.data.message); });
    }, lang);
    await page.goto(base + '/editor');
    await page.locator('input[type=file]').first().setInputFiles({ name: 'very-long-figure-name-with-editable-labels-and-connectors.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(sample) });
    await page.waitForFunction(() => document.querySelector('.ff-editor-stage')?.dataset.ready === 'true' && !document.querySelector('.product-editor-route-content')?.inert);
    if (!await page.locator('.ff-editor-inspector').count()) await page.locator('.ff-inspector-toggle').click();
    await pick('text-with-a-very-long-identifier-to-check-overflow');
    await measure(`${width}-${lang}-properties`);
    await page.screenshot({ path: `${output}/after-${width}-${height}-${lang}.png` });
    await page.getByRole('tab', {name:lang==='zh'?'图层':'Layers',exact:true}).click();
    await measure(`${width}-${lang}-layers`);
    await page.locator('.ff-layer-settings summary').click();
    await measure(`${width}-${lang}-layer-settings`);
    await page.getByRole('tab', {name:lang==='zh'?'页面':'Page',exact:true}).click();
    await measure(`${width}-${lang}-document`);
    await page.getByRole('tab', {name:lang==='zh'?'属性':'Properties',exact:true}).click();
    await pick('star');
    await page.locator('.ff-inspector-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
    await page.getByRole('button', {name:lang==='zh'?'选中父组':'Select parent group',exact:true}).scrollIntoViewIfNeeded();
    await measure(`${width}-${lang}-star-bottom`);
    if (width === 1440 && lang === 'en') {
      await pick('text-with-a-very-long-identifier-to-check-overflow');
      assert.equal(await page.getByRole('button', {name:'Bold',exact:true}).getAttribute('aria-pressed'), 'true');
      await page.getByRole('button', {name:'Bold',exact:true}).click();
      await page.waitForFunction(()=>window.editorState.selection.fontWeight==='normal' || window.editorState.selection.fontWeight==='400');
      assert.equal(await page.getByRole('button', {name:'Bold',exact:true}).getAttribute('aria-pressed'), 'false');
      await page.getByRole('button', {name:'Bold',exact:true}).click();
      await page.waitForFunction(()=>window.editorState.selection.fontWeight==='bold' || window.editorState.selection.fontWeight==='700');
      assert.equal(await page.getByRole('button', {name:'Underline',exact:true}).getAttribute('aria-pressed'), 'true');
      await field('Font family', 'Courier, monospace');
      await page.waitForFunction(()=>window.editorState.selection.fontFamily.includes('Courier'));
      await pick('dashed-line');
      assert.equal(await page.getByLabel('Dash', {exact:true}).inputValue(), '5,5');
      await page.getByLabel('Dash', {exact:true}).selectOption('5,2,2,2,2,2');
      await page.waitForFunction(()=>window.editorState.selection.strokeDasharray.includes('2'));
      checks.push('Numeric bold, decoration state, custom font input and all native dash presets');
      await page.getByRole('tab',{name:'Page',exact:true}).click();
      await page.getByLabel('Canvas preset',{exact:true}).selectOption('1024x768');
      await page.waitForFunction(()=>window.editorState.document.w===1024 && window.editorState.document.h===768);
      await field('JPEG / WebP quality %', 72);
      await page.frameLocator('iframe').locator('body').evaluate(()=>{const original=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback,type,quality){window.exportQuality=quality;return original.call(this,callback,type,quality);};});
      const download = page.waitForEvent('download');
      await page.getByRole('button',{name:'JPEG',exact:true}).click();
      await (await download).saveAs(output+'/quality-72.jpeg');
      assert.equal(await page.frameLocator('iframe').locator('body').evaluate(()=>window.exportQuality), .72);
      checks.push('Canvas preset changes actual document dimensions; JPEG quality control exports an image');
      await page.getByRole('tab',{name:'Properties',exact:true}).click();
      await pick('box');
      await page.getByRole('button',{name:/^Fill:/}).click();
      await page.getByRole('button',{name:'Gradient & opacity',exact:true}).click();
      await page.getByRole('dialog').getByLabel('Type',{exact:true}).selectOption('linear');
      await measure('gradient-dialog');
      await page.screenshot({path:output+'/gradient-dialog.png'});
      await page.getByRole('dialog').getByRole('button',{name:'Apply',exact:true}).click();
      const svgDownload = page.waitForEvent('download');
      await page.getByRole('button',{name:'Export SVG',exact:true}).click();
      await (await svgDownload).saveAs(output+'/layout-edited-copy.svg');
      checks.push('Paint dialog applies gradient; modified SVG copy downloaded');
    }
    await page.locator('.ff-inspector-close').click();
    await measure(`${width}-${lang}-collapsed`);
    await page.getByRole('button',{name:lang==='zh'?'更多绘图工具':'More drawing tools',exact:true}).click();
    await measure(`${width}-${lang}-tool-menu`);
    await page.getByRole('button',{name:lang==='zh'?'星形':'Star',exact:true}).click();
    assert.equal(await page.locator('.ff-editor-inspector').count(), 1, 'Parametric tool exposes its controls');
    await page.getByLabel(lang==='zh'?'内外径比例':'Radius ratio',{exact:true}).scrollIntoViewIfNeeded();
    await measure(`${width}-${lang}-star-parameters`);
    if (width === 390 && lang === 'en') {
      await page.getByRole('button',{name:'More drawing tools',exact:true}).click();
      await page.getByRole('button',{name:'Image',exact:true}).click();
      await measure('mobile-image-dialog');
      await page.screenshot({path:output+'/mobile-image-dialog.png'});
      await page.getByLabel('Or use an image URL',{exact:true}).fill('javascript:alert(1)');
      await page.getByRole('button',{name:'Place on canvas',exact:true}).click();
      assert.match(await page.locator('.ff-image-dialog-error').innerText(), /HTTP/);
      await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
      checks.push('Narrow image dialog fits; image URL rejects unsupported schemes');
      await page.getByRole('button',{name:'More drawing tools',exact:true}).click();
      await page.getByRole('button',{name:'Shape library',exact:true}).click();
      await page.locator('.ff-shape-grid button').first().waitFor();
      await measure('mobile-shape-library');
      await page.screenshot({path:output+'/mobile-shape-library.png'});
      await page.getByRole('dialog').getByRole('button',{name:'Close',exact:true}).click();
      await page.getByRole('button',{name:'Edit',exact:true}).click();
      await page.getByRole('button',{name:'SVG source',exact:true}).click();
      await measure('mobile-source-dialog');
      await page.getByRole('dialog').getByRole('button',{name:'Cancel',exact:true}).click();
    }
    errors.push(...await page.evaluate(()=>window.editorErrors));
    checks.push(`${width}×${height} ${lang}: properties, page, layer management, star parameters, tools and collapsed canvas`);
    await page.close();
  }
  assert.deepEqual(issues, [], 'Layout defects');
  assert.deepEqual(errors, [], 'Runtime/bridge errors');
} catch (error) {
  if (page && !page.isClosed()) await page.screenshot({path:output+'/layout-failure.png'}).catch(()=>{});
  throw error;
} finally {
  await writeFile(output+'/layout-checks.json',JSON.stringify({checks,issues,errors},null,2));
  await browser.close();
}
console.log(JSON.stringify({checks,issues,errors},null,2));
