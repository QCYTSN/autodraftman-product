import { ArrowClockwise, ArrowLeft, Check, Pause, Play, X } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useState, type CSSProperties } from "react";
import type { ProductLanguage } from "../../ProductPages";
import "./figure-process.css";

const steps = {
  zh: {
    create: [
      { title: "整理要求", description: "结合描述与参考，明确图中的内容和布局。" },
      { title: "生成图片", description: "按照绘图要求，生成科研图像。" },
      { title: "查看结果", description: "查看图片，再决定下载、修改或转为 SVG。" },
    ],
    rebuild: [
      { title: "重建 SVG", description: "重建文字、图形及它们之间的相对位置。" },
      { title: "检查关系", description: "检查局部布局、文字与连接关系。" },
      { title: "修复问题", description: "根据检查结果调整局部，再检查修复后的图像。" },
      { title: "整理结果", description: "准备可查看、下载和继续编辑的 SVG。" },
    ],
  },
  en: {
    create: [
      { title: "Prepare the brief", description: "Use the description and references to define the content and layout." },
      { title: "Generate the image", description: "Create a scientific figure from the prepared brief." },
      { title: "Review the result", description: "Review the image, then download, refine or convert it to SVG." },
    ],
    rebuild: [
      { title: "Reconstruct SVG", description: "Rebuild text, shapes and their relative positions." },
      { title: "Check relationships", description: "Review local layouts, labels and connections." },
      { title: "Repair issues", description: "Adjust the affected region, then review the repaired figure." },
      { title: "Prepare the result", description: "Prepare the SVG for viewing, downloading and editing." },
    ],
  },
} as const;

