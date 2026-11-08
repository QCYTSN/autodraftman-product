import { CheckCircle } from '@phosphor-icons/react';
import { copy } from '../copy';
import type { Copy,PresentationCase,PresentationState } from '../types';

export const guidanceStates:Record<PresentationCase['gapGuidance']['state'],Copy>={
 triggered:{en:'Triggered',zh:'已触发'},'not-triggered':{en:'Not triggered',zh:'未触发'},'not-recorded':{en:'Not recorded',zh:'未记录'},
};
type Props={data:PresentationCase;state:PresentationState;patch:(v:Partial<PresentationState>)=>void};
export default function ArchitectureStatus({data,state,patch}:Props){
 const lang=state.language,issue=data.issues[0];
 return <>
  {state.scene==='targets'&&issue.verification==='confirmed'&&<span className="pv2-review-mark" data-verification="confirmed">
   <CheckCircle size={24}/><span data-stage-copy>{copy.confirmed[lang]} {issue.id}</span>
  </span>}
  {['targets','repair'].includes(state.scene)&&<div className={'pv2-guidance-branch '+(state.scene==='repair'?'pv2-guidance-execution':'')} data-guidance={data.gapGuidance.state}>
   <svg aria-hidden="true" className="pv2-guidance-line" width="330" height="380"><path d={state.scene==='repair'?'M150 0 H304 V364 H226':'M0 0 V160 H24'}/></svg><button aria-haspopup="dialog" onClick={()=>patch({overlay:'guidance'})} aria-label={copy.guidance[lang]+': '+guidanceStates[data.gapGuidance.state][lang]}>
    <span data-stage-copy>{copy.guidance[lang]}</span><small data-stage-copy>{guidanceStates[data.gapGuidance.state][lang]}</small>
   </button>
  </div>}
  {state.scene==='editable'&&<button className="pv2-retained" aria-haspopup="dialog" data-retained={data.repair.unresolvedCount??'not-recorded'} onClick={()=>patch({overlay:'retained'})}>
   <span data-stage-copy>{copy.retained[lang]} <b>{data.repair.unresolvedCount??'—'}</b></span>
  </button>}
 </>;
}
