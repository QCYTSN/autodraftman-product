import type { Cue, Language, PresentationState } from './types';
export const cues: Cue[] = ['overview', 'assets', 'draft', 'issue-map', 'evidence', 'plan', 'repair', 'edit'];
export const stageStarts = [1, 3, 5];
export const stageFor = (index: number) => index === 0 ? -1 : index <= 2 ? 0 : index <= 4 ? 1 : 2;
export function initialState(language: Language, originalText: string): PresentationState {
  return { cueIndex: 0, selectedIssueId: 'B1', selectedAssetId: 'point-cloud', evidenceView: 'detail', repairView: 'pair', drawer: 'none', language, editedText: originalText, inputText: originalText, editSelected: false, selectedTargetId: 'green_pooling_path_left' };
}
type Action = { type: 'navigate'; index: number } | { type: 'patch'; value: Partial<PresentationState> } | { type: 'reset'; originalText: string };
export function reducer(state: PresentationState, action: Action): PresentationState {
  if (action.type === 'patch') return { ...state, ...action.value };
  if (action.type === 'reset') return initialState(state.language, action.originalText);
  const cueIndex = Math.max(0, Math.min(7, action.index));
  if (cueIndex === state.cueIndex) return state;
  return { ...state, cueIndex, drawer: 'none', selectedIssueId: 'B1', evidenceView: 'detail', repairView: 'pair', editSelected: false, selectedTargetId: 'green_pooling_path_left' };
}
export const motionTokens = { micro: .14, fade: .22, panel: .28, layout: .48, focus: .52, ease: [.22, 1, .36, 1] as const, maxTranslate: 12, stagger: .06 };
