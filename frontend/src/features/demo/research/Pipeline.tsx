import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { animate, motion, useMotionValue } from 'motion/react';
import { useReducedMotionPreference } from './useReducedMotionPreference';
import { ArrowCounterClockwise, ArrowRight, Play, Pause } from '@phosphor-icons/react';
import { useResearch } from './ResearchContext';
import { asset, load } from './data';

type Copy = { zh: string; en: string };
type PipelineData = {
  sample: string; title: Copy; width: number; height: number;
  focus: { id: string; label: Copy; inspect: Copy; repair: Copy; bounds: number[]; issueIds: string[] }[];
  receipt: { planned_operations: number; executed_operations: number };
  operations: { transaction: string; edits: { op: string; target: string }[] }[];
};
type Playback = 'idle' | 'playing' | 'paused' | 'complete';
const STAGE_SECONDS = [4, 7, 7];

export default function Pipeline({ stage, onStage }: { stage: number; onStage: (n: number) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const { language, open } = useResearch();
  const zh = language === 'zh';
  const reduced = useReducedMotionPreference();
  const [data, setData] = useState<PipelineData | null>(null);
  const [failed, setFailed] = useState(false), [retry, setRetry] = useState(0);
  const [focusIndex, setFocusIndex] = useState(0);
  const [playback, setPlayback] = useState<Playback>('idle');
  const progress = useMotionValue(0);
  const playing = playback === 'playing';
  const pause = () => setPlayback(current => current === 'playing' ? 'paused' : current);
  function selectStage(index: number) { setPlayback('idle'); progress.set(0); onStage(index); }
  function togglePlayback() {
    if (playing) { pause(); return; }
    if (playback !== 'paused') { progress.set(0); onStage(0); }
    setPlayback('playing');
  }
  useEffect(() => {
    const controller = new AbortController();
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      setFailed(false);
      void load<PipelineData>('pipeline-featured.json', controller.signal).then(setData).catch(() => { if (!controller.signal.aborted) setFailed(true); });
      observer.disconnect();
    }, { rootMargin: '240px' });
    if (root.current) observer.observe(root.current);
    return () => { observer.disconnect(); controller.abort(); };
  }, [retry]);
  useEffect(() => {
    if (!playing || !data) return;
    const animation = animate(progress, 1, {
      duration: (1 - progress.get()) * STAGE_SECONDS[stage], ease: 'linear',
      onComplete: () => {
        if (stage === 2) { setPlayback('complete'); return; }
        progress.set(0); onStage(stage + 1);
      },
    });
    return () => animation.stop();
  }, [playing, stage, onStage, progress, data]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { if (!entries[0]?.isIntersecting) pause(); });
    if (root.current) observer.observe(root.current);
    const visibility = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  const titles = zh ? ['重建初稿', '定位差异', '修复 SVG'] : ['Reconstruct', 'Inspect', 'Repair'];
  const subtitles = zh ? ['SAM 辅助图像重建', '原图与初稿逐区对照', '执行原生编辑操作'] : ['SAM-guided drafting', 'Compare local regions', 'Execute native edits'];
  const detail = data?.focus[focusIndex];
  const description = stage === 0 ? (zh ? '重建文字、模块与连接，得到可编辑的 SVG 初稿。' : 'Reconstruct text, modules and connections into an editable SVG draft.') : detail?.[stage === 1 ? 'inspect' : 'repair'][language];
  const files = stage === 2 ? ['C', 'A'] : ['source', 'C'];
  const caption = (file: string) => file === 'source' ? (zh ? '原图' : 'Reference') : file === 'C' ? (zh ? 'SVG 初稿' : 'SVG draft') : (zh ? '修复后的 SVG' : 'Repaired SVG');
  const crop = detail ? [detail.bounds[0] - 18, detail.bounds[1] - 18, detail.bounds[2] + 36, detail.bounds[3] + 36].join(' ') : '';

  return <div className="research-pipeline" ref={root} data-playback={playback}>
    <ol className="research-stage-tabs" data-demo-reveal="fade" aria-label={zh ? 'FigFox 重建流程' : 'FigFox reconstruction sequence'}>
      {titles.map((title, index) => <li key={index}>
        <button aria-pressed={stage === index} onClick={() => selectStage(index)}><span className="pipeline-step-number">0{index + 1}</span><span><b>{title}</b><small>{subtitles[index]}</small></span></button>
        {index < 2 && <ArrowRight className="pipeline-step-arrow" size={24} aria-hidden="true" />}
      </li>)}
    </ol>
    <div className="research-stage-evidence">
      <header className="pipeline-stage-heading" data-demo-reveal="fade">
        <div><span className="research-eyebrow">0{stage + 1} / 03</span><h3>{titles[stage]}</h3><p>{description}</p></div>
        <div className="pipeline-playback-controls">
          <button className="research-text-action pipeline-play-button" disabled={!data} onClick={togglePlayback}>{playing ? <Pause size={16} /> : playback === 'complete' ? <ArrowCounterClockwise size={16} /> : <Play size={16} />}{playing ? (zh ? '暂停演示' : 'Pause') : playback === 'paused' ? (zh ? '继续演示' : 'Resume') : playback === 'complete' ? (zh ? '重播流程' : 'Replay stages') : (zh ? '播放流程' : 'Play stages')}</button>
          <div className="pipeline-playback-progress" aria-hidden="true">{[0, 1, 2].map(index => <span key={index}><motion.i style={{ scaleX: playback === 'idle' || index > stage ? 0 : index < stage || reduced ? 1 : progress }} /></span>)}</div>
          <span className="pipeline-playback-status" role="status">{playback === 'idle' ? (zh ? '约 18 秒 · 三个步骤' : '18 seconds · Three stages') : playback === 'complete' ? (zh ? '演示完成' : 'Complete') : `${playing ? (zh ? '正在演示' : 'Playing') : (zh ? '已暂停' : 'Paused')} ${stage + 1} / 3`}</span>
        </div>
      </header>
      {data && detail ? <>
        {stage > 0 && <div className="pipeline-detail-picker research-controls research-tabs" aria-label={zh ? '观察细节' : 'Inspect a detail'}>{data.focus.map((item, index) => <button key={item.id} aria-pressed={index === focusIndex} onClick={() => { pause(); setFocusIndex(index); }}>{item.label[language]}</button>)}</div>}
        <div data-demo-reveal><motion.div className="pipeline-visual" key={`${stage}-${focusIndex}`} initial={{ opacity: reduced ? 1 : .4, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .28 }}>
          {stage > 0 && <figure className="pipeline-overview"><figcaption>{data.title[language]} · {zh ? '原图定位' : 'Locate in the reference'}</figcaption><svg viewBox={`0 0 ${data.width} ${data.height}`} role="img" aria-label={detail.label[language]}><image href={asset(`samples/${data.sample}/source.webp`)} width={data.width} height={data.height} /><rect className="pipeline-focus-box" x={detail.bounds[0]} y={detail.bounds[1]} width={detail.bounds[2]} height={detail.bounds[3]} vectorEffect="non-scaling-stroke" /></svg></figure>}
          <div className={'pipeline-pair' + (stage > 0 ? ' is-detail' : '')} style={{ '--pipeline-aspect': data.width / data.height } as CSSProperties}>
            {files.map((file, index) => <figure key={file}><figcaption><span>{caption(file)}</span>{index === 0 && <ArrowRight size={20} aria-hidden="true" />}</figcaption><div className="pipeline-artifact">
              {stage === 0 ? <img src={asset(`samples/${data.sample}/${file}.webp`)} alt={`${caption(file)}：${data.title[language]}`} loading="lazy" /> : <svg viewBox={crop} role="img" aria-label={`${caption(file)} · ${detail.label[language]}`}><defs><clipPath id={`pipeline-crop-${file}`}><rect x={detail.bounds[0] - 18} y={detail.bounds[1] - 18} width={detail.bounds[2] + 36} height={detail.bounds[3] + 36} /></clipPath></defs><image href={asset(`samples/${data.sample}/${file}.webp`)} width={data.width} height={data.height} clipPath={`url(#pipeline-crop-${file})`} /></svg>}
            </div></figure>)}
          </div>
        </motion.div></div>
        <div className="pipeline-stage-footer" data-demo-reveal="fade"><span>{stage === 2 ? `${data.receipt.executed_operations} / ${data.receipt.planned_operations} ${zh ? '项编辑操作已执行' : 'edit operations executed'}` : data.title[language]}</span><button className="research-text-action" onClick={() => { pause(); open({ sample: data.sample, metric: 'D16', scope: 'ablation', condition: 'C', methods: files, view: 'pair' }); }}>{zh ? '放大对照' : 'Compare in detail'} ↗</button></div>
        {stage === 2 && <details className="research-settings pipeline-records"><summary>{zh ? '查看编辑记录' : 'View edit records'}</summary>{data.operations.map(operation => <p key={operation.transaction}>{operation.edits.map(edit => `${edit.op} → ${edit.target}`).join(' · ')}</p>)}<p>{zh ? '另保留一项连接观察：复核后维持原连接。' : 'One connection observation is retained; the original connection was kept after review.'}</p></details>}
      </> : <p className="pipeline-loading" role={failed ? 'alert' : 'status'}>{failed ? <>{zh ? '流程材料加载失败。' : 'Could not load the stage records.'}<button onClick={() => setRetry(value => value + 1)}>{zh ? '重试' : 'Retry'}</button></> : (zh ? '正在加载流程材料…' : 'Loading stage records…')}</p>}
    </div>
  </div>;
}
