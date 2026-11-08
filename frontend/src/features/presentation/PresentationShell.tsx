import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, DotsThree } from '@phosphor-icons/react';
import { MotionConfig } from 'motion/react';
import { initialState,reducer,scenes,stageFor,stageStarts } from './state';
import { copy,stages,titles } from './copy';
import { editedSvg } from './svg';
import type { Language,PresentationCase,PresentationState } from './types';
import PresentationStage from './PresentationStage';
import CaseDetails from './components/CaseDetails';
export default function PresentationShell({data,media,offline,language}:{data:PresentationCase;media:Record<string,string>;offline:boolean;language:Language}){
  const [state,dispatch]=useReducer(reducer,initialState(language,data.editTarget.originalText,data.sam.assets[0]?.id??''));
  const host=useRef<HTMLDivElement>(null),menu=useRef<HTMLButtonElement>(null),lastNavigation=useRef(-Infinity);
  const [scale,setScale]=useState(Math.min(innerWidth/1600,innerHeight/900)),[message,setMessage]=useState('');
  const patch=useCallback((value:Partial<PresentationState>)=>dispatch({type:'patch',value}),[]);
  const index=scenes.indexOf(state.scene),stage=stageFor(state.scene),lang=state.language;
  const navigate=useCallback((next:number,direct=false)=>{
    next=Math.max(0,Math.min(6,next));if(next===index||performance.now()-lastNavigation.current<250)return;
    lastNavigation.current=performance.now();dispatch({type:'navigate',index:next,direct});
  },[index]);
  const fullscreen=useCallback(async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await host.current?.requestFullscreen();}
    catch{setMessage(copy.fullscreenFailed[lang]);}},[lang]);
  useEffect(()=>{const resize=()=>setScale(Math.min(host.current!.clientWidth/1600,host.current!.clientHeight/900));
    const observer=new ResizeObserver(resize);observer.observe(host.current!);resize();return()=>observer.disconnect();},[]);
  useEffect(()=>{document.documentElement.lang=lang==='zh'?'zh-CN':'en';document.title='FigFox · Architecture V2';},[lang]);
  useEffect(()=>{
    const down=(e:KeyboardEvent)=>{
      if(e.repeat||e.isComposing||e.keyCode===229||e.altKey||e.ctrlKey||e.metaKey)return;
      const target=e.target as HTMLElement;
      if(target.closest('input,textarea,select,[contenteditable="true"]'))return;
      const key=e.key.toLowerCase();
      if(key==='escape'){if(state.overlay!=='none'){e.preventDefault();patch({overlay:'none'});}return;}
      if(key==='f'){e.preventDefault();void fullscreen();return;}
      if(key==='d'){e.preventDefault();patch({overlay:state.overlay==='details'?'none':'details'});return;}
      if(state.overlay!=='none')return;
      if((key===' '||key==='enter')&&target.closest('button,a,[role="button"]'))return;
      let next:number|undefined,direct=false;
      if(['ArrowRight','PageDown',' '].includes(e.key))next=index+1;
      if(['ArrowLeft','PageUp'].includes(e.key))next=index-1;
      if(e.key==='Home'){next=0;direct=true;}if(e.key==='End'){next=6;direct=true;}
      if(['1','2','3'].includes(key)){next=stageStarts[Number(key)-1];direct=true;}
      if(next!==undefined){e.preventDefault();navigate(next,direct);return;}
      if(key==='b'&&state.scene==='repair'){e.preventDefault();patch({temporaryBefore:true});}
    };
    const up=(e:KeyboardEvent)=>{if(e.key.toLowerCase()==='b')patch({temporaryBefore:false});};
    const release=()=>patch({temporaryBefore:false});
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',release);
    document.addEventListener('visibilitychange',release);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',release);document.removeEventListener('visibilitychange',release);};
  },[state.overlay,state.scene,index,navigate,fullscreen,patch]);
  const edited=useMemo(()=>editedSvg(media[data.svg.final],data.editTarget,state.editedText),[data,media,state.editedText]);
  const download=()=>{const url=URL.createObjectURL(new Blob([edited],{type:'image/svg+xml;charset=utf-8'}));const a=document.createElement('a');
    a.href=url;a.download='FigFox-sample-0001-edited.svg';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);};
  return <MotionConfig reducedMotion="user"><div ref={host} className="figfox-presentation-v2">
    <div className="pv2-stage" data-scene={state.scene} data-language={lang} data-scale={scale} data-offline={offline} style={{transform:'translate(-50%,-50%) scale('+scale+')'}}>
      <div inert={state.overlay!=='none'}>
        <header className="pv2-top"><img className="pv2-brand" src={media.logo} alt="FigFox"/><span className="pv2-mode">{copy.mode[lang]}</span>
          <span className="pv2-stage-number">{stage<0?'METHOD':'0'+(stage+1)+' / 03'}</span>
          <button ref={menu} className="pv2-menu-trigger" aria-label={copy.menu[lang]} onClick={()=>patch({overlay:'menu'})}><DotsThree size={28}/></button></header>
        <PresentationStage data={data} media={media} state={state} patch={patch} edited={edited} download={download}/>
        <footer className="pv2-footer"><nav className="pv2-dots" aria-label="Scenes">{scenes.map((scene,i)=><button key={scene} data-scene-button={scene} aria-label={scene} aria-current={index===i?'step':undefined} onClick={()=>navigate(i,true)}><span/></button>)}</nav>
          <nav className="pv2-stages" aria-label="Stages">{stages.map((label,i)=><button key={i} aria-current={stage===i?'step':undefined} onClick={()=>navigate(stageStarts[i],true)}>{label[lang]}</button>)}</nav>
          <div className="pv2-arrows"><button disabled={index===0} aria-label={copy.previous[lang]} onClick={()=>navigate(index-1)}><ArrowLeft size={24}/></button><button disabled={index===6} aria-label={copy.next[lang]} onClick={()=>navigate(index+1)}><ArrowRight size={24}/></button></div>
        </footer>
      </div>
      {state.overlay!=='none'&&<CaseDetails state={state} data={data} offline={offline} patch={patch} onFullscreen={fullscreen}
        onReset={()=>dispatch({type:'reset',originalText:data.editTarget.originalText,selectedAsset:data.sam.assets[0]?.id??''})}
        onRestore={()=>dispatch({type:'restore',originalText:data.editTarget.originalText})} returnFocus={menu}/>}
      {message&&<button className="pv2-toast" role="status" onClick={()=>setMessage('')}>{message}</button>}
      <span className="pv2-sr" aria-live="polite">{index+1} / 7 · {titles[state.scene][lang]}</span>
    </div></div></MotionConfig>;
}
