import { motion } from 'motion/react';
import { copy } from '../copy';
import type { Language } from '../types';

export default function DraftHandoff({language,active,reduced,assets}:{language:Language;active:boolean;reduced:boolean;assets:string[]}){
 return <div className="pv2-draft-handoff" data-handoff="draft-model">
  <svg className="pv2-lines" viewBox="0 0 1600 900">
   <path data-input="reference" d={active?'M408 416 H450 m-6 -4 6 4 -6 4 M510 416 H552 m-6 -4 6 4 -6 4':'M438 416 H522 m-7 -4 7 4 -7 4'}/>
   <motion.g data-draft-node initial={false} animate={{opacity:active?1:0}} transition={{duration:reduced?0:.14}}>
    <rect x="454" y="390" width="52" height="52" rx="12" fill="var(--pv2-bg)" stroke="var(--pv2-accent)" strokeWidth="1.5"/>
    <path d="M469 406 H491 V426 H469 Z M475 400 V406 M485 400 V406 M475 426 V432 M485 426 V432 M463 411 H469 M491 411 H497 M463 421 H469 M491 421 H497"/>
    <path data-input="assets" d="M439 496 V484 H521 V496 M480 484 V450 m-4 6 4 -6 4 6"/>
   </motion.g>
  </svg>
  <motion.div className="pv2-model-inputs" aria-hidden="true" initial={false} animate={{opacity:active?1:0}} transition={{duration:reduced?0:.14}}>
   {assets.map((src,i)=><img key={src} src={src} alt="" style={{left:i*41}}/>)}
  </motion.div>
  <span className="pv2-draft-model-label" data-stage-copy>{copy.draftModel[language]}</span>
 </div>;
}
