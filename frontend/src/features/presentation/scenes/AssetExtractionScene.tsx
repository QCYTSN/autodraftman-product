import { motion } from 'motion/react';
import type { Box,PresentationCase,PresentationState } from '../types';
import { assetConnector,mapBox,regionBox } from '../geometry';
import { copy } from '../copy';
import { motionTokens } from '../state';
type Props={data:PresentationCase;media:Record<string,string>;state:PresentationState;patch:(v:Partial<PresentationState>)=>void;forward:boolean;time:number;reduced:boolean};
export default function AssetExtractionScene({data,media,state,patch,forward,time,reduced}:Props){
 const assets=data.sam.assets.slice(0,3),offset=(3-assets.length)*166/2,frame:Box=[88,238,900,474];
 const handing=state.scene==='draft',selected=assets.findIndex(a=>a.id===state.selectedAsset);
 const box=selected>=0?mapBox(regionBox(assets[selected].sourceRegion),data.dimensions.viewBox,frame):null;
 const line=box?assetConnector(box,frame,294+offset+selected*166):null;
 return <>
  {!handing&&<motion.span className="pv2-assets-label" data-stage-copy initial={forward?{opacity:0}:false} animate={{opacity:1}} transition={{duration:.18,delay:forward?.44:0}}>{(data.sam.mode==='recorded'?copy.sam:copy.crops)[state.language]}</motion.span>}
  {assets.map((asset,i)=>{const source=mapBox(regionBox(asset.sourceRegion),data.dimensions.viewBox,frame),top=232+offset+i*166;
   return <motion.button className="pv2-asset" data-asset={asset.id} aria-pressed={state.selectedAsset===asset.id} key={asset.id}
    inert={handing} initial={false} animate={{left:handing?421+i*41:1120,top:handing?500:top,opacity:handing?0:1}}
    transition={{duration:reduced?0:handing?.48:.22,ease:motionTokens.enterEase}} onClick={()=>patch({selectedAsset:asset.id})}>
    <motion.img src={media[asset.image]} alt="" initial={forward&&!handing?{x:source[0]-1120,y:source[1]-top,width:source[2],height:source[3],opacity:0}:false}
     animate={{x:0,y:handing?0:(124-(asset.displayHeight??124))/2,width:handing?40:240,height:handing?40:(asset.displayHeight??124),opacity:1}}
     transition={{duration:reduced?0:handing?.48:.42,delay:forward&&!handing?.44+i*.07:0,ease:motionTokens.enterEase}}/>
    <motion.span data-stage-copy initial={forward?{opacity:0}:false} animate={{opacity:handing?0:1}} transition={{duration:.1,delay:forward&&!handing?.86+i*.07:0}}>{asset.name[state.language]}</motion.span>
   </motion.button>;
  })}
  {!handing&&line&&time>=990&&<svg className="pv2-lines" viewBox="0 0 1600 900"><motion.path data-asset-connector={state.selectedAsset} initial={false} animate={{d:line.path}} transition={{duration:reduced?0:.22}}/><circle cx={line.start[0]} cy={line.start[1]} r="2.5"/></svg>}
 </>;
}
