import { createContext, useContext, useEffect, useRef, useState, lazy, Suspense, type ReactNode } from 'react';
import type { DemoLanguage } from '../cases';
import { load, type SampleIndex, type Selection, type Summary } from './data';
import './research.css';
const Compare = lazy(() => import('./SampleBrowser'));
type Store = { data: Summary | null; samples: SampleIndex[]; error: boolean; ensureSamples: () => void; open: (s: Selection) => void; language: DemoLanguage };
const Context = createContext<Store>(null!);
export const useResearch = () => useContext(Context);
export function ResearchProvider({ language, children }: { language: DemoLanguage; children: ReactNode }) {
  const [data,setData]=useState<Summary|null>(null), [samples,setSamples]=useState<SampleIndex[]>([]), [error,setError]=useState(false), [selection,setSelection]=useState<Selection|null>(null);
  const trigger=useRef<HTMLElement|null>(null), previousHash=useRef('');
  function ensureSamples() { setError(false); void load<SampleIndex[]>('samples.json').then(setSamples).catch(()=>setError(true)); }
  function open(s: Selection) { trigger.current=document.activeElement as HTMLElement; previousHash.current=location.hash; ensureSamples(); setSelection(s); history.replaceState(null,'',`#research?sample=${s.sample}&metric=${s.metric}&condition=${s.condition??'A'}&methods=${(s.methods??[]).join(',')}&view=${s.view??''}&scope=${s.scope??''}`); }
  useEffect(()=>{ void load<Summary>('summary.json').then(setData).catch(()=>setError(true));
    function readHash() { if(location.hash.startsWith('#research?')) { const q=new URLSearchParams(location.hash.slice(10)); ensureSamples(); setSelection({sample:q.get('sample')??'sample-0001',metric:q.get('metric')??'D01',condition:q.get('condition')??'A', methods:q.get('methods')?.split(',').filter(Boolean), view:q.get('view')==='overview'?'overview':q.get('view')==='pair'?'pair':undefined, scope:q.get('scope')==='ablation'?'ablation':q.get('scope')==='comparison'?'comparison':undefined}); } }
    readHash(); addEventListener('hashchange',readHash);return()=>removeEventListener('hashchange',readHash);
  },[]);
  return <Context.Provider value={{data,samples,error,ensureSamples,open,language}}>{children}{selection&&data&&<Suspense fallback={<div className="research-loading" role="status">{language==='zh'?'正在载入比较器…':'Loading comparison…'}</div>}><Compare selection={selection} onClose={()=>{setSelection(null); history.replaceState(null,'',location.pathname+location.search+previousHash.current); requestAnimationFrame(()=>trigger.current?.focus({preventScroll:true}));}} /></Suspense>}</Context.Provider>;
}
export function ResearchOverview() { const {data,language}=useResearch();const zh=language==='zh';return <div className="research-overview"><span><b>{data?.provenance.cohortN??'—'}</b> {zh?'张科研图':'scientific figures'}</span><span><b>4</b> {zh?'种方法':'methods'}</span><span><b>{data?.metrics.length??'—'}</b> {zh?'项评价标准':'criteria'}</span><a href="#demo-benchmarks">{zh?'探索实验发现':'Explore the evidence'} ↗</a></div>; }
export function BrowserEntry() { const {open,language}=useResearch();return <section className="research-entry"><div><span className="research-eyebrow">EXPERIMENT EXPLORER</span><h2>{language==='zh'?'同一张图，四种重建':'One figure. Four reconstructions.'}</h2><p>{language==='zh'?'从原图出发，检查文字、连接和可编辑结构。所有方法保留真实输出。':'Inspect text, connections and editable structure against the source.'}</p></div><button onClick={()=>open({sample:'sample-0001',metric:'D01'})}>{language==='zh'?'打开四方法比较':'Open four-method comparison'} ↗</button></section>; }
