import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
const snapshot = () => window.matchMedia(query).matches;
const serverSnapshot = () => false;
function subscribe(onChange: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
}

// Also react to preference changes while this page is already open.
export function useReducedMotionPreference() {
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}
