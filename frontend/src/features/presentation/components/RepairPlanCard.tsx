import { messages } from '../copy';
import { CheckCircle, ArrowRight } from '@phosphor-icons/react';
import type { Language, PresentationCase } from '../types';
export default function RepairPlanCard({ data, selected, language, onSelect }: { data: PresentationCase; selected: string; language: Language; onSelect: (id: string) => void }) {
  return <div className="ffp-plan-card">
    <span className="ffp-eyebrow">{messages.issueB1[language]}</span>
    <p className="ffp-verification"><CheckCircle size={24} />{messages.independentlyVerified[language]}</p>
    {data.repair.operations.map((op, i) => <button key={op.targetId} data-plan-target={op.targetId} aria-pressed={op.targetId === selected}
      onClick={() => onSelect(op.targetId)} className={op.targetId === selected ? 'is-active' : ''}>
      <span className="ffp-plan-order">0{i + 1}</span><span><strong>{i === 0 ? (messages.updateThePoolingPath[language]) : (messages.adjustRelatedFeatureObjects[language])}</strong>
        <code>{op.op}</code></span><ArrowRight size={24} />
    </button>)}
    <p className="ffp-small">{messages.planMappedToActualSVGObjects[language]}</p>
  </div>;
}
