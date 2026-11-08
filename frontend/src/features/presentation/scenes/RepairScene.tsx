import RepairComparison from '../components/RepairComparison';
import type { SceneProps } from './shared';
export default function RepairScene({ data, media, state, patch }: SceneProps) {
  return <RepairComparison data={data} media={media} language={state.language} view={state.repairView} onView={repairView => patch({ repairView })} />;
}
