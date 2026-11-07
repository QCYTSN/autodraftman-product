import { motion, useTransform } from 'motion/react';
import type { Method } from './data';
import { useAnimatedScore } from './useAnimatedScore';

export function ProfileRow({ method, score, onInspect }: {
  method: Method; score: number | null; onInspect: () => void;
}) {
  const value = useAnimatedScore(score);
  const position = useTransform(value, current => `${current}%`);
  const formatted = useTransform(value, current => current.toFixed(1));
  return <button onClick={onInspect} aria-label={`${method.name}: ${score?.toFixed(1) ?? '—'}`}>
    <span>{method.name}</span>
    <span className="research-profile-track" aria-hidden="true">
      {score !== null && <motion.i style={{ left: position, background: method.color }} />}
    </span>
    {score === null ? <b>—</b> : <motion.b aria-hidden="true">{formatted}</motion.b>}
  </button>;
}
