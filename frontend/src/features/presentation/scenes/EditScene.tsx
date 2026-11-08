import EditableSvgPreview from '../components/EditableSvgPreview';
import { ui } from '../copy';
import type { SceneProps } from './shared';
export default function EditScene({ data, state, patch, edited }: SceneProps & { edited: string }) {
  return <EditableSvgPreview svg={edited} data={data} selected={state.editSelected} onSelect={() => patch({ editSelected: true })} label={ui.selectLabel[state.language]} />;
}
