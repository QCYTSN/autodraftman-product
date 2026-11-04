import { useState } from 'react';
import { motion, useTransform } from 'motion/react';
import type { DemoLanguage } from '../cases';
import { label, mainIds, number, type Metric, type Summary } from './data';
import { meanScore } from './comparisonData';
import { useAnimatedScore } from './useAnimatedScore';

function AnimatedNumber({ value, digits = 2 }: { value: number; digits?: number }) {
  const current = useAnimatedScore(value);
  const text = useTransform(current, next => next.toFixed(digits));
  return <><motion.span aria-hidden="true">{text}</motion.span><span className="research-sr-only">{number(value, digits)}</span></>;
}

function PlotPoint({ name, value, cost, maximum, featured, selected, onSelect }: { name: string; value: number; cost: number; maximum: number; featured: boolean; selected: boolean; onSelect: () => void }) {
  const animated = useAnimatedScore(value);
  const left = useTransform(animated, next => `${next}%`);
  return <motion.button className="research-cost-point" style={{ left, bottom: `${cost / maximum * 100}%` }} data-featured={featured || undefined} data-side={value > 55 ? 'left' : 'right'} data-score={value} data-cost={cost} aria-label={`${name}: ${number(value, 2)} / 100, $${number(cost, 3)}`} aria-pressed={selected} onClick={onSelect}>
    <i aria-hidden="true" /><span>{name}</span>
  </motion.button>;
}

export function QualityCostPlot({ data, language, metric, costMaximum }: { data: Summary; language: DemoLanguage; metric?: Metric; costMaximum: number }) {
  const zh = language === 'zh';
  const [selected, setSelected] = useState('A');
  const score = (id: string) => metric ? data.summaries[id][metric.id].score! : meanScore(data, id);
  const difference = score('A') - score('DrawAI');
  const saving = (1 - data.resources.A.cost / data.resources.DrawAI.cost) * 100;
  const qualityLabel = metric ? label(metric, language) : (zh ? '16 项等权均分' : '16-criterion mean');
  const method = data.methods.find(item => item.id === selected)!;
  return <div className="research-quality-cost">
    <figure className="research-cost-figure" aria-label={zh ? '四方法效果与每图费用坐标图' : 'Quality versus per-figure cost for four methods'}>
      <figcaption>{zh ? '每图记录费用 · USD' : 'Recorded cost per figure · USD'}</figcaption>
      <div className="research-cost-plot">
        {[0, 1, 2, 3, 4, 5].map(index => <div className="research-cost-grid" key={index} style={{ bottom: `${index * 20}%` }} aria-hidden="true"><span>${number(costMaximum * index / 5, 1)}</span></div>)}
        {[0, 25, 50, 75, 100].map(tick => <span className="research-quality-tick" key={tick} style={{ left: `${tick}%` }} aria-hidden="true">{tick}</span>)}
        {mainIds.map(id => <PlotPoint key={id} name={data.methods.find(item => item.id === id)!.name} value={score(id)} cost={data.resources[id].cost} maximum={costMaximum} featured={id === 'A'} selected={selected === id} onSelect={() => setSelected(id)} />)}
      </div>
      <div className="research-cost-axis"><span>{qualityLabel} →</span></div>
      <div className="research-point-readout" aria-live="polite" aria-atomic="true"><b>{method.name}</b><span><AnimatedNumber value={score(selected)} /> {zh ? '分' : 'points'}</span><span>${number(data.resources[selected].cost, 3)} / {zh ? '图' : 'figure'}</span></div>
    </figure>
    <div className="research-cost-insights">
      <h3>{zh ? 'FigFox 与 DrawAI' : 'FigFox and DrawAI'}</h3>
      <div className="research-cost-insight"><span>{zh ? (metric ? '单项得分差距' : '等权均分差距') : (metric ? 'Criterion score gap' : 'Mean score gap')}</span><strong><AnimatedNumber value={Math.abs(difference)} /><small>{zh ? '分' : 'points'}</small></strong><p>{zh ? `FigFox ${difference > 1e-9 ? '高于' : difference < -1e-9 ? '低于' : '持平'} DrawAI` : `FigFox ${difference > 1e-9 ? 'above' : difference < -1e-9 ? 'below' : 'level with'} DrawAI`}</p><div className="research-insight-values">FigFox <AnimatedNumber value={score('A')} /> <span>/</span> DrawAI <AnimatedNumber value={score('DrawAI')} /></div></div>
      <div className="research-cost-insight"><span>{zh ? 'FigFox 平均记录费用低' : 'Lower recorded cost for FigFox'}</span><strong>{number(saving, 1)}<small>%</small></strong><p>FigFox ${number(data.resources.A.cost, 3)} <span>/</span> DrawAI ${number(data.resources.DrawAI.cost, 3)}</p></div>
    </div>
  </div>;
}
