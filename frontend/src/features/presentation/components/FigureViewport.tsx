import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence,motion } from 'motion/react';
import { cleanSvg, instanceSvg, targetBox } from '../svg';
import { motionTokens } from '../state';
import type { Box, PresentationCase, Region } from '../types';
export type ObjectBounds = Record<string, Box>;
type Props = {
  dimensions: PresentationCase['dimensions']; image?: string; svg?: string; frame: Box; camera?: Box;
  label?: string; name: string; visible?: boolean; duration?: number; opacity?: number; paperShadow?: boolean;
  targets?: string[]; selectedTarget?: string; onBoxes?: (boxes: ObjectBounds) => void;
  onObject?: (id: string) => void; objectNames?: Record<string,string>; objectLabel?: string;
  regions?: {id:string; region:Region; maskSvg?:string; labelPosition?:[number,number]|null; labelAnchor?:'start'|'end'}[]; selectedRegion?: string; regionsOpacity?: number; regionLabels?: boolean;
  endpoint?: [number,number]; showEndpoint?: boolean;
  onlySelected?: boolean; regionsAnimated?: boolean; emphasis?: boolean; openingPoint?: boolean;
  objectLabelSide?: 'left'|'right';
  openingEntrance?: boolean;
};
export function corners([x,y,w,h]: Box, length: number) {
  const l=Math.min(length,w/2,h/2);
  return 'M'+x+' '+(y+l)+' V'+y+' H'+(x+l)+' M'+(x+w-l)+' '+y+' H'+(x+w)+' V'+(y+l)
    +' M'+(x+w)+' '+(y+h-l)+' V'+(y+h)+' H'+(x+w-l)+' M'+(x+l)+' '+(y+h)+' H'+x+' V'+(y+h-l);
}
export default function FigureViewport({dimensions,image,svg,frame,camera=dimensions.viewBox,label,name,visible=true,duration=0,opacity=1,paperShadow=false,
 targets=[],selectedTarget,onBoxes,onObject,objectNames={},objectLabel,regions=[],selectedRegion,regionsOpacity=1,endpoint,showEndpoint=false,
 onlySelected=false,regionsAnimated=false,emphasis=false,openingPoint=false,objectLabelSide='left',openingEntrance=false,regionLabels=false}:Props){
  const prefix='pv2-'+useId().replace(/:/g,'');
  const instance=useMemo(()=>svg?instanceSvg(svg,prefix):null,[svg,prefix]);
  const root=useRef<SVGGElement>(null);
  const [boxes,setBoxes]=useState<ObjectBounds>({});
  const targetKey=targets.join('|');
  const masks=useMemo(()=>Object.fromEntries(regions.filter(r=>r.maskSvg).map(r=>[r.id,instanceSvg(cleanSvg(r.maskSvg!),prefix+'-mask-'+r.id).html])),[regions,prefix]);
  useLayoutEffect(()=>{
    if(!root.current||!instance)return;
    const next:ObjectBounds={};
    for(const id of targets){const node=root.current.querySelector('[id="'+instance.ids.get(id)+'"]') as SVGGraphicsElement|null;
      if(node)next[id]=targetBox(node,root.current);}
    setBoxes(next);onBoxes?.(next);
  },[instance,targetKey,onBoxes]);
  const s=Math.min(frame[2]/camera[2],frame[3]/camera[3]);
  const labelBox=selectedTarget?boxes[selectedTarget]:undefined;
  return <motion.div className={'pv2-figure'+(paperShadow?' pv2-paper-shadow':'')} data-figure={name} aria-hidden={!visible}
    style={{pointerEvents:visible?'auto':'none'}} inert={!visible}
    initial={openingEntrance?{left:frame[0],top:frame[1],width:frame[2],height:frame[3],opacity:0,y:12}:false} animate={{left:frame[0],top:frame[1],width:frame[2],height:frame[3],opacity:visible?opacity:0,y:0}}
    transition={{duration:openingEntrance&&duration>0?.42:duration,ease:motionTokens.cameraEase}}>
    {label&&<span className="pv2-figure-label" data-stage-copy>{label}</span>}
    <motion.svg className="pv2-document" role="group" aria-label={name} initial={false} animate={{viewBox:camera.join(' ')}}
      transition={{duration,ease:motionTokens.cameraEase}} data-camera={camera.join(' ')}>
      {image&&<image href={image} width={dimensions.width} height={dimensions.height}/>}
      {instance&&<g ref={root} id={prefix+'-document'} dangerouslySetInnerHTML={{__html:instance.html}}/>}
      <g className="pv2-observation">
        {regions.map(({id,region:{box:[l,t,r,b]},maskSvg,labelPosition,labelAnchor},i)=><motion.g key={id} data-region={id} className={id===selectedRegion?'is-selected':''}
          initial={regionsAnimated?{opacity:0}:false} animate={{opacity:regionsOpacity*(id===selectedRegion?1:regionLabels?.6:.35)}} transition={{duration:duration===0?0:regionsAnimated?.16:.22,delay:regionsAnimated?.2+i*.07:0}}>
          {maskSvg?<g id={prefix+'-mask-'+id+'-document'} dangerouslySetInnerHTML={{__html:masks[id]}}/>:
            <path d={corners([l,t,r-l,b-t],18/s)} fill="none" stroke="var(--pv2-accent)" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/>}
          {regionLabels&&<text data-stage-copy data-issue-label={id} x={labelPosition?.[0]??l} y={labelPosition?.[1]??t-7/s} textAnchor={labelAnchor??'start'} fontSize={22/s} fontFamily="inherit" fill="var(--pv2-accent-text)" paintOrder="stroke" stroke="white" strokeWidth={3/s}>{id}</text>}
        </motion.g>)}
        <AnimatePresence>{Object.entries(boxes).map(([id,box])=>{
          const [x,y,w,h]=box, active=id===selectedTarget, pad=4/s;
          return <motion.g key={id} data-target={id} data-selected={active} initial={{opacity:0}} animate={{opacity:emphasis&&active?[1,.35,1]:1}} exit={{opacity:0}} transition={{duration:duration===0?0:emphasis?.32:.16}}>
            {active?<path d={corners([x-pad,y-pad,w+pad*2,h+pad*2],18/s)} fill="none" stroke="var(--pv2-accent)" strokeWidth="2.5" vectorEffect="non-scaling-stroke"/>:!onlySelected&&
              <rect x={x-pad} y={y-pad} width={w+pad*2} height={h+pad*2} fill="none" stroke="var(--pv2-secondary)" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke"/>}
            {onObject&&<rect role="button" tabIndex={0} aria-label={objectNames[id]??id} data-object-hit={id}
              x={x-6/s} y={y-6/s} width={Math.max(w+12/s,28/s)} height={Math.max(h+12/s,28/s)} fill="transparent"
              onClick={()=>onObject(id)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();onObject(id);}}}/>}
          </motion.g>;
        })}</AnimatePresence>
        {endpoint&&showEndpoint&&<motion.circle className="pv2-endpoint" initial={{opacity:duration===0?1:0}} animate={{opacity:1}} transition={{duration:duration===0?0:openingPoint?.12:.14}}
          cx={endpoint[0]} cy={endpoint[1]} r={(openingPoint?3:6)/s} fill={openingPoint?'var(--pv2-accent)':'none'} stroke={openingPoint?'none':'var(--pv2-issue)'} strokeWidth="1.5" vectorEffect="non-scaling-stroke"/>}
      </g>
    </motion.svg>
    {objectLabel&&labelBox&&<span className="pv2-object-label" data-stage-copy style={{
      left:(labelBox[0]-camera[0])*s+(frame[2]-camera[2]*s)/2+(objectLabelSide==='right'?labelBox[2]*s+16:-16),
      top:(labelBox[1]-camera[1])*s+(frame[3]-camera[3]*s)/2+(objectLabelSide==='right'?-12:(labelBox[3]*s-28)/2),
      transform:objectLabelSide==='left'?'translateX(-100%)':undefined}}>{objectLabel}</span>}
  </motion.div>;
}
