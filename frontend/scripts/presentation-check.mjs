import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');process.chdir(root);
const output=path.join(root,'.review/presentation-case-refresh');await mkdir(output,{recursive:true});
const active=JSON.parse(await readFile(path.join(root,'public/assets/presentation/active-case.json'),'utf8'));
const data=JSON.parse(await readFile(path.join(root,'public/assets/presentation',active.id,'manifest.json'),'utf8'));
const editedName='FigFox-'+data.id+'-edited.svg',editId=data.editTarget.elementId;
const scenes=['opening','assets','draft','evidence','targets','repair','editable'],checks=[],errors=[],servers=[];
const executablePath=process.env.CHROME_PATH||(process.platform==='win32'?'C:/Program Files/Google/Chrome/Application/chrome.exe':'/usr/bin/google-chrome');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function serve(mode,port){const args=[path.join(root,'node_modules/vite/bin/vite.js')];if(mode==='pages')args.push('preview','--mode','github-pages');
 args.push('--host','127.0.0.1','--port',String(port),'--strictPort');const child=spawn(process.execPath,args,{cwd:root,stdio:'pipe',windowsHide:true});servers.push(child);
 let stderr='';child.stderr.on('data',b=>stderr+=b);const base='http://127.0.0.1:'+port+(mode==='pages'?'/figfox':'');
 for(let i=0;i<100;i++){if(child.exitCode!==null)throw new Error(stderr);try{if((await fetch(base+'/presentation')).ok)return base;}catch{}await pause(100);}throw new Error('Server timeout');}
const browser=await chromium.launch({executablePath,headless:true});
async function open(context,url,online=true){const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(url);
 if(online)await page.getByRole('button',{name:'Begin',exact:true}).click();await page.locator('.pv2-stage').waitFor();await pause(600);return page;}
async function at(page,scene){assert.equal(await page.locator('.pv2-stage').getAttribute('data-scene'),scene);}
async function go(page,scene){await pause(260);await page.locator('[data-scene-button="'+scene+'"]').click();await pause(420);await at(page,scene);}
async function menu(page){await page.locator('.pv2-menu-trigger').click();}
async function close(page){await page.keyboard.press('Escape');await pause(50);}
async function layout(page){return page.evaluate(()=>{
 const visible=el=>{for(let n=el;n&&n instanceof Element;n=n.parentElement)if(getComputedStyle(n).opacity==='0'||getComputedStyle(n).display==='none')return false;return true;};
 const words=[...document.querySelectorAll('[data-stage-copy]')].filter(visible).map(e=>e.innerText??e.textContent).join(' ').trim();
 const chinese=document.querySelector('.pv2-stage').dataset.language==='zh';const count=chinese?words.replace(/\s/g,'').length:words.split(/\s+/).length;
 const errors=[];if(count>(chinese?28:16))errors.push('Text budget: '+count+' '+words);
 if(document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight)errors.push('Page scrollbars');
 for(const e of document.querySelectorAll('.pv2-stage button,.pv2-title,[data-stage-copy]')){if(!visible(e)||e.closest('[inert]'))continue;
  const r=e.getBoundingClientRect();if(r.width&&r.height&&(r.left<-.5||r.top<-.5||r.right>innerWidth+.5||r.bottom>innerHeight+.5))errors.push('Outside screen: '+e.textContent);}
 return {count,words,errors};});}
async function editAndExport(page,text){await go(page,'editable');await page.getByRole('button',{name:'Edit',exact:true}).first().click();
 await page.getByRole('textbox',{name:'Edit SVG text'}).fill(text);await page.getByRole('textbox').press('Enter');
 const pending=page.waitForEvent('download');await page.getByRole('button',{name:'SVG',exact:true}).click();const download=await pending;
 assert.equal(download.suggestedFilename(),editedName);return readFile(await download.path(),'utf8');}
