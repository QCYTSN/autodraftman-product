import { useState } from 'react';
import { motion, useTransform } from 'motion/react';
import { useResearch } from './ResearchContext';
import { label, mainIds, number } from './data';
import { bestResult, comparableMetrics, criterionRank, gapToBest, meanScore, rankCounts } from './comparisonData';
import { differenceText } from './display';
import { useAnimatedScore } from './useAnimatedScore';
import './comparisons.css';
import { QualityCostPlot } from './QualityCostPlot';
import { CriterionSelect } from './CriterionSelect';

export function ScoreComparison({ onLocate }: { onLocate: (metric: string) => void }) {
  const { data, language } = useResearch();
  if (!data) return null;
  const zh = language === 'zh';
  const figfox = rankCounts(data, 'A');
  const rankLabels = zh ? ['第一', '第二', '第三及以后'] : ['First', 'Second', 'Third or below'];
  const closeCount = comparableMetrics(data).filter(metric => gapToBest(data, metric, 'A') <= 5).length;
  return <div className="research-score-overview">
    <div className="research-score-examples">{['D01', 'D08', 'D11'].map(id => {
      const metric = data.metrics.find(item => item.id === id)!;
      const score = data.summaries.A[id].score!;
      const gap = gapToBest(data, metric, 'A');
      const best = bestResult(data, metric);
      const bestNames = best.methods.map(method => data.methods.find(item => item.id === method)!.name).join(' / ');
      return <figure className="research-score-example" data-demo-reveal key={id} data-metric={id}>
        <figcaption>{label(metric, language)}</figcaption>
        <div className="research-score-pair"><div><small>FigFox</small><strong title={String(score)}>{number(score)}</strong></div><div><small>{zh ? '最高' : 'Best'} · {bestNames}</small><b title={String(best.score)}>{number(best.score)}</b></div></div>
        <div className="research-score-track" role="img" aria-label={`FigFox ${number(score)}, ${bestNames} ${number(best.score)}, 0–100`}>
          <i style={{ left: `${Math.min(score, best.score ?? score)}%`, width: `${Number.isFinite(gap) ? gap : 0}%` }} /><b style={{ left: `${best.score ?? 0}%` }} /><span style={{ left: `${score}%` }} />
        </div>
        <div className="research-score-gap"><span>0–100</span><b title={String(gap)}>{gap === 0 ? (best.methods.length > 1 ? (zh ? '本项并列最高' : 'Joint highest score') : (zh ? '本项最高' : 'Highest score')) : zh ? `相差 ${differenceText(gap)} 分` : `${differenceText(gap)} points apart`}</b></div>
        <button className="research-text-action research-locate" onClick={() => onLocate(id)}>{zh ? '查看完整比较' : 'View full comparison'} ↓</button>
      </figure>;
    })}</div>
    <details className="research-settings research-ranking-details" data-demo-reveal="fade"><summary>{zh ? '查看排名分布' : 'View rank distribution'}<span>{zh ? '按原始分数计算，含并列' : 'Unrounded scores, including ties'}</span></summary>
    <p className="research-score-summary">{zh ? `16 项同口径指标中，${closeCount} 项与该项最高分相差不超过 5 分。` : `Across 16 comparable criteria, ${closeCount} are within 5 points of their highest score.`}</p>
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
    </details>
  </div>;
}

function QualityGauge({ value, maximum, rank, zh }: { value: number; maximum: number; rank: number | null; zh: boolean }) {
  const score = useAnimatedScore(value);
  const percentage = useAnimatedScore(value / maximum * 100);
  const width = useTransform(percentage, current => `${current}%`);
  const text = useTransform(score, current => current.toFixed(1));
  return <div className="research-comparison-cell research-quality-cell">
    <div className="research-comparison-value"><motion.strong aria-hidden="true">{text}</motion.strong><small>/ {maximum}</small>{rank !== null && <span className="research-quality-rank">{zh ? `第 ${rank}` : `#${rank}`}</span>}</div>
    <span className="research-sr-only">{value.toFixed(1)} / {maximum}</span>
    <div className="research-comparison-track" aria-hidden="true"><motion.i style={{ width }} /><motion.b style={{ left: width }} /></div>
  </div>;
}

