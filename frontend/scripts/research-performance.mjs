import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4175/figfox';
const label = process.env.PERFORMANCE_LABEL || 'after';
const directory = `.review/performance/${label}`;
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-proxy-server'] });
const reports = [];
try {
  for (const [width, height] of [[1440,900],[1280,720],[390,844]]) {
    const context = await browser.newContext({ viewport: {width,height}, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const client = await context.newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });
    await client.send('Network.emulateNetworkConditions', { offline:false, latency:80, downloadThroughput:1250000, uploadThroughput:625000 });
    await client.send('Emulation.setCPUThrottlingRate', {rate:4});
    await client.send('Performance.enable');
    let phase = 'cold';
    const requests = new Map(), errors = [];
    client.on('Network.requestWillBeSent', e => { if(e.request.url.startsWith('http')) requests.set(e.requestId,{url:e.request.url,phase,type:e.type,bytes:0,decoded:0}); });
    client.on('Network.responseReceived', e => { const r=requests.get(e.requestId);if(r){r.status=e.response.status;r.mime=e.response.mimeType;r.cached=e.response.fromDiskCache||false;} });
    client.on('Network.dataReceived', e => {const r=requests.get(e.requestId);if(r)r.decoded+=e.dataLength;});
    client.on('Network.loadingFinished', e => {const r=requests.get(e.requestId);if(r)r.bytes=e.encodedDataLength;});
    client.on('Network.loadingFailed', e => {const r=requests.get(e.requestId);if(r)r.cancelled=e.canceled||e.errorText;});
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      localStorage.setItem('autodraftman-language','zh');
      window.__measure = {lcp:0,shifts:[],longTasks:[],interactions:[],phase:'cold'};
      new PerformanceObserver(list=>{for(const e of list.getEntries()) window.__measure.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});
      new PerformanceObserver(list=>{for(const e of list.getEntries()) if(!e.hadRecentInput) window.__measure.shifts.push({time:e.startTime,value:e.value,phase:window.__measure.phase});}).observe({type:'layout-shift',buffered:true});
      new PerformanceObserver(list=>{for(const e of list.getEntries()) window.__measure.longTasks.push({time:e.startTime,duration:e.duration,phase:window.__measure.phase});}).observe({type:'longtask',buffered:true});
      new PerformanceObserver(list=>{for(const e of list.getEntries()) if(e.interactionId) window.__measure.interactions.push({id:e.interactionId,duration:e.duration,phase:window.__measure.phase});}).observe({type:'event',durationThreshold:16,buffered:true});
    });
    await page.goto(base+'/',{waitUntil:'networkidle',timeout:90000});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(1500);
    const coldVitals=await page.evaluate(()=>structuredClone(window.__measure));
    const coldMetrics=(await client.send('Performance.getMetrics')).metrics;
    await page.screenshot({path:`${directory}/${width}-cold.png`});
    phase='research';await page.evaluate(()=>window.__measure.phase='research');
    await page.locator('#demo-benchmarks').scrollIntoViewIfNeeded();
    await page.locator('.research-profiles button').first().waitFor();
    await page.waitForTimeout(800);
    phase='compare';await page.evaluate(()=>window.__measure.phase='compare');
    await page.locator('.research-profiles button').first().click();
    await page.locator('.research-dialog[open]').waitFor();
    await page.waitForTimeout(800);
    const openRequestIds = new Set([...requests].filter(([,r])=>r.phase==='compare').map(([id])=>id));
    for(const sample of ['sample-0033','sample-0062','sample-0097']) await page.getByRole('combobox',{name:'样本',exact:true}).selectOption(sample);
    await page.waitForTimeout(1000);
    await page.getByRole('button',{name:'关闭比较',exact:true}).click();
    const vitals=await page.evaluate(()=>structuredClone(window.__measure));
    const finalMetrics=(await client.send('Performance.getMetrics')).metrics;
    const cls = entries => { let max=0,sum=0,start=0,last=0;for(const e of entries){if(e.time-last>1000||e.time-start>5000){sum=0;start=e.time;}sum+=e.value;max=Math.max(max,sum);last=e.time;}return max;};
    const phases={};
    for(const name of ['cold','research','compare']) {
      const rs=[...requests.values()].filter(r=>r.phase===name);
      const bytes=type=>rs.filter(r=>r.type===type).reduce((n,r)=>n+r.bytes,0);
      const longs=vitals.longTasks.filter(e=>e.phase===name);
      phases[name]={requests:rs.length,transferBytes:rs.reduce((n,r)=>n+r.bytes,0),imageBytes:bytes('Image'),jsBytes:bytes('Script'),cssBytes:bytes('Stylesheet'),fontBytes:bytes('Font'),longTasks:longs.length,longTaskMs:longs.reduce((n,e)=>n+e.duration,0),maxLongTaskMs:Math.max(0,...longs.map(e=>e.duration))};
    }
    const metric=(ms,name)=>ms.find(m=>m.name===name)?.value||0;
    const inspectionOpen={requests:openRequestIds.size,transferBytes:[...openRequestIds].reduce((sum,id)=>sum+requests.get(id).bytes,0)};
    const report={viewport:{width,height},conditions:{cache:'disabled',latencyMs:80,downMbps:10,cpuSlowdown:4},phases,inspectionOpen,cold:{lcpMs:coldVitals.lcp,cls:cls(coldVitals.shifts),scriptMs:metric(coldMetrics,'ScriptDuration')*1000,styleMs:metric(coldMetrics,'RecalcStyleDuration')*1000,layoutMs:metric(coldMetrics,'LayoutDuration')*1000},interaction:{cls:cls(vitals.shifts),observedEvents:vitals.interactions.length,maxEventLatencyMs:Math.max(0,...vitals.interactions.map(e=>e.duration)),note:'Lab Event Timing; not field INP',scriptMs:metric(finalMetrics,'ScriptDuration')*1000},errors,resources:[...requests.values()]};
    reports.push(report);await writeFile(`${directory}/${width}.json`,JSON.stringify(report,null,2));
    console.log(JSON.stringify({label,...report,resources:undefined}));await context.close();
  }
  await writeFile(`${directory}/summary.json`,JSON.stringify(reports,null,2));
} finally {await browser.close();}