/** A diagram of the process, never a substitute for an actual task artifact. */
export function FigureProcessGraphic({ stage, mode = "rebuild", className = "", staticArt = false, running = true }: {
  stage: number;
  mode?: "create" | "rebuild";
  className?: string;
  staticArt?: boolean;
  running?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const reducedMotion = useReducedMotion();
  const instant = reducedMotion || staticArt;
  const complete = stage >= (mode === "rebuild" ? 3 : 2);
  const inspecting = mode === "rebuild" && stage === 1;
  const repairing = mode === "rebuild" && stage === 2;
  const imperfect = !complete && mode === "rebuild" && stage < 2;
  const sketch = mode === "create" && stage === 0;
  const transition = { duration: instant ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] as const };

  return <svg className={`figure-process-graphic ${className} ${staticArt ? "is-static" : ""} ${complete ? "is-complete" : ""} ${!running ? "is-paused" : ""} stage-${stage}`} viewBox="0 0 560 350" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-paper`} x1="87" y1="47" x2="457" y2="299" gradientUnits="userSpaceOnUse"><stop stopColor="#fff" /><stop offset="1" stopColor="#fcfbff" /></linearGradient>
      <linearGradient id={`${id}-line`} x1="150" y1="174" x2="424" y2="174" gradientUnits="userSpaceOnUse"><stop stopColor="#7658d7" /><stop offset="1" stopColor="#638ed1" /></linearGradient>
      <filter id={`${id}-shadow`} x="20" y="15" width="520" height="335" filterUnits="userSpaceOnUse"><feDropShadow dx="0" dy="15" stdDeviation="13" floodColor="#34235f" floodOpacity=".065" /></filter>
    </defs>
    <g className="figure-process-paper" filter={`url(#${id}-shadow)`}>
      <rect x="63" y="44" width="434" height="257" rx="17" fill={`url(#${id}-paper)`} stroke="#e9e5f1" />
    </g>
    <g className="figure-process-heading"><circle cx="86" cy="68" r="3" fill="#cabce9" /><circle cx="97" cy="68" r="3" fill="#d9d0ed" /><circle cx="108" cy="68" r="3" fill="#e4ddf1" /><rect x="85" y="98" width="155" height="6" rx="3" fill="#55596c" opacity=".75" /><rect x="85" y="111" width="102" height="4" rx="2" fill="#c1c5d2" /></g>
    <g stroke={`url(#${id}-line)`} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <motion.path d="M163 180H203M196 176l7 4-7 4M341 180H381M374 176l7 4-7 4" initial={instant ? false : {pathLength: 0}} animate={{pathLength: 1, opacity: sketch ? .3 : .75}} transition={{...transition, duration: instant ? 0 : 2.3}} />
      <motion.path className="figure-process-feedback" d="M424 212v32H133v-32m-4 7 4-7 4 7" initial={false} animate={{ opacity: complete ? 0.75 : 0.2, pathLength: complete ? 1 : 0.85 }} transition={transition} />
      {!complete && !instant && <path className="figure-process-flow" d="M163 180H203M341 180H381" />}
    </g>
    <motion.g initial={false} animate={{ opacity: stage === 0 ? 0.75 : 1, x: stage === 0 && !staticArt ? -3 : 0 }} transition={transition}>
      <rect x="87" y="147" width="76" height="66" rx="11" fill="#f1eef9" stroke="#e1d8f1" />
      <motion.rect x="99" y="160" width="52" height="32" rx="4" initial={false} animate={{fill: sketch ? "#f1eef7" : "#e0d7f1"}} transition={transition} />
      <motion.path d="m99 185 15-13 10 9 10-7 17 11v7H99Z" initial={false} animate={{fill: sketch ? "#e5dfee" : "#a692cf"}} transition={transition} /><motion.circle cx="139" cy="169" r="4" initial={false} animate={{fill: sketch ? "#e9e3f2" : "#bfadde"}} transition={transition} />
      <path d="M108 203h35" stroke="#9585b6" strokeWidth="2.5" strokeLinecap="round" />
    </motion.g>
    <motion.g initial={false} animate={{ x: imperfect ? 5 : 0, y: imperfect ? 6 : 0, opacity: stage === 0 ? 0.6 : 1 }} transition={transition}>
      <rect x="203" y="145" width="138" height="70" rx="11" fill="#f5f2fc" stroke={repairing || complete ? "#aa91df" : "#e3dcf2"} />
      <motion.rect x="224" y="163" width="39" height="31" rx="5" initial={false} animate={{fill: sketch ? "#ebe5f3" : "#cfc1ed"}} transition={transition} /><motion.rect x="281" y="163" width="39" height="31" rx="5" initial={false} animate={{fill: sketch ? "#e9edf4" : "#d4e3f4"}} transition={transition} />
      <path d="M263 179h18m-4-3 4 3-4 3" stroke="#8b7eaa" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M226 203h92" stroke="#c3b6de" strokeWidth="2" strokeLinecap="round" />
    </motion.g>
    <motion.g initial={false} animate={{ opacity: stage === 0 ? 0.4 : 1, x: stage === 0 && !staticArt ? 3 : 0 }} transition={transition}>
      <rect x="381" y="147" width="86" height="66" rx="11" fill="#f0f6fd" stroke="#d9e5f3" />
      <path d="M395 193v-30m0 30h56" stroke="#a1b5d0" strokeWidth="1.3" strokeLinecap="round" />
      <motion.path key={`curve-${mode}`} d="m400 184 12-8 9 3 12-14 13 3" stroke="#7298cc" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" initial={instant ? false : {pathLength: sketch ? 1 : 0}} animate={{pathLength: 1, opacity: sketch ? .25 : 1}} transition={{duration: instant ? 0 : 1.8, ease: "easeInOut"}} />
      <path d="M405 203h38" stroke="#afc4e0" strokeWidth="2.5" strokeLinecap="round" />
    </motion.g>
    <motion.g className="figure-process-inspector" initial={false} animate={{ opacity: inspecting || repairing ? 1 : 0 }} transition={{ duration: instant ? 0 : 0.5 }}>
      <rect x="194" y="135" width="157" height="93" rx="15" stroke="#a48cdd" strokeWidth="1.2" strokeDasharray="4 5" />
      <circle cx="343" cy="140" r="5" fill="#f0eafa" stroke="#b59bde" /><path d="m341 140 1.5 1.5 2.5-3" stroke="#8c6ac9" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      {!instant && <path className="figure-process-scan" d="M213 146v69" stroke="#b099e2" strokeWidth="1.2" opacity=".55" />}
    </motion.g>
    <motion.g initial={false} animate={{opacity: repairing ? .6 : 0}} transition={transition}>
      <path d="M202 154H350M214 134V229M330 134V229" stroke="#b7a0de" strokeWidth=".8" strokeDasharray="2 4" />
      <circle cx="214" cy="154" r="2.5" fill="#a78dd3" /><circle cx="330" cy="154" r="2.5" fill="#a78dd3" />
    </motion.g>
    <motion.g initial={false} animate={{opacity: complete && mode === "rebuild" && !staticArt ? 1 : 0}} transition={transition}>
      <rect x="201" y="143" width="142" height="74" rx="12" stroke="#a48ad8" strokeWidth="1" />
      {[[201,143],[343,143],[201,217],[343,217]].map(([x,y])=><rect key={`${x}-${y}`} x={x-2.5} y={y-2.5} width="5" height="5" rx="1" fill="white" stroke="#a48ad8" />)}
      <text x="272" y="234" textAnchor="middle" fill="#937aae" fontSize="8.5" letterSpacing=".8">TEXT · SHAPES · CONNECTIONS</text>
    </motion.g>
    <motion.g initial={false} animate={{ opacity: complete || staticArt ? 1 : 0.45, y: complete || staticArt ? 0 : 4 }} transition={transition}>
      <rect x="374" y="87" width="91" height="26" rx="13" fill={complete || staticArt ? "#f0ebfa" : "#f4f3f7"} />
      <circle cx="389" cy="100" r="3" fill={complete || staticArt ? "#8d72cb" : "#c4bad9"} />
      <text x="401" y="103.5" fill="#8673a6" fontSize="10" fontWeight="550" letterSpacing="1.1">{mode === "create" ? "IMAGE" : "SVG"}</text>
    </motion.g>
    <g opacity=".75"><rect x="86" y="267" width="80" height="3" rx="1.5" fill="#c6c1d3" /><rect x="175" y="267" width="47" height="3" rx="1.5" fill="#e0dce8" /><circle cx="463" cy="269" r="3" fill="#d6c9ec" /></g>
    {staticArt && <g className="figure-process-selection"><rect x="201" y="143" width="142" height="74" rx="12" stroke="#ab91de" strokeWidth="1" /><rect x="198" y="140" width="6" height="6" rx="1.5" fill="white" stroke="#ab91de" /><rect x="340" y="214" width="6" height="6" rx="1.5" fill="white" stroke="#ab91de" /></g>}
  </svg>;
}

export function FigureProcessPreview({ active = true, language, mode, onClose }: { active?: boolean; language: ProductLanguage; mode: "create" | "rebuild"; onClose: () => void }) {
  const zh = language === "zh";
  const reducedMotion = useReducedMotion();
  const phases = steps[language][mode];
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(!reducedMotion);
  const [visible, setVisible] = useState(() => document.visibilityState !== "hidden");
  const completed = stage === phases.length - 1;

  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (reducedMotion) setPlaying(false);
  }, [reducedMotion]);
  useEffect(() => {
    if (!active || !playing || !visible || completed) return;
    const timer = window.setTimeout(() => setStage(current => Math.min(current + 1, phases.length - 1)), 6500);
    return () => window.clearTimeout(timer);
  }, [active, playing, visible, completed, stage, phases.length]);

  return <section className="figure-process-preview" aria-label={zh ? "处理流程预览" : "Process preview"}>
    <header className="figure-process-preview-header"><span><i />{zh ? "流程示意" : "Process illustration"}</span><button type="button" onClick={onClose} aria-label={zh ? "关闭流程预览" : "Close process preview"}><X size={18} /></button></header>
    <FigureProcessGraphic stage={stage} mode={mode} running={active && playing && visible} />
    <div className="figure-process-caption" aria-live="polite" aria-atomic="true"><h2>{phases[stage].title}</h2><p>{phases[stage].description}</p></div>
    <ol className="figure-process-steps" style={{ "--process-steps": phases.length } as CSSProperties}>
      {phases.map((phase, index) => <li key={phase.title} data-state={index < stage ? "done" : index === stage ? "current" : "waiting"}><button type="button" aria-current={index === stage ? "step" : undefined} onClick={() => { setStage(index); setPlaying(false); }}><span>{index < stage ? <Check size={13} /> : String(index + 1).padStart(2, "0")}</span><strong>{phase.title}</strong></button></li>)}
    </ol>
    <footer className="figure-process-preview-footer">
      <p>{zh ? "这里展示处理流程，尚未提交你的草稿。" : "This illustrates the workflow. Your draft has not been submitted."}</p>
      <div>{completed ? <button type="button" onClick={() => { setStage(0); setPlaying(!reducedMotion); }}><ArrowClockwise size={15} />{zh ? "重新播放" : "Replay"}</button> : <button type="button" onClick={() => setPlaying(value => !value)}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? zh ? "暂停" : "Pause" : zh ? "播放" : "Play"}</button>}<button type="button" onClick={onClose}><ArrowLeft size={15} />{zh ? "返回草稿" : "Back to draft"}</button></div>
    </footer>
  </section>;
}
