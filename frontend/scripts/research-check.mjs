import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const base=process.env.AUDIT_BASE_URL||'http://127.0.0.1:4175/figfox';
const output='.review/research';await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[],checks=[];
async function openCriterion(page,name) {
 await page.getByRole('combobox',{name,exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('.research-criterion-popup[data-open]')?.contains(document.activeElement));
}
async function chooseCriterion(page, name, value) {
 await openCriterion(page,name);
 await page.locator(`.research-criterion-popup[data-open] .research-criterion-option[data-value="${value}"]`).click();
 await page.locator('.research-criterion-popup:visible').waitFor({state:'hidden'});
}
try {
 const page=await browser.newPage({viewport:{width:1440,height:900},acceptDownloads:true});
 await page.addInitScript(()=>localStorage.setItem('autodraftman-language','zh'));
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(base+'/',{waitUntil:'networkidle'});await page.locator('.demo-canvas-stage').scrollIntoViewIfNeeded();await page.locator('.demo-svg-mount > svg').waitFor();await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
 const summary=await (await page.request.get(base+'/assets/research/summary.json')).json();
 assert.equal(summary.provenance.cohortN,80);assert.equal(summary.provenance.judgments,8160);assert.equal(summary.metrics.length,17);
 await page.screenshot({path:output+'/desktop-hero.png'});
 await page.locator('#demo-benchmarks').scrollIntoViewIfNeeded();await page.locator('.research-profiles button').first().waitFor();
 assert.equal(await page.locator('.research-heatmap tbody tr').count(),17);assert.equal(await page.locator('.research-heatmap tbody button').count(),68);
 assert.equal(summary.provenance.snapshot,'2026-11-04');assert.equal(summary.summaries.A.D01.sampleN,63);assert.equal(summary.ablationSummaries.A.D01.sampleN,74);checks.push('Official data and 68 heatmap cells');
 const methodIds=['A','DrawAI','AFE','Crafter'];
 for (const [row,metric] of summary.metrics.entries()) {
  const values=methodIds.map(id=>summary.summaries[id][metric.id].score);
  const best=metric.direction==='lower'?Math.min(...values):Math.max(...values);
  const expected=values.map((v,i)=>Math.abs(v-best)<1e-9?i:-1).filter(i=>i>=0);
  const actual=await page.locator('.research-heatmap tbody tr').nth(row).locator('button').evaluateAll(es=>es.flatMap((e,i)=>e.hasAttribute('data-best')?[i]:[]));
  assert.deepEqual(actual,expected,metric.id+' winners');
 }
 assert.equal(await page.locator('.stage-highlight').count(),0);
 assert.ok(await page.locator('.demo-method-figure').evaluate(e=>e.getBoundingClientRect().width)<=900);
 await page.locator('.research-profiles').scrollIntoViewIfNeeded();
 const motion=await page.evaluate(async()=>{
  const row=()=>document.querySelector('.research-profiles button');
  const read=()=>({value:Number(row().querySelector('b').textContent),position:parseFloat(row().querySelector('i').style.left)});
  const initial=read();
  [...document.querySelectorAll('#demo-benchmarks .research-controls button')].find(b=>b.textContent==='可编辑性').click();
  await new Promise(r=>setTimeout(r,90));const midway=read();
  await new Promise(r=>setTimeout(r,550));return {initial,midway,final:read()};
 });
 assert.ok(motion.midway.value>motion.initial.value&&motion.midway.value<motion.final.value,JSON.stringify(motion));
 assert.ok(motion.midway.position>motion.initial.position&&motion.midway.position<motion.final.position);
 assert.equal(motion.final.value,Number(summary.summaries.A.D13.score.toFixed(1)));
 await page.locator('#demo-benchmarks').getByRole('button',{name:'内容正确性',exact:true}).click();await page.waitForTimeout(550);
 const subGap=await page.locator('.research-profiles').evaluate(e=>document.querySelector('.research-full-results').getBoundingClientRect().top-e.getBoundingClientRect().bottom);
 assert.ok(subGap>=80,'Profile-to-heatmap spacing: '+subGap);
 checks.push('Row-best highlights, smaller unframed architecture, synchronized profile motion and section spacing');

 await page.locator('#demo-evaluation').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.waitForTimeout(100);assert.equal(await page.locator('.demo-nav a[aria-current=location]').getAttribute('href'),'#demo-evaluation');
 await page.locator('#demo-benchmarks').screenshot({path:output+'/desktop-results.png',style:'.demo-header{visibility:hidden}'});
 await page.locator('.research-full-results summary').click();
 const cell=page.locator('.research-heatmap tbody tr').nth(7).locator('button').nth(1);await cell.click();
 await page.locator('.research-output-grid article').nth(3).waitFor();assert.equal(await page.locator('.research-output-grid article').count(),4);
 assert.equal(await page.getByLabel('指标',{exact:true}).inputValue(),'D08');
 await page.getByRole('button',{name:'聚焦比较',exact:true}).click();assert.equal(await page.locator('.research-output-grid article').count(),2);
 await page.getByLabel('同步缩放',{exact:true}).fill('2');await page.getByRole('button',{name:'向右平移',exact:true}).click();
 assert.equal(await page.locator('.research-output-grid').evaluate(el=>el.style.getPropertyValue('--pan-x')),'40px');
 await page.getByRole('button',{name:'重置视图',exact:true}).click();assert.equal(await page.getByLabel('同步缩放',{exact:true}).inputValue(),'1');
 await page.locator('.research-dialog').screenshot({path:output+'/comparison.png'});await page.keyboard.press('Escape');await page.locator('.research-dialog').waitFor({state:'detached'});await page.waitForTimeout(40);
 assert.equal(await cell.evaluate(el=>el===document.activeElement),true);checks.push('Heatmap opens matching metric; focus, zoom, pan, reset, Escape and focus restoration');
 // Named gallery examples replace the raw sample-ID list on the landing page.
 assert.equal(await page.locator('.research-deltas').count(),0);
 for (const [index,id] of ['sample-0033','sample-0062','sample-0097'].entries()) {
  await page.locator('.research-case-nav button').nth(index).click();
  assert.match(await page.locator('.research-gallery-stage img').getAttribute('src'),new RegExp(id+'/A.webp'));
  await page.locator('.research-gallery-toolbar').getByRole('button',{name:'原图',exact:true}).click();
  assert.match(await page.locator('.research-gallery-stage img').getAttribute('src'),new RegExp(id+'/source.webp'));
  await page.locator('.research-gallery-toolbar').getByRole('button',{name:'FigFox',exact:true}).click();
 }
 await page.locator('.research-gallery-footer').getByRole('button',{name:'放大与对照'}).click();
 await page.locator('.research-dialog').waitFor();assert.equal(await page.getByLabel('样本',{exact:true}).inputValue(),'sample-0097');
 await page.keyboard.press('Escape');checks.push('Three named visual examples switch source/output and open the matching detail');
 await page.locator('#demo-ablations').getByRole('button',{name:/^无 SAM:/}).click();
 await page.locator('#demo-ablations').getByRole('button',{name:'查看无 SAM示例'}).click();
 await page.locator('.research-dialog').waitFor();assert.equal(await page.getByLabel('方法 2',{exact:true}).inputValue(),'B');await page.keyboard.press('Escape');
 await page.locator('#demo-ablations').getByRole('button',{name:/^完整 FigFox:/}).click();
 await page.locator('#demo-ablations').getByRole('button',{name:'查看完整 FigFox示例'}).click();
 await page.getByLabel('方法 2',{exact:true}).waitFor();assert.equal(await page.getByLabel('方法 2',{exact:true}).inputValue(),'C');
 assert.equal(await page.getByLabel('方法 2',{exact:true}).locator('option').count(),3);await page.keyboard.press('Escape');
 await page.locator('#demo-ablations').scrollIntoViewIfNeeded();
 await openCriterion(page,'消融指标');
 const ablationMotion=await page.evaluate(async()=>{
  const row=()=>document.querySelector('.research-ablation-chart button:last-of-type');
  const read=()=>({value:Number(row().querySelector('strong').textContent),position:parseFloat(row().querySelector('.research-ablation-track b').style.left)});
  const initial=read();document.querySelector('.research-criterion-popup[data-open] .research-criterion-option[data-value="D03"]').click();
  await new Promise(r=>setTimeout(r,90));const midway=read();
  await new Promise(r=>setTimeout(r,550));return{initial,midway,final:read()};
 });
 assert.ok(ablationMotion.midway.value>ablationMotion.initial.value&&ablationMotion.midway.value<ablationMotion.final.value,JSON.stringify(ablationMotion));
 assert.ok(ablationMotion.midway.position>ablationMotion.initial.position&&ablationMotion.midway.position<ablationMotion.final.position);
 assert.equal(ablationMotion.final.value,Number(summary.ablationSummaries.A.D03.score.toFixed(1)));
 for (const id of ['D01','D13','D08']) await chooseCriterion(page,'消融指标',id);
 await page.waitForTimeout(550);
 assert.equal(await page.locator('.research-ablation-chart button').last().locator('strong').innerText(),summary.ablationSummaries.A.D08.score.toFixed(1));
 await page.emulateMedia({reducedMotion:'reduce'});await chooseCriterion(page,'消融指标','D03');
 await page.evaluate(()=>new Promise(requestAnimationFrame));
 assert.equal(await page.locator('.research-ablation-chart button').last().locator('strong').innerText(),summary.ablationSummaries.A.D03.score.toFixed(1));
 await page.emulateMedia({reducedMotion:'no-preference'});
 checks.push('Ablation numbers and markers interpolate together, rapid changes settle correctly, reduced motion updates immediately');
 const currentMetrics=summary.metrics.filter(m=>m.id!=='D09');
 assert.equal(await page.locator('.research-ranking-details').evaluate(e=>e.open),false);
 await page.locator('.research-ranking-details summary').click();
 const expectedMean=id=>currentMetrics.reduce((sum,m)=>sum+summary.summaries[id][m.id].score,0)/16;
 assert.ok(Math.abs(expectedMean('A')-88.00036348862142)<1e-9);
 assert.ok(Math.abs(expectedMean('DrawAI')-90.7522497934646)<1e-9);
 assert.match(await page.locator('.research-score-summary').innerText(),/10 项/);
 for(const id of ['D01','D08','D11']){
  const example=page.locator(`.research-score-example[data-metric="${id}"]`);
  const best=Math.max(...methodIds.map(method=>summary.summaries[method][id].score));
  assert.equal(await example.locator('.research-score-pair strong').innerText(),summary.summaries.A[id].score.toFixed(2));
  assert.match(await example.locator('.research-score-gap b').innerText(),new RegExp((best-summary.summaries.A[id].score).toFixed(2)));
 }
 await page.locator('.research-resource-details summary').click();
 for(const id of methodIds){
  const ranks=currentMetrics.map(m=>1+methodIds.filter(other=>m.direction==='lower'?summary.summaries[other][m.id].score<summary.summaries[id][m.id].score-1e-9:summary.summaries[other][m.id].score>summary.summaries[id][m.id].score+1e-9).length);
  const counts=[ranks.filter(r=>r===1).length,ranks.filter(r=>r===2).length,ranks.filter(r=>r>2).length];
  const row=page.locator(`.research-rank-row[data-method="${id}"]`);
  for(const [index,count] of counts.entries()){
   const segment=row.locator(`[data-rank="${index+1}"]`);
   if(count===0)assert.equal(await segment.count(),0);else assert.equal(await segment.innerText(),String(count));
  }
  const comparison=page.locator(`.research-comparison-row[data-method="${id}"]`);
  assert.equal(await comparison.locator('.research-quality-cell strong').innerText(),expectedMean(id).toFixed(1));
  for(const kind of ['cost','minutes']){
   const cell=comparison.locator(`[data-kind="${kind}"]`);
   const maximum=kind==='cost'?2.5:20;
   assert.match(await cell.locator('strong').innerText(),new RegExp(summary.resources[id][kind].toFixed(kind==='cost'?3:2).replace('.', '\\.')));
   const width=await cell.locator('.research-comparison-track i').evaluate(e=>parseFloat(e.style.width));
   assert.ok(Math.abs(width-summary.resources[id][kind]/maximum*100)<.0001);
  }
 }
 await openCriterion(page,'效果对比指标');
 const qualityMotion=await page.evaluate(async()=>{
  const read=()=>{const row=document.querySelector('.research-comparison-row[data-method="A"]');return{value:Number(row.querySelector('.research-quality-cell strong').textContent),position:parseFloat(row.querySelector('.research-quality-cell .research-comparison-track b').style.left)}};
  const initial=read();document.querySelector('.research-criterion-popup[data-open] .research-criterion-option[data-value="D01"]').click();
  await new Promise(r=>setTimeout(r,100));const midway=read();await new Promise(r=>setTimeout(r,550));return{initial,midway,final:read()};
 });
 assert.ok(qualityMotion.midway.value>qualityMotion.initial.value&&qualityMotion.midway.value<qualityMotion.final.value,JSON.stringify(qualityMotion));
 assert.ok(qualityMotion.midway.position>Math.min(qualityMotion.initial.position,qualityMotion.final.position)&&qualityMotion.midway.position<Math.max(qualityMotion.initial.position,qualityMotion.final.position),JSON.stringify(qualityMotion));
 assert.equal(qualityMotion.final.value,Number(summary.summaries.A.D01.score.toFixed(1)));
 assert.equal(await page.locator('.research-comparison-row[data-method="A"] .research-quality-rank').innerText(),'第 2');
 assert.equal(await page.locator('.research-comparison-row[data-method="DrawAI"] .research-quality-rank').innerText(),'第 1');
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const metric of currentMetrics){
  await chooseCriterion(page,'效果对比指标',metric.id);await page.evaluate(()=>new Promise(requestAnimationFrame));
  for(const id of methodIds){
   assert.equal(await page.locator(`.research-comparison-row[data-method="${id}"] .research-quality-cell strong`).innerText(),summary.summaries[id][metric.id].score.toFixed(1));
   const point=page.locator('.research-cost-point').nth(methodIds.indexOf(id));
   const coordinates=await point.evaluate(e=>({left:parseFloat(e.style.left),bottom:parseFloat(e.style.bottom)}));
   assert.ok(Math.abs(coordinates.left-summary.summaries[id][metric.id].score)<.0001,`${metric.id} ${id} horizontal position`);
   assert.ok(Math.abs(coordinates.bottom-(1-summary.resources[id].cost/2.5)*100)<.0001,`${metric.id} ${id} vertical position`);
  }
 }
 await openCriterion(page,'效果对比指标');assert.equal(await page.locator('.research-criterion-popup[data-open] .research-criterion-option[data-value="D09"]').count(),0);await page.keyboard.press('Escape');await page.locator('.research-criterion-popup:visible').waitFor({state:'hidden'});
 await chooseCriterion(page,'效果对比指标','mean');await page.emulateMedia({reducedMotion:'no-preference'});
 await page.waitForTimeout(550);
 await page.locator('.research-resource-details summary').click();
 for(const [i,id] of methodIds.entries()){
  const point=page.locator('.research-cost-point').nth(i);
  assert.ok(Math.abs(Number(await point.getAttribute('data-score'))-expectedMean(id))<1e-9);
  await point.click();assert.equal(await point.getAttribute('aria-pressed'),'true');
  assert.match(await page.locator('.research-point-readout').innerText(),new RegExp(summary.methods.find(m=>m.id===id).name));
 }
 await page.locator('.research-cost-point').first().focus();await page.keyboard.press('Enter');
 assert.equal(await page.locator('.research-cost-point').first().getAttribute('aria-pressed'),'true');
 checks.push('Equal-weight mean, true score gaps, zero-based cost/quality positions for all 16 criteria, keyboard and tap point readouts');
 await page.locator('.research-ranking-details summary').click();
 await page.locator('.research-comparison-scope a').click();assert.equal(await page.locator('#research-settings').evaluate(e=>e.open),true);
 await page.locator('#research-settings summary').click();
 checks.push('Disclosed rank distributions, every quality criterion, recorded resources and animated selection');
 assert.equal(await page.locator('.research-resource-bar').count(),2);
 const proportions=await page.locator('.research-resource-bar>i:first-child').evaluateAll(es=>es.map(e=>parseFloat(e.style.width)));
 assert.ok(Math.abs(proportions[0]-summary.resources.C.cost/summary.resources.A.cost*100)<.0001);
 assert.ok(Math.abs(proportions[1]-summary.resources.C.minutes/summary.resources.A.minutes*100)<.0001);
 await page.locator('#research-settings summary').click();assert.match(await page.locator('#research-settings').innerText(),/D09/);
 assert.match(await page.locator('#research-settings').innerText(),/GPT-5.5/);await page.locator('#research-settings summary').click();
 checks.push('Resource breakdown derives from A/C records; complete protocol and downloads remain available in settings');
 await page.locator('.research-stage-tabs button').nth(2).click();await page.locator('.research-stage-evidence').getByText(/13 \/ 13/).waitFor();checks.push('Historical native receipt shows 13 of 13 executed operations');
 await page.locator('.research-stage-tabs button').nth(1).click();await page.getByRole('button',{name:'B1 · 定位问题',exact:true}).click();assert.equal(await page.locator('.pipeline-roi').count(),2);await page.locator('.research-stage-tabs button').nth(2).click();
 await page.locator('#demo-method .demo-section-heading').scrollIntoViewIfNeeded();await page.waitForTimeout(400);await page.locator('#demo-method').screenshot({path:output+'/architecture.png',style:'.demo-header{visibility:hidden}[data-demo-reveal]{opacity:1!important;transform:none!important}'});
 await page.locator('.demo-object-types button').first().click();await page.getByRole('button',{name:'修改选中文字',exact:true}).click();await page.getByLabel('修改案例文字').fill('Research demo edit');await page.getByLabel('修改案例文字').press('Enter');
 await page.locator('.demo-case-picker button').nth(1).click();await page.locator('.demo-svg-mount #title_main').waitFor();await page.locator('.demo-case-picker button').first().click();await page.locator('.demo-svg-mount #plus_node_34').waitFor();assert.equal(await page.locator('.demo-svg-mount #plus_node_34').textContent(),'Research demo edit');
 await page.getByRole('button',{name:'恢复案例',exact:true}).click();assert.notEqual(await page.locator('.demo-svg-mount #plus_node_34').textContent(),'Research demo edit');
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'下载 SVG',exact:true}).click();assert.match((await download).suggestedFilename(),/\.svg$/);await page.locator('.demo-case-picker button').nth(3).click();await page.locator('.demo-svg-mount #title_top_row').waitFor();assert.match(await page.locator('.demo-svg-mount #title_top_row').textContent(),/Category/);
 checks.push('Case-local edits survive switching; reset and SVG download work');
 for(const language of ['zh','en']) {
  if(language==='en'){await page.evaluate(()=>scrollTo(0,0));await page.getByRole('button',{name:'切换为英文'}).click();}
  for(const [width,height] of [[1440,900],[1280,720],[390,844],[320,740]]) {
   await page.setViewportSize({width,height});await page.emulateMedia({reducedMotion:'reduce'});
   for(const section of ['.demo-hero','.research-pipeline','#demo-evaluation','#demo-benchmarks','#research-samples','#demo-ablations','#demo-efficiency']) {
    await page.locator(section).scrollIntoViewIfNeeded();await page.waitForTimeout(70);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert.equal(overflow,false,`${language} ${width} ${section} overflow`);
   }
   await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:`${output}/${language}-${width}-hero.png`});
   if(width===390){await page.locator('#demo-benchmarks').evaluate(e=>e.scrollIntoView({block:'start',behavior:'instant'}));await page.screenshot({path:`${output}/${language}-mobile-results.png`});}
  }
 }
 checks.push('Chinese and English at desktop, laptop, 390 px and 320 px; reduced motion and no page overflow');
 await page.goto(base+'/#research?sample=sample-0002&metric=D05&condition=C',{waitUntil:'networkidle'});await page.locator('.research-dialog').waitFor();assert.equal(await page.getByLabel(/^(样本|Sample)$/).inputValue(),'sample-0002');checks.push('Direct /figfox/ research deep link restores sample and condition');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({checks,errors},null,2));await writeFile(output+'/checks.json',JSON.stringify({checks,errors},null,2));
} finally {await browser.close();}
