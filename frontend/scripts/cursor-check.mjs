import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const base=(process.env.AUDIT_BASE_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const executablePath=process.env.CHROME_PATH || (process.platform==='win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/usr/bin/google-chrome');
const output='.review/cursor';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath,headless:true});
const checks=[],errors=[],apiRequests=[];
const record=(name,evidence)=>checks.push({name,evidence});
async function custom(page,mode) {
  await page.waitForTimeout(280);
  assert.equal(await page.locator('.figfox-cursor').getAttribute('data-mode'),mode);
  assert.equal(await page.locator('.figfox-site').evaluate(root=>root.hasAttribute('data-figfox-cursor-active')),true);
  assert.equal(await page.locator('.figfox-cursor').evaluate(cursor=>getComputedStyle(cursor).visibility),'visible');
}
async function native(page,target,cursor) {
  await target.hover();
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.figfox-site').evaluate(root=>root.hasAttribute('data-figfox-cursor-active')),false);
  assert.equal(await page.locator('.figfox-cursor').evaluate(cursor=>getComputedStyle(cursor).visibility),'hidden');
  if(cursor) assert.equal(await target.evaluate(target=>getComputedStyle(target).cursor),cursor);
}
try {
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  await page.addInitScript(()=>localStorage.setItem('autodraftman-language','zh'));
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>{if(new URL(request.url()).pathname.includes('/api/'))apiRequests.push(request.url());});
  await page.goto(base+'/',{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1100);
  await page.mouse.move(1050,570);
  await custom(page,'idle');
  assert.equal(await page.locator('.figfox-cursor-shape').evaluate(shape=>getComputedStyle(shape).width),'8px');
  await page.screenshot({path:output+'/desktop-idle.png'});
  record('Small purple browsing pointer');

  await page.locator('.demo-hero-replay').hover();
  await custom(page,'link');
  await page.mouse.down();
  await page.waitForTimeout(100);
  const press=await page.locator('.figfox-cursor-shape').evaluate(shape=>new DOMMatrix(getComputedStyle(shape).transform).a);
  assert.ok(press<.9,press);
  await page.mouse.up();
  await page.waitForTimeout(280);
  record('Link morph and press feedback',press);

  await page.mouse.move(850,640);
  await page.waitForTimeout(30);
  await page.mouse.move(1100,610,{steps:6});
  const shape=await page.locator('.figfox-cursor-shape').evaluate(shape=>getComputedStyle(shape).transform);
  assert.equal(await page.locator('.figfox-cursor-point').evaluate(point=>{const matrix=new DOMMatrix(getComputedStyle(point).transform);return {x:matrix.m41,y:matrix.m42};}).then(position=>position.x),1100);
  record('Exact pointer position with shape elasticity',shape);
  for(const [x,y] of [[1439,450],[1,450],[720,1],[720,899]]) {
    await page.mouse.move(x,y);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),1440);
  }
  record('Pointer clips safely at viewport edges');

  await page.locator('.demo-method-preview').hover();
  await custom(page,'zoom');
  assert.equal(await page.locator('.figfox-cursor-shape span').textContent(),'放大');
  await page.screenshot({path:output+'/desktop-zoom.png'});
  await page.locator('.demo-method-preview').click();
  assert.equal(await page.locator('.demo-diagram-dialog:not(.demo-crop-dialog):not(.demo-refinement-dialog)').evaluate(dialog=>dialog.open),true);
  await native(page,page.getByRole('button',{name:'关闭流程图',exact:true}),'pointer');
  await page.keyboard.press('Escape');
  record('Zoom cue opens the actual diagram; dialog uses native cursor');

  await page.getByRole('button',{name:'切换为英文',exact:true}).click();
  await page.locator('.demo-method-preview').hover();
  await custom(page,'zoom');
  assert.equal(await page.locator('.figfox-cursor-shape span').textContent(),'Zoom');
  await page.getByRole('button',{name:'Switch to Chinese',exact:true}).click();
  record('Localized zoom cue');

  await page.locator('#demo-examples').scrollIntoViewIfNeeded();
  await page.waitForTimeout(750);
  const title=page.locator('.demo-svg-mount text').filter({hasText:'Experiment 1: Restudy vs. Prior Test'});
  await native(page,title,'text');
  await title.dblclick();
  const input=page.getByRole('textbox',{name:'修改案例文字'});
  await native(page,input);
  await input.fill('FigFox cursor editing check');
  await input.press('Enter');
  const edited=page.locator('.demo-svg-mount text').filter({hasText:'FigFox cursor editing check'});
  assert.equal(await edited.count(),1);
  record('Native text editing preserves actual SVG edits');

  const tile=page.locator('.demo-svg-mount use').first();
  await tile.scrollIntoViewIfNeeded();
  await native(page,tile,'grab');
  const bounds=await tile.boundingBox();
  await page.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
  await page.mouse.down();
  await page.mouse.move(bounds.x+bounds.width/2+24,bounds.y+bounds.height/2+16,{steps:6});
  assert.equal(await page.locator('.demo-canvas-stage').evaluate(stage=>stage.hasAttribute('data-demo-dragging')),true);
  assert.equal(await tile.evaluate(tile=>getComputedStyle(tile).cursor),'grabbing');
  assert.equal(await page.locator('.figfox-cursor').evaluate(cursor=>getComputedStyle(cursor).visibility),'hidden');
  await page.mouse.up();
  assert.equal(await page.locator('.demo-canvas-stage').evaluate(stage=>stage.hasAttribute('data-demo-dragging')),false);
  const moved=await tile.boundingBox();
  assert.ok(Math.abs(moved.x-bounds.x-24)<2&&Math.abs(moved.y-bounds.y-16)<2);
  await page.getByRole('button',{name:'恢复案例',exact:true}).click();
  record('Native grab/grabbing cursors with precise drag',moved);

  const slider=page.getByRole('slider');
  await native(page,slider,'ew-resize');
  await slider.fill('76');
  assert.equal(await slider.inputValue(),'76');
  await slider.press('Home');
  assert.equal(await slider.inputValue(),'0');
  await slider.fill('50');
  record('Native split comparison and keyboard endpoints');

  await page.locator('.demo-header .demo-primary').hover();
  await custom(page,'link');
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.figfox-site').evaluate(root=>root.hasAttribute('data-figfox-cursor-active')),false);
  await page.mouse.move(15,500);
  await custom(page,'idle');
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.figfox-cursor').evaluate(cursor=>getComputedStyle(cursor).display),'none');
  assert.equal(await page.locator('.figfox-site').evaluate(root=>root.hasAttribute('data-figfox-cursor-active')),false);
  await page.emulateMedia({reducedMotion:'no-preference',forcedColors:'active'});
  await page.waitForTimeout(100);
  assert.equal(await page.locator('.figfox-cursor').evaluate(cursor=>getComputedStyle(cursor).display),'none');
  await page.emulateMedia({forcedColors:'none'});
  await page.mouse.move(16,500);
  await custom(page,'idle');
  record('Keyboard, reduced-motion and high-contrast fallback');

  const productNative = async () => {
    assert.equal(await page.locator('.figfox-cursor').count(), 0);
    assert.equal(await page.locator('.figfox-site').evaluate(root => root.hasAttribute('data-figfox-cursor-active')), false);
  };
  const navigateProduct = async route => {
    if (new URL(page.url()).pathname.endsWith('/workspace')) await page.getByRole('button', {name: route === '/docs' ? '使用指南' : '定价', exact:true}).click();
    else await page.locator('.product-nav a[href$="'+route+'"]').click();
    await page.waitForURL(url=>url.pathname.endsWith(route));
  };
  await page.locator('.demo-footer a[href$="/docs"]').click();
  for (const route of ['/docs', '/pricing', '/workspace']) {
    if (!page.url().endsWith(route)) await navigateProduct(route);
    await page.locator('h1').first().hover(); await productNative();
    const control = route === '/workspace' ? page.locator('.new-draft-button') : page.locator('.product-nav a').first();
    await control.hover(); assert.equal(await control.evaluate(el=>getComputedStyle(el).cursor), 'pointer');
    await page.screenshot({path:output+'/native-'+route.slice(1)+'.png'});
  }
  record('Guide, pricing and workspace consistently use system pointers');
  await page.locator('#figure-prompt').hover();
  assert.equal(await page.locator('#figure-prompt').evaluate(el=>getComputedStyle(el).cursor), 'text');
  await page.locator('.workspace-record-delete').first().click();
  await productNative();
  await page.getByRole('button',{name:'取消',exact:true}).click();
  await page.locator('.workspace-account-summary').click();
  await page.waitForURL(/\/login$/); await productNative();
  await page.getByRole('button',{name:'继续使用工作台',exact:true}).click();
  await page.waitForURL(/\/workspace(?:\?view=(?:task|documents))?$/); await productNative();
  record('Draft text, confirmation dialogs and sign-in keep native interaction');
  await navigateProduct('/pricing');
  const summary = page.locator('.product-faq summary').first(); await summary.hover();
  assert.equal(await summary.evaluate(el=>getComputedStyle(el).cursor),'pointer');
  await summary.click(); assert.equal(await page.locator('.product-faq details').first().evaluate(el=>el.open), true);
  await page.locator('h1').hover(); await page.mouse.down(); await productNative(); await page.mouse.up();
  record('FAQ and selectable product copy retain system pointers');
  await navigateProduct('/workspace');
  await page.getByRole('button',{name:'我的 SVG',exact:true}).click();
  await page.getByRole('button',{name:'新建 SVG 画布',exact:true}).click();
  await page.waitForURL(/\/editor$/);
  await page.waitForFunction(()=>document.querySelector('.ff-editor-stage')?.dataset.ready==='true');
  await page.locator('.product-editor-back').hover(); await productNative();
  const fit = page.getByRole('button',{name:'适合画布',exact:true}); await fit.hover();
  assert.equal(await fit.evaluate(el=>getComputedStyle(el).cursor),'pointer');
  await page.locator('.figfox-svgedit-frame').hover(); await productNative();
  await page.locator('.product-editor-back').click();
  await page.waitForURL(/\/workspace(?:\?view=(?:task|documents))?$/);
  record('Editor header, tools and canvas retain native cursors');
  for (const route of ['/docs','/pricing','/workspace','/docs','/workspace']) { await navigateProduct(route); await productNative(); }
  await page.locator('.workspace-brand').click();
  await page.waitForURL(url=>url.pathname.endsWith('/')); await page.mouse.move(1050,570); await custom(page,'idle');
  assert.equal(await page.locator('.figfox-cursor').count(),1);
  record('Returning from repeated product navigation restores exactly one showcase pointer');
  for (const route of ['/docs','/pricing','/workspace']) {
    await page.goto(base+route,{waitUntil:'networkidle'}); await productNative();
    await page.emulateMedia({reducedMotion:'reduce'}); await productNative();
    await page.emulateMedia({reducedMotion:'no-preference',forcedColors:'active'}); await productNative();
    await page.emulateMedia({forcedColors:'none'});
  }
  record('Product refresh, reduced motion and high contrast retain native cursors');
  await page.close();

  const mobileContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const mobile=await mobileContext.newPage();
  mobile.on('pageerror',error=>errors.push(error.message));
  mobile.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  mobile.on('request',request=>{if(new URL(request.url()).pathname.includes('/api/'))apiRequests.push(request.url());});
  await mobile.goto(base+'/',{waitUntil:'networkidle'});
  await mobile.touchscreen.tap(280,500);
  assert.equal(await mobile.locator('.figfox-site').evaluate(root=>root.hasAttribute('data-figfox-cursor-active')),false);
  assert.equal(await mobile.locator('.figfox-cursor').evaluate(cursor=>getComputedStyle(cursor).visibility),'hidden');
  for (const route of ['/docs','/pricing','/workspace']) {
    await mobile.goto(base+route,{waitUntil:'networkidle'});
    await mobile.touchscreen.tap(15,500);
    assert.equal(await mobile.locator('.figfox-site').evaluate(root=>root.hasAttribute('data-figfox-cursor-active')),false);
    assert.equal(await mobile.locator('.figfox-cursor').count(),0);
    assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth),390);
  }
  record('Touch input keeps native interaction on the showcase and all three product pages');
  await mobileContext.close();

  assert.deepEqual(errors,[]);
  assert.deepEqual(apiRequests,[]);
  await writeFile(output+'/report.json',JSON.stringify({base,checks,errors,apiRequests},null,2));
  console.log(JSON.stringify({checks:checks.length,errors,apiRequests}));
}catch(error){
  await writeFile(output+'/failure.json',JSON.stringify({base,checks,errors,apiRequests,failure:String(error)},null,2));
  throw error;
}finally{await browser.close();}
