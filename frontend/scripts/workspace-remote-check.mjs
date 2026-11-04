import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

// API-compatible development build with intercepted responses. No backend or
// model service is contacted; this exercises the asynchronous DTO boundary.
const base='http://127.0.0.1:4177';
const server=await createServer({server:{host:'127.0.0.1',port:4177,strictPort:true},define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify(base)}});
await server.listen();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const checks=[],errors=[],writes=[];
let releaseCreate;
const delayedCreate=new Promise(resolve=>{releaseCreate=resolve;});
try {
  const page=await browser.newPage();
  page.on('pageerror',e=>errors.push(e.message));
  let creates=0;
  await page.route('**/api/**',async route=>{
    const request=route.request(),pathname=new URL(request.url()).pathname;
    if(pathname==='/api/v1/auth/providers') return route.fulfill({json:{providers:[]}});
    if(request.method()==='GET' && pathname==='/api/v1/drafts') return route.fulfill({json:{items:[],limit:30,offset:0}});
    if(['POST','PATCH'].includes(request.method()) && pathname.startsWith('/api/v1/drafts')) {
      const input=request.postDataJSON(); writes.push(input);
      assert.equal('taskType' in input,false); assert.equal('localImage' in input,false); assert.equal('task_type' in input,false);
      const id=request.method()==='POST'?`remote-${++creates}`:pathname.split('/').at(-1);
      if(id==='remote-2' && request.method()==='POST') await delayedCreate;
      return route.fulfill({json:{id,...input,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),expires_at:null}});
    }
    throw new Error(`Unexpected API request: ${request.method()} ${pathname}`);
  });
  await page.goto(base+'/assets/demo/cases/study/input.png',{waitUntil:'networkidle'});
  await page.evaluate(async()=>{
    localStorage.setItem('autodraftman-language','zh');
    const image={key:'retained-image',name:'original.png',type:'image/png',size:68,width:1,height:1};
    const now=new Date().toISOString();
    localStorage.setItem('autodraftman-workspace-drafts-v1',JSON.stringify([{id:'local-seeded',title:null,prompt:'Initial notes',mode:'reference',taskType:'rebuild',localImage:image,aspect_ratio:'16:9',output_format:'PNG',visibility:'private',reference_asset_id:null,created_at:now,updated_at:now,expires_at:null}]));
    localStorage.setItem('figfox-active-task','local-seeded');
    const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/NhoAAAAASUVORK5CYII='),c=>c.charCodeAt(0));
    await new Promise((resolve,reject)=>{const request=indexedDB.open('figfox-workspace-images',1);request.onupgradeneeded=()=>request.result.createObjectStore('images');request.onerror=()=>reject(request.error);request.onsuccess=()=>{const db=request.result,transaction=db.transaction('images','readwrite');transaction.objectStore('images').put(new Blob([bytes],{type:'image/png'}),image.key);transaction.oncomplete=()=>{db.close();resolve();};transaction.onerror=()=>reject(transaction.error);};});
  });
  await page.goto(base+'/workspace',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>localStorage.getItem('figfox-active-task')==='remote-1' && document.querySelector('.product-workspace-source')?.naturalWidth===1,null,{timeout:10000}).catch(async error=>{console.error({creates,writes,errors,state:await page.evaluate(()=>({active:localStorage.getItem('figfox-active-task'),drafts:localStorage.getItem('autodraftman-workspace-drafts-v1'),copy:document.body.innerText.slice(-1200)}))});throw error;});
  assert.equal(await page.getByRole('tab',{name:'图片转 SVG',exact:true}).getAttribute('aria-selected'),'true');
  const migrated=await page.evaluate(()=>JSON.parse(localStorage.getItem('autodraftman-workspace-drafts-v1'))[0]);
  assert.equal(migrated.localImage.key,'retained-image'); assert.equal(migrated.taskType,'rebuild');
  checks.push('Server-assigned IDs retain task type, image association and restored Blob');
  await page.getByRole('button',{name:'新建任务',exact:true}).click();
  await page.locator('#figure-prompt').fill('First request');
  for(let attempt=0;creates<2 && attempt<100;attempt++) await page.waitForTimeout(50);
  assert.equal(creates,2);
  await page.getByRole('tab',{name:'文生图',exact:true}).click();
  await page.locator('#figure-prompt').fill('Latest text while creation is pending');
  await page.waitForTimeout(950);
  assert.equal(creates,2,'One draft must have only one create request in flight');
  releaseCreate();
  await page.waitForFunction(()=>localStorage.getItem('figfox-active-task')==='remote-2' && document.querySelector('.draft-save-state')?.textContent==='草稿已保存');
  const latest=await page.evaluate(()=>JSON.parse(localStorage.getItem('autodraftman-workspace-drafts-v1')).find(item=>item.id==='remote-2'));
  assert.equal(latest.prompt,'Latest text while creation is pending'); assert.equal(latest.taskType,'create');
  assert.equal(await page.locator('#figure-prompt').inputValue(),latest.prompt);
  assert.equal(writes.at(-1).prompt,latest.prompt);
  checks.push('Slow creation cannot duplicate a draft or overwrite later text/task changes; API payloads contain no local extensions');
  assert.deepEqual(errors,[]);
  await mkdir('.review/product-refinement',{recursive:true});
  await writeFile('.review/product-refinement/remote-checks.json',JSON.stringify({checks,errors},null,2));
  console.log(JSON.stringify({checks:checks.length,errors}));
} finally {releaseCreate();await browser.close();await server.close();}
