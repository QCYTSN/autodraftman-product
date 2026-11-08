import { useEffect,useRef } from 'react';
import { Check,X } from '@phosphor-icons/react';
import { copy } from '../copy';
import type { Box,PresentationState } from '../types';
type Props={state:PresentationState;box?:Box;patch:(value:Partial<PresentationState>)=>void;download:()=>void};
export default function EditableScene({state,box,patch,download}:Props){
 const input=useRef<HTMLInputElement>(null),composing=useRef(false),lang=state.language;
 const activate=()=>patch({editing:true,inputDraft:state.editedText});
 const cancel=()=>patch({editing:false,inputDraft:state.editedText});
 const apply=()=>{if(!composing.current)patch({editedText:state.inputDraft,editing:false});};
 useEffect(()=>{if(state.editing){input.current?.focus();input.current?.select();}},[state.editing]);
 const width=Math.max(220,(box?.[2]??180)+40),left=Math.min(1536-width-88,Math.max(64,box?.[0]??1000));
 const top=Math.min(740,(box?.[1]??400)+(box?.[3]??30)+18);
 return <>
  <div className="pv2-edit-actions"><button onClick={activate} data-stage-copy>{copy.edit[lang]}</button><button onClick={download} data-stage-copy>SVG</button></div>
  {state.editing&&<form className="pv2-inline-editor" style={{left,top}} onSubmit={e=>{e.preventDefault();apply();}}>
    <input ref={input} aria-label={copy.input[lang]} style={{width}} value={state.inputDraft} onChange={e=>patch({inputDraft:[...e.target.value].slice(0,40).join('')})}
      onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={()=>{composing.current=false;}}
      onKeyDown={e=>{e.stopPropagation();if(e.nativeEvent.isComposing||composing.current||e.keyCode===229)return;
        if(e.key==='Escape'){e.preventDefault();cancel();}if(e.key==='Enter'){e.preventDefault();apply();}}}/>
    <button type="submit" aria-label={copy.apply[lang]}><Check size={22}/></button><button type="button" aria-label={copy.cancel[lang]} onClick={cancel}><X size={22}/></button>
  </form>}
 </>;
}
