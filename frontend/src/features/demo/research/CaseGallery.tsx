import { useState } from 'react';
import { motion } from 'motion/react';
import { useReducedMotionPreference } from './useReducedMotionPreference';
import { useResearch } from './ResearchContext';
import { asset } from './data';

const examples = [
  { id: 'sample-0033', title: ['训练与推理流程', 'Training & inference'], detail: ['分区、模块连接与嵌入图像', 'Sections, connections and embedded images'] },
  { id: 'sample-0062', title: ['多层网络架构', 'Multi-layer architecture'], detail: ['层级布局、重复模块与跨区连线', 'Hierarchical layouts and cross-region connections'] },
  { id: 'sample-0097', title: ['注意力机制示意', 'Attention mechanisms'], detail: ['注意力模块、三维块与数据流', 'Attention modules, 3D blocks and data flow'] },
];

export function CaseGallery() {
  const { language, open } = useResearch();
  const zh = language === 'zh';
  const reduced = useReducedMotionPreference();
  const [index, setIndex] = useState(0);
  const [source, setSource] = useState(false);
  const item = examples[index];
  const locale = zh ? 0 : 1;
  return <div className="research-gallery">
    <div className="research-case-nav" data-demo-reveal="fade" role="group" aria-label={zh ? '精选重建案例' : 'Selected reconstructions'}>
      {examples.map((example, i) => <button key={example.id} aria-pressed={index === i} onClick={() => setIndex(i)}>
        <img loading="lazy" src={asset(`samples/${example.id}/A.webp`)} alt="" />
        <span><b>{example.title[locale]}</b><small>{example.detail[locale]}</small></span>
      </button>)}
    </div>
    <div className="research-gallery-toolbar" data-demo-reveal="fade">
      <h3>{item.title[locale]}</h3>
      <div className="research-controls research-tabs"><button aria-pressed={source} onClick={() => setSource(true)}>{zh ? '原图' : 'Reference'}</button><button aria-pressed={!source} onClick={() => setSource(false)}>FigFox</button></div>
    </div>
    <figure className="research-gallery-stage" data-demo-reveal data-demo-delay="1">
      <motion.img key={item.id + source} initial={{ opacity: reduced ? 1 : .25 }} animate={{ opacity: 1 }} transition={{ duration: .25 }} src={asset(`samples/${item.id}/${source ? 'source' : 'A'}.webp`)} alt={`${item.title[locale]} · ${source ? (zh ? '原图' : 'Reference') : 'FigFox'}`} loading="lazy" />
    </figure>
    <div className="research-gallery-footer" data-demo-reveal="fade"><span>{item.detail[locale]}</span><div><button className="research-text-action" onClick={() => open({ sample: item.id, metric: 'D08', condition: 'C', methods: ['A', 'C'] })}>{zh ? '放大与对照' : 'Inspect & compare'} ↗</button><a href={asset(`samples/${item.id}/A.svg`)} download>{zh ? '下载 SVG' : 'Download SVG'} ↓</a></div></div>
  </div>;
}
