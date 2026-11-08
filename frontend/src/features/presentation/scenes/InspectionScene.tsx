import { messages } from '../copy';
import FigureViewport from '../components/FigureViewport';
import EvidencePair from '../components/EvidencePair';
import type { SceneProps } from './shared';
export default function InspectionScene({ data, media, state, patch }: SceneProps) {
  const issue = data.issues.find(i => i.id === state.selectedIssueId)!;
  if (state.cueIndex === 4) return <EvidencePair data={data} media={media} issue={issue} language={state.language} full={state.evidenceView === 'overview'} />;
  return <div className="ffp-issue-map">
    <FigureViewport dimensions={data.dimensions} svg={media[data.svg.draft]} label={messages.issuesInTheDraft[state.language]}
      regions={data.issues.map(item => ({ id: item.id, region: item.draftRegion, label: item.id, labelPosition: item.labelPosition, leaderSide: item.leaderSide }))}
      selectedRegion={state.selectedIssueId} onRegion={id => patch({ selectedIssueId: id })} animateRegions />
  </div>;
}
