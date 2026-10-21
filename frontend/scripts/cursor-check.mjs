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

  await page.locator('.demo-footer a[href$="/docs"]').click();
  await page.waitForURL(/\/docs$/);
  for (const route of ['/docs', '/pricing', '/workspace']) {
    if (!page.url().endsWith(route)) await page.locator('.product-nav a[href$="'+route+'"]').click();
    await page.waitForURL(url=>url.pathname.endsWith(route));
    await page.locator('h1').first().hover();
    await custom(page,'idle');
    assert.equal(await page.locator('.figfox-cursor').count(),1);
    assert.equal(await page.locator('.figfox-cursor-shape').evaluate(shape=>getComputedStyle(shape).width),'8px');
    await page.locator('.product-nav a[href$="'+route+'"]').hover();
    await custom(page,'link');
    assert.equal(await page.locator('.product-nav a[href$="'+route+'"]').evaluate(link=>getComputedStyle(link).cursor),'none');
    const geometry = await page.locator('.figfox-cursor').evaluate(cursor=>{const bounds=cursor.getBoundingClientRect();return [bounds.x,bounds.y,bounds.width,bounds.height];});
    assert.deepEqual(geometry,[0,0,1440,900]);
    await page.screenshot({path:output+route+'-desktop.png'});
    record('Shared cursor on '+route+', outside page entrance transforms');
  }

  await native(page,page.locator('#figure-prompt'),'text');
  await page.locator('#figure-prompt').fill('Local cursor regression draft');
  await page.locator('.workspace-record-delete').first().click();
  await page.getByRole('alertdialog').waitFor();
  await native(page,page.getByRole('button',{name:'取消',exact:true}),'pointer');
  await page.getByRole('button',{name:'取消',exact:true}).click();
  await page.locator('.product-nav a[href$="/pricing"]').hover();
  await custom(page,'link');
  record('Product text fields and portal dialogs use native cursors and resume browsing afterwards');

  await page.locator('.product-account').click();
  await page.waitForURL(/\/login$/);
  await page.locator('.product-login-continue').hover();
  await custom(page,'link');
  assert.equal(await page.locator('.figfox-cursor').count(),1);
  await page.screenshot({path:output+'/login-desktop.png'});
  await page.locator('.product-login-back').click();
  await page.waitForURL(/\/workspace$/);
  assert.equal(await page.locator('#figure-prompt').inputValue(),'Local cursor regression draft');
  record('Independent sign-in shares the brand cursor and returns to the retained draft');

  await page.locator('.product-nav a[href$="/pricing"]').click();
  await page.waitForTimeout(650);
  await page.locator('.product-faq summary').first().hover();
  await custom(page,'link');
  assert.equal(await page.locator('.product-faq summary').first().evaluate(summary=>getComputedStyle(summary).cursor),'none');
  await page.locator('.product-faq summary').first().click();
  assert.equal(await page.locator('.product-faq details').first().evaluate(details=>details.open),true);
  await page.locator('h1').hover();
  await page.mouse.down();
  assert.equal(await page.locator('.figfox-cursor').evaluate(cursor=>getComputedStyle(cursor).visibility),'hidden');
  await page.mouse.up();
  await custom(page,'idle');
  record('FAQ has control feedback; selecting product copy restores the native cursor');

  await page.locator('.product-nav a[href$="/workspace"]').click();
  await page.getByRole('button',{name:'我的 SVG',exact:true}).click();
  const create = page.getByRole('button',{name:/^新建画布/});
  await create.hover();
  await custom(page,'link');
  await create.click();
  await page.waitForURL(/\/editor$/);
  await page.waitForFunction(()=>document.querySelector('.ff-editor-stage')?.dataset.ready==='true');
  await page.locator('.product-editor-back').hover();
  await custom(page,'link');
  await native(page,page.getByRole('button',{name:'适合画布',exact:true}),'pointer');
  await page.locator('.product-editor-back').hover();
  await custom(page,'link');
  await page.locator('.figfox-svgedit-frame').hover();
  assert.equal(await page.locator('.figfox-site').evaluate(root=>root.hasAttribute('data-figfox-cursor-active')),false);
  assert.equal(await page.locator('.figfox-cursor').evaluate(cursor=>getComputedStyle(cursor).visibility),'hidden');
  await page.locator('.product-editor-back').hover();
  await custom(page,'link');
  await page.locator('.product-editor-back').click();
  record('SVG editor header shares the pointer; tools and iframe retain native cursors');

  for (const route of ['/docs','/pricing','/workspace','/docs','/workspace']) {
    await page.locator('.product-nav a[href$="'+route+'"]').click();
    await page.waitForURL(url=>url.pathname.endsWith(route));
    await page.locator('h1').first().hover();
    await custom(page,'idle');
    assert.equal(await page.locator('.figfox-cursor').count(),1);
  }
  await page.locator('.product-brand').first().click();
  await page.waitForURL(url=>url.pathname.endsWith('/'));
  await page.mouse.move(1050,570);
  await custom(page,'idle');
  assert.equal(await page.locator('.figfox-cursor').count(),1);
  record('Repeated SPA navigation and return to the showcase keep exactly one pointer');

  for (const route of ['/docs','/pricing','/workspace']) {
    await page.goto(base+route,{waitUntil:'networkidle'});
    await page.locator('.product-nav a[href$="'+route+'"]').hover();
    await custom(page,'link');
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.figfox-cursor').evaluate(cursor=>getComputedStyle(cursor).display),'none');
    assert.equal(await page.locator('.figfox-site').evaluate(root=>root.hasAttribute('data-figfox-cursor-active')),false);
    assert.notEqual(await page.locator('.product-nav a[href$="'+route+'"]').evaluate(link=>getComputedStyle(link).cursor),'none');
    await page.emulateMedia({reducedMotion:'no-preference',forcedColors:'active'});
    assert.equal(await page.locator('.figfox-cursor').evaluate(cursor=>getComputedStyle(cursor).display),'none');
    await page.emulateMedia({forcedColors:'none'});
    await page.locator('h1').first().hover();
    await custom(page,'idle');
  }
  record('Direct product-route refresh, reduced-motion and high-contrast native fallbacks');
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
    assert.equal(await mobile.locator('.figfox-cursor').evaluate(cursor=>getComputedStyle(cursor).visibility),'hidden');
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
