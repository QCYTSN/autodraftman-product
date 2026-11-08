import type { Language, PresentationState, SceneId } from './types';
export const scenes: SceneId[] = ['opening', 'assets', 'draft', 'evidence', 'targets', 'repair', 'editable'];
export const stageStarts = [1, 3, 4];
export const stageFor = (scene: SceneId) => scene === 'opening' ? -1 : ['assets', 'draft'].includes(scene) ? 0 : scene === 'evidence' ? 1 : 2;
export const motionTokens = { micro: .14, selection: .22, stateBlend: .24, objectMove: .42, camera: .56, scene: .6, maxSequence: 1.1,
  enterEase: [.22, 1, .36, 1] as const, cameraEase: [.4, 0, .2, 1] as const };
export function initialState(language: Language, originalText: string, selectedAsset: string): PresentationState {
  return { scene: 'opening', language, selectedAsset, selectedOperation: 0, comparisonMode: 'after', temporaryBefore: false,
    overlay: 'none', editedText: originalText, inputDraft: originalText, editing: false, fullReference: false, fullDraft: false, navigation: 'direct', revision: 0 };
}
type Action = { type: 'navigate'; index: number; direct?: boolean } | { type: 'patch'; value: Partial<PresentationState> }
  | { type: 'restore'; originalText: string } | { type: 'reset'; originalText: string; selectedAsset: string };
export function reducer(state: PresentationState, action: Action): PresentationState {
  if (action.type === 'patch') return { ...state, ...action.value };
  if (action.type === 'restore') return { ...state, editedText: action.originalText, inputDraft: action.originalText, editing: false };
  if (action.type === 'reset') return { ...initialState(state.language, action.originalText, action.selectedAsset), revision: state.revision + 1 };
  const index = Math.max(0, Math.min(scenes.length - 1, action.index)), previous = scenes.indexOf(state.scene);
  if (index === previous) return state;
  return { ...state, scene: scenes[index], navigation: action.direct ? 'direct' : index === previous + 1 ? 'forward' : 'back', revision: state.revision + 1,
    overlay: 'none', editing: false, inputDraft: state.editedText, temporaryBefore: false, selectedOperation: 0, comparisonMode: 'after', fullReference: false, fullDraft: false };
}
