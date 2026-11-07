// Render unchanged SVG bytes for a missing archival PNG. Never repairs the SVG.
import { chromium } from 'playwright-core';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const [source, destination] = process.argv.slice(2);
assert.ok(source && destination, 'Pass source SVG and destination PNG');
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
  const page = await browser.newPage();
  await page.route('http**/*', route => route.abort());
  const svg = (await readFile(source)).toString('base64');
  const result = await page.evaluate(async encoded => {
    const image = new Image();image.src = 'data:image/svg+xml;base64,' + encoded;await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('SVG has no renderable size');
    const canvas = document.createElement('canvas');
    canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
    if(canvas.width*canvas.height>40000000) throw new Error('Unexpected render dimensions');
    const context=canvas.getContext('2d');context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0);
    return {png:canvas.toDataURL('image/png').split(',')[1],width:canvas.width,height:canvas.height};
  },svg);
  await writeFile(destination,Buffer.from(result.png,'base64'));
  console.log(JSON.stringify({renderer:'Chromium '+browser.version(),width:result.width,height:result.height}));
} finally { await browser.close(); }
