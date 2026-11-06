import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';
await mkdir('.review', { recursive: true });
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5178';
const browser = await chromium.launch({executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless:true});
const context = await browser.newContext();
let historyReads=0, offline=false, submissions=0, remoteActive=false;
const old={id:'a'.repeat(32), revision:1,status:'succeeded',stage:'finalize',draftId:'older-draft',name:'older.png',result:{svg:`/local-api/jobs/${'a'.repeat(32)}/result.svg`,png:`/local-api/jobs/${'a'.repeat(32)}/result.png`,costUsd:0,elapsedSeconds:1,unresolvedCount:0,sha256:'x'}};
await context.route('**/*', async route=>{
 const url=new URL(route.request().url());
 if(url.origin!==base) return route.abort();
 if(url.pathname.startsWith('/local-api/')) {
  if(url.pathname.endsWith('/health')) return route.fulfill({status:offline?503:200,json:{service:'figfox-local-v1',available:true,problems:[],supportsUserPrompt:false,remainingBudgetUsd:4}});
  if(url.pathname==='/local-api/jobs' && route.request().method()==='GET') return route.fulfill({status:++historyReads===1?503:200,json:remoteActive?[{...old,id:'b'.repeat(32),name:'other-tab.png',status:'running',stage:'reconstruct',result:null},old]:[old]});
  if(route.request().method()==='POST') { submissions++; return route.fulfill({json:{...old,status:'queued',result:null}}); }
  return route.fulfill({status:404,body:''});
 }
 if(url.pathname.startsWith('/api/')) return route.abort();
 return route.continue();
});
try {
 const page=await context.newPage();
 await page.goto(base+'/workspace');
 await page.waitForSelector('.workspace-reconstruction-history .ff-select-trigger');
 await page.locator('.workspace-reconstruction-history .ff-select-trigger').click();
 await page.screenshot({path:'.review/reconstruction-history.png',fullPage:true});
 await page.keyboard.press('Escape');
 assert.ok(historyReads>=2, 'history recovers after temporary failure');
 assert.equal(await page.locator('.workspace-reconstruction-result').count(),0,'old result not shown in unrelated draft');
 await page.locator('.workspace-progress-strip button').click();
 await page.locator('[role="dialog"] .reconstruction-result-actions button').first().click();
 await page.locator('[role="dialog"] [role="alert"]').waitFor();
 assert.match(await page.locator('[role="dialog"] [role="alert"]').innerText(), /SVG/);
 await page.locator('[role="dialog"] .reconstruction-result-actions button').nth(1).click();
 await page.waitForFunction(()=>[...document.querySelectorAll('[role="dialog"] [role="alert"]')].some(item=>/Download failed|\u4e0b\u8f7d\u5931\u8d25/.test(item.textContent)));
 await page.locator('[role="dialog"] .figure-process-preview-footer button').click();
 const image={name:'A.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/NhoAAAAASUVORK5CYII=','base64')};
 await page.locator('#reference-file').setInputFiles(image);
 await page.waitForFunction(()=>!document.querySelector('.generate-button').disabled);
 await page.evaluate(()=>{const decode=HTMLImageElement.prototype.decode; HTMLImageElement.prototype.decode=function(){return new Promise(resolve=>{window.releaseDecode=()=>resolve(decode.call(this));});};});
 await page.locator('#reference-file').setInputFiles({...image,name:'B.png'});
 assert.equal(await page.locator('.generate-button').isDisabled(),true,'decode blocks submission of old image');
 assert.equal(submissions,0);
 await page.evaluate(()=>window.releaseDecode());
 await page.waitForFunction(()=>!document.querySelector('.generate-button').disabled);
 offline=true;
 await page.waitForFunction(()=>document.querySelector('.generate-button').disabled,{},{timeout:35000});
 assert.match(await page.locator('body').innerText(),/disconnected|已断开/);
 offline=false;
 await page.waitForFunction(()=>!document.querySelector('.generate-button').disabled,{},{timeout:35000});
 remoteActive=true;
 await page.waitForFunction(()=>document.querySelector('.generate-button').disabled, {}, {timeout:15000});
 assert.equal(await page.locator('.generate-button').isDisabled(),true,'another tab active task blocks submission');
 assert.equal((await page.locator('.workspace-reconstruction-history .ff-select-trigger').innerText()).includes('older.png'),true,'history refresh does not switch selected result');
 remoteActive=false;
 await page.waitForFunction(()=>!document.querySelector('.generate-button').disabled, {}, {timeout:15000});
 await page.locator('.generate-button').evaluate(button=>{button.click();button.click();});
 await page.waitForFunction(()=>document.querySelector('.reconstruction-progress'));
 assert.equal(submissions,1,'double click submits once');
 console.log('PASS: modal edit/download errors; cross-tab history sync; double click;  recovery retry; draft association/history; decode race; health disconnect/reconnect. No real API requests.');
} finally {await context.close();await browser.close();}
