import { useState } from 'react';
import { motion, useTransform } from 'motion/react';
import { useResearch } from './ResearchContext';
import { label, mainIds, number } from './data';
import { comparableMetrics, criterionRank, rankCounts } from './comparisonData';
import { useAnimatedScore } from './useAnimatedScore';
import './comparisons.css';
import { CriterionSelect } from './CriterionSelect';

export function RankComparison() {
  const { data, language } = useResearch();
  if (!data) return null;
  const zh = language === 'zh';
  const figfox = rankCounts(data, 'A');
  const rankLabels = zh ? ['第一', '第二', '第三及以后'] : ['First', 'Second', 'Third or below'];
  return <div className="research-ranking-overview">
    <div className="research-rank-highlights">
      <div><strong>{figfox.first}<small>/ {figfox.total}</small></strong><span>{zh ? '项指标排名第一' : 'criteria ranked first'}</span></div>
      <div><strong>{figfox.topTwo}<small>/ {figfox.total}</small></strong><span>{zh ? '项指标位列前二' : 'criteria in the top two'}</span></div>
    </div>
    <figure className="research-rank-distribution">
      <figcaption><span>{zh ? '四方法排名分布' : 'Rank distribution across four methods'}</span><div className="research-rank-legend">{rankLabels.map((text, index) => <span key={text}><i data-rank={index + 1} />{text}</span>)}</div></figcaption>
      {mainIds.map(id => {
        const method = data.methods.find(item => item.id === id)!;
        const counts = rankCounts(data, id);
        const description = `${method.name}: ${counts.first} ${rankLabels[0]}, ${counts.second} ${rankLabels[1]}, ${counts.other} ${rankLabels[2]}`;
        return <div className="research-rank-row" key={id} data-method={id} data-featured={id === 'A' || undefined}>
          <b>{method.name}</b>
          <div className="research-rank-bar" role="img" aria-label={description}>{[counts.first, counts.second, counts.other].map((count, index) => count > 0 && <span key={index} data-rank={index + 1} style={{ width: `${count / counts.total * 100}%` }} title={`${rankLabels[index]}: ${count}`} aria-hidden="true">{count}</span>)}</div>
        </div>;
      })}
      <p className="research-rank-scale">{zh ? `每行 ${figfox.total} 项同口径指标` : `${figfox.total} criteria with a shared review protocol per row`}</p>
    </figure>
  </div>;
}

function QualityGauge({ value, maximum, rank, countMode, zh }: { value: number; maximum: number; rank: number | null; countMode: boolean; zh: boolean }) {
  const score = useAnimatedScore(value);
  const percentage = useAnimatedScore(value / maximum * 100);
  const width = useTransform(percentage, current => `${current}%`);
  const text = useTransform(score, current => current.toFixed(countMode ? 0 : 1));
  return <div className="research-comparison-cell research-quality-cell">
    <div className="research-comparison-value"><motion.strong aria-hidden="true">{text}</motion.strong><small>/ {maximum}</small>{rank !== null && <span className="research-quality-rank">{zh ? `第 ${rank}` : `#${rank}`}</span>}</div>
    <span className="research-sr-only">{value.toFixed(countMode ? 0 : 1)} / {maximum}</span>
    <div className="research-comparison-track" aria-hidden="true"><motion.i style={{ width }} /><motion.b style={{ left: width }} /></div>
  </div>;
}

export function ResourceComparison() {
  const { data, language } = useResearch();
  const [criterion, setCriterion] = useState('top-two');
  if (!data) return null;
  const zh = language === 'zh';
  const metrics = comparableMetrics(data);
  const metric = metrics.find(item => item.id === criterion);
  const countMode = !metric;
  const qualityMaximum = countMode ? metrics.length : 100;
  const costMaximum = Math.ceil(Math.max(...mainIds.map(id => data.resources[id].cost)) * 2) / 2;
  const timeMaximum = Math.ceil(Math.max(...mainIds.map(id => data.resources[id].minutes)) / 5) * 5;
  const qualityLabel = metric ? label(metric, language) : (zh ? '前二指标数' : 'Criteria in the top two');
  return <div className="research-resource-comparison">
    <div className="research-comparison-toolbar"><CriterionSelect metrics={metrics} value={criterion} onValueChange={setCriterion} label={zh ? '对比效果' : 'Compare quality'} ariaLabel={zh ? '效果对比指标' : 'Quality comparison criterion'} language={language} includeOverview /><span>{zh ? '四种方法 · 每种 80 张图' : 'Four methods · 80 figures each'}</span></div>
    <div className="research-comparison-table" role="table" aria-label={zh ? '效果、记录费用与记录耗时对比' : 'Quality, recorded cost and recorded time'}>
      <div className="research-comparison-head" role="row"><span role="columnheader">{zh ? '方法' : 'Method'}</span><span role="columnheader">{qualityLabel} <small>↑</small></span><span role="columnheader">{zh ? '记录费用 / 张' : 'Recorded cost / figure'}<small>USD</small></span><span role="columnheader">{zh ? '记录耗时 / 张' : 'Recorded time / figure'}<small>{zh ? '分钟' : 'min'}</small></span></div>
      {mainIds.map(id => {
        const method = data.methods.find(item => item.id === id)!;
        const resources = data.resources[id];
        const quality = metric ? data.summaries[id][metric.id].score! : rankCounts(data, id).topTwo;
        return <div className="research-comparison-row" role="row" data-method={id} data-featured={id === 'A' || undefined} key={id}>
          <div className="research-comparison-method" role="rowheader"><b>{method.name}</b>{id === 'A' && <span>{zh ? '完整流程' : 'Full workflow'}</span>}</div>
          <div role="cell" aria-label={`${qualityLabel}: ${number(quality, countMode ? 0 : 1)} / ${qualityMaximum}`}><span className="research-mobile-label">{qualityLabel}</span><QualityGauge value={quality} maximum={qualityMaximum} rank={metric ? criterionRank(data, metric, id) : null} countMode={countMode} zh={zh} /></div>
          {(['cost', 'minutes'] as const).map(kind => <div role="cell" key={kind} className="research-comparison-cell" data-kind={kind}>
            <span className="research-mobile-label">{kind === 'cost' ? (zh ? '记录费用' : 'Recorded cost') : (zh ? '记录耗时' : 'Recorded time')}</span>
            <div className="research-comparison-value"><strong>{kind === 'cost' ? '$' : ''}{number(resources[kind], kind === 'cost' ? 3 : 2)}</strong><small>{kind === 'cost' ? 'USD' : (zh ? '分钟' : 'min')}</small></div>
            <div className="research-comparison-track" aria-hidden="true"><i style={{ width: `${resources[kind] / (kind === 'cost' ? costMaximum : timeMaximum) * 100}%` }} /></div>
          </div>)}
        </div>;
      })}
      <div className="research-comparison-axis" role="row" aria-hidden="true"><span role="cell" /><span role="cell">0 <i>{qualityMaximum}</i></span><span role="cell">0 <i>${costMaximum.toFixed(2)}</i></span><span role="cell">0 <i>{timeMaximum} {zh ? '分钟' : 'min'}</i></span></div>
    </div>
    <div className="research-comparison-scope"><span>{zh ? '费用按账本计入；耗时按各方法原运行记录汇总。' : 'Costs follow the recorded ledgers; time totals follow each method’s original run logs.'}</span><a href="#resource-scope" onClick={() => { const settings = document.getElementById('research-settings'); if (settings instanceof HTMLDetailsElement) settings.open = true; }}>{zh ? '统计范围' : 'Measurement scope'} ↗</a></div>
  </div>;
}
