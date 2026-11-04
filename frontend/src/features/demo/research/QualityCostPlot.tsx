import { useState } from 'react';
import { motion, useTransform } from 'motion/react';
import type { DemoLanguage } from '../cases';
import { label, mainIds, number, type Metric, type Summary } from './data';
import { meanScore } from './comparisonData';
import { costComparison, differenceText, scoreComparison } from './display';
import { useAnimatedScore } from './useAnimatedScore';

function AnimatedNumber({ value, digits = 1 }: { value: number; digits?: number }) {
  const current = useAnimatedScore(value);
  const text = useTransform(current, next => next.toFixed(digits));
  return <><motion.span aria-hidden="true">{text}</motion.span><span className="research-sr-only">{number(value, digits)}</span></>;
}

function PlotPoint({ name, value, cost, maximum, featured, reference, selected, onSelect }: { name: string; value: number; cost: number; maximum: number; featured: boolean; reference: boolean; selected: boolean; onSelect: () => void }) {
  const animated = useAnimatedScore(value);
  const left = useTransform(animated, next => `${next}%`);
  return <motion.button className="research-cost-point" style={{ left, bottom: `${(1 - cost / maximum) * 100}%` }} data-featured={featured || undefined} data-reference={reference || undefined} data-side={value > 55 ? 'left' : 'right'} data-score={value} data-cost={cost} aria-label={`${name}: ${number(value)} / 100, $${number(cost, 3)}`} aria-pressed={selected} onClick={onSelect}>
    <i aria-hidden="true" /><span>{name}</span>
  </motion.button>;
}

export function QualityCostPlot({ data, language, metric, costMaximum }: { data: Summary; language: DemoLanguage; metric?: Metric; costMaximum: number }) {
  const zh = language === 'zh';
  const [selected, setSelected] = useState('A');
  const [comparison, setComparison] = useState('DrawAI');
  const reference = data.methods.find(item => item.id === comparison)!;
  function selectMethod(id: string) { setSelected(id); if (id !== 'A') setComparison(id); }
  const score = (id: string) => metric ? data.summaries[id][metric.id].score! : meanScore(data, id);
  const difference = score('A') - score(comparison);
  const referenceCost = data.resources[comparison].cost;
  const costChange = referenceCost === 0 ? null : (data.resources.A.cost - referenceCost) / referenceCost * 100;
  const qualityLabel = metric ? label(metric, language) : (zh ? '16 项等权均分' : '16-criterion mean');
  const method = data.methods.find(item => item.id === selected)!;
  return <div className="research-quality-cost">
    <figure className="research-cost-figure" data-demo-reveal aria-label={zh ? '四方法效果与每图费用坐标图：越上费用越低，越右分数越高' : 'Quality versus per-figure cost: lower costs toward the top, higher scores toward the right'}>
      <figcaption><span>{zh ? '记录的每图费用 · USD · 越低越好 ↑' : 'Recorded USD / figure · Lower is better ↑'}</span><span className="research-cost-direction">{zh ? '高分、低费用 ↗' : 'Higher scores, lower costs ↗'}</span></figcaption>
      <div className="research-cost-plot">
        {[0, 1, 2, 3, 4, 5].map(index => <div className="research-cost-grid" key={index} style={{ bottom: `${100 - index * 20}%` }} aria-hidden="true"><span>${number(costMaximum * index / 5, 1)}</span></div>)}
        {[0, 25, 50, 75, 100].map(tick => <span className="research-quality-tick" key={tick} style={{ left: `${tick}%` }} aria-hidden="true">{tick}</span>)}
        {mainIds.map(id => <PlotPoint key={id} name={data.methods.find(item => item.id === id)!.name} value={score(id)} cost={data.resources[id].cost} maximum={costMaximum} featured={id === 'A'} reference={id === comparison} selected={selected === id} onSelect={() => selectMethod(id)} />)}
      </div>
      <div className="research-cost-axis"><span>{qualityLabel} · {zh ? '越高越好' : 'Higher is better'} →</span></div>
      <div className="research-point-readout" aria-live="polite" aria-atomic="true"><b>{method.name}</b><span><AnimatedNumber value={score(selected)} /> {zh ? '分' : 'points'}</span><span>${number(data.resources[selected].cost, 3)} / {zh ? '图' : 'figure'}</span><span className="research-reference-readout">{zh ? '对照：' : 'Reference: '}{reference.name}</span></div>
    </figure>
    <div className="research-cost-insights" data-demo-reveal data-demo-delay="1">
      <h3>{zh ? `FigFox 与 ${reference.name}` : `FigFox and ${reference.name}`}</h3>
      <div className="research-cost-insight"><span>{zh ? (metric ? '单项得分差距' : '等权均分差距') : (metric ? 'Criterion score gap' : 'Mean score gap')}</span><strong title={Math.abs(difference).toString()}>{difference !== 0 && Math.abs(difference) < .1 ? '<0.1' : <AnimatedNumber value={Math.abs(difference)} />}<small>{zh ? '分' : 'points'}</small></strong><p aria-live="polite">{scoreComparison(score('A'), score(comparison), reference.name, zh)}</p><div className="research-insight-values">FigFox <AnimatedNumber value={score('A')} /> <span>/</span> {reference.name} <AnimatedNumber value={score(comparison)} /></div></div>
      <div className="research-cost-insight"><span>{zh ? '记录的每图费用' : 'Recorded cost per figure'}</span><strong>{costChange === null ? '—' : differenceText(costChange)}<small>{costChange !== null && '%'}</small></strong><p aria-live="polite">{costComparison(data.resources.A.cost, referenceCost, zh)}</p><p>FigFox ${number(data.resources.A.cost, 3)} <span>/</span> {reference.name} ${number(referenceCost, 3)}</p></div>
    </div>
  </div>;
}
