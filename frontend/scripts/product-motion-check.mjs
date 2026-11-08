import assert from "node:assert/strict";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { chromium } from "playwright-core";
import { createServer } from "vite";

const base = process.env.AUDIT_BASE_URL || "http://127.0.0.1:4176/figfox";
const out = ".review/product-motion";
await mkdir(out + "/video", {recursive:true});
const checks = [], frames = {}, errors = [];
const record = name => { checks.push(name); console.log(name); };
// Serve an isolated fixture with the real App and an explicit injected adapter.
const fixtureServer = await createServer({server:{host:"127.0.0.1",port:5177,strictPort:true},plugins:[{
  name:"progress-review-only",
  configureServer(server) { server.middlewares.use(async (req,res,next) => {
    if (req.url !== "/__review/progress") return next();
    const html = await server.transformIndexHtml(req.url, '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><div id="root"></div><script type="module" src="/scripts/fixtures/reconstruction-progress.tsx"></script></body></html>');
    res.setHeader("Content-Type","text/html"); res.end(html);
  }); },
}]});
await fixtureServer.listen();
const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
const context = await browser.newContext({viewport:{width:1440,height:900},recordVideo:{dir:out+"/video",size:{width:1440,height:900}}});
await context.addInitScript(() => localStorage.setItem("autodraftman-language","zh"));
const page = await context.newPage();
page.on("pageerror",error => errors.push(error.message));
const open = async (route) => { await page.goto(base+route,{waitUntil:"networkidle"}); await page.evaluate(()=>document.fonts.ready); };
const settledPrices = expected => page.waitForFunction(value => [...document.querySelectorAll('.product-plan-price strong')].map(el=>el.textContent).join(',')===value,expected);
async function captureDisclosure(selector, label) {
  const item = page.locator(selector).first();
  await item.scrollIntoViewIfNeeded();
  for (const direction of ["open","close"]) {
    const samples = await item.evaluate((el, direction) => new Promise(resolve => {
      const samples = [], start = performance.now();
      el.querySelector('summary').click();
      const frame = now => {
        const body = el.querySelector('.product-disclosure-body');
        samples.push({t:now-start,h:body.getBoundingClientRect().height,opacity:Number(getComputedStyle(body).opacity),open:el.open});
        if(now-start<380) requestAnimationFrame(frame); else resolve(samples);
      }; requestAnimationFrame(frame);
    }),direction);
    frames[label+'-'+direction] = samples;
    const maximum = Math.max(...samples.map(f=>f.h));
    assert.ok(maximum>10);
    assert.ok(samples.some(f=>f.h>1 && f.h<maximum-1),label+' must have intermediate heights');
    assert.equal(await item.evaluate(el=>el.open),direction==='open');
  }
  await item.locator('summary').focus(); await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  assert.equal(await item.locator('summary').getAttribute('aria-expanded'),'true');
  // Rapid reversal should keep the final intent and native open state aligned.
  await item.evaluate(el=>el.querySelector('summary').click());
  await page.waitForTimeout(50);
  await item.evaluate(el=>el.querySelector('summary').click());
  await page.waitForTimeout(320);
  assert.equal(await item.evaluate(el=>el.open),true);
  assert.equal(await item.locator('summary').getAttribute('aria-expanded'),'true');
  record(label+' opens/closes through intermediate heights; keyboard and rapid reversal work');
}
async function report(snapshot) {
  await page.evaluate(value => Object.assign(window.reconstructionFixture.snapshot,value),snapshot);
  await page.waitForFunction(value => {
    const el=document.querySelector('.reconstruction-progress');
    return el?.dataset.status===value.status && el?.dataset.stage===(value.stage || 'unknown');
  },snapshot);
  await page.waitForTimeout(360);
}
try {
  await open('/pricing');
  await page.locator('.product-billing').scrollIntoViewIfNeeded();
  frames.prices = await page.evaluate(()=>new Promise(resolve=>{
    const samples=[],start=performance.now();
    document.querySelectorAll('.product-billing button')[1].click();
    const frame=now=>{
      samples.push({t:now-start,values:[...document.querySelectorAll('.product-plan-price strong')].map(el=>({text:el.textContent,opacity:Number(getComputedStyle(el).opacity),transform:getComputedStyle(el).transform}))});
      if(now-start<420) requestAnimationFrame(frame); else resolve(samples);
    };requestAnimationFrame(frame);
  }));
  assert.ok(frames.prices.some(f=>f.values.some(v=>v.opacity>0 && v.opacity<1)));
  await settledPrices('7,15,31');
  assert.deepEqual(await page.locator('.product-plan-billing').allTextContents(),['全年 $84，一次支付','全年 $180，一次支付','全年 $372，一次支付']);
  await page.locator('.product-billing button').evaluateAll(buttons=>{buttons[0].click();setTimeout(()=>buttons[1].click(),40);setTimeout(()=>buttons[0].click(),80);});
  await settledPrices('9,19,39'); await page.waitForTimeout(400);
  await page.locator('.product-plans').screenshot({path:out+'/pricing.png'});
  record('Price transitions contain real intermediate frames; rapid switching settles to the last cycle');
  await captureDisclosure('.product-faq details','Pricing FAQ');
  await page.locator('.product-faq').screenshot({path:out+'/pricing-faq.png'});
  await open('/docs');
  await captureDisclosure('.product-guide-help details','Guide help');
  await page.locator('.product-guide-help').screenshot({path:out+'/guide-help.png'});

  await open('/workspace');
  assert.equal(await page.locator('.generate-button').isDisabled(),true);
  assert.equal(await page.getByRole('button',{name:'查看进度',exact:true}).count(),0);
  await page.getByRole('button',{name:'流程示意',exact:true}).click();
  assert.ok((await page.locator('.figure-process-preview').innerText()).includes('尚未提交你的草稿'));
  await page.keyboard.press('Escape');
  record('Released build keeps generation unavailable and clearly labels the independent illustration');

  await page.goto('http://127.0.0.1:5177/__review/progress',{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('#reference-file').setInputFiles('public/assets/demo/cases/study/input.png');
  await page.locator('#figure-prompt').fill('保留文字和连接关系');
  await page.waitForFunction(()=>!document.querySelector('.generate-button').disabled);
  await page.locator('.generate-button').evaluate(el=>{el.click();el.click();});
  const dialog=page.locator('.workspace-process-dialog');
  await dialog.waitFor();
  assert.equal(await page.evaluate(()=>window.reconstructionFixture.submitted),1);
  assert.equal(await page.evaluate(()=>window.reconstructionFixture.input.prompt),'保留文字和连接关系');
  assert.equal(await page.locator('.reconstruction-progress').getAttribute('data-status'),'queued');
  await page.getByRole('button',{name:'关闭进度',exact:true}).click();
  await dialog.waitFor({state:'hidden'});
  assert.equal(await page.getByRole('button',{name:'查看进度',exact:true}).evaluate(el=>document.activeElement===el),true);
  const readsBefore = await page.evaluate(()=>window.reconstructionFixture.reads);
  await page.evaluate(()=>Object.assign(window.reconstructionFixture.snapshot,{revision:2,status:'running',stage:'inspect'}));
  await page.waitForFunction(count=>window.reconstructionFixture.reads>count,readsBefore);
  await page.getByRole('button',{name:'查看进度',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.reconstruction-progress')?.dataset.stage==='inspect');
  await page.waitForTimeout(450);
  await page.screenshot({path:out+'/progress-fixture-desktop.png'});
  assert.equal(await page.locator('.reconstruction-progress .figure-process-steps button').count(),0);
  record('Injected adapter: submission opens progress once; dismissing keeps updates alive; reopen uses latest stage with focus restored');
  await page.waitForTimeout(7000);
  assert.equal(await page.locator('.reconstruction-progress').getAttribute('data-stage'),'inspect');
  record('Time alone does not advance the reported stage');
  await page.evaluate(()=>{window.reconstructionFixture.readFailure=true;});
  await page.waitForFunction(()=>document.querySelector('.reconstruction-progress')?.textContent.includes('正在重新连接'));
  assert.equal(await page.locator('.reconstruction-progress').getAttribute('data-stage'),'inspect');
  await page.evaluate(()=>{window.reconstructionFixture.readFailure=false;});
  await report({revision:3,status:'running',stage:'repair'});
  await report({revision:4,status:'running',stage:'finalize'});
  await report({revision:5,status:'succeeded',stage:'finalize'});
  assert.ok((await dialog.innerText()).includes('SVG 已就绪'));
  const readsAtEnd=await page.evaluate(()=>window.reconstructionFixture.reads);
  await page.waitForTimeout(1700);
  assert.equal(await page.evaluate(()=>window.reconstructionFixture.reads),readsAtEnd);
  await page.screenshot({path:out+'/progress-fixture-complete.png'});
  await page.keyboard.press('Escape'); await dialog.waitFor({state:'hidden'});
  record('Connection failure preserves last known stage; recovery and completion update; terminal status stops polling');

  await page.locator('.generate-button').click(); await dialog.waitFor();
  await report({revision:2,status:'running',stage:'reconstruct'});
  await report({revision:3,status:'failed',stage:'reconstruct'});
  assert.ok((await dialog.innerText()).includes('重建未完成'));
  await page.getByRole('button',{name:'返回工作台',exact:true}).click(); await dialog.waitFor({state:'hidden'});
  assert.equal(await page.locator('#figure-prompt').inputValue(),'保留文字和连接关系');
  assert.equal(await page.locator('.workspace-image-open img').count(),1);
  await page.evaluate(()=>window.reconstructionFixture.submitFailure=true);
  await page.locator('.generate-button').click();
  await page.getByRole('alert').filter({hasText:'任务未能提交'}).waitFor();
  assert.equal(await dialog.count(),0);
  record('Task and submission failure preserve input and never show a false completed state');

  const phone=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await phone.addInitScript(()=>localStorage.setItem('autodraftman-language','en'));
  phone.on('pageerror',error=>errors.push(error.message));
  await phone.goto(base+'/pricing',{waitUntil:'networkidle'});
  await phone.getByRole('button',{name:/Yearly/}).click();
  await phone.waitForFunction(()=>[...document.querySelectorAll('.product-plan-price strong')].map(el=>el.textContent).join(',')==='7,15,31');
  await phone.locator('.product-faq summary').nth(3).click();
  await phone.waitForFunction(()=>document.querySelectorAll('.product-faq details')[3].dataset.expanded==='true');
  assert.equal(await phone.locator('.product-faq summary span').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');
  assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await phone.locator('.product-faq').screenshot({path:out+'/faq-mobile-reduced.png'});
  await phone.goto('http://127.0.0.1:5177/__review/progress',{waitUntil:'networkidle'});
  await phone.locator('#reference-file').setInputFiles('public/assets/demo/cases/study/input.png');
  await phone.waitForFunction(()=>!document.querySelector('.generate-button').disabled);
  await phone.locator('.generate-button').click();
  await phone.locator('.reconstruction-progress').waitFor();
  assert.equal(await phone.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await phone.screenshot({path:out+'/progress-fixture-mobile.png'});
  await phone.getByRole('button',{name:'Close progress',exact:true}).click();
  await phone.getByRole('button',{name:'View progress',exact:true}).click();
  await phone.keyboard.press('Escape');
  await phone.locator('.workspace-process-dialog').waitFor({state:'hidden'});
  record('English mobile FAQ and progress fit the viewport; reduced motion and reopen/close work');
  await phone.close();
  assert.deepEqual(errors,[]);
  // The fixture must not be reachable from any production JS chunk.
  const manifest=await readFile('dist/index.html','utf8');
  assert.equal(manifest.includes('reconstruction-progress.tsx'),false);
  await context.close();
  await writeFile(out+'/checks.json',JSON.stringify({checks,frames,errors},null,2));
  console.log(`PASS ${checks.length} groups`);
} finally { await browser.close(); await fixtureServer.close(); }
