import type { PresentationCase, PresentationState } from '../types';
export type SceneProps = {
  data: PresentationCase; media: Record<string, string>; state: PresentationState;
  patch: (value: Partial<PresentationState>) => void;
};
