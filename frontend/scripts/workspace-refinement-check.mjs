import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import { chromium } from 'playwright-core';

const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4175/figfox';
const output = '.review/product-refinement';
await mkdir(output, {recursive:true});
const checks = [], errors = [], requests = [];
const record = name => checks.push(name);

// Exercise the local/remote DTO boundary separately from the static Pages build.
const compiled = ts.transpileModule(await readFile('src/drafts.ts', 'utf8'), {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const drafts = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const input = {title:null,prompt:'A reference-guided creation',mode:'reference',aspect_ratio:'16:9',output_format:'PNG',visibility:'private',reference_asset_id:null};
const metadata = {key:'unchanged-blob-key',name:'figure.png',type:'image/png',size:123,width:800,height:400};
const local = drafts.makeLocalDraft({...input,taskType:'create',localImage:metadata});
const remote = {id:'remote-1',...input,created_at:local.created_at,updated_at:local.updated_at,expires_at:null};
const merged = drafts.mergeRemoteDraft(remote,local);
assert.equal(merged.id,'remote-1'); assert.equal(merged.taskType,'create'); assert.deepEqual(merged.localImage,metadata);
assert.deepEqual(drafts.draftInput(merged),input);
assert.equal(drafts.makeLocalDraft(input).taskType,'rebuild');
assert.equal(drafts.mergeRemoteDraft(remote).taskType,'create');
assert.equal(drafts.draftFingerprint(drafts.localDraftInput(local)), drafts.draftFingerprint({...input,localImage:metadata,taskType:'create'}));
record('Remote merges and local-to-remote ID migration preserve image and task metadata; API payload excludes all local fields');

const browser = await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const setup = async (language='zh',width=1440,height=900) => {
  const context=await browser.newContext({viewport:{width,height},acceptDownloads:true});
  const page=await context.newPage();
  await page.addInitScript(language=>{
    localStorage.setItem('autodraftman-language',language);
    window.addEventListener('message',event=>{if(event.data?.source==='figfox-svgedit' && event.data.type==='state')window.editorState=event.data.state;});
  },language);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(new URL(request.url()).pathname.includes('/api/'))requests.push(request.url());});
  page.on('dialog',dialog=>dialog.accept());
  return page;
};
const cached = page=>page.evaluate(()=>JSON.parse(localStorage.getItem('autodraftman-workspace-drafts-v1')));
const active = page=>page.evaluate(()=>JSON.parse(localStorage.getItem('autodraftman-workspace-drafts-v1')).find(item=>item.id===localStorage.getItem('figfox-active-task')));
const saved = page=>page.waitForFunction(()=>document.querySelector('.draft-save-state')?.textContent.includes('已在当前浏览器保存'));
const imageCount = page=>page.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('figfox-workspace-images',1);r.onsuccess=()=>{const db=r.result;const q=db.transaction('images').objectStore('images').count();q.onsuccess=()=>{db.close();resolve(q.result);};q.onerror=()=>reject(q.error);};r.onerror=()=>reject(r.error);}));
const editorReady=page=>page.waitForFunction(()=>document.querySelector('.ff-editor-stage')?.dataset.ready==='true' && !document.querySelector('.product-editor-route-content')?.inert);
const setImage=async(page,path)=>{await page.locator('#reference-file').setInputFiles(path);await page.waitForFunction(name=>document.querySelector('.reference-upload-copy strong')?.textContent===name,path.split('/').at(-1));await saved(page);};
try {
  const page=await setup();
  await page.goto(base+'/workspace',{waitUntil:'networkidle'}); await saved(page);
  assert.equal((await active(page)).taskType,'rebuild');
  assert.equal(await page.locator('.product-header').count(),0);
  assert.equal(await page.locator('.figfox-cursor').count(),0);
  assert.equal(await page.locator('.privacy-control').count(),0);
  for(const [width,height] of [[1440,900],[1366,768]]) {
    await page.setViewportSize({width,height}); await page.evaluate(()=>document.fonts.ready);
    const boxes=await page.locator('.upload-zone,.generate-button,.workspace-service-status').evaluateAll(elements=>elements.map(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom})));
    assert.ok(boxes.every(box=>box.top>=0 && box.bottom<=height),JSON.stringify(boxes));
    await page.screenshot({path:`${output}/new-task-zh-${width}.png`,fullPage:true});
  }
  record('New tasks default to image-to-SVG; primary input, action and status fit both desktop sizes');
  await page.locator('#figure-prompt').fill('保留所有文字与箭头');
  await setImage(page,'public/assets/demo/cases/study/input.png');
  await page.waitForFunction(()=>document.querySelector('.reference-upload-copy')?.textContent.includes('1774 × 887'));
  const first=await active(page); assert.equal(first.localImage.name,'input.png');
  assert.equal(await imageCount(page),1);
  assert.equal(await page.locator('.workspace-title-line h1').textContent(),await page.locator('.workspace-record.current strong').textContent());
  await page.screenshot({path:`${output}/uploaded-task-zh.png`,fullPage:true});
  await page.reload({waitUntil:'networkidle'}); await saved(page);
  assert.equal(await page.locator('#figure-prompt').inputValue(),'保留所有文字与箭头');
  assert.ok((await page.locator('.reference-upload-card img').getAttribute('src')).startsWith('blob:'));
  await page.getByRole('button',{name:'新建任务',exact:true}).click();
  await page.getByRole('tab',{name:'文生图',exact:true}).click();
  await page.locator('#figure-prompt').fill('文生图使用参考图');
  await setImage(page,'public/assets/demo/cases/study/result.png');
  assert.equal((await active(page)).taskType,'create'); assert.equal((await active(page)).mode,'reference');
  await page.reload({waitUntil:'networkidle'}); await saved(page);
  assert.equal(await page.getByRole('tab',{name:'文生图',exact:true}).getAttribute('aria-selected'),'true');
  await page.locator('.workspace-record-main').filter({hasText:'input.png'}).click(); await saved(page);
  await page.reload({waitUntil:'networkidle'}); await saved(page);
  assert.equal((await active(page)).id,first.id); assert.equal((await active(page)).taskType,'rebuild');
  record('Task types remain independent of references; text and Blob images restore across refresh and task switching');
  await setImage(page,'public/assets/demo/cases/study/thumbnail.webp');
  assert.equal((await active(page)).localImage.type,'image/webp'); assert.equal(await imageCount(page),2);
  const blobKeys=await page.evaluate(()=>new Promise(resolve=>{const r=indexedDB.open('figfox-workspace-images');r.onsuccess=()=>{const db=r.result,q=db.transaction('images').objectStore('images').getAllKeys();q.onsuccess=()=>{db.close();resolve(q.result);};};}));
  assert.ok(!blobKeys.includes(first.localImage.key));
  await page.getByRole('button',{name:'移除参考图',exact:true}).click(); await saved(page);
  assert.equal((await active(page)).localImage,null); assert.equal(await imageCount(page),1);
  record('Replacing and removing a reference releases its previous Blob association');

  const prevented=await page.locator('.upload-zone').evaluate(el=>{const data=new DataTransfer();data.items.add(new File(['invalid'],'wrong.svg',{type:'image/svg+xml'}));const event=new DragEvent('drop',{bubbles:true,cancelable:true,dataTransfer:data});el.dispatchEvent(event);return event.defaultPrevented;});
  assert.equal(prevented,true); await page.getByRole('alert').waitFor(); assert.equal((await active(page)).localImage,null);
  const bytes=[...await readFile('public/assets/demo/cases/study/thumbnail.webp')];
  await page.locator('.upload-zone').evaluate((el,bytes)=>{const d=new DataTransfer();d.items.add(new File([new Uint8Array(bytes)],'pasted.webp',{type:'image/webp'}));el.dispatchEvent(new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:d}));},bytes); await saved(page);
  assert.equal((await active(page)).localImage.name,'pasted.webp');
  const pasteKey=(await active(page)).localImage.key;
  assert.equal(await page.locator('#figure-prompt').evaluate((el,bytes)=>{const d=new DataTransfer();d.items.add(new File([new Uint8Array(bytes)],'ignored.webp',{type:'image/webp'}));const e=new ClipboardEvent('paste',{bubbles:true,cancelable:true,clipboardData:d});el.dispatchEvent(e);return e.defaultPrevented;},bytes),false);
  assert.equal((await active(page)).localImage.key,pasteKey);
  record('Invalid drops are prevented; image paste is scoped to the upload context and leaves text inputs alone');

  await page.getByRole('button',{name:'编辑科研 SVG 示例',exact:true}).click(); await editorReady(page);
  await page.locator('.product-editor-back').click();
  assert.equal(await page.locator('#figure-prompt').inputValue(),'保留所有文字与箭头');
  assert.equal((await active(page)).localImage.key,pasteKey);
  record('Opening the real SVG example from a task returns to the same task and image');
  await page.getByRole('button',{name:'我的 SVG',exact:true}).click(); await page.locator('.product-documents').waitFor();
  assert.equal(await page.locator('.workspace-title-line h1').textContent(),'我的 SVG');
  assert.equal(await page.locator('.draft-save-state').count(),0);
  await page.locator('.product-document-card').first().waitFor();
  await page.waitForFunction(()=>!document.documentElement.hasAttribute('data-figfox-navigation'));
  await page.locator('.product-document-preview img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.screenshot({path:`${output}/documents-zh.png`,fullPage:true});
  await page.locator('.product-document-preview').first().click(); await editorReady(page);
  await page.getByRole('button',{name:/^重命名文档/}).click();
  await page.getByLabel('文档名称',{exact:true}).fill('科研图编辑验证');
  await page.getByRole('button',{name:'保存文档名称',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.product-editor-title [role=status]')?.textContent==='已保存到此浏览器');
  await page.locator('.product-editor-back').click();
  assert.equal(await page.locator('.workspace-title-line h1').textContent(),'我的 SVG');
  await page.locator('.product-document-card').first().waitFor();
  assert.equal(await page.locator('.product-document-card').count(),1);
  assert.equal(await page.locator('.product-document-card h3').textContent(),'科研图编辑验证.svg');
  record('Document view has its own context; editor rename keeps one document and returns to the library');

  await page.locator('.workspace-record-main').filter({hasText:'pasted.webp'}).click(); await saved(page);
  await page.evaluate(()=>{const original=IDBObjectStore.prototype.put;window.originalImagePut=original;IDBObjectStore.prototype.put=function(...args){if(this.transaction.db.name==='figfox-workspace-images')throw new DOMException('Quota exceeded','QuotaExceededError');return original.apply(this,args);};});
  await page.locator('#reference-file').setInputFiles('public/assets/demo/cases/study/input.png');
  await page.waitForFunction(()=>document.querySelector('.draft-save-state')?.textContent.includes('原图未保存'));
  await page.locator('#figure-prompt').fill('配额失败后保留的文字');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('autodraftman-workspace-drafts-v1')).some(d=>d.prompt==='配额失败后保留的文字'));
  assert.equal(await page.locator('.reference-upload-card img').count(),1);
  await page.reload({waitUntil:'networkidle'});
  await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('#figure-prompt').inputValue(),'配额失败后保留的文字');
  assert.ok((await page.locator('.draft-save-state').textContent()).includes('原图未保存'));
  await page.getByRole('button',{name:'我的 SVG',exact:true}).click(); await page.locator('.product-documents').waitFor(); assert.equal(await page.locator('.product-document-card').count(),1);
  await page.locator('.workspace-record-main').filter({hasText:'input.png'}).click();
  await setImage(page,'public/assets/demo/cases/study/input.png');
  await page.locator('.workspace-record.current .workspace-record-delete').click();
  await page.getByRole('alertdialog').getByRole('button',{name:'删除草稿',exact:true}).click(); await saved(page);
  assert.equal((await cached(page)).some(d=>d.id===first.id),false);
  record('Quota and missing-Blob errors preserve text and SVG documents, show partial-save feedback and allow recovery and task deletion');

  await page.evaluate(()=>{
    const legacy={id:'legacy-create',title:null,prompt:'旧版带参考图的文生图',mode:'reference',aspect_ratio:'16:9',output_format:'PNG',visibility:'private',reference_asset_id:null,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),expires_at:null};
    localStorage.setItem('autodraftman-workspace-drafts-v1',JSON.stringify([legacy]));localStorage.setItem('figfox-active-task','legacy-create');
  });
  // Open a fresh tab so pagehide cannot rewrite the deliberately seeded legacy cache.
  const legacy=await page.context().newPage(); await legacy.goto(base+'/workspace',{waitUntil:'networkidle'});
  assert.equal(await legacy.getByRole('tab',{name:'文生图',exact:true}).getAttribute('aria-selected'),'true');
  assert.equal(await legacy.locator('#figure-prompt').inputValue(),'旧版带参考图的文生图');
  await legacy.close(); await page.close();
  record('Legacy drafts without task type retain create semantics, including reference input');

  for(const language of ['zh','en']) {
    const visual=await setup(language);
    for(const [width,height] of [[1440,900],[1366,768]]) {
      await visual.setViewportSize({width,height}); await visual.goto(base+'/workspace',{waitUntil:'networkidle'});
      await visual.evaluate(()=>document.fonts.ready);
      assert.equal(await visual.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await visual.screenshot({path:`${output}/new-task-${language}-${width}.png`,fullPage:true});
    }
    for(const route of ['docs','pricing']) {
      await visual.goto(base+'/'+route,{waitUntil:'networkidle'}); await visual.evaluate(()=>document.fonts.ready);
      await visual.screenshot({path:`${output}/${route}-${language}.png`});
    }
    await visual.close();
  }
  assert.deepEqual(errors,[]); assert.deepEqual(requests,[]);
  await writeFile(output+'/checks.json',JSON.stringify({checks,errors,requests},null,2));
  console.log(JSON.stringify({checks:checks.length,errors,requests}));
} finally { await browser.close(); }
