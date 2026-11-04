import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react';
import { useReducedMotionPreference } from './useReducedMotionPreference';
import { ArrowCounterClockwise, ArrowRight, Play, Pause } from '@phosphor-icons/react';
import { useResearch } from './ResearchContext';
import { asset, load } from './data';

type PipelineData = {
  issues: { bbox: number[]; id: string; initial_evidence: string; repair: string }[];
  receipt: { planned_operations: number; executed_operations: number };
  operations: { transaction: string; edits: { op: string; target: string }[] }[];
};
type Playback = 'idle' | 'playing' | 'paused' | 'complete';
const STAGE_SECONDS = 3.6;

export default function Pipeline({ stage, onStage }: { stage: number; onStage: (n: number) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const { language, open } = useResearch();
  const zh = language === 'zh';
  const reduced = useReducedMotionPreference();
  const [data, setData] = useState<PipelineData | null>(null);
  const [issueIndex, setIssueIndex] = useState(0);
  const [playback, setPlayback] = useState<Playback>('idle');
  const [replay, setReplay] = useState(0);
  const progress = useMotionValue(0);
  const draftReveal = useTransform(progress, value => `inset(0 ${100 - Math.min(1, value * 1.8) * 100}% 0 0)`);
  const playing = playback === 'playing';
  const pause = () => setPlayback(current => current === 'playing' ? 'paused' : current);
  function selectStage(index: number) {
    setPlayback('idle');
    progress.set(0);
    onStage(index);
  }
  function togglePlayback() {
    if (playing) { pause(); return; }
    if (playback !== 'paused') {
      progress.set(0);
      setIssueIndex(0);
      onStage(0);
      setReplay(current => current + 1);
    }
    setPlayback('playing');
  }
  useMotionValueEvent(progress, 'change', value => {
    if (!playing || stage !== 1 || !data?.issues.length) return;
    const next = Math.min(Math.floor(value * 4), Math.min(data.issues.length, 4) - 1);
    if (next !== issueIndex) setIssueIndex(next);
  });
  useEffect(() => {
    if (!root.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        void load<PipelineData>('pipeline.json').then(setData).catch(() => setData(null));
        observer.disconnect();
      }
    }, { rootMargin: '240px' });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!playing) return;
    const animation = animate(progress, 1, {
      duration: (1 - progress.get()) * STAGE_SECONDS,
      ease: 'linear',
      onComplete: () => {
        if (stage === 2) { setPlayback('complete'); return; }
        progress.set(0);
        setIssueIndex(0);
        onStage(stage + 1);
      },
    });
    return () => animation.stop();
  }, [playing, stage, onStage, progress]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { if (!entries[0]?.isIntersecting) pause(); });
    if (root.current) observer.observe(root.current);
    const visibility = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', visibility);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  const titles = zh ? ['重建初稿', '定位差异', '修复 SVG'] : ['Reconstruct', 'Inspect', 'Repair'];
  const subtitles = zh ? ['SAM 辅助图像重建', '原图与初稿逐区对照', '执行原生编辑操作'] : ['SAM-guided drafting', 'Compare local regions', 'Execute native edits'];
  const descriptions = zh
    ? ['结合原图与 SAM 素材，生成包含文字、图形和连接的 SVG 初稿。', '对照原图与初稿，在对应区域标出需要修复的差异。', '将修复计划转为原生 SVG 操作，得到可以继续编辑的图形。']
    : ['Build an SVG draft from the reference and SAM assets, including text, shapes and connections.', 'Compare matching regions in the reference and draft to locate differences.', 'Apply native SVG edits to the repair plan and produce a figure ready for further editing.'];
  const files = stage === 2 ? ['C', 'A'] : ['source', 'C'];
  const caption = (file: string) => file === 'source' ? (zh ? '原图' : 'Reference') : file === 'C' ? (zh ? 'SVG 初稿' : 'SVG draft') : (zh ? '修复后的 SVG' : 'Repaired SVG');

  return <div className="research-pipeline" ref={root} data-playback={playback}>
    <ol className="research-stage-tabs" aria-label={zh ? 'FigFox 重建流程' : 'FigFox reconstruction sequence'}>
      {titles.map((title, index) => <li key={index}>
        <button aria-pressed={stage === index} onClick={() => selectStage(index)}>
          <span className="pipeline-step-number">0{index + 1}</span>
          <span><b>{title}</b><small>{subtitles[index]}</small></span>
        </button>
        {index < 2 && <ArrowRight className="pipeline-step-arrow" size={24} aria-hidden="true" />}
      </li>)}
    </ol>
    <div className="research-stage-evidence">
      <header className="pipeline-stage-heading">
        <div><span className="research-eyebrow">0{stage + 1} / 03</span><h3>{titles[stage]}</h3><p>{descriptions[stage]}</p></div>
        <div className="pipeline-playback-controls">
          <button className="research-text-action pipeline-play-button" onClick={togglePlayback}>{playing ? <Pause size={16} /> : playback === 'complete' ? <ArrowCounterClockwise size={16} /> : <Play size={16} />}{playing ? (zh ? '暂停演示' : 'Pause') : playback === 'paused' ? (zh ? '继续演示' : 'Resume') : playback === 'complete' ? (zh ? '重播流程' : 'Replay stages') : (zh ? '播放流程' : 'Play stages')}</button>
          <div className="pipeline-playback-progress" aria-hidden="true">{[0, 1, 2].map(index => <span key={index}><motion.i style={{ scaleX: playback === 'idle' || index > stage ? 0 : index < stage || reduced ? 1 : progress }} /></span>)}</div>
          <span className="pipeline-playback-status" role="status">{playback === 'idle' ? (zh ? '约 11 秒 · 三个步骤' : '11 seconds · Three stages') : playback === 'complete' ? (zh ? '演示完成' : 'Complete') : `${playing ? (zh ? '正在演示' : 'Playing') : (zh ? '已暂停' : 'Paused')} ${stage + 1} / 3`}</span>
        </div>
      </header>
      <motion.div className="pipeline-pair" key={`${stage}-${replay}`} initial={{ opacity: reduced ? 1 : .35, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }}>
        {files.map((file, index) => <figure key={file}>
          <figcaption><span>{caption(file)}</span>{index === 0 && <ArrowRight size={20} aria-hidden="true" />}</figcaption>
          <div className="pipeline-artifact"><motion.img style={{ clipPath: !reduced && playback !== 'idle' && stage === 0 && file === 'C' ? draftReveal : undefined }} src={asset(`samples/sample-0001/${file}.webp`)} alt={caption(file) + (zh ? '：类别统一目标跟踪' : ': category-unified tracking')} loading="lazy" />
            {stage === 1 && data?.issues[issueIndex]?.bbox && <span className="pipeline-roi" style={{ left: `${data.issues[issueIndex].bbox[0] / 968 * 100}%`, top: `${data.issues[issueIndex].bbox[1] / 510 * 100}%`, width: `${(data.issues[issueIndex].bbox[2] - data.issues[issueIndex].bbox[0]) / 968 * 100}%`, height: `${(data.issues[issueIndex].bbox[3] - data.issues[issueIndex].bbox[1]) / 510 * 100}%` }} />}
          </div>
        </figure>)}
      </motion.div>
      <div className="pipeline-stage-footer">
        {stage === 1 && data ? <div className="research-controls research-tabs" aria-label={zh ? '差异区域' : 'Difference regions'}>{data.issues.slice(0, 4).map((issue, index) => <button key={issue.id} aria-label={`${issue.id} · ${zh ? '定位问题' : 'Locate issue'}`} aria-pressed={issueIndex === index} onClick={() => { setPlayback('idle'); setIssueIndex(index); }}>{zh ? '区域' : 'Region'} {index + 1}</button>)}</div> : <span>{stage === 2 && data ? `${data.receipt.executed_operations} / ${data.receipt.planned_operations} ${zh ? '项编辑操作已执行' : 'edit operations executed'}` : (zh ? '类别统一目标跟踪 · 重建示例' : 'Category-unified tracking · Reconstruction example')}</span>}
        <button className="research-text-action" onClick={() => { pause(); open({ sample: 'sample-0001', metric: 'D05', condition: 'C', methods: ['C', 'A'] }); }}>{zh ? '放大查看' : 'Inspect in detail'} ↗</button>
      </div>
      {stage > 0 && data && <details className="research-settings pipeline-records"><summary>{zh ? '查看本阶段记录' : 'View stage records'}</summary>{stage === 1 ? data.issues.slice(0, 4).map(issue => <p key={issue.id}><b>{issue.id}</b> · {issue.initial_evidence}<br />{issue.repair}</p>) : data.operations.map(operation => <p key={operation.transaction}>{operation.transaction}<br />{operation.edits.map(edit => `${edit.op} → ${edit.target}`).join(' · ')}</p>)}</details>}
    </div>
  </div>;
}
