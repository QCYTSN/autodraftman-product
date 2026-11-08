import { usePresentationMotion } from './usePresentationMotion';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ArrowsOut, Question, Notebook } from '@phosphor-icons/react';
import { MotionConfig, motion } from 'motion/react';
import { initialState, reducer, cues } from './state';
import { messages, scenes, ui } from './copy';
import { editedSvg } from './svg';
import type { Language, PresentationCase, PresentationState } from './types';
import StageRail from './components/StageRail';
import CueNavigation from './components/CueNavigation';
import DetailDrawer from './components/DetailDrawer';
import EvidencePanel from './components/EvidencePanel';
import OverviewScene from './scenes/OverviewScene';
import DraftScene from './scenes/DraftScene';
import InspectionScene from './scenes/InspectionScene';
import PlanScene from './scenes/PlanScene';
import RepairScene from './scenes/RepairScene';
import EditScene from './scenes/EditScene';

export default function PresentationShell({ data, media, offline, language }: { data: PresentationCase; media: Record<string, string>; offline: boolean; language: Language }) {
  const [state, dispatch] = useReducer(reducer, initialState(language, data.editTarget.originalText));
  const host = useRef<HTMLDivElement>(null), canvas = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(Math.min(window.innerWidth / 1600, window.innerHeight / 900));
  const [message, setMessage] = useState('');
  const reduced = usePresentationMotion(), lastNavigation = useRef(-Infinity);
  const patch = useCallback((value: Partial<PresentationState>) => dispatch({ type: 'patch', value }), []);
  const navigate = useCallback((index: number) => {
    const targetIndex = Math.max(0, Math.min(7, index));
    if (targetIndex === state.cueIndex) return;
    const now = performance.now();
    if (now - lastNavigation.current < 250) return;
    lastNavigation.current = now;
    dispatch({ type: 'navigate', index: targetIndex });
  }, [state.cueIndex]);
  const fullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await host.current?.requestFullscreen();
      setMessage('');
    } catch { setMessage(messages.fullscreenUnavailableUseYourBrowserFullscreenControl[state.language]); }
  }, [state.language]);
  useEffect(() => {
    const element = host.current!;
    const resize = () => setScale(Math.min(element.clientWidth / 1600, element.clientHeight / 900));
    const observer = new ResizeObserver(resize); observer.observe(element);
    window.visualViewport?.addEventListener('resize', resize);
    resize();
    return () => { observer.disconnect(); window.visualViewport?.removeEventListener('resize', resize); };
  }, []);
  useEffect(() => {
    document.documentElement.lang = state.language === 'zh' ? 'zh-CN' : 'en';
    document.title = 'FigFox · Architecture walkthrough';
  }, [state.language]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement;
      if (target.closest('input,textarea,select,[contenteditable="true"]')) return;
      if (event.key === 'Escape') { if (state.drawer !== 'none') { event.preventDefault(); patch({ drawer: 'none' }); } return; }
      const key = event.key.toLowerCase();
      if (state.drawer !== 'none') {
        if (['n', 'h', '?'].includes(key)) { event.preventDefault(); patch({ drawer: 'none' }); }
        return;
      }
      if ((event.key === ' ' || event.key === 'Enter') && target.closest('button,a,[role="button"]')) return;
      let index: number | undefined;
      if (['ArrowRight', 'PageDown', ' '].includes(event.key)) index = Math.min(7, state.cueIndex + 1);
      if (['ArrowLeft', 'PageUp'].includes(event.key)) index = Math.max(0, state.cueIndex - 1);
      if (event.key === 'Home') index = 0;
      if (event.key === 'End') index = 7;
      if (['1', '2', '3'].includes(key)) index = [1, 3, 5][Number(key) - 1];
      if (index !== undefined) { event.preventDefault(); navigate(index); return; }
      if (key === 'b' && state.cueIndex === 6) { event.preventDefault(); patch({ repairView: state.repairView === 'before' ? 'after' : 'before' }); }
      if (key === 'n') { event.preventDefault(); patch({ drawer: 'notes' }); }
      if (key === 'h' || key === '?') { event.preventDefault(); patch({ drawer: 'help' }); }
      if (key === 'f') { event.preventDefault(); void fullscreen(); }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [state, patch, navigate, fullscreen]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) for (const animation of canvas.current?.getAnimations({ subtree: true }) ?? []) animation.finish(); };
    document.addEventListener('visibilitychange', hidden);
    return () => document.removeEventListener('visibilitychange', hidden);
  }, []);
  const edited = useMemo(() => editedSvg(media[data.svg.final], data.editTarget, state.editedText), [media, data, state.editedText]);
  const download = () => {
    const url = URL.createObjectURL(new Blob([edited], { type: 'image/svg+xml;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'FigFox-sample-0001-edited.svg';
    document.body.append(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  };
  const cue = cues[state.cueIndex], props = { data, media, state, patch };
  return <MotionConfig reducedMotion="user"><div className="ffp-host" ref={host}>
    <div className="ffp-canvas" ref={canvas} style={{ transform: 'translate(-50%, -50%) scale(' + scale + ')' }} data-cue={cue} data-language={state.language} data-offline={offline} data-scale={scale}>
      <header className="ffp-topbar" inert={state.drawer !== 'none'}>
        <div className="ffp-brand"><img src={media.logo} alt="FigFox" /><span>Architecture walkthrough</span></div>
        <div className="ffp-top-actions"><span className="ffp-mode">{ui.mode[state.language]}</span>{offline && <span className="ffp-offline">{ui.offline[state.language]}</span>}
          <button aria-label={messages.switchLanguage[state.language]} onClick={() => patch({ language: state.language === 'zh' ? 'en' : 'zh' })}>中 / EN</button>
          <button onClick={() => navigate(0)}>{ui.overview[state.language]}</button>
          <button aria-label={ui.notes[state.language]} onClick={() => patch({ drawer: state.drawer === 'notes' ? 'none' : 'notes' })}><Notebook size={24} /></button>
          <button aria-label={ui.help[state.language]} onClick={() => patch({ drawer: state.drawer === 'help' ? 'none' : 'help' })}><Question size={24} /></button>
          <button onClick={() => void fullscreen()}><ArrowsOut size={24} />{ui.fullscreen[state.language]}</button>
        </div>
      </header>
      <div inert={state.drawer !== 'none'}>
        <StageRail index={state.cueIndex} language={state.language} navigate={navigate} />
        <main className={'ffp-main ffp-scene-' + cue} aria-labelledby="ffp-scene-title">
          <h1 id="ffp-scene-title">{scenes[cue].title[state.language]}</h1>
          <motion.div className="ffp-scene-body" key={cue} initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduced ? 0 : .28, ease: [.22, 1, .36, 1] }}>
            {state.cueIndex === 0 && <OverviewScene {...props} />}
            {[1, 2].includes(state.cueIndex) && <DraftScene {...props} />}
            {[3, 4].includes(state.cueIndex) && <InspectionScene {...props} />}
            {state.cueIndex === 5 && <PlanScene {...props} />}
            {state.cueIndex === 6 && <RepairScene {...props} />}
            {state.cueIndex === 7 && <EditScene {...props} edited={edited} />}
          </motion.div>
        </main>
        <EvidencePanel {...props} navigate={navigate} download={download} />
        <CueNavigation index={state.cueIndex} language={state.language} navigate={navigate} />
      </div>
      {state.drawer !== 'none' && <DetailDrawer state={state} data={data} offline={offline} onClose={() => patch({ drawer: 'none' })} onReset={() => dispatch({ type: 'reset', originalText: data.editTarget.originalText })} />}
      {message && <div className="ffp-toast" role="status" onClick={() => setMessage('')}>{message}</div>}
    </div>
  </div></MotionConfig>;
}
