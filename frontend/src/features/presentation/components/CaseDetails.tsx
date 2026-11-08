import { useEffect,useRef,type RefObject } from 'react';
import { X } from '@phosphor-icons/react';
import type { PresentationCase,PresentationState } from '../types';
import { copy } from '../copy';
type Props={state:PresentationState;data:PresentationCase;offline:boolean;patch:(value:Partial<PresentationState>)=>void;
 onReset:()=>void;onRestore:()=>void;onFullscreen:()=>Promise<void>;returnFocus:RefObject<HTMLButtonElement|null>};
export default function CaseDetails({state,data,offline,patch,onReset,onRestore,onFullscreen,returnFocus}:Props){
 const root=useRef<HTMLElement>(null),lang=state.language;
 useEffect(()=>{const prior=document.activeElement as HTMLElement|null;root.current?.querySelector<HTMLButtonElement>('button')?.focus();
   return()=>{requestAnimationFrame(()=>{if(prior?.isConnected&&!prior.closest('[inert]'))prior.focus();else returnFocus.current?.focus();});};},[returnFocus]);
 const title=state.overlay==='menu'?copy.menu:state.overlay==='case'?copy.case:copy.details;
 return <aside ref={root} className={'pv2-overlay '+(state.overlay==='menu'?'pv2-menu':'pv2-details')} role="dialog" aria-modal="true" aria-labelledby="pv2-dialog-title"
  onKeyDown={e=>{if(e.key!=='Tab')return;const items=[...root.current!.querySelectorAll<HTMLElement>('button,a[href],summary,input')];const first=items[0],last=items[items.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}>
  <header><h2 id="pv2-dialog-title">{title[lang]}</h2><button aria-label={copy.close[lang]} onClick={()=>patch({overlay:'none'})}><X size={24}/></button></header>
  {state.overlay==='menu'?<div className="pv2-menu-items">
   <button onClick={()=>patch({language:lang==='en'?'zh':'en'})}>{copy.language[lang]}</button>
   <button onClick={()=>void onFullscreen()}>{copy.fullscreen[lang]} <kbd>F</kbd></button>
   <button onClick={()=>patch({overlay:'case'})}>{copy.case[lang]}</button>
   <button onClick={()=>patch({overlay:'details'})}>{copy.details[lang]} <kbd>D</kbd></button>
   {offline?<span>{copy.packaged[lang]}</span>:<a download href={import.meta.env.BASE_URL+'presentation-downloads/FigFox-Architecture-Demo-V2.html'}>{copy.offline[lang]}</a>}
   <button onClick={onReset}>{copy.reset[lang]}</button>
   <button onClick={()=>{onRestore();patch({overlay:'none'});}}>{copy.restore[lang]}</button>
  </div>:<div className="pv2-details-scroll">
   <h3>{data.id} · {data.title[lang]}</h3>
   <p>{lang==='en'?'Recorded artifacts. Live generation remains in the workspace.':'此处展示已记录产物，现场生成由工作台承担。'}</p>
   <dl><dt>SAM</dt><dd>{data.sam.mode} · {data.sam.segmentationCount??'—'}</dd>
    <dt>{lang==='en'?'Comparison scope':'对照范围'}</dt><dd>{data.repair.kind}</dd>
    <dt>{lang==='en'?'Before / after':'前后状态'}</dt><dd>{data.repair.kind==='transaction-snapshot'?(lang==='en'?'Actual transaction snapshots, including prior transaction context.':'真实事务执行前后快照，保留先前事务上下文。'):(lang==='en'?'Full repair includes this issue and other local changes.':'完整修复包含当前问题及其他局部调整。')}</dd>
   </dl>
   {state.overlay==='case'?<>
    <p>{data.sam.reason}</p><h3>{lang==='en'?'Models from this run':'本次运行模型'}</h3>
    {Object.entries(data.modelLabels).map(([role,model])=><p key={role}>{role}: {model??(lang==='en'?'Model name not recorded':'模型名称未记录')}</p>)}
    <h3>{lang==='en'?'Provenance and transformations':'来源与转换'}</h3><pre>{JSON.stringify(data.provenance,null,2)}</pre>
    {data.transformations.map(t=><p key={t}>{t}</p>)}
   </>:<>
    {data.issues.map(issue=><details key={issue.id} open={issue.id==='B1'}><summary>{issue.id} · {issue.title[lang]} · {issue.verification}</summary>
      <p>{issue.sourceEvidence[lang]}</p><p>{issue.draftEvidence[lang]}</p><p>{issue.recordedEvidence.source}</p><p>{issue.recordedEvidence.draft}</p>
      <pre>{JSON.stringify({factId:issue.factId,sourceRegion:issue.sourceRegion,draftRegion:issue.draftRegion,finalRegion:issue.finalRegion,targetIds:issue.targetIds,transactionId:issue.transactionId},null,2)}</pre></details>)}
    <h3>{data.repair.transactionId}</h3><pre>{JSON.stringify(data.repair.operations,null,2)}</pre>
    <p>{lang==='en'?'Entire run counts; execution completion is separate from visual acceptance.':'以下数字属于整次运行；执行完成与视觉验收分别记录。'}</p>
    <dl><dt>planned / executed</dt><dd>{data.repair.plannedOperations??'—'} / {data.repair.executedOperations??'—'}</dd>
     <dt>execution</dt><dd>{data.repair.executionStatus}</dd><dt>visual quality</dt><dd>{data.repair.visualQualityPass===null?'not-recorded':String(data.repair.visualQualityPass)}</dd>
     <dt>unresolved</dt><dd>{data.repair.unresolvedCount??'not-recorded'}</dd></dl>
    <h3>DeepSeek Gap Guidance</h3><p>{lang==='en'?'Conditional guidance for gaps in native operation protocols or executor capabilities.':'原生操作协议或执行器能力存在缺口时按需提供指导。'}</p>
    <p>{data.gapGuidance.state} · {data.gapGuidance.summary[lang]}</p>
    <details><summary>Case manifest</summary><pre>{JSON.stringify(data,null,2)}</pre></details>
   </>}
  </div>}
 </aside>;
}
