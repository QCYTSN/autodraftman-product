import { useRef, useState, type ReactNode } from 'react';
import { CriterionSelect } from './CriterionSelect';
import { ProfileRow } from './ProfileRow';
import { AblationRow } from './AblationRow';
import { CaseGallery } from './CaseGallery';
import { AggregateResults } from './AggregateResults';
import { ExperimentSettings } from './ExperimentSettings';
import { ScoreComparison, ResourceComparison } from './Comparisons';
import { meanScore } from './comparisonData';
import { ablationText, groupLabel } from './display';
import { useResearch } from './ResearchContext';
import { asset, label, mainIds, number, type Metric } from './data';

function Section({ id, kicker, title, body, children }: { id: string; kicker: string; title: string; body: string; children: ReactNode }) {
  return <section className="research-section demo-section" id={id} aria-labelledby={id + '-title'}>
    <div className="demo-section-heading" data-demo-reveal><span className="research-eyebrow">{kicker}</span><h2 id={id + '-title'}>{title}</h2><p>{body}</p></div>{children}
  </section>;
}

export default function Results() {
  const { data, open, language, error } = useResearch();
  const zh = language === 'zh';
  const root = useRef<HTMLDivElement>(null);
  const [metricId, setMetricId] = useState('D01');
  const [ablationMetric, setAblationMetric] = useState('D05');
  const [group, setGroup] = useState('');
  const [located, setLocated] = useState('');
  const [condition, setCondition] = useState('A');
  if (!data) return <div ref={root} className="research-loading" role="status">{error ? (zh ? '研究数据暂不可用，请刷新重试。' : 'Research data unavailable. Refresh to retry.') : (zh ? '正在加载实验数据…' : 'Loading experiment data…')}</div>;
  const metric = data.metrics.find(item => item.id === metricId)!;
  const methods = mainIds.map(id => data.methods.find(method => method.id === id)!);
  const groups = [...new Set(data.metrics.map(item => item.group))];
  const activeGroup = group || groups[0];
  const names: Record<string, string> = { A: zh ? '完整 FigFox' : 'Full FigFox', B: zh ? '无 SAM' : 'Without SAM', C: zh ? '仅初稿' : 'Draft only' };
  const configurations: Record<string, string> = zh ? { A: 'SAM＋初稿＋检查修复', B: '初稿＋检查修复', C: 'SAM＋初稿' } : { A: 'SAM + draft + inspection & repair', B: 'Draft + inspection & repair', C: 'SAM + draft' };
  const selectedAblation = data.metrics.find(item => item.id === ablationMetric)!;
  const ablationDescription = ablationText(selectedAblation, { A: data.ablationSummaries.A[ablationMetric].score, B: data.ablationSummaries.B[ablationMetric].score, C: data.ablationSummaries.C[ablationMetric].score }, zh);
  const inspect = (criterion: Metric, method?: string) => {
    const sample = data.examples.comparison[criterion.id];
    open({ sample, metric: criterion.id, scope: 'comparison', view: method ? 'pair' : 'overview', methods: method ? ['A', method === 'A' ? 'DrawAI' : method] : undefined });
  };
  const mean = meanScore(data, 'A');
  const draft = data.resources.C;
  const full = data.resources.A;

  return <div ref={root} className="research-results">
    <Section id="demo-evaluation" kicker="EVALUATION" title={zh ? '用 17 项标准评估重建结果' : 'Evaluate reconstructions with 17 criteria'} body={zh ? '在 80 张科研图上，评估 FigFox 的内容、结构、视觉表达与可编辑性。' : 'Evaluate content, structure, visual presentation and editability across 80 scientific figures.'}>
      <div className="research-metric-map">{groups.map((name, index) => {
        const metrics = data.metrics.filter(item => item.group === name);
        return <div key={name} data-demo-reveal="fade" data-demo-delay={Math.min(index, 2)}><h3>{groupLabel(name, metrics[0].groupEn, zh)}</h3><div>{metrics.map(item => <button key={item.id} aria-pressed={metricId === item.id} onClick={() => setMetricId(item.id)}><small>{item.id}</small>{label(item, language)}</button>)}</div></div>;
      })}</div>
      <div className="research-definition" data-demo-reveal="fade" aria-live="polite"><span>{metric.id}</span><div key={metric.id} className="research-definition-copy"><h3>{label(metric, language)}</h3><p>{zh ? metric.definition : metric.definitionEn}</p></div><button className="research-text-action" onClick={() => inspect(metric)}>{zh ? '查看示例' : 'View example'} ↗</button></div>
    </Section>

    <Section id="demo-benchmarks" kicker="FIGFOX IN COMPARISON" title={zh ? '四种方法，逐项比较' : 'Compare four reconstruction methods'} body={zh ? '在同一组科研图上，比较文字、结构、视觉表达与可编辑性。' : 'Compare text, structure, visual presentation and editability on the same scientific figures.'}>
      <ScoreComparison onLocate={id => { setGroup(data.metrics.find(item => item.id === id)!.group); setLocated(id); requestAnimationFrame(() => document.getElementById('profile-' + id)?.scrollIntoView({ block: 'center', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })); }} />
      <nav className="demo-research-index research-controls" data-demo-reveal="fade"><a href="#demo-evaluation">{zh ? "指标定义" : "Criterion definitions"} ↑</a><a href="#demo-ablations">{zh ? '修复的作用' : 'Repair gains'} ↓</a><a href="#demo-efficiency">{zh ? '效果与投入' : 'Quality & resources'} ↓</a><a href="#research-provenance">{zh ? '实验与代码' : 'Data & code'} ↓</a></nav>
      <AggregateResults scope="comparison" />
      <h3 className="research-chart-title" data-demo-reveal>{zh ? '按指标类别比较' : 'Compare by criterion group'}</h3>
      <div className="research-controls research-tabs" data-demo-reveal="fade">{groups.map(name => <button key={name} aria-pressed={activeGroup === name} onClick={() => setGroup(name)}>{groupLabel(name, data.metrics.find(item => item.group === name)!.groupEn, zh)}</button>)}</div>
      <div className="research-profiles">{data.metrics.filter(item => item.group === activeGroup).map((item, slot) => <div className="research-profile-card" id={"profile-" + item.id} data-located={located === item.id || undefined} data-demo-reveal="fade" key={slot}><h4>{item.id} · {label(item, language)}{item.id === 'D09' ? ' †' : ''}</h4>{methods.map(method => <ProfileRow key={method.id} method={method} score={data.summaries[method.id][item.id].score} onInspect={() => inspect(item, method.id)} />)}<div className="research-axis"><span>0</span><span>100</span></div></div>)}</div>
      {data.metrics.some(item => item.group === activeGroup && item.id === 'D09') && <p className="research-caption">† {zh ? 'D09 为历史评分，详见' : 'D09 uses historical scores. See'} <a href="#research-settings" onClick={() => { const settings = document.getElementById('research-settings'); if (settings instanceof HTMLDetailsElement) settings.open = true; }}>{zh ? '实验设置' : 'experiment settings'} ↗</a></p>}
      <details className="research-full-results research-settings" data-demo-reveal="fade"><summary>{zh ? '查看全部 17 项指标对比' : 'View all 17 criteria'} <span>{zh ? '每项最优结果以深紫色标记' : 'Best results highlighted in purple'}</span></summary>
        <div className="research-table-scroll"><table className="research-heatmap"><thead><tr><th>{zh ? '指标 / 分组' : 'Criterion / group'}</th>{methods.map(method => <th key={method.id} style={{ color: method.color }}>{method.name}</th>)}</tr></thead><tbody>{data.metrics.map((item, index) => <tr key={item.id} className={index === 0 || item.group !== data.metrics[index - 1].group ? 'group-start' : ''}><th><small>{groupLabel(item.group, item.groupEn, zh)}</small>{item.id} {label(item, language)}{item.id === 'D09' ? ' †' : ''}</th>{methods.map(method => {
          const score = data.summaries[method.id][item.id];
          const values = methods.map(candidate => data.summaries[candidate.id][item.id].score).filter((value): value is number => value !== null);
          const bestValue = item.direction === 'lower' ? Math.min(...values) : Math.max(...values);
          const best = score.score !== null && Math.abs(score.score - bestValue) < 1e-9;
          return <td key={method.id}><button data-best={best || undefined} aria-label={`${method.name} · ${label(item, language)} · ${number(score.score)}${best ? (zh ? ' · 最优' : ' · Best') : ''}`} style={{ background: best ? '#6243ce' : `rgba(98,67,206,${.04 + (score.score ?? 0) / 100 * .3})` }} onClick={() => inspect(item, method.id)} title={`${number(score.score, 4)} / 100`}><b>{number(score.score)}{best && <span className="research-best-label">{zh ? '最优' : 'Best'}</span>}</b><small>{item.id === 'D09' ? (zh ? '历史评分 †' : 'Historical †') : `N=${score.sampleN}`}</small></button></td>;
        })}</tr>)}</tbody></table></div>
        <p className="research-caption">{zh ? '分数为百分制均分，N 为各方法有效图数。D13–D15 采用全量网页编辑复评，AFE 为 79 图，其余方法为 80 图。视觉项沿用共同有效集合；† D09 为历史评分。' : 'Scores are means on a 0–100 scale; N is valid images per method. D13–D15 use full-cohort web-editor reviews: 79 images for AFE, 80 for others. Visual criteria retain jointly valid sets; † D09 is historical.'}</p>
      </details>
    </Section>

    <Section id="research-samples" kicker="SELECTED RECONSTRUCTIONS" title={zh ? '不同结构的科研图' : 'Scientific figures, in their many forms'} body={zh ? '从训练流程到多层网络，查看 FigFox 对文字、模块与连接关系的重建。' : 'From training workflows to multi-layer networks, explore reconstructed text, modules and connections.'}><CaseGallery /></Section>

    <Section id="demo-ablations" kicker="INSPECTION & REPAIR" title={zh ? '检查与修复如何影响结果' : 'How inspection and repair affect the result'} body={ablationDescription}>
      <div className="research-ablation-heading" data-demo-reveal="fade"><CriterionSelect metrics={data.metrics.filter(item => item.id !== 'D09')} value={ablationMetric} onValueChange={setAblationMetric} label={zh ? '评价指标' : 'Criterion'} ariaLabel={zh ? '消融指标' : 'Ablation criterion'} language={language} /><span>{zh ? `共同有效图数 ${data.ablationSummaries.A[ablationMetric].sampleN} · 0–100 分` : `${data.ablationSummaries.A[ablationMetric].sampleN} jointly valid figures · 0–100 points`}</span></div>
      <div className="research-ablation-chart" data-demo-reveal="fade" data-demo-delay="1">{['C', 'B', 'A'].map(id => <AblationRow key={id} name={names[id]} description={configurations[id]} score={data.ablationSummaries[id][ablationMetric].score} reference={data.ablationSummaries.C[ablationMetric].score} color={data.methods.find(method => method.id === id)!.color} selected={condition === id} onSelect={() => setCondition(id)} />)}<div className="research-axis"><span>0</span><span>100</span></div></div>
      <AggregateResults scope="ablation" />
      <div className="research-ablation-footer" data-demo-reveal="fade"><span>{zh ? '灰色竖线：仅初稿得分' : 'Gray marker: draft-only score'}</span><button className="research-text-action" onClick={() => open({ sample: data.examples.ablation[ablationMetric], metric: ablationMetric, condition, scope: 'ablation', view: 'pair', methods: ['A', condition === 'A' ? 'C' : condition] })}>{zh ? '查看' : 'Inspect'}{zh ? names[condition] : ' ' + names[condition]}{zh ? '示例' : ' example'} ↗</button></div>
    </Section>

    <Section id="demo-efficiency" kicker="QUALITY & RESOURCES" title={zh ? '重建质量与每图费用' : 'Reconstruction quality and cost'} body={zh ? `FigFox 的总体均分为 ${number(mean, 2)}，平均记录费用为每张 $${number(full.cost, 3)}。` : `FigFox achieves an overall mean of ${number(mean, 2)}, at a recorded $${number(full.cost, 3)} per figure.`}>
      <ResourceComparison />
      <details className="research-settings research-stage-resources" data-demo-reveal="fade"><summary>{zh ? '查看 FigFox 的阶段用量' : 'View FigFox resources by stage'}</summary>
      <div className="research-resource-breakdown">{(['cost', 'minutes'] as const).map(kind => {
        const isCost = kind === 'cost';
        const digits = isCost ? 3 : 2;
        const unit = isCost ? 'USD' : (zh ? '分钟' : 'min');
        const increment = full[kind] - draft[kind];
        return <div key={kind}>
          <span>{isCost ? (zh ? '平均记录费用 / 张' : 'Recorded cost / figure') : (zh ? '平均记录耗时 / 张' : 'Recorded time / figure')}</span>
          <strong>{isCost ? '$' : ''}{number(full[kind], digits)}<small>{unit}</small></strong>
          <div className="research-resource-bar" role="img" aria-label={`${zh ? '初稿' : 'Draft'} ${number(draft[kind], digits)} ${unit}; ${zh ? '检查与修复' : 'Inspection & repair'} ${number(increment, digits)} ${unit}`}><i style={{ width: `${draft[kind] / full[kind] * 100}%` }} /><i style={{ flex: 1 }} /></div>
          <div className="research-resource-legend"><span><i />{zh ? '初稿生成' : 'Drafting'}<b>{number(draft[kind], digits)} {unit}</b></span><span><i />{zh ? '检查与修复' : 'Inspection & repair'}<b>{number(increment, digits)} {unit}</b></span></div>
        </div>;
      })}</div>
      </details>
    </Section>

    <Section id="research-provenance" kicker="EXPLORE FIGFOX" title={zh ? '源代码与实验数据' : 'Source code and experiment data'} body={zh ? '查看实现与实验设置，下载评分数据。' : 'Explore the implementation and experiment settings, and download evaluation scores.'}>
      <div className="research-downloads" data-demo-reveal="fade"><a href="https://github.com/LawrenceRiver/FigFox" target="_blank" rel="noreferrer">FigFox GitHub ↗</a><a href={asset('论文汇总评分.csv')} download>{zh ? '下载论文汇总' : 'Download paper aggregates'} ↓</a><a href={asset('四方法评分.csv')} download>{zh ? '下载实验评分' : 'Download evaluation scores'} ↓</a></div>
      <ExperimentSettings />
    </Section>
  </div>;
}
