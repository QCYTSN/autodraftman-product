import { messages } from '../copy';
import { useLayoutEffect, useRef, useState } from 'react';
import FigureViewport from '../components/FigureViewport';
import RepairPlanCard from '../components/RepairPlanCard';
import { expandedRegion } from '../svg';
import type { SceneProps } from './shared';
export default function PlanScene({ data, media, state, patch }: SceneProps) {
  const root = useRef<HTMLDivElement>(null), [leader, setLeader] = useState('');
  useLayoutEffect(() => {
    const el = root.current;
    const node = el?.querySelector('[data-original-id="' + state.selectedTargetId + '"]') as SVGGraphicsElement | null;
    const row = el?.querySelector('[data-plan-target="' + state.selectedTargetId + '"]');
    if (!el || !node || !row) return;
    const whole = el.getBoundingClientRect(), box = node.getBoundingClientRect(), target = row.getBoundingClientRect();
    const scale = whole.width / 1120;
    const x = (box.right - whole.left) / scale, y = (box.top + box.height / 2 - whole.top) / scale;
    const endY = (target.top + target.height / 2 - whole.top) / scale;
    setLeader('M' + x + ' ' + y + ' L550 ' + y + ' L550 ' + endY + ' L572 ' + endY);
  }, [state.selectedTargetId]);
  return <div className="ffp-plan-scene" ref={root}>
    <div className="ffp-plan-figure"><FigureViewport dimensions={data.dimensions} svg={media[data.svg.draft]} label={messages.repairTargetObjects[state.language]}
      camera={expandedRegion(data.repair.region)} targets={data.repair.operations.map(o => o.targetId)} selectedTarget={state.selectedTargetId} /></div>
    <RepairPlanCard data={data} selected={state.selectedTargetId} language={state.language} onSelect={id => patch({ selectedTargetId: id })} />
    <svg className="ffp-plan-leader" viewBox="0 0 1120 600" aria-hidden="true"><path d={leader} fill="none" stroke="#6D46D9" strokeWidth="1.5" /></svg>
  </div>;
}
