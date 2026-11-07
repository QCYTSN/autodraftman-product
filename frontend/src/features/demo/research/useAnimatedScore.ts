import { useEffect, useRef } from 'react';
import { animate, useMotionValue } from 'motion/react';
import { useReducedMotionPreference } from './useReducedMotionPreference';

// Interrupted transitions resume from the last visible value.
export function useAnimatedScore(score: number | null) {
  const value = useMotionValue(score ?? 0);
  const hadScore = useRef(score !== null);
  const reducedMotion = useReducedMotionPreference();
  useEffect(() => {
    if (score === null) { hadScore.current = false; return; }
    if (reducedMotion || !hadScore.current) {
      value.set(score);
      hadScore.current = true;
      return;
    }
    const animation = animate(value, score, { duration: .48, ease: [.22, 1, .36, 1] });
    return () => animation.stop();
  }, [score, reducedMotion, value]);
  return value;
}
