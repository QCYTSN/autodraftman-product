import FigureViewport from './FigureViewport';
import { pairedCameras } from '../svg';
import { ui } from '../copy';
import type { Issue, Language, PresentationCase } from '../types';
export default function EvidencePair({ data, media, issue, language, full }: {
  data: PresentationCase; media: Record<string, string>; issue: Issue; language: Language; full: boolean;
}) {
  const cameras = pairedCameras(issue.sourceRegion, issue.draftRegion);
  return <div className="ffp-evidence-pair">
    {[0, 1].map(i => <figure key={i}>
      <figcaption>{ui[i === 0 ? 'reference' : 'draft'][language]}</figcaption>
      <FigureViewport dimensions={data.dimensions} image={i === 0 ? media[data.images.reference] : undefined} svg={i === 1 ? media[data.svg.draft] : undefined}
        label={i === 0 ? issue.sourceEvidence[language] : issue.draftEvidence[language]} camera={full ? undefined : cameras[i]} focusOnMount
        endpoint={!full ? (i === 0 ? issue.sourceEndpoint : issue.draftEndpoint) ?? undefined : undefined} endpointLabel={ui.locate[language]} />
      <p>{i === 0 ? issue.sourceEvidence[language] : issue.draftEvidence[language]}</p>
    </figure>)}
  </div>;
}
