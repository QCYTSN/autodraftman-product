import { motion, useTransform } from 'motion/react';
import { useAnimatedScore } from './useAnimatedScore';

export function AblationRow({ name, score, reference, color, selected, onSelect }: {
  name: string; score: number | null; reference: number | null; color: string;
  selected: boolean; onSelect: () => void;
}) {
  const value = useAnimatedScore(score);
  const baseline = useAnimatedScore(reference);
  const position = useTransform(value, v => `${v}%`);
  const referencePosition = useTransform(baseline, v => `${v}%`);
  const formatted = useTransform(value, v => v.toFixed(1));
  return <button aria-pressed={selected} aria-label={`${name}: ${score?.toFixed(1) ?? '—'}`} onClick={onSelect}>
    <span>{name}</span>
    <span className="research-ablation-track" aria-hidden="true">
      {reference !== null && <motion.i style={{ left: referencePosition }} />}
      {score !== null && <motion.b style={{ left: position, background: color }} />}
    </span>
    {score === null ? <strong>—</strong> : <motion.strong aria-hidden="true">{formatted}</motion.strong>}
  </button>;
}
