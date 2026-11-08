import { ArrowRight, Check } from '@phosphor-icons/react';
import { messages, stages } from '../copy';
import { stageFor, stageStarts } from '../state';
import type { Language } from '../types';
export default function StageRail({ index, language, navigate }: { index: number; language: Language; navigate: (index: number) => void }) {
  const active = stageFor(index);
  return <nav className="ffp-stages" aria-label={messages.threeStages[language]}>
    {stages.map((stage, i) => <div className="ffp-stage-group" key={i}>
      <button className={'ffp-stage ffp-stage-' + i + (active === i ? ' is-active' : '')} aria-current={active === i ? 'step' : undefined} onClick={() => navigate(stageStarts[i])}>
        <span className="ffp-stage-number">{active > i ? <Check size={24} /> : i + 1}</span>
        <span><strong>{stage.title[language]}</strong><small>{language === 'zh' ? stage.subtitle : 'Stage ' + ['I', 'II', 'III'][i]}</small></span>
      </button>{i < 2 && <ArrowRight className="ffp-stage-connector" size={24} weight="regular" />}
    </div>)}
  </nav>;
}
