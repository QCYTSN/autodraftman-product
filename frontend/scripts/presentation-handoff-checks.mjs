import assert from 'node:assert/strict';
import path from 'node:path';

export async function checkHandoffs(browser,base,output,data,checks,errors){
 const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 // Use real browser time: Motion also uses the native Web Animations timeline.
 await page.goto(base+'/presentation');
 await page.getByRole('button',{name:'Begin',exact:true}).click();await page.waitForTimeout(650);
 const tick=ms=>page.waitForTimeout(ms);
 const go=async scene=>{await page.locator('[data-scene-button="'+scene+'"]').click();await tick(400);};
 const phase=async expected=>assert.equal(await page.locator('main').getAttribute('data-handoff-phase'),expected);
 try{
  await go('draft');await page.keyboard.press('r');await tick(200);await phase('model');
  assert.equal(await page.locator('[data-handoff="draft-model"] [data-input]').count(),2);
  assert.equal(await page.locator('.pv2-model-inputs img').count(),3);
  await page.screenshot({path:path.join(output,'handoff-draft-model.png')});
  await tick(900);await phase('objects');assert.equal(await page.locator('[data-draft-node]').evaluate(e=>Number(getComputedStyle(e).opacity)),0);
  await page.getByRole('button',{name:'Replay transition'}).click();await tick(200);await phase('model');await tick(900);
  checks.push('Reference and actual SAM inputs enter Draft model; mouse and R replay; model node retires before settled SVG objects');

  await page.keyboard.press('ArrowRight');await tick(200);await phase('issue-map');
  assert.deepEqual(await page.locator('[data-issue-label]').evaluateAll(nodes=>nodes.map(n=>n.textContent)),data.issueMap.map(i=>i.id));
  assert.equal(await page.locator('[data-figure="draft"] svg').first().getAttribute('viewBox'),data.dimensions.viewBox.join(' '));
  await page.screenshot({path:path.join(output,'handoff-issue-map.png')});
  await tick(900);await phase('paired-crops');assert.equal(await page.locator('[data-issue-label]').count(),0);
  // Replay from the crop must reset to a complete map, not zoom out only halfway.
  await page.keyboard.press('r');await tick(200);await phase('issue-map');
  assert.equal(await page.locator('[data-figure="draft"] svg').first().getAttribute('viewBox'),data.dimensions.viewBox.join(' '));
  await tick(900);await page.keyboard.press('i');await tick(700);await phase('issue-map');
  await tick(2000);await phase('issue-map');await page.screenshot({path:path.join(output,'issue-map-held.png')});
  await page.setViewportSize({width:1366,height:768});await tick(200);await page.screenshot({path:path.join(output,'1366x768-issue-map-held.png')});
  await page.setViewportSize({width:1600,height:900});
  await page.keyboard.press('Escape');await tick(700);await phase('paired-crops');
  checks.push('All nine original detector regions precede paired crops; replay resets full map; I and Escape hold/close it without another scene');

  await go('targets');assert.equal(await page.locator('[data-verification]').getAttribute('data-verification'),data.issues[0].verification);
  // Plan and execution must start from the same recorded transaction state,
  // including changes already applied by earlier transactions.
  assert(await page.evaluate(()=>{
   const content=name=>{const root=document.querySelector('[data-figure="'+name+'"] svg > g[id$="-document"]');return root.innerHTML.replaceAll(root.id.slice(0,-9),'instance');};
   return content('draft')===content('before');
  }));
  await page.evaluate(()=>{window.planGroup=document.querySelector('[data-operation-group]');});
  const camera=await page.locator('[data-figure="draft"] svg').first().getAttribute('data-camera');
  await page.evaluate(()=>{window.handoffTrace=[];window.handoffObserver=new MutationObserver(()=>{const m=document.querySelector('main');window.handoffTrace.push({phase:m.dataset.handoffPhase,comparison:m.dataset.comparison});});window.handoffObserver.observe(document.querySelector('main'),{attributes:true});});
  await page.keyboard.press('ArrowRight');await tick(200);await phase('execution');
  assert(await page.evaluate(()=>window.planGroup===document.querySelector('[data-operation-group]')));
  assert.equal(await page.locator('main').getAttribute('data-comparison'),'before');
  await page.screenshot({path:path.join(output,'handoff-local-execution.png')});
  await tick(900);await phase('render');assert.equal(await page.locator('main').getAttribute('data-comparison'),'after');
  const trace=await page.evaluate(()=>{window.handoffObserver.disconnect();return window.handoffTrace;});
  assert.deepEqual([...new Set(trace.map(t=>t.phase).filter(Boolean))],['plan','execution','svg-updated','render']);
  assert(trace.some(t=>t.phase==='svg-updated'&&t.comparison==='after'));
  assert.equal(await page.locator('[data-figure="result"] svg').first().getAttribute('data-camera'),camera);
  await phase('render');assert.equal(await page.locator('[data-render-phase]').getAttribute('data-render-phase'),'rendered');
  await page.screenshot({path:path.join(output,'handoff-render.png')});
  await page.keyboard.press('r');await tick(60);await phase('plan');
  assert(Math.abs((await page.locator('[data-operation-group]').boundingBox()).y-286)<1);
  await tick(1040);await phase('render');assert(Math.abs((await page.locator('[data-operation-group]').boundingBox()).y-226)<1);
  checks.push('Confirmed issue enters Plan; same operation group transfers to Local execution; scoped SVG updates before Render at unchanged camera');

  const guidance=page.getByRole('button',{name:'Gap guidance: Not recorded',exact:true});
  await guidance.focus();await guidance.press('Enter');await tick(50);
  assert.equal(await page.locator('[data-guidance-status]').getAttribute('data-guidance-status'),'not-recorded');
  await page.screenshot({path:path.join(output,'gap-guidance-details.png')});
  await page.keyboard.press('Escape');await tick(50);assert(await guidance.evaluate(e=>e===document.activeElement));
  await go('editable');const retained=page.getByRole('button',{name:'Unresolved 0',exact:true});await retained.click();await tick(50);
  assert.equal(await page.locator('[data-unresolved-count]').textContent(),'0');
  assert.equal(await page.locator('[data-visual-acceptance]').textContent(),'Not recorded');
  await page.screenshot({path:path.join(output,'retained-details.png')});await page.keyboard.press('Escape');await tick(50);
  checks.push('Keyboard and mouse record details preserve focus; unknown guidance, zero retained items and unknown visual acceptance remain distinct');

  await go('evidence');await page.keyboard.press('r');await tick(200);await go('editable');await tick(1600);
  assert.equal(await page.locator('.pv2-stage').getAttribute('data-scene'),'editable');
  assert.equal(await page.locator('[data-issue-label]').count(),0);
  await page.getByRole('button',{name:'Edit',exact:true}).first().click();const input=page.getByRole('textbox');
  await input.fill('Editing');await input.press('r');await input.press('i');await tick(1500);
  assert.equal(await input.inputValue(),'Editingri');assert.equal(await page.locator('.pv2-stage').getAttribute('data-scene'),'editable');
  await input.press('Escape');
  checks.push('Interrupted/replayed handoffs cancel stale timers; R and I remain ordinary text while editing');
 }finally{await context.close();}
}
