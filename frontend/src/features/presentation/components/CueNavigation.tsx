import { ArrowLeft, ArrowRight } from '@phosphor-icons/react';
import { messages, scenes, ui } from '../copy';
import { cues } from '../state';
import type { Language } from '../types';
export default function CueNavigation({ index, language, navigate }: { index: number; language: Language; navigate: (index: number) => void }) {
  return <footer className="ffp-controls">
    <div className="ffp-step-caption"><b>{String(index + 1).padStart(2, '0')} <span>/ 08</span></b><span>{scenes[cues[index]].act[language]}</span></div>
    <nav className="ffp-cues" aria-label={messages.eightSteps[language]}>
      {cues.map((cue, i) => <button key={cue} aria-label={String(i + 1) + ' · ' + scenes[cue].title[language]} aria-current={i === index ? 'step' : undefined}
        onClick={() => navigate(i)} data-cue-button={cue}><span /></button>)}
    </nav>
    <div className="ffp-control-actions"><span className="ffp-key-hint">← / →</span>
      <button disabled={index === 0} onClick={() => navigate(index - 1)}><ArrowLeft size={24} />{ui.previous[language]}</button>
      <button className="ffp-primary" data-action="next" onClick={() => navigate(index === 7 ? 0 : index + 1)}>{scenes[cues[index]].next[language]}<ArrowRight size={24} /></button>
    </div>
  </footer>;
}
