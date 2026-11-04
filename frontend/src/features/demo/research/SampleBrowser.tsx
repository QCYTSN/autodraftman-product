import { useEffect, useRef, useState } from 'react';
import { useResearch } from './ResearchContext';
import { asset, category, label, load, mainIds, number, type Artifact, type Sample, type Selection } from './data';

type Evidence = Record<string, Record<string, {evidence:{status:string;text:string;reviewer:number;source:string}[]}>>;

export default function SampleBrowser({selection,onClose}:{selection:Selection;onClose:()=>void}) {
 const {data,samples,language,error:indexError,ensureSamples}=useResearch(); const zh=language==='zh';
 const [requested,setRequested]=useState(selection.sample),[metric,setMetric]=useState(selection.metric),[filter,setFilter]=useState('all');
 const [focus,setFocus]=useState(Boolean(selection.methods?.some(k=>k==='B'||k==='C')||(selection.condition&&selection.condition!=='A')));
 const initialPair=(selection.methods?.length===2?selection.methods:['A',selection.condition&&selection.condition!=='A'?selection.condition:'DrawAI']).map(k=>data!.methods.some(m=>m.id===k)?k:'A');
 const [pair,setPair]=useState(initialPair[0]===initialPair[1]?['A','DrawAI']:initialPair);
 const [zoom,setZoom]=useState(1),[current,setCurrent]=useState<Sample|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 const [evidenceRetry,setEvidenceRetry]=useState(0);
 const [wantsEvidence,setWantsEvidence]=useState(false),[evidence,setEvidence]=useState<{sample:string;data:Evidence}|null>(null),[evidenceError,setEvidenceError]=useState(false);
 const sid=samples.some(s=>s.id===requested)?requested:(samples[0]?.id??requested);
 const sample=current?.id===sid?current:null;
 const m=data!.metrics.find(m=>m.id===metric)??data!.metrics[0];
 const visible=focus?pair:mainIds;
 const scope=visible.some(k=>k==='B'||k==='C')?'ablation':'comparison';
 const summary=scope==='ablation'?data!.ablationSummaries:data!.summaries;
 const dialog=useRef<HTMLDialogElement>(null),pan=useRef({x:0,y:0}),drag=useRef<{x:number;y:number;px:number;py:number}|null>(null),gallery=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  dialog.current?.showModal();
  const old=document.body.style.overflow,scroll=window.scrollY;document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=old;window.scrollTo({top:scroll,behavior:'instant'});};
 },[]);
 useEffect(()=>{
  if(!samples.length)return;
  const controller=new AbortController();
  setError(false);setWantsEvidence(false);setEvidenceError(false);reset();
  // Coalesce rapid selection; removed images and obsolete JSON work are not retained.
  const timer=setTimeout(()=>{void load<Sample>('sample-meta/'+sid+'.json',controller.signal)
   .then(value=>{if(!controller.signal.aborted)setCurrent(value);})
   .catch(()=>{if(!controller.signal.aborted)setError(true);});},120);
  return()=>{clearTimeout(timer);controller.abort();};
 },[sid,samples,retry]);
 useEffect(()=>{
  if(!wantsEvidence||!sample)return;
  const controller=new AbortController();setEvidenceError(false);
  void load<Evidence>('details/'+sid+'.json',controller.signal)
   .then(value=>{if(!controller.signal.aborted)setEvidence({sample:sid,data:value});})
   .catch(()=>{if(!controller.signal.aborted)setEvidenceError(true);});
  return()=>controller.abort();
 },[wantsEvidence,sample,sid,evidenceRetry]);
 useEffect(()=>{history.replaceState(null,'','#research?sample='+sid+'&metric='+metric+'&condition='+(selection.condition??'A')+'&methods='+pair.join(','));},[sid,metric,pair,selection.condition]);
 function move(x:number,y:number){pan.current={x,y};gallery.current?.style.setProperty('--pan-x',x+'px');gallery.current?.style.setProperty('--pan-y',y+'px');}
 function reset(){setZoom(1);move(0,0);drag.current=null;}
 function preview(a:Artifact,name:string){
  return a.image?<img key={a.image} src={asset(a.image)} width={a.width} height={a.height} decoding="async" alt={name} draggable={false}/>:
   <div className="research-unavailable">{a.status==='damaged'?(zh?'原始 SVG 损坏':'Original SVG is damaged'):(zh?'此产物暂无预览':'Preview unavailable')}</div>;
 }
 return <dialog className="research-dialog" ref={dialog} onCancel={e=>{e.preventDefault();onClose();}} aria-labelledby="research-browser-title" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <header><div><span className="research-eyebrow">SAMPLE EXPLORER</span><h2 id="research-browser-title">{zh?'对照真实输出':'Compare actual outputs'}</h2></div><button onClick={onClose} aria-label={zh?'关闭比较':'Close comparison'}>×</button></header>
  <div className="research-controls">
   <label>{zh?'拥挤度':'Clutter'}<select aria-label={zh?'拥挤度':'Clutter'} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{zh?'全部':'All'}</option>{[...new Set(samples.map(s=>s.category))].sort().map(c=><option key={c} value={c}>{category(c,zh)}</option>)}</select></label>
   <label>{zh?'样本':'Sample'}<select aria-label={zh?'样本':'Sample'} value={sid} onChange={e=>setRequested(e.target.value)}>{samples.filter(s=>filter==='all'||s.category===filter||s.id===sid).map(s=><option key={s.id}>{s.id}</option>)}</select></label>
   <label>{zh?'指标':'Criterion'}<select aria-label={zh?'指标':'Criterion'} value={metric} onChange={e=>setMetric(e.target.value)}>{data!.metrics.map(m=><option key={m.id} value={m.id}>{m.id} · {label(m,language)}</option>)}</select></label>
   <button aria-pressed={focus} onClick={()=>{setFocus(!focus);reset();}}>{zh?'聚焦比较':'Focus comparison'}</button>
  </div>
  {sample?<div data-sample={sample.id}>
   <figure className="research-source">{preview(sample.source,zh?'原图':'Source')}<figcaption>{sample.id} · {category(sample.category,zh)} · <a href={sample.sourceUrl} target="_blank" rel="noreferrer">{zh?'原论文':'Source paper'} ↗</a></figcaption></figure>
   {focus&&<div className="research-controls">{pair.map((v,i)=><label key={i}>{zh?'方法 '+(i+1):'Method '+(i+1)}<select aria-label={zh?'方法 '+(i+1):'Method '+(i+1)} value={v} onChange={e=>setPair(pair.map((p,j)=>i===j?e.target.value:p))}>{data!.methods.filter(m=>(scope==='ablation'?['A','B','C']:mainIds).includes(m.id)).map(m=><option key={m.id} value={m.id} disabled={pair[1-i]===m.id}>{m.name}</option>)}</select></label>)}<label>{zh?'同步缩放':'Shared zoom'}<input aria-label={zh?'同步缩放':'Shared zoom'} type="range" min="1" max="4" step=".25" value={zoom} onChange={e=>setZoom(+e.target.value)}/>{Math.round(zoom*100)}%</label><button onClick={reset}>{zh?'重置视图':'Reset view'}</button><button aria-label={zh?'向左平移':'Pan left'} onClick={()=>move(pan.current.x-40,pan.current.y)}>←</button><button aria-label={zh?'向右平移':'Pan right'} onClick={()=>move(pan.current.x+40,pan.current.y)}>→</button><button aria-label={zh?'向上平移':'Pan up'} onClick={()=>move(pan.current.x,pan.current.y-40)}>↑</button><button aria-label={zh?'向下平移':'Pan down'} onClick={()=>move(pan.current.x,pan.current.y+40)}>↓</button></div>}
   <div className="research-browser-definition"><b>{m.id} · {label(m,language)}</b><p>{zh?m.definition:m.definitionEn}</p><small>{zh?'本图判断 · Codex 复核':'Per-image judgment · Codex review'}</small></div>
   <p className="research-caption">{m.id==='D09'?(zh?'D09 此处显示当前单图复核；汇总图保留历史值。':'D09 here shows current per-image review; summary charts retain historical values.'):zh?('该指标的'+(scope==='comparison'?'四方法对比':'消融')+'使用 '+summary.A[m.id].sampleN+' 张共同有效图。'+(sample.eligible[scope].includes(m.id)?'':'本图不在这一有效集合内。')):('This criterion uses '+summary.A[m.id].sampleN+' jointly valid figures in '+scope+'. '+(sample.eligible[scope].includes(m.id)?'':'This image is outside that valid set.'))}</p>
   <div className={'research-output-grid '+(focus?'is-focus':'')} ref={gallery} style={{'--zoom':zoom} as React.CSSProperties}>
    {visible.map(k=>{const method=data!.methods.find(m=>m.id===k)!;const a=sample.artifacts[k];const s=sample.scores[k][m.id];return <article key={k} data-method={k} style={{'--method':method.color} as React.CSSProperties}>
     <header><strong>{method.name}</strong><span>{m.id} {number(s.score)} / 100</span></header>
     <div className="research-output" onPointerDown={e=>{if(!focus)return;drag.current={x:e.clientX,y:e.clientY,px:pan.current.x,py:pan.current.y};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current)move(drag.current.px+e.clientX-drag.current.x,drag.current.py+e.clientY-drag.current.y);}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>{preview(a,method.name+' '+sid)}</div>
     <footer><span>{zh?'通过 / 失败 / 未知 / NA':'Pass / Fail / Unknown / NA'}: {['pass','fail','unknown','NA'].map(k=>s.counts[k as keyof typeof s.counts]??0).join(' / ')}</span>{a.svg&&<a href={asset(a.svg)} download>{a.status==='damaged'?(zh?'下载损坏原件':'Download damaged original'):(zh?'下载原始 SVG':'Original SVG')} ↓</a>}</footer>
     <details key={sid} onToggle={e=>{if(e.currentTarget.open)setWantsEvidence(true);}}><summary>{zh?'查看评分证据与出处':'Judgment evidence & provenance'}</summary>{evidenceError?<p role="alert">{zh?'证据加载失败':'Evidence unavailable'} <button onClick={()=>setEvidenceRetry(v=>v+1)}>{zh?'重试':'Retry'}</button></p>:evidence?.sample===sid?evidence.data[k]?.[m.id]?.evidence.map(e=><p key={e.reviewer}><b>{e.status} · Codex</b><br/>{e.text}</p>):<p role="status">{zh?'正在加载证据…':'Loading evidence…'}</p>}
      {a.previewOrigin==='rendered-original-svg'&&<p>{zh?'预览由原始 SVG 渲染；原始资料未附 PNG。':'Preview rendered from the original SVG; no PNG was supplied.'}</p>}
      {sample.resources?.[k]&&<p>{zh?'本图记录：':'Recorded for this image:'} $ {number(sample.resources[k].cost,3)} · {number(sample.resources[k].seconds,1)} s · {sample.resources[k].tokens.toLocaleString()} API tokens</p>}
      <p className="research-hash">SVG SHA256: {a.svgHash}<br/>{a.evaluationVersion} · {a.runId}</p>
     </details>
    </article>;})}
   </div>
  </div>:<div className="research-browser-pending" style={{minHeight:'60vh'}} role={error||indexError?'alert':'status'}>{error||indexError?<>{zh?'样本加载失败':'Sample could not be loaded'} <button onClick={()=>{if(indexError)ensureSamples();setRetry(r=>r+1);}}>{zh?'重试':'Retry'}</button></>:zh?'正在加载样本…':'Loading sample…'}</div>}
 </dialog>;
}
