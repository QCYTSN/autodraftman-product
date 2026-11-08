import { guidanceStates } from '../scenes/ArchitectureStatus';
import type { Language,PresentationCase } from '../types';

export default function RecordDetails({data,language:lang,kind}:{data:PresentationCase;language:Language;kind:'guidance'|'retained'}){
 const zh=lang==='zh';
 return <div className="pv2-details-scroll" data-record-details={kind}>
  <h3>{data.id}</h3>
  {kind==='guidance'?<>
   <h3>DeepSeek Gap Guidance</h3>
   <p>{zh?'原生操作协议或执行器实现存在缺口时，按需提供辅助指导。它不是每次运行的必经环节。':'Optional guidance for gaps in native operation protocols or executor capabilities. This branch is conditional.'}</p>
   <dl><dt>{zh?'记录状态':'Recorded state'}</dt><dd data-guidance-status={data.gapGuidance.state}>{guidanceStates[data.gapGuidance.state][lang]}</dd></dl>
   <p>{data.gapGuidance.summary[lang]}</p>
   {data.gapGuidance.state==='not-recorded'&&<p>{zh?'当前材料无法证明该支路被调用，也不能据此断言它没有被调用。':'The material establishes neither a call nor an explicit non-trigger for this branch.'}</p>}
  </>:<>
   <p>{zh?'系统保留处理未完成或仍有不确定性的事项。下列数量来自执行记录；它不代表整图视觉质量已经通过。':'Outstanding or uncertain items are retained with the result. The recorded count is separate from overall visual acceptance.'}</p>
   <dl><dt>{zh?'保留事项':'Retained items'}</dt><dd data-unresolved-count>{data.repair.unresolvedCount??(zh?'未记录':'Not recorded')}</dd>
    <dt>{zh?'操作执行':'Operation execution'}</dt><dd>{data.repair.executionStatus}</dd>
    <dt>{zh?'整图视觉验收':'Overall visual acceptance'}</dt><dd data-visual-acceptance>{data.repair.visualQualityPass===null?(zh?'未记录':'Not recorded'):String(data.repair.visualQualityPass)}</dd>
   </dl>
   {data.repair.unresolvedItems?.length?<pre>{JSON.stringify(data.repair.unresolvedItems,null,2)}</pre>:<p>{data.repair.unresolvedCount===0?(zh?'本次记录的保留清单为空。':'The retained list in this record is empty.'):(zh?'当前材料没有提供事项明细。':'Item details are unavailable in this material.')}</p>}
  </>}
 </div>;
}
