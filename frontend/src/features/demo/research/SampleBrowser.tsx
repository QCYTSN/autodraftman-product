import { useEffect, useRef, useState } from 'react';
import { useResearch } from './ResearchContext';
import { asset, category, label, load, mainIds, number, type Artifact, type Selection } from './data';
type Evidence = Record<string,Record<string,{evidence:{status:string;text:string;reviewer:number}[]}>>;
export default function SampleBrowser({selection,onClose}:{selection:Selection;onClose:()=>void}) {
 const {data,samples,language}=useResearch(); const zh=language==='zh';
 const [sid,setSid]=useState(selection.sample),[metric,setMetric]=useState(selection.metric),[filter,setFilter]=useState('all'),[focus,setFocus]=useState(Boolean(selection.condition&&selection.condition!=='A'));
 const initialPair=(selection.methods?.length===2?selection.methods:['A',selection.condition&&selection.condition!=='A'?selection.condition:'DrawAI']).map(k=>data!.methods.some(m=>m.id===k)?k:'A');
 const [pair,setPair]=useState(initialPair[0]===initialPair[1]?['A','DrawAI']:initialPair);
 const [zoom,setZoom]=useState(1),[evidence,setEvidence]=useState<Evidence|null>(null),[error,setError]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null),pan=useRef({x:0,y:0}),drag=useRef<{x:number;y:number;px:number;py:number}|null>(null),gallery=useRef<HTMLDivElement>(null);
 const sample=samples.find(s=>s.id===sid)??samples[0]; const m=data!.metrics.find(m=>m.id===metric)??data!.metrics[0];
 useEffect(()=>{const d=dialog.current;d?.showModal();const old=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=old;};},[]);
 useEffect(()=>{let alive=true;setEvidence(null);setError(false);void load<Evidence>(`details/${sid}.json`).then(d=>{if(alive)setEvidence(d);}).catch(()=>{if(alive)setError(true);});reset();return()=>{alive=false;};},[sid]);
 useEffect(()=>{history.replaceState(null,'',`#research?sample=${sid}&metric=${metric}&condition=${selection.condition??'A'}&methods=${pair.join(',')}`);},[sid,metric,pair,selection.condition]);
 function move(x:number,y:number){pan.current={x,y};gallery.current?.style.setProperty('--pan-x',x+'px');gallery.current?.style.setProperty('--pan-y',y+'px');}
 function reset(){setZoom(1);move(0,0);}
 function preview(a:Artifact,name:string){return a.image?<img src={asset(a.image)} alt={name} draggable={false} />:<div className="research-unavailable">{a.status==='damaged'?(zh?'原始 SVG 损坏，保留失败记录':'Original SVG damaged; failure retained'):(zh?'本地资料未包含此产物；评分与证据仍可查看':'Artifact absent from local archive; scores and evidence remain available')}</div>;}
 const visible=focus?pair:mainIds;
 return <dialog className="research-dialog" ref={dialog} onCancel={onClose} aria-labelledby="research-browser-title" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
  <header><div><span className="research-eyebrow">SAMPLE EXPLORER</span><h2 id="research-browser-title">{zh?'对照真实输出':'Compare actual outputs'}</h2></div><button onClick={onClose} aria-label={zh?'关闭比较':'Close comparison'}>×</button></header>
  <div className="research-controls">
   <label>{zh?'拥挤度':'Clutter'}<select aria-label={zh?'拥挤度':'Clutter'} value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">{zh?'全部':'All'}</option>{[...new Set(samples.map(s=>s.category))].sort().map(c=><option key={c} value={c}>{category(c,zh)}</option>)}</select></label>
   <label>{zh?'样本':'Sample'}<select aria-label={zh?'样本':'Sample'} value={sid} onChange={e=>setSid(e.target.value)}>{samples.filter(s=>filter==='all'||s.category===filter||s.id===sid).map(s=><option key={s.id}>{s.id}</option>)}</select></label>
   <label>{zh?'指标':'Criterion'}<select aria-label={zh?'指标':'Criterion'} value={metric} onChange={e=>setMetric(e.target.value)}>{data!.metrics.map(m=><option key={m.id} value={m.id}>{m.id} · {label(m,language)}</option>)}</select></label>
   <button aria-pressed={focus} onClick={()=>{setFocus(!focus);reset();}}>{zh?'聚焦比较':'Focus comparison'}</button>
  </div>
  {sample?<><figure className="research-source">{preview(sample.source,zh?'原图':'Source')}<figcaption>{sample.id} · {category(sample.category,zh)} · <a href={sample.sourceUrl} target="_blank" rel="noreferrer">{zh?'原论文':'Source paper'} ↗</a></figcaption></figure>
  {focus&&<div className="research-controls">{pair.map((v,i)=><label key={i}>{zh?`方法 ${i+1}`:`Method ${i+1}`}<select aria-label={zh?`方法 ${i+1}`:`Method ${i+1}`} value={v} onChange={e=>setPair(pair.map((p,j)=>i===j?e.target.value:p))}>{data!.methods.map(m=><option key={m.id} value={m.id} disabled={pair[1-i]===m.id}>{m.name}</option>)}</select></label>)}<label>{zh?'同步缩放':'Shared zoom'}<input aria-label={zh?'同步缩放':'Shared zoom'} type="range" min="1" max="4" step=".25" value={zoom} onChange={e=>setZoom(+e.target.value)}/>{Math.round(zoom*100)}%</label><button onClick={reset}>{zh?'重置视图':'Reset view'}</button><button onClick={()=>move(pan.current.x-40,pan.current.y)}>←</button><button onClick={()=>move(pan.current.x+40,pan.current.y)}>→</button><button onClick={()=>move(pan.current.x,pan.current.y-40)}>↑</button><button onClick={()=>move(pan.current.x,pan.current.y+40)}>↓</button></div>}
  <div className="research-browser-definition">{m.id==='D09'&&<p>{zh?'此处为最新双评审 D09，不能与旧轮汇总逐图配对。':'These are current double-review D09 judgments, separate from historical summary scores.'}</p>}<b>{m.id} · {label(m,language)}</b><p>{zh?m.definition:m.definitionEn}</p><small>{zh?'0–100 分 · 越高越好':'0–100 score · Higher is better'}</small></div>
  <p className="research-caption">{zh?'全图按比例展示；不同画布未做局部配准。聚焦模式可同步拖动与缩放。':'Full figures preserve aspect ratio; different canvases are not locally registered. Drag or zoom both focus panes together.'}</p>
  <div className={'research-output-grid '+(focus?'is-focus':'')} ref={gallery} style={{'--zoom':zoom} as React.CSSProperties}>
   {visible.map(k=>{const method=data!.methods.find(m=>m.id===k)!;const a=sample.artifacts[k];const s=sample.scores[k][m.id];return <article key={k} style={{'--method':method.color} as React.CSSProperties}>
    <header><strong>{method.name}</strong><span>{m.id} {number(s.score)} / 100</span></header>
    <div className="research-output" onPointerDown={e=>{if(!focus)return;drag.current={x:e.clientX,y:e.clientY,px:pan.current.x,py:pan.current.y};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current)move(drag.current.px+e.clientX-drag.current.x,drag.current.py+e.clientY-drag.current.y);}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>{preview(a,method.name+' '+sid)}</div>
    <footer><span>{zh?'通过 / 失败 / 未知 / NA':'Pass / Fail / Unknown / NA'}: {['pass','fail','unknown','NA'].map(k=>s.counts[k as keyof typeof s.counts]??0).join(' / ')}</span>{a.svg&&<a href={asset(a.svg)} download>{zh?'下载原始 SVG':'Original SVG'} ↓</a>}</footer>
    <details><summary>{zh?'查看评分证据与出处':'Judgment evidence & provenance'}</summary>{error?<p role="alert">{zh?'证据加载失败，请重新打开':'Evidence unavailable. Reopen to retry.'}</p>:evidence?.[k]?.[m.id]?.evidence.map(e=><p key={e.reviewer}><b>{e.status} · {zh?'评审':'Review'} {e.reviewer+1}</b><br/>{e.text}</p>)}{sample.resources?.[k]&&<p>{zh?'本图记录（非端到端）：':'This image, recorded (not end-to-end):'} ${number(sample.resources[k].cost,3)} · {number(sample.resources[k].seconds,1)} s · {sample.resources[k].tokens.toLocaleString()} API tokens</p>}<p className="research-hash">SHA256: {a.svgHash}<br/>{a.runId}</p></details>
   </article>;})}
  </div><p className="research-caption">{zh?'单图分数来自两次独立模型判断，非连续精度估计。D09 此处显示最新复核，与沿用旧轮的汇总表分开。':'Per-image scores come from two independent model reviews, not continuous precision estimates. D09 here uses the latest review, separately from the historical summary.'}</p></>:<p role="status">{zh?'正在加载样本…':'Loading samples…'}</p>}
 </dialog>;
}
