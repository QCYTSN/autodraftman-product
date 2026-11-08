import { useCallback,useEffect,useMemo,useState } from 'react';
import { AnimatePresence,motion } from 'motion/react';
import { CornersOut } from '@phosphor-icons/react';
import FigureViewport,{type ObjectBounds} from './components/FigureViewport';
import EditableScene from './scenes/EditableScene';
import AssetExtractionScene from './scenes/AssetExtractionScene';
import RepairTargetScene from './scenes/RepairTargetScene';
import { titles,copy } from './copy';
import { evidenceCameras,mapBox,repairCamera,draftObjects } from './geometry';
import { useSceneSequence } from './useSceneSequence';
import type { Box,PresentationCase,PresentationState } from './types';
export type StageProps={data:PresentationCase;media:Record<string,string>;state:PresentationState;patch:(value:Partial<PresentationState>)=>void;edited:string;download:()=>void};
export default function PresentationStage({data,media,state,patch,edited,download}:StageProps){
 const {scene,language:lang}=state,issue=data.issues.find(i=>i.id==='B1')!;
 const sequence=useSceneSequence(state),{time,forward,reduced}=sequence;
 const cameras=useMemo(()=>evidenceCameras(issue.sourceRegion,issue.draftRegion),[issue]);
 const localCamera=useMemo(()=>repairCamera(data),[data]);
 const objects=useMemo(()=>draftObjects(media[data.svg.draft],data),[data,media]);
 const [chosenObject,setChosenObject]=useState<string|null>(null);
 useEffect(()=>setChosenObject(null),[state.revision]);
 const activeObject=scene==='draft'&&forward&&time<990?objects[Math.min(objects.length-1,time<650?0:time<820?1:2)]:objects.find(o=>o.id===chosenObject)??objects.at(-1);
 const referenceFrames:Record<string,Box>={opening:[730,224,790,450],assets:[88,238,900,474],draft:[88,330,320,170],evidence:[88,246,650,430],targets:[1320,654,176,100]};
 const referenceFrame=referenceFrames[scene]??referenceFrames.targets;
 const referenceCamera=scene==='evidence'&&!state.fullReference?cameras[0]:data.dimensions.viewBox;
 const localFrame:Box=[88,226,1010,500],editFrame:Box=[224,224,1152,544];
 const draftFrame:Box=scene==='evidence'?[862,246,650,430]:['targets','repair','editable'].includes(scene)?localFrame:[560,220,952,502];
 const draftCamera=scene==='evidence'?(state.fullDraft?data.dimensions.viewBox:cameras[1]):['targets','repair','editable'].includes(scene)?localCamera:data.dimensions.viewBox;
 const [editBounds,setEditBounds]=useState<ObjectBounds>({}),[targetBounds,setTargetBounds]=useState<ObjectBounds>({});
 const onEditBounds=useCallback((value:ObjectBounds)=>setEditBounds(value),[]),onTargetBounds=useCallback((value:ObjectBounds)=>setTargetBounds(value),[]);
 const operations=data.repair.operations.slice(0,2),targetIds=operations.map(o=>o.targetId),activeTarget=operations[state.selectedOperation].targetId;
 const after=state.comparisonMode==='after'&&!state.temporaryBefore&&(!forward||time>=180);
 const sceneDuration=reduced?0:!forward?.18:scene==='assets'?.44:scene==='draft'?.48:scene==='targets'?.6:.56;
 const blendDuration=reduced?0:forward?.24:.18;
 const editingReady=scene==='editable'&&time>=560;
 const referenceVisible=['opening','assets','draft','evidence','targets'].includes(scene);
 const title=titles[scene][lang];
 const openingEntrance=scene==='opening'&&state.revision===0&&!reduced;
 return <main className="pv2-main" aria-label={scene} data-comparison={scene==='repair'?(after?'after':'before'):undefined} data-sequence={time}>
  <AnimatePresence mode="wait"><motion.h1 className={'pv2-title '+(scene==='opening'?'pv2-title-opening':scene==='editable'?'pv2-title-end':'')} key={title} data-stage-copy
    initial={{opacity:reduced?1:0}} animate={{opacity:1}} exit={{opacity:0,transition:{duration:forward?.16:0}}} transition={{duration:reduced?0:openingEntrance?.24:.18,delay:openingEntrance?.08:0}}>
    {scene==='opening'?<>{lang==='en'?'From pixels.':'从像素'}<br/>{lang==='en'?'To ':'到'}<span className="pv2-structure-word">{lang==='en'?'structure.':'结构'}<motion.i initial={openingEntrance?{scaleX:0}:false} animate={{scaleX:1}} transition={{duration:openingEntrance?.3:0,delay:openingEntrance?.18:0}}/></span></>:title}
  </motion.h1></AnimatePresence>
  <FigureViewport dimensions={data.dimensions} image={media[data.images.reference]} name="reference" frame={referenceFrame} camera={referenceCamera}
   visible={referenceVisible} duration={sceneDuration} openingEntrance={openingEntrance} paperShadow={scene==='opening'} label={!referenceVisible||scene==='targets'?undefined:copy.reference[lang]}
   regions={scene==='assets'?data.sam.assets.slice(0,3).map(a=>({id:a.id,region:a.sourceRegion,maskSvg:a.maskSvg})):scene==='evidence'&&state.fullReference?[{id:'B1',region:issue.sourceRegion}]:[]}
   selectedRegion={scene==='assets'?state.selectedAsset:'B1'} regionsAnimated={scene==='assets'&&forward&&time<600}
   endpoint={issue.sourceEndpoint??undefined} showEndpoint={scene==='opening'||(scene==='evidence'&&!state.fullReference&&time>=560)} openingPoint={scene==='opening'}/>
  {(scene==='assets'||(scene==='draft'&&forward&&time<480))&&<AssetExtractionScene data={data} media={media} state={state} patch={patch} {...sequence}/>}
  <FigureViewport dimensions={data.dimensions} svg={media[data.svg.draft]} name="draft" frame={draftFrame} camera={draftCamera}
   visible={['draft','evidence','targets'].includes(scene)} duration={sceneDuration} label={scene==='draft'?copy.svgDraft[lang]:scene==='targets'?copy.target[lang]:scene==='evidence'?copy.draft[lang]:undefined}
   targets={scene==='targets'?targetIds:scene==='draft'&&time>=480?objects.map(o=>o.id):[]} selectedTarget={scene==='targets'?activeTarget:activeObject?.id}
   onlySelected={scene==='draft'} objectLabel={scene==='draft'&&time>=480&&activeObject?copy[activeObject.type][lang]:undefined}
   objectLabelSide={activeObject?.type==='text'?'right':'left'}
   onObject={scene==='draft'?id=>setChosenObject(id):undefined} objectNames={Object.fromEntries(objects.map(o=>[o.id,copy[o.type][lang]]))} onBoxes={onTargetBounds}
   regions={scene==='evidence'&&state.fullDraft?[{id:'B1',region:issue.draftRegion}]:[]} selectedRegion="B1" endpoint={issue.draftEndpoint??undefined} showEndpoint={scene==='evidence'&&!state.fullDraft&&time>=560}/>
  {scene==='draft'&&<svg className="pv2-lines pv2-draft-arrow" viewBox="0 0 1600 900"><path d="M438 416 H522 m-7 -4 7 4 -7 4"/></svg>}
  {scene==='evidence'&&<><span className="pv2-direction" data-stage-copy>{copy.direction[lang]}</span><div className="pv2-evidence-baseline pv2-left"/><div className="pv2-evidence-baseline pv2-right"/>
   {[false,true].map(right=><button key={String(right)} className={'pv2-full-figure '+(right?'pv2-right':'pv2-left')} aria-label={copy.fullFigure[lang]+' '+(right?copy.draft[lang]:copy.reference[lang])}
    aria-pressed={right?state.fullDraft:state.fullReference} onClick={()=>patch(right?{fullDraft:!state.fullDraft}:{fullReference:!state.fullReference})}><CornersOut size={24}/></button>)}</>}
  <AnimatePresence>{scene==='targets'&&<RepairTargetScene key="targets" data={data} state={state} patch={patch} forward={forward} reduced={reduced}
    box={targetBounds[activeTarget]?mapBox(targetBounds[activeTarget],localCamera,localFrame):undefined}/>}</AnimatePresence>
  <FigureViewport dimensions={data.dimensions} svg={media[data.repair.beforeSvg]} name="before" frame={localFrame} camera={localCamera} visible={scene==='repair'} opacity={after?0:1}
    duration={blendDuration} targets={targetIds} selectedTarget={activeTarget}/>
  <FigureViewport dimensions={data.dimensions} svg={scene==='editable'?edited:media[data.repair.afterSvg]} name="result" frame={scene==='editable'?editFrame:localFrame}
    camera={scene==='editable'?data.dimensions.viewBox:localCamera} visible={scene==='repair'||scene==='editable'} opacity={scene==='repair'&&!after?0:1}
    duration={scene==='editable'?sceneDuration:blendDuration} targets={editingReady?[data.editTarget.elementId]:targetIds} selectedTarget={editingReady?data.editTarget.elementId:activeTarget}
    emphasis={scene==='repair'&&forward&&time>=420&&time<820} onBoxes={onEditBounds} onObject={editingReady?()=>patch({editing:true,inputDraft:state.editedText}):undefined}
    objectNames={{[data.editTarget.elementId]:copy.edit[lang]}}/>
  {scene==='repair'&&<div className="pv2-comparison"><div>{(['before','after'] as const).map(mode=><button key={mode} data-compare={mode} aria-pressed={state.comparisonMode===mode} onClick={()=>patch({comparisonMode:mode})} data-stage-copy>{copy[mode][lang]}</button>)}</div>
    <span data-stage-copy>{(after?copy.repaired:copy.draft)[lang]}</span></div>}
  {scene==='editable'&&<EditableScene state={state} patch={patch} download={download} box={editBounds[data.editTarget.elementId]?mapBox(editBounds[data.editTarget.elementId],data.dimensions.viewBox,editFrame):undefined}/>}
 </main>;
}
