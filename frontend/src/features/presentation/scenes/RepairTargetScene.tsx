import { useEffect,useState } from 'react';
import { motion,useIsPresent } from 'motion/react';
import { copy } from '../copy';
import type { Box,PresentationCase,PresentationState } from '../types';
type Props={data:PresentationCase;state:PresentationState;patch:(v:Partial<PresentationState>)=>void;box?:Box;forward:boolean;reduced:boolean};
export default function RepairTargetScene({data,state,patch,box,forward,reduced}:Props){
 const present=useIsPresent();
 const operation=data.repair.operations[state.selectedOperation],lang=state.language;
 const [anchor,setAnchor]=useState<[number,number]|null>(null);
 const boxKey=box?.join(' ');
 useEffect(()=>{
  let raf=0;const start=performance.now();
  const track=()=>{const stage=document.querySelector('.pv2-stage'),target=stage?.querySelector('[data-figure="draft"] [data-target="'+operation.targetId+'"]');
   if(stage&&target){const s=Number(stage.getAttribute('data-scale')),a=stage.getBoundingClientRect(),b=target.getBoundingClientRect();
    const next:[number,number]=[(b.right-a.left)/s,(b.top+b.height/2-a.top)/s];setAnchor(old=>old&&Math.abs(old[0]-next[0])<.1&&Math.abs(old[1]-next[1])<.1?old:next);}
   if(performance.now()-start<650)raf=requestAnimationFrame(track);
  };track();return()=>cancelAnimationFrame(raf);
 },[operation.targetId,state.revision,boxKey]);
 const point=anchor??(box?[box[0]+box[2],box[1]+box[3]/2]:null),endY=368+state.selectedOperation*100;
 // Leave the target through its margin, then cross above the figure, clear of other objects.
 const exitX=point?Math.min(point[0]+16,1112):0,roof=212,radius=6;
 const path=point?'M'+point[0]+' '+point[1]+' H'+(exitX-radius)+' Q'+exitX+' '+point[1]+' '+exitX+' '+(point[1]-radius)+
  ' V'+(roof+radius)+' Q'+exitX+' '+roof+' '+(exitX+radius)+' '+roof+' H1116 Q1122 '+roof+' 1122 '+(roof+radius)+
  ' V'+(endY-radius)+' Q1122 '+endY+' 1128 '+endY+' H1178':'';
 return <motion.div className="pv2-target-scene" inert={!present} initial={false} exit={{opacity:0}} transition={{duration:reduced?0:.16}}>
  <motion.div className="pv2-operations" initial={forward?{opacity:0,y:8}:false} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.18,delay:forward?.3:0}}>
    <span data-stage-copy>{copy.operations[lang]}</span>
    {data.repair.operations.slice(0,2).map((op,i)=><button key={op.targetId} data-operation={op.targetId} aria-pressed={state.selectedOperation===i} onClick={()=>patch({selectedOperation:i})}>
      <span className="pv2-operation-number" data-stage-copy>0{i+1}</span><span data-stage-copy>{op.op==='replace_svg'?'replace':op.op}</span></button>)}
  </motion.div>
  {point&&<svg className="pv2-lines" viewBox="0 0 1600 900"><motion.path data-operation-connector={operation.targetId} d={path} initial={forward?{pathLength:0}:false} animate={{pathLength:1}} transition={{duration:reduced?0:.3,delay:forward?.3:0}}/>
   {data.issues[0]?.verification==='confirmed'&&<g transform={'translate('+point[0]+','+point[1]+')'} className="pv2-confirmed"><circle r="7"/><path d="M-3 0 L-1 2 L3 -2"/></g>}
  </svg>}
 </motion.div>;
}
