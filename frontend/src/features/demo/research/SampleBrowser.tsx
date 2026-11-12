import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useResearch } from './ResearchContext';
import { asset, category, label, load, mainIds, number, type Observations, type Sample, type Selection } from './data';
import { judgmentText } from './display';
import { ArtifactPreview } from './ArtifactPreview';
import './sample-browser.css';

type Evidence = Record<string, Record<string, { evidence: { status: string; text: string; reviewer: number; source: string }[] }>>;

export default function SampleBrowser({ selection, onClose }: { selection: Selection; onClose: () => void }) {
  const { data, samples, language, error: indexError, ensureSamples } = useResearch();
  const zh = language === 'zh';
  const scope = selection.scope ?? (selection.methods?.some(id => id === 'B' || id === 'C') || (selection.condition && selection.condition !== 'A') ? 'ablation' : 'comparison');
  const allowed = ['source', ...(scope === 'ablation' ? ['A', 'B', 'C'] : mainIds)];
  const initial = selection.methods?.length === 2 && selection.methods.every(id => allowed.includes(id)) ? selection.methods : ['A', scope === 'ablation' ? (selection.condition === 'B' ? 'B' : 'C') : 'DrawAI'];
  const [pair, setPair] = useState(initial[0] === initial[1] ? ['source', 'A'] : initial);
  const [focus, setFocus] = useState(scope === 'ablation' || selection.view === 'pair' || (selection.view !== 'overview' && Boolean(selection.methods?.length)));
  const [requested, setRequested] = useState(selection.sample), [metric, setMetric] = useState(selection.metric);
  const [filter, setFilter] = useState('all'), [zoom, setZoom] = useState(1);
  const [current, setCurrent] = useState<Sample | null>(null), [error, setError] = useState(false), [retry, setRetry] = useState(0);
  const [wantsEvidence, setWantsEvidence] = useState(false), [evidence, setEvidence] = useState<{ sample: string; data: Evidence } | null>(null);
  const [evidenceError, setEvidenceError] = useState(false), [evidenceRetry, setEvidenceRetry] = useState(0);
  const [observations, setObservations] = useState<Observations | null>(null), [marked, setMarked] = useState(true), [crop, setCrop] = useState(false);
  const sid = samples.some(item => item.id === requested) ? requested : samples[0]?.id ?? requested;
  const sample = current?.id === sid ? current : null;
  const m = data!.metrics.find(item => item.id === metric) ?? data!.metrics[0];
  const visible = focus ? pair : mainIds;
  const historicalEditing = data!.provenance.summaryOnlyMetrics.includes(m.id);
  const hasSourcePane = focus && pair.includes('source');
  const summary = scope === 'ablation' ? data!.ablationSummaries : data!.summaries;
  const mapped = observations?.[scope][m.id];
  const observation = mapped?.sample === sid ? mapped : undefined;
  const title = observation?.title[language] ?? sid;
  const dialog = useRef<HTMLDialogElement>(null), sourceDialog = useRef<HTMLDialogElement>(null), gallery = useRef<HTMLDivElement>(null);
  const pan = useRef({ x: 0, y: 0 }), drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const old = document.body.style.overflow, scroll = window.scrollY;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = old; window.scrollTo({ top: scroll, behavior: 'instant' }); };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load<Observations>('example-observations.json', controller.signal).then(value => { if (!controller.signal.aborted) setObservations(value); }).catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!samples.length) return;
    const controller = new AbortController();
    setError(false); setWantsEvidence(false); setEvidenceError(false); reset(); setMarked(true);
    const timer = setTimeout(() => { void load<Sample>('sample-meta/' + sid + '.json', controller.signal).then(value => {
      if (!controller.signal.aborted) setCurrent(value);
    }).catch(() => { if (!controller.signal.aborted) setError(true); }); }, 120);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [sid, samples, retry]);
  useEffect(() => { reset(); setMarked(true); }, [metric]);
  useEffect(() => {
    if (!wantsEvidence || !sample) return;
    const controller = new AbortController(); setEvidenceError(false);
    void load<Evidence>('details/' + sid + '.json', controller.signal).then(value => {
      if (!controller.signal.aborted) setEvidence({ sample: sid, data: value });
    }).catch(() => { if (!controller.signal.aborted) setEvidenceError(true); });
    return () => controller.abort();
  }, [wantsEvidence, sample, sid, evidenceRetry]);
  useEffect(() => {
    const query = new URLSearchParams({ sample: sid, metric, condition: scope === 'ablation' ? pair.find(id => id === 'B' || id === 'C') ?? 'A' : 'A', methods: pair.join(','), view: focus ? 'pair' : 'overview', scope });
    history.replaceState(null, '', '#research?' + query.toString());
  }, [sid, metric, pair, scope, focus]);
  function move(x: number, y: number) { pan.current = { x, y }; gallery.current?.style.setProperty('--pan-x', x + 'px'); gallery.current?.style.setProperty('--pan-y', y + 'px'); }
  function reset() { setZoom(1); setCrop(false); move(0, 0); drag.current = null; }
  const methodName = (id: string) => id === 'source' ? (zh ? '原图' : 'Reference') : scope === 'ablation' ? ({ A: zh ? '完整 FigFox' : 'Full FigFox', B: zh ? '无 SAM' : 'Without SAM', C: zh ? '仅初稿' : 'Draft only' }[id]) : data!.methods.find(method => method.id === id)!.name;

  return <dialog className="research-dialog" ref={dialog} onCancel={event => { event.preventDefault(); onClose(); }} aria-labelledby="research-browser-title" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <header><h2 id="research-browser-title">{scope === 'ablation' ? (zh ? '同一原图的消融结果' : 'Compare ablation results') : (zh ? '同一原图的重建结果' : 'Compare reconstructions')}</h2><button onClick={onClose} aria-label={zh ? '关闭比较' : 'Close comparison'}>×</button></header>
    <div className="research-controls research-browser-controls">
      <label>{zh ? '样本' : 'Sample'}<select aria-label={zh ? '样本' : 'Sample'} value={sid} onChange={event => setRequested(event.target.value)}>{samples.filter(item => filter === 'all' || item.category === filter || item.id === sid).map(item => <option key={item.id}>{item.id}</option>)}</select></label>
      <label>{zh ? '指标' : 'Criterion'}<select aria-label={zh ? '指标' : 'Criterion'} value={metric} onChange={event => setMetric(event.target.value)}>{data!.metrics.map(item => <option key={item.id} value={item.id}>{item.id} · {label(item, language)}</option>)}</select></label>
      {scope === 'comparison' ? <div className="research-view-switch" role="group" aria-label={zh ? '对照方式' : 'Comparison view'}>{[false, true].map(isPair => <button key={String(isPair)} aria-pressed={focus === isPair} onClick={() => { setFocus(isPair); reset(); }}>{isPair ? (zh ? '双图对照' : 'Two-image comparison') : (zh ? '四方法总览' : 'Four-method overview')}</button>)}</div> : <span className="research-scope-label">{zh ? 'A / B / C 配置对照' : 'A / B / C configuration comparison'}</span>}
    </div>
    <details className="research-browser-definition" key={m.id}><summary>{label(m, language)} · {zh ? m.definition : m.definitionEn}</summary><p>{historicalEditing ? (zh ? '汇总采用 2026-11-10 全量网页复评。新版逐图记录待补充，下方可展开 2026-11-04 历史评分。' : 'Aggregates use the November 10 full-cohort web review. Updated per-image records are pending; November 4 historical scores can be expanded below.') : m.id === 'D09' ? (zh ? '这里显示 D09 当前单图复核；汇总图保留历史值。' : 'This view uses current D09 judgments; summary charts retain historical scores.') : (zh ? `本项${scope === 'ablation' ? '消融' : '四方法比较'}使用 ${summary.A[m.id].sampleN} 张共同有效图。` : `This ${scope} criterion uses ${summary.A[m.id].sampleN} jointly valid figures.`)} {sample && !historicalEditing && !sample.eligible[scope].includes(m.id) && (zh ? '本图不在该共同有效集合中。' : 'This figure is outside that jointly valid set.')}</p></details>
    {historicalEditing && <p className="research-caption research-history-notice">{zh ? '新版逐图评分待补充 · 此处保留原始产物及历史记录' : 'Updated per-image scores pending · Original artifacts and historical records retained'}</p>}
    {sample ? <div className={'research-browser-body' + (hasSourcePane ? ' has-source-pane' : '')} data-sample={sample.id}>
      <aside className="research-source-rail">
        {!hasSourcePane && <figure className="research-source"><figcaption><b>{zh ? '原图参照' : 'Reference figure'}</b><span>{title}</span></figcaption><div className="research-source-preview"><ArtifactPreview key={sample.source.image} artifact={sample.source} name={zh ? '原图' : 'Source'} region={marked ? observation?.regions.source : undefined} zh={zh} /></div><button className="research-source-enlarge" onClick={() => sourceDialog.current?.showModal()}>{zh ? '放大原图' : 'Enlarge reference'} ↗</button></figure>}
        <details className="research-sample-info"><summary>{zh ? '案例信息' : 'Figure details'}</summary><p className="research-source-id">{sid}<br />{category(sample.category, zh)}</p><a href={sample.sourceUrl} target="_blank" rel="noreferrer">{zh ? '来源论文' : 'Source paper'} ↗</a></details>
        <details className="research-source-filter"><summary>{zh ? '按拥挤度筛选样本' : 'Filter by visual clutter'}</summary><select aria-label={zh ? '拥挤度' : 'Clutter'} value={filter} onChange={event => setFilter(event.target.value)}><option value="all">{zh ? '全部' : 'All'}</option>{[...new Set(samples.map(item => item.category))].sort().map(value => <option key={value} value={value}>{category(value, zh)}</option>)}</select></details>
        {observation && <div className="research-observation"><b>{zh ? '观察点' : 'What to look for'}</b><p>{observation.note[language]}</p><button aria-pressed={marked} onClick={() => { setMarked(!marked); setCrop(false); }}>{marked ? (zh ? '隐藏标注' : 'Hide annotations') : (zh ? '显示标注' : 'Show annotations')}</button><button onClick={() => { setMarked(true); setCrop(true); setZoom(1); move(0, 0); }}>{zh ? '放大观察点' : 'Zoom to detail'}</button><button onClick={reset}>{zh ? '恢复全图' : 'Show full figures'}</button></div>}
      </aside>
      <div className="research-comparison-main">
        {focus && <div className="research-controls research-focus-controls">{pair.map((value, index) => <label key={index}>{zh ? (index === 0 ? '左侧内容' : '右侧内容') : (index === 0 ? 'Left content' : 'Right content')}<select aria-label={zh ? (index === 0 ? '左侧内容' : '右侧内容') : (index === 0 ? 'Left content' : 'Right content')} value={value} onChange={event => { setPair(pair.map((id, position) => index === position ? event.target.value : id)); reset(); }}>{allowed.map(id => <option key={id} value={id} disabled={pair[1 - index] === id}>{methodName(id)}</option>)}</select></label>)}<label>{zh ? '同步缩放' : 'Shared zoom'}<input aria-label={zh ? '同步缩放' : 'Shared zoom'} type="range" min="1" max="4" step=".25" value={zoom} onChange={event => setZoom(+event.target.value)} /></label><button onClick={reset}>{zh ? '重置视图' : 'Reset view'}</button><div className="research-pan-controls">{[[-40, 0, '←', '向左平移', 'Pan left'], [40, 0, '→', '向右平移', 'Pan right'], [0, -40, '↑', '向上平移', 'Pan up'], [0, 40, '↓', '向下平移', 'Pan down']].map(([x, y, arrow, cn, en]) => <button key={String(arrow)} aria-label={String(zh ? cn : en)} onClick={() => move(pan.current.x + Number(x), pan.current.y + Number(y))}>{arrow}</button>)}</div></div>}
        <div className={'research-output-grid ' + (focus ? 'is-focus' : '')} ref={gallery} style={{ '--zoom': zoom } as CSSProperties}>
          {visible.map(id => { const method = data!.methods.find(item => item.id === id)!; const artifact = id === 'source' ? sample.source : sample.artifacts[id]; const score = sample.scores[id]?.[m.id]; return <article key={id} data-method={id} style={{ '--method': method?.color ?? '#697180' } as CSSProperties}>
            <header><strong>{methodName(id)}</strong>{score && !historicalEditing && <span title={number(score.score, 8)}>{label(m, language)}：{judgmentText(score, zh)}</span>}</header>
            <div className="research-output" onPointerDown={event => { if (!focus) return; drag.current = { x: event.clientX, y: event.clientY, px: pan.current.x, py: pan.current.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={event => { if (drag.current) move(drag.current.px + event.clientX - drag.current.x, drag.current.py + event.clientY - drag.current.y); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}><ArtifactPreview key={artifact.image ?? artifact.status} artifact={artifact} name={methodName(id) + ' ' + sid} region={marked ? observation?.regions[id] : undefined} crop={crop} zh={zh} /></div>
            <div className="research-output-metadata"><footer>{crop && !observation?.regions[id] && <span>{zh ? '全图参照' : 'Full-figure reference'}</span>}{artifact.svg && <a href={asset(artifact.svg)} download>{artifact.status === 'damaged' ? (zh ? '下载损坏原件' : 'Download damaged original') : (zh ? '下载 SVG' : 'Download SVG')} ↓</a>}</footer>
            {score && <details key={sid + m.id} onToggle={event => { if (event.currentTarget.open) setWantsEvidence(true); }}><summary>{historicalEditing ? (zh ? '历史评分 · 2026-11-04' : 'Historical score · 2026-11-04') : (zh ? '评分详情' : 'Score details')}</summary>{historicalEditing && <p>{judgmentText(score, zh)} · {zh ? '旧版二值评估，不用于当前编辑性汇总。' : 'Earlier binary evaluation; not used in current editability aggregates.'}</p>}<p>{zh ? '通过 / 失败 / 未知 / NA' : 'Pass / Fail / Unknown / NA'}: {['pass', 'fail', 'unknown', 'NA'].map(key => score.counts[key as keyof typeof score.counts] ?? 0).join(' / ')}</p>
              {evidenceError ? <p role="alert">{zh ? '证据加载失败' : 'Evidence unavailable'} <button onClick={() => setEvidenceRetry(value => value + 1)}>{zh ? '重试' : 'Retry'}</button></p> : evidence?.sample === sid ? evidence.data[id]?.[m.id]?.evidence.map(item => <p key={item.reviewer}><b>{item.status} · Codex</b><br />{item.text}</p>) : <p role="status">{zh ? '正在加载证据…' : 'Loading evidence…'}</p>}
              {artifact.previewOrigin === 'rendered-original-svg' && <p>{zh ? '预览由原始 SVG 渲染；资料未附 PNG。' : 'Preview rendered from the original SVG; no PNG was supplied.'}</p>}
              {sample.resources?.[id] && <p>{zh ? '本图记录：' : 'Recorded for this figure:'} ${number(sample.resources[id].cost, 3)} · {number(sample.resources[id].seconds)} s · {sample.resources[id].tokens.toLocaleString()} API tokens</p>}
              <p className="research-hash">SVG SHA256: {artifact.svgHash}<br />{artifact.evaluationVersion} · {artifact.runId}</p>
            </details>}</div>
          </article>; })}
        </div>
      </div>
      <dialog className="research-source-dialog" ref={sourceDialog} onCancel={event => event.stopPropagation()}><header><strong>{title} · {zh ? '原图' : 'Reference'}</strong><button onClick={() => sourceDialog.current?.close()} aria-label={zh ? '关闭原图' : 'Close reference'}>×</button></header><ArtifactPreview key={sample.source.image} artifact={sample.source} name={zh ? '放大原图' : 'Enlarged reference'} region={marked ? observation?.regions.source : undefined} crop={crop} zh={zh} /></dialog>
    </div> : <div className="research-browser-pending" role={error || indexError ? 'alert' : 'status'}>{error || indexError ? <>{zh ? '样本加载失败' : 'Sample could not be loaded'} <button onClick={() => { if (indexError) ensureSamples(); setRetry(value => value + 1); }}>{zh ? '重试' : 'Retry'}</button></> : zh ? '正在加载样本…' : 'Loading sample…'}</div>}
  </dialog>;
}
