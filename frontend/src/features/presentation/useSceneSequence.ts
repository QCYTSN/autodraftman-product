import { useEffect,useRef,useState } from 'react';
import type { PresentationState } from './types';
import { usePresentationMotion } from './usePresentationMotion';
// Only forward navigation plays a narrative sequence. Every timer belongs to a revision.
export function useSceneSequence(state:PresentationState){
 const reduced=usePresentationMotion(),finished=useRef(-1);
 const [step,setStep]=useState({revision:-1,time:1100});
 useEffect(()=>{
  if(reduced||state.navigation!=='forward'||finished.current===state.revision){finished.current=state.revision;setStep({revision:state.revision,time:1100});return;}
  setStep({revision:state.revision,time:0});
  const timers=[180,200,420,440,480,560,600,650,720,820,990,1100].map(time=>setTimeout(()=>{
   if(time===1100)finished.current=state.revision;setStep({revision:state.revision,time});
  },time));
  return()=>timers.forEach(clearTimeout);
 },[state.revision,state.navigation,reduced]);
 const time=reduced||state.navigation!=='forward'?1100:step.revision===state.revision?step.time:0;
 return {time,reduced,forward:state.navigation==='forward'&&!reduced,duration:reduced?0:state.navigation==='forward'?.6:.18};
}
