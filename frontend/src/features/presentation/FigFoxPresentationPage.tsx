import { useEffect, useState } from 'react';
import PresentationShell from './PresentationShell';
import { presentationCase, media } from './data/prepared-case';
import { fontData } from './data/prepared-font';
import { cleanSvg } from './svg';
import { copy } from './copy';
import type { Language } from './types';
import './presentation.css';
export default function FigFoxPresentationPage({offline=false}:{offline?:boolean}){
  const [loaded,setLoaded]=useState(0),[ready,setReady]=useState<Record<string,string>|null>(null);
  const [started,setStarted]=useState(offline),[error,setError]=useState(false),[retry,setRetry]=useState(0);
  const language:Language=new URLSearchParams(location.search).get('lang')==='zh'?'zh':'en';
  const total=Object.keys(media).length+1;
  useEffect(()=>{
    let cancelled=false;setLoaded(0);setError(false);
    const prepared:Record<string,string>={};
    const done=()=>{if(!cancelled)setLoaded(n=>n+1);};
    const font=new FontFace('FigFox Presentation Figtree','url('+fontData+')',{weight:'300 900'});
    Promise.all([font.load().then(loadedFont=>{if(!cancelled)document.fonts.add(loadedFont);done();}),...Object.entries(media).map(async([name,value])=>{
      prepared[name]=name.endsWith('.svg')?cleanSvg(value):value;
      const image=new Image();image.src=name.endsWith('.svg')?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(prepared[name]):value;
      await image.decode();done();
    })]).then(()=>{if(!cancelled)setReady(prepared);}).catch(()=>{if(!cancelled)setError(true);});
    return()=>{cancelled=true;document.fonts.delete(font);};
  },[retry]);
  if(!ready||!started)return <div className="figfox-presentation-v2 pv2-loading"><img src={media.logo} alt="FigFox"/>
    <h1>{(error?copy.failed:copy.loading)[language]}</h1><p role="status">{loaded} / {total}</p>
    <button disabled={!error&&!ready} onClick={()=>error?setRetry(n=>n+1):setStarted(true)}>{(error?copy.retry:copy.begin)[language]}</button></div>;
  return <PresentationShell data={presentationCase} media={ready} offline={offline} language={language}/>;
}