export function ResourceComparison() {
  const { data, language } = useResearch();
  const [criterion, setCriterion] = useState('mean');
  if (!data) return null;
  const zh = language === 'zh';
  const metrics = comparableMetrics(data);
  const metric = metrics.find(item => item.id === criterion);
  const qualityMaximum = 100;
  const costMaximum = Math.ceil(Math.max(...mainIds.map(id => data.resources[id].cost)) * 2) / 2;
  const timeMaximum = Math.ceil(Math.max(...mainIds.map(id => data.resources[id].minutes)) / 5) * 5;
  const qualityLabel = metric ? label(metric, language) : (zh ? '16 项等权均分' : '16-criterion mean');
  return <div className="research-resource-comparison">
    <div className="research-comparison-toolbar" data-demo-reveal="fade"><CriterionSelect metrics={metrics} value={criterion} onValueChange={setCriterion} label={zh ? '对比效果' : 'Compare quality'} ariaLabel={zh ? '效果对比指标' : 'Quality comparison criterion'} language={language} overview={{ value: 'mean', label: zh ? '16 项等权均分' : '16-criterion mean' }} /><span>{zh ? '四种方法 · 每种 80 张图' : 'Four methods · 80 figures each'}</span></div>
    <QualityCostPlot data={data} language={language} metric={metric} costMaximum={costMaximum} />
    <p className="research-mean-note" data-demo-reveal="fade">{zh ? '均分为 16 项当前指标分数的算术平均，每项权重 6.25%。' : 'The mean averages all 16 current criterion scores, with a 6.25% weight each.'} <a href="#research-settings" onClick={() => { const settings = document.getElementById('research-settings'); if (settings instanceof HTMLDetailsElement) settings.open = true; }}>{zh ? '计算说明' : 'Calculation notes'} ↗</a></p>
    <details className="research-settings research-resource-details" data-demo-reveal="fade"><summary>{zh ? '查看四方法的分数、费用与时间' : 'View scores, costs and times for all four methods'}</summary>
    <div className="research-comparison-table" role="table" aria-label={zh ? '效果、记录费用与记录耗时对比' : 'Quality, recorded cost and recorded time'}>
      <div className="research-comparison-head" role="row"><span role="columnheader">{zh ? '方法' : 'Method'}</span><span role="columnheader">{qualityLabel} <small>↑</small></span><span role="columnheader">{zh ? '记录费用 / 张' : 'Recorded cost / figure'}<small>USD</small></span><span role="columnheader">{zh ? '记录耗时 / 张' : 'Recorded time / figure'}<small>{zh ? '分钟' : 'min'}</small></span></div>
      {mainIds.map(id => {
        const method = data.methods.find(item => item.id === id)!;
        const resources = data.resources[id];
        const quality = metric ? data.summaries[id][metric.id].score! : meanScore(data, id);
        return <div className="research-comparison-row" role="row" data-method={id} data-featured={id === 'A' || undefined} key={id}>
          <div className="research-comparison-method" role="rowheader"><b>{method.name}</b>{id === 'A' && <span>{zh ? '完整流程' : 'Full workflow'}</span>}</div>
          <div role="cell" aria-label={`${qualityLabel}: ${number(quality, 1)} / ${qualityMaximum}`}><span className="research-mobile-label">{qualityLabel}</span><QualityGauge value={quality} maximum={qualityMaximum} rank={metric ? criterionRank(data, metric, id) : null} zh={zh} /></div>
          {(['cost', 'minutes'] as const).map(kind => <div role="cell" key={kind} className="research-comparison-cell" data-kind={kind}>
            <span className="research-mobile-label">{kind === 'cost' ? (zh ? '记录费用' : 'Recorded cost') : (zh ? '记录耗时' : 'Recorded time')}</span>
            <div className="research-comparison-value"><strong>{kind === 'cost' ? '$' : ''}{number(resources[kind], kind === 'cost' ? 3 : 2)}</strong><small>{kind === 'cost' ? 'USD' : (zh ? '分钟' : 'min')}</small></div>
            <div className="research-comparison-track" aria-hidden="true"><i style={{ width: `${resources[kind] / (kind === 'cost' ? costMaximum : timeMaximum) * 100}%` }} /></div>
          </div>)}
        </div>;
      })}
      <div className="research-comparison-axis" role="row" aria-hidden="true"><span role="cell" /><span role="cell">0 <i>{qualityMaximum}</i></span><span role="cell">0 <i>${costMaximum.toFixed(2)}</i></span><span role="cell">0 <i>{timeMaximum} {zh ? '分钟' : 'min'}</i></span></div>
    </div>
    </details>
    <div className="research-comparison-scope" data-demo-reveal="fade"><span>{zh ? '费用为原运行记录的每图均值；时间及计费范围见统计说明。' : 'Costs are per-figure means from original logs; timing and billing scopes are detailed in the notes.'}</span><a href="#resource-scope" onClick={() => { const settings = document.getElementById('research-settings'); if (settings instanceof HTMLDetailsElement) settings.open = true; }}>{zh ? '统计范围' : 'Measurement scope'} ↗</a></div>
  </div>;
}
