import { useRef, useState, type ReactNode } from 'react';
import { CriterionSelect } from './CriterionSelect';
import { ProfileRow } from './ProfileRow';
import { AblationRow } from './AblationRow';
import { CaseGallery } from './CaseGallery';
import { ExperimentSettings } from './ExperimentSettings';
import { ScoreComparison, ResourceComparison } from './Comparisons';
import { meanScore } from './comparisonData';
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
  const [condition, setCondition] = useState('A');
  if (!data) return <div ref={root} className="research-loading" role="status">{error ? (zh ? '研究数据暂不可用，请刷新重试。' : 'Research data unavailable. Refresh to retry.') : (zh ? '正在加载实验数据…' : 'Loading experiment data…')}</div>;
  const metric = data.metrics.find(item => item.id === metricId)!;
  const methods = mainIds.map(id => data.methods.find(method => method.id === id)!);
  const groups = [...new Set(data.metrics.map(item => item.group))];
  const activeGroup = group || groups[0];
  const names: Record<string, string> = { A: zh ? '完整 FigFox' : 'Full FigFox', B: zh ? '无 SAM' : 'Without SAM', C: zh ? '仅初稿' : 'Draft only' };
  const inspect = (criterion: Metric, method = 'A') => {
    const sample = data.examples.comparison[criterion.id];
    open({ sample, metric: criterion.id, methods: ['A', method === 'A' ? 'DrawAI' : method] });
  };
  const mean = meanScore(data, 'A');
  const draft = data.resources.C;
  const full = data.resources.A;

  return <div ref={root} className="research-results">
    <Section id="demo-evaluation" kicker="EVALUATION" title={zh ? '从内容到编辑，覆盖 17 项标准' : '17 criteria, from content to editing'} body={zh ? '在 80 张科研图上，评估 FigFox 的内容、结构、视觉表达与可编辑性。' : 'Evaluate content, structure, visual presentation and editability across 80 scientific figures.'}>
      <div className="research-metric-map">{groups.map((name, index) => {
        const metrics = data.metrics.filter(item => item.group === name);
        return <div key={name} data-demo-reveal="fade" data-demo-delay={Math.min(index, 2)}><h3>{zh ? name : metrics[0].groupEn}</h3><div>{metrics.map(item => <button key={item.id} aria-pressed={metricId === item.id} onClick={() => setMetricId(item.id)}><small>{item.id}</small>{label(item, language)}</button>)}</div></div>;
      })}</div>
      <div className="research-definition" data-demo-reveal="fade" aria-live="polite"><span>{metric.id}</span><div key={metric.id} className="research-definition-copy"><h3>{label(metric, language)}</h3><p>{zh ? metric.definition : metric.definitionEn}</p></div><button className="research-text-action" onClick={() => inspect(metric)}>{zh ? '查看示例' : 'View example'} ↗</button></div>
    </Section>

    <Section id="demo-benchmarks" kicker="FIGFOX IN COMPARISON" title={zh ? '文字、布局与样式，接近最高分' : 'Text, layout and style, close to the best'} body={zh ? '在四种方法的评测中，用实际分数呈现 FigFox 的重建能力。' : 'See FigFox’s reconstruction quality through actual scores across four methods.'}>
      <ScoreComparison />
      <nav className="demo-research-index research-controls" data-demo-reveal="fade"><a href="#demo-ablations">{zh ? '修复的作用' : 'Repair gains'} ↓</a><a href="#demo-efficiency">{zh ? '效果与投入' : 'Quality & resources'} ↓</a><a href="#research-provenance">{zh ? '实验与代码' : 'Data & code'} ↓</a></nav>
      <h3 className="research-chart-title" data-demo-reveal>{zh ? '五类能力，逐项呈现' : 'Explore each dimension'}</h3>
      <div className="research-controls research-tabs" data-demo-reveal="fade">{groups.map(name => <button key={name} aria-pressed={activeGroup === name} onClick={() => setGroup(name)}>{zh ? name : data.metrics.find(item => item.group === name)!.groupEn}</button>)}</div>
      <div className="research-profiles">{data.metrics.filter(item => item.group === activeGroup).map((item, slot) => <div className="research-profile-card" data-demo-reveal="fade" key={slot}><h4>{item.id} · {label(item, language)}{item.id === 'D09' ? ' †' : ''}</h4>{methods.map(method => <ProfileRow key={method.id} method={method} score={data.summaries[method.id][item.id].score} onInspect={() => inspect(item, method.id)} />)}<div className="research-axis"><span>0</span><span>100</span></div></div>)}</div>
      {data.metrics.some(item => item.group === activeGroup && item.id === 'D09') && <p className="research-caption">† {zh ? 'D09 为历史评分，详见' : 'D09 uses historical scores. See'} <a href="#research-settings" onClick={() => { const settings = document.getElementById('research-settings'); if (settings instanceof HTMLDetailsElement) settings.open = true; }}>{zh ? '实验设置' : 'experiment settings'} ↗</a></p>}
      <details className="research-full-results research-settings" data-demo-reveal="fade"><summary>{zh ? '查看全部 17 项指标对比' : 'View all 17 criteria'} <span>{zh ? '每项最优结果以深紫色标记' : 'Best results highlighted in purple'}</span></summary>
        <div className="research-table-scroll"><table className="research-heatmap"><thead><tr><th>{zh ? '指标 / 分组' : 'Criterion / group'}</th>{methods.map(method => <th key={method.id} style={{ color: method.color }}>{method.name}</th>)}</tr></thead><tbody>{data.metrics.map((item, index) => <tr key={item.id} className={index === 0 || item.group !== data.metrics[index - 1].group ? 'group-start' : ''}><th><small>{zh ? item.group : item.groupEn}</small>{item.id} {label(item, language)}{item.id === 'D09' ? ' †' : ''}</th>{methods.map(method => {
          const score = data.summaries[method.id][item.id];
          const values = methods.map(candidate => data.summaries[candidate.id][item.id].score).filter((value): value is number => value !== null);
          const bestValue = item.direction === 'lower' ? Math.min(...values) : Math.max(...values);
          const best = score.score !== null && Math.abs(score.score - bestValue) < 1e-9;
          return <td key={method.id}><button data-best={best || undefined} aria-label={`${method.name} · ${label(item, language)} · ${number(score.score)}${best ? (zh ? ' · 最优' : ' · Best') : ''}`} style={{ background: best ? '#6243ce' : `rgba(98,67,206,${.04 + (score.score ?? 0) / 100 * .3})` }} onClick={() => inspect(item, method.id)} title={`${number(score.score, 4)} / 100`}><b>{number(score.score)}{best && <span className="research-best-label">{zh ? '最优' : 'Best'}</span>}</b><small>{item.id === 'D09' ? (zh ? '历史评分 †' : 'Historical †') : `N=${score.sampleN} · n=${score.judgmentN}`}</small></button></td>;
        })}</tr>)}</tbody></table></div>
        <p className="research-caption">{zh ? 'N 为有效图数，n 为有效判断数。† D09 沿用历史评分：对照单评审 / FigFox 双评审。其余 16 项使用 11 月 4 日 Codex 复核的四方法共同有效样本。' : 'N: valid images; n: valid judgments. † D09 retains historical scores: single review for baselines, double for FigFox. The other 16 criteria use the November 4 Codex review and samples valid for all four methods.'}</p>
      </details>
    </Section>

    <Section id="research-samples" kicker="SELECTED RECONSTRUCTIONS" title={zh ? '重建不同结构的科研图' : 'Scientific figures, in their many forms'} body={zh ? '从训练流程到多层网络，查看 FigFox 对文字、模块与连接关系的重建。' : 'From training workflows to multi-layer networks, explore reconstructed text, modules and connections.'}><CaseGallery /></Section>

    <Section id="demo-ablations" kicker="INSPECTION & REPAIR" title={zh ? '检查与修复，让初稿更完整' : 'Refine the draft through inspection and repair'} body={zh ? `从同一份初稿出发，连接拓扑得分从 ${number(data.ablationSummaries.C.D05.score)} 提升至 ${number(data.ablationSummaries.A.D05.score)}。` : `Starting from the same draft, the full workflow raises the connection-topology score from ${number(data.ablationSummaries.C.D05.score)} to ${number(data.ablationSummaries.A.D05.score)}.`}>
      <div className="research-ablation-heading" data-demo-reveal="fade"><CriterionSelect metrics={data.metrics.filter(item => item.id !== 'D09')} value={ablationMetric} onValueChange={setAblationMetric} label={zh ? '评价指标' : 'Criterion'} ariaLabel={zh ? '消融指标' : 'Ablation criterion'} language={language} /><span>{zh ? `共同有效图数 ${data.ablationSummaries.A[ablationMetric].sampleN} · 0–100 分` : `${data.ablationSummaries.A[ablationMetric].sampleN} jointly valid figures · 0–100 points`}</span></div>
      <div className="research-ablation-chart" data-demo-reveal="fade" data-demo-delay="1">{['C', 'B', 'A'].map(id => <AblationRow key={id} name={names[id]} score={data.ablationSummaries[id][ablationMetric].score} reference={data.ablationSummaries.C[ablationMetric].score} color={data.methods.find(method => method.id === id)!.color} selected={condition === id} onSelect={() => setCondition(id)} />)}<div className="research-axis"><span>0</span><span>100</span></div></div>
      <div className="research-ablation-footer" data-demo-reveal="fade"><span>{zh ? '灰色竖线：仅初稿得分' : 'Gray marker: draft-only score'}</span><button className="research-text-action" onClick={() => open({ sample: data.examples.ablation[ablationMetric], metric: ablationMetric, condition, methods: ['A', condition === 'A' ? 'C' : condition] })}>{zh ? '查看' : 'Inspect'}{zh ? names[condition] : ' ' + names[condition]}{zh ? '示例' : ' example'} ↗</button></div>
    </Section>

    <Section id="demo-efficiency" kicker="QUALITY & RESOURCES" title={zh ? '把效果与投入，放在一起看' : 'See quality and resources together'} body={zh ? `FigFox 的 16 项等权均分为 ${number(mean, 2)}，平均记录费用为每张 $${number(full.cost, 3)}。` : `FigFox averages ${number(mean, 2)} across 16 equally weighted criteria, at a recorded $${number(full.cost, 3)} per figure.`}>
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

    <Section id="research-provenance" kicker="EXPLORE FIGFOX" title={zh ? '继续探索 FigFox' : 'Explore FigFox further'} body={zh ? '获取实验数据与源代码，在自己的科研图上开始重建。' : 'Explore the data and source code, then reconstruct your own scientific figures.'}>
      <div className="research-downloads" data-demo-reveal="fade"><a href="https://github.com/LawrenceRiver/FigFox" target="_blank" rel="noreferrer">FigFox GitHub ↗</a><a href={asset('四方法评分.csv')} download>{zh ? '下载实验评分' : 'Download evaluation scores'} ↓</a></div>
      <ExperimentSettings />
    </Section>
  </div>;
}