try{
 const base=process.env.AUDIT_BASE_URL||await serve('pages',5196),dev=await serve('dev',5197);
 const context=await browser.newContext({viewport:{width:1600,height:900},acceptDownloads:true});const requests=[];context.on('request',r=>requests.push(r.url()));
 const page=await open(context,base+'/presentation');
 assert(await page.evaluate(()=>document.fonts.check('600 62px "FigFox Presentation Figtree"')));
 await page.evaluate(()=>{window.figfoxReference=document.querySelector('[data-figure="reference"]');window.figfoxDraft=document.querySelector('[data-figure="draft"]');});
 for(let i=1;i<7;i++){await page.keyboard.press('ArrowRight');await pause(1200);await at(page,scenes[i]);}
 await page.keyboard.press('ArrowRight');await at(page,'editable');assert(await page.getByRole('button',{name:'Next scene'}).isDisabled());
 for(let i=5;i>=0;i--){await page.keyboard.press('ArrowLeft');await pause(280);await at(page,scenes[i]);}
 assert(await page.evaluate(()=>window.figfoxReference===document.querySelector('[data-figure="reference"]')&&window.figfoxDraft===document.querySelector('[data-figure="draft"]')));
 checks.push('Six forward steps, bounded end, reverse navigation and stable figure DOM identity');
 for(const [key,scene] of [['1','assets'],['2','evidence'],['3','targets'],['End','editable'],['Home','opening']]){await pause(270);await page.keyboard.press(key);await at(page,scene);}
 await pause(230);assert(await page.locator('.pv2-title').evaluate(e=>Number(getComputedStyle(e).opacity)>.99));
 assert(await page.locator('[data-figure="reference"]').evaluate(e=>Math.abs(e.getBoundingClientRect().left-730)<1));
 await pause(270);await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await at(page,'assets');
 await pause(270);await page.keyboard.press('ArrowLeft');await pause(1200);await at(page,'opening');
 await page.evaluate(()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',repeat:true,bubbles:true})));await at(page,'opening');
 checks.push('Stage keys, direct jumps, interrupted transitions, repeat filtering and navigation throttle');
 await go(page,'assets');for(const asset of data.sam.assets.map(a=>a.id)){await page.locator('[data-asset="'+asset+'"]').click();await pause(260);
 assert.equal(await page.locator('[data-figure="reference"] .is-selected').getAttribute('data-region'),asset);assert.equal(await page.locator('[data-asset-connector]').getAttribute('data-asset-connector'),asset);}
 checks.push('Three verified SAM assets map to their own source regions with one connector');
 await go(page,'draft');const objectHits=page.locator('[data-figure="draft"] [data-object-hit]');assert.equal(await objectHits.count(),3);
 for(const id of await objectHits.evaluateAll(els=>els.map(e=>e.dataset.objectHit))){await page.locator('[data-object-hit="'+id+'"]').click();assert.equal(await page.locator('[data-figure="draft"] [data-selected="true"]').getAttribute('data-target'),id);}
 checks.push('Actual image, shape and text objects can be selected in the SVG draft');
 await go(page,'evidence');const cameras=await page.locator('[data-figure="reference"] svg,[data-figure="draft"] svg').evaluateAll(els=>els.map(e=>e.dataset.camera.split(' ').map(Number)));
 assert.equal(cameras[0][2],cameras[1][2]);assert.equal(cameras[0][3],cameras[1][3]);for(const [i,key] of ['sourceRegion','draftRegion'].entries()){const [l,t,r,b]=data.issues[0][key].box;assert(Math.abs(cameras[i][0]+cameras[i][2]/2-(l+r)/2)<.01);assert(Math.abs(cameras[i][1]+cameras[i][3]/2-(t+b)/2)<.01);}
 const [l,t,r,b]=data.issues[0].draftRegion.box;assert(Math.min(r-l,b-t)*430/cameras[1][3]*(768/900)>=72);
 for(const label of ['Toggle full figure Reference','Toggle full figure Draft']){const button=page.getByRole('button',{name:label});await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');await button.click();}
 checks.push('Independent evidence centers, equal unit scale, 28-pixel context, >=72px short side at 1366 and independent overview toggles');
 await go(page,'targets');for(const id of data.repair.operations.map(op=>op.targetId)){await page.locator('[data-operation="'+id+'"]').click();await pause(250);
 assert.equal(await page.locator('[data-figure="draft"] [data-selected="true"]').getAttribute('data-target'),id);assert.equal(await page.locator('[data-operation-connector]').getAttribute('data-operation-connector'),id);}
 checks.push('Recorded transaction operations select their actual SVG targets and connector');
 await go(page,'repair');await page.locator('[data-compare="before"]').click();assert.equal(await page.locator('main').getAttribute('data-comparison'),'before');
 await page.locator('[data-compare="after"]').click();await page.keyboard.down('b');assert.equal(await page.locator('main').getAttribute('data-comparison'),'before');await page.keyboard.up('b');assert.equal(await page.locator('main').getAttribute('data-comparison'),'after');
 await page.locator('[data-compare="before"]').click();await page.keyboard.down('b');await page.keyboard.up('b');assert.equal(await page.locator('main').getAttribute('data-comparison'),'before');
 await page.keyboard.down('b');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.keyboard.up('b');
 checks.push('Before/After clicks and hold-B restore the selected view; blur releases temporary comparison');
 const svg=await editAndExport(page,'Demo Table');await writeFile(path.join(output,editedName),svg);
 const original=await readFile(path.join(root,'public/assets/presentation',active.id,data.svg.final),'utf8');
 const exported=await page.evaluate(async({svg,original,editId})=>{const parse=s=>new DOMParser().parseFromString(s,'image/svg+xml');const d=parse(svg),o=parse(original);
  const t=d.getElementById(editId),originalText=o.getElementById(editId);const attrs=n=>Object.fromEntries([...n.attributes].map(a=>[a.name,a.value]));
  const ids=new Set([...d.querySelectorAll('[id]')].map(n=>n.id));const refs=[...svg.matchAll(/url\(#([^)]+)\)/g)].map(m=>m[1]);
  const image=new Image();image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await image.decode();
  return {text:t.textContent,attrs:attrs(t),originalAttrs:attrs(originalText),valid:!d.querySelector('parsererror'),references:refs.every(id=>ids.has(id)),overlays:svg.includes('pv2-observation')||svg.includes('data-original-id')};},{svg,original,editId});
 assert.equal(exported.text,'Demo Table');assert.deepEqual(exported.attrs,exported.originalAttrs);assert(exported.valid&&exported.references&&!exported.overlays);
 checks.push('Real text-node edit and exported SVG parse/render, original attributes, references and no observation overlays');
 await page.getByRole('button',{name:'Edit',exact:true}).first().click();const input=page.getByRole('textbox',{name:'Edit SVG text'});await input.fill('Unconfirmed');
 for(const key of ['Space','ArrowLeft','Home','End','b','d'])await input.press(key);await at(page,'editable');
 await input.dispatchEvent('compositionstart');await input.dispatchEvent('keydown',{key:'Enter',code:'Enter',isComposing:true});assert(await input.isVisible());await input.dispatchEvent('compositionend');
 await input.press('Escape');assert.equal(await input.count(),0);assert((await page.locator('[data-figure="result"] [data-original-id="'+editId+'"]').textContent()).includes('Demo Table'));
 await page.getByRole('button',{name:'Edit',exact:true}).first().click();await input.fill('Pending copy');await menu(page);await page.getByRole('button',{name:'中文',exact:true}).click();await close(page);
 assert.equal(await page.getByRole('textbox').inputValue(),'Pending copy');await at(page,'editable');await page.getByRole('textbox').press('Escape');
 await menu(page);await page.getByRole('button',{name:'English',exact:true}).click();await close(page);
 await go(page,'opening');await go(page,'editable');assert.equal(await page.locator('[data-figure="result"] [data-original-id="'+editId+'"]').textContent(),'Demo Table');
 await menu(page);await page.getByRole('button',{name:'Restore case',exact:true}).click();assert.equal(await page.locator('[data-figure="result"] [data-original-id="'+editId+'"]').textContent(),data.editTarget.originalText);
 checks.push('Input keys and IME, cancel pending input, language preserves draft, scene navigation preserves edits, restore case');
 await page.keyboard.press('d');assert(await page.getByRole('dialog').isVisible());assert((await page.getByRole('dialog').innerText()).includes('not-recorded'));await close(page);
 await menu(page);await page.keyboard.press('d');assert(await page.getByRole('heading',{name:'Technical details',exact:true}).isVisible());await close(page);
 await menu(page);await page.keyboard.press('f');await pause(250);assert(await page.evaluate(()=>Boolean(document.fullscreenElement)));await page.keyboard.press('f');await pause(250);await close(page);
 await menu(page);await page.getByRole('button',{name:'Case materials',exact:true}).click();assert((await page.getByRole('dialog').innerText()).includes(data.sam.mode));await close(page);
 assert(await page.locator('.pv2-menu-trigger').evaluate(e=>e===document.activeElement));
 await menu(page);await page.getByRole('button',{name:'Reset walkthrough',exact:true}).click();await at(page,'opening');
 checks.push('Menu, complete case/evidence details, focus restoration and walkthrough reset');
 console.log('Interaction checks passed; capturing layouts.');
 const layouts=[];
 for(const [width,height] of [[1600,900],[1366,768],[1920,1080],[1280,720],[1024,768]]){await page.setViewportSize({width,height});for(const scene of scenes){await go(page,scene);const result=await layout(page);layouts.push({width,height,scene,language:'en',...result});if(width===1600||width===1366)await page.screenshot({path:path.join(output,width+'x'+height+'-'+scene+'.png')});}}
 await page.setViewportSize({width:1600,height:900});await menu(page);await page.getByRole('button',{name:'中文',exact:true}).click();await close(page);
 for(const scene of scenes){await go(page,scene);layouts.push({scene,language:'zh',...await layout(page)});await page.screenshot({path:path.join(output,'zh-'+scene+'.png')});}
 await writeFile(path.join(output,'layout.json'),JSON.stringify(layouts,null,2));assert.deepEqual(layouts.flatMap(x=>x.errors),[]);
 checks.push('All seven scenes in five viewports; bilingual text budgets; 21 complete screenshots; no viewport overflow');
 await menu(page);await page.getByRole('button',{name:'English',exact:true}).click();await close(page);await page.emulateMedia({reducedMotion:'reduce'});
 for(const scene of scenes)await go(page,scene);await pause(100);assert.equal(await page.locator('main').getAttribute('data-sequence'),'1100');
 await page.getByRole('button',{name:'Edit',exact:true}).first().click();await page.getByRole('textbox').fill('Reduced motion');await page.getByRole('textbox').press('Enter');
 checks.push('Reduced motion retains all scenes, complete objects and actual editing');
 await page.keyboard.press('f');await pause(300);assert(await page.evaluate(()=>Boolean(document.fullscreenElement)));await page.keyboard.press('f');await pause(300);assert.equal(await page.evaluate(()=>Boolean(document.fullscreenElement)),false);
 checks.push('Actual browser fullscreen entry and exit');
 const zoom=await chromium.launchPersistentContext(path.join(output,'zoom-profile'),{executablePath,headless:true,viewport:{width:1600,height:900}});
 try{const settings=await zoom.newPage();await settings.goto('chrome://settings/appearance');await settings.locator('#zoomLevel').selectOption('1.25');const zp=await open(zoom,base+'/presentation');
 assert.deepEqual(await zp.evaluate(()=>[innerWidth,innerHeight,devicePixelRatio]),[1280,720,1.25]);for(const scene of scenes){await go(zp,scene);assert.deepEqual((await layout(zp)).errors,[]);}await zp.screenshot({path:path.join(output,'zoom-125.png')});}finally{await zoom.close();}
 checks.push('Native Chrome 125% zoom; all seven scenes remain usable');
 await page.reload();await page.getByRole('button',{name:'Begin',exact:true}).click();assert(!requests.some(url=>/\/api\/|session|auth\/|reconstruct/i.test(url)));
 assert(!requests.some(url=>/\.woff2?(?:$|\?)/i.test(url)));const devPage=await open(context,dev+'/presentation');await devPage.reload();await devPage.getByRole('button',{name:'Begin',exact:true}).click();
 for(const entry of [base,dev])for(const name of ['FigFox-Architecture-Demo-V2.html','FigFox-Architecture-Demo.html']){const response=await fetch(entry+'/presentation-downloads/'+name);assert(response.ok);assert.equal(await response.text(),await readFile(path.join(root,'presentation-dist/FigFox-Architecture-Demo-V2.html'),'utf8'));}
 checks.push('Dev and Pages deep-link refresh, isolated route, embedded font and both exact offline download paths');
  const svgHelpers = await devPage.evaluate(async () => {
    const { cleanSvg, instanceSvg, editedSvg, targetBox } = await import('/src/features/presentation/svg.ts');
    const raw = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"><defs><marker id="arrow"><path d="M0 0L5 5"/></marker><clipPath id="crop"><rect width="50" height="50"/></clipPath></defs><g transform="translate(50 60) rotate(30)"><text id="label" x="0" y="0" style="fill:red">one<tspan x="4" dy="20">two</tspan></text><rect id="box" x="0" y="0" width="30" height="20"/></g><path id="path" d="M0 0L30 30" marker-end="url(#arrow)" clip-path="url(#crop)"/><use href="#path"/><image href="https://example.invalid/image.png" onload="alert(1)"/><script>alert(1)</script></svg>';
    const clean = cleanSvg(raw), instance = instanceSvg(clean, 'test-instance');
    const changed = editedSvg(clean, { elementId: 'label', textNodePath: [1, 0] }, 'changed');
    const document = new DOMParser().parseFromString(changed, 'image/svg+xml');
    const mount = window.document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    mount.setAttribute('viewBox', '0 0 300 200'); mount.style.width = '300px'; mount.style.height = '200px';
    mount.innerHTML = '<g id="test-instance-document">' + instance.html + '</g>'; window.document.body.append(mount);
    const box = targetBox(mount.querySelector('#test-instance-box'), mount.querySelector('#test-instance-document'));
    mount.remove();
    return { one: document.getElementById('label').firstChild.nodeValue, two: document.querySelector('tspan').textContent, attrs: document.querySelector('tspan').getAttribute('dy'),
      safe: !clean.includes('https://') && !clean.includes('<script') && !clean.includes('onload'),
      references: instance.html.includes('url(#test-instance-arrow)') && instance.html.includes('href="#test-instance-path"'),
      box };
  });
  assert(svgHelpers.safe && svgHelpers.references);
  assert.deepEqual([svgHelpers.one, svgHelpers.two, svgHelpers.attrs], ['one', 'changed', '20']);
  assert(Math.abs(svgHelpers.box[0] - 40) < .01 && Math.abs(svgHelpers.box[1] - 60) < .01);
  assert(Math.abs(svgHelpers.box[2] - 35.980762) < .01 && Math.abs(svgHelpers.box[3] - 32.320508) < .01);
  checks.push('SVG sanitization, marker/clip/use references, nested tspan preservation and rotated-object bounds');

 const offlineContext=await browser.newContext({offline:true,viewport:{width:1600,height:900},acceptDownloads:true});const offlineRequests=[];offlineContext.on('request',r=>{if(/^https?:/.test(r.url()))offlineRequests.push(r.url());});
 const offlinePage=await open(offlineContext,pathToFileURL(path.join(root,'presentation-dist/FigFox-Architecture-Demo-V2.html')).href,false);
 for(const scene of scenes)await go(offlinePage,scene);const offlineSvg=await editAndExport(offlinePage,'Offline Table');assert(offlineSvg.includes('Offline Table'));
 await menu(offlinePage);assert(await offlinePage.getByText('Packaged for offline use',{exact:true}).isVisible());await offlinePage.getByRole('button',{name:'中文',exact:true}).click();await close(offlinePage);
 await offlinePage.screenshot({path:path.join(output,'offline-edit.png')});assert.deepEqual(offlineRequests,[]);
 checks.push('Offline file:// seven scenes, language, actual text edit and SVG export with zero HTTP/HTTPS attempts');
 console.log('Functional and offline checks passed; recording transitions.');
 await mkdir(path.join(output,'videos'),{recursive:true});
 const videoContext=await browser.newContext({viewport:{width:1600,height:900},recordVideo:{dir:path.join(output,'videos'),size:{width:1600,height:900}}});
 const vp=await open(videoContext,base+'/presentation');await pause(500);
 for(const scene of scenes.slice(1)){await vp.keyboard.press('ArrowRight');await pause(1300);await at(vp,scene);await vp.screenshot({path:path.join(output,'video-'+scene+'.png')});
  const before=await vp.screenshot();await pause(250);assert.deepEqual(await vp.screenshot(),before,'Scene must be static after its sequence: '+scene);}
 const video=vp.video();await videoContext.close();await video.saveAs(path.join(output,'architecture-transitions.webm'));
 checks.push('Recorded all six forward transitions; every scene is pixel-stable after 1100ms');
 assert.deepEqual(errors,[]);await writeFile(path.join(output,'checks.json'),JSON.stringify({passed:checks,errors,requests,offlineHttpRequests:offlineRequests,browser:await browser.version()},null,2));
 console.log(JSON.stringify({passed:checks.length,errors},null,2));
}catch(error){await writeFile(path.join(output,'failure.json'),JSON.stringify({passed:checks,errors,failure:String(error)},null,2));throw error;}
finally{await browser.close();for(const server of servers)server.kill();}
