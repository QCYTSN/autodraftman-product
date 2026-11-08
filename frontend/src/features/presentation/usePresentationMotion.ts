import { useSyncExternalStore } from 'react';
import { useReducedMotion } from 'motion/react';
const subscribe = (callback: () => void) => {
  document.addEventListener('visibilitychange', callback);
  return () => document.removeEventListener('visibilitychange', callback);
};
// Finish a local transition when hidden; returning never changes the cue.
export function usePresentationMotion() {
  const hidden = useSyncExternalStore(subscribe, () => document.hidden, () => false);
  return Boolean(useReducedMotion() || hidden);
}
