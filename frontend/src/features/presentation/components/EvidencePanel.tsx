import { usePresentationMotion } from '../usePresentationMotion';
import { ArrowRight, CheckCircle, DownloadSimple, MagnifyingGlass } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import FigureViewport from './FigureViewport';
import { expandedRegion } from '../svg';
import { messages, scenes, ui, overviewPoints } from '../copy';
import { cues } from '../state';
import type { PresentationCase, PresentationState } from '../types';
type Props = { data: PresentationCase; media: Record<string, string>; state: PresentationState; patch: (v: Partial<PresentationState>) => void; navigate: (i: number) => void; download: () => void };
export default function EvidencePanel({ data, media, state, patch, navigate, download }: Props) {
  const { language, cueIndex } = state, cue = cues[cueIndex];
  const issue = data.issues.find(i => i.id === state.selectedIssueId)!;
  const reduced = usePresentationMotion();
  const apply = () => patch({ editedText: state.inputText, editSelected: true });
  return <aside className={'ffp-evidence-panel ffp-panel-' + cue} aria-label={messages.explanationAndEvidence[language]}>
    <span className="ffp-eyebrow">{cueIndex === 0 ? 'HOW FIGFOX WORKS' : cueIndex < 3 ? 'STAGE I' : cueIndex < 5 ? issue.id + ' · ' + issue.title[language] : cueIndex < 7 ? 'STAGE III' : 'EDITABLE SVG'}</span>
    <h2>{cue === 'issue-map' && issue.id !== 'B1' ? issue.draftEvidence[language] : scenes[cue].conclusion[language]}</h2>
    {cue === 'overview' && <>
      <ul className="ffp-overview-points">{overviewPoints.map(t => <li key={t.en}><CheckCircle size={24} />{t[language]}</li>)}</ul>
      <button className="ffp-primary" onClick={() => navigate(1)}>{messages.beginWalkthrough[language]}<ArrowRight size={24} /></button>
    </>}
    {cue === 'assets' && <>
      <p>{messages.textGraphicsAndConnectionsAreAssembledInto[language]}</p>
      <span className="ffp-tag">{ui[data.sam.mode === 'recorded' ? 'sam' : 'illustrative'][language]}</span>
      <p className="ffp-small">{data.sam.mode === 'recorded' ? (messages.actualSegmentationRecordsForThisCase[language]) : (messages.threeRectangularCropsExplainTheMechanismSegmentation[language])}</p>
    </>}
    {cue === 'draft' && <><p>{messages.nextInspectLocalRegionsAgainstTheReference[language]}</p><span className="ffp-tag">{data.modelLabels.draft ?? (messages.draftGenerationModel[language])}</span></>}
    {cue === 'issue-map' && <>
      <div className="ffp-reference-thumbnail"><FigureViewport dimensions={data.dimensions} image={media[data.images.reference]} camera={expandedRegion(issue.sourceRegion)} label={issue.sourceEvidence[language]} /></div>
      <p className="ffp-small">{issue.sourceEvidence[language]}</p>
      <button onClick={() => { navigate(4); patch({ selectedIssueId: issue.id }); }}><MagnifyingGlass size={24} />{messages.viewReferenceEvidence[language]}</button>
    </>}
    {cue === 'evidence' && <>
      <motion.div className="ffp-observations" initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : .52, duration: reduced ? 0 : .16 }}><p><span>{ui.sourceObservation[language]}</span>{issue.sourceEvidence[language]}</p><p><span>{ui.draftObservation[language]}</span>{issue.draftEvidence[language]}</p></motion.div>
      <span className={'ffp-verification ' + (issue.verification === 'confirmed' ? '' : 'is-unknown')}><CheckCircle size={24} />{ui[issue.verification === 'confirmed' ? 'confirmed' : 'unrecorded'][language]}</span>
      <button onClick={() => patch({ evidenceView: state.evidenceView === 'detail' ? 'overview' : 'detail' })}>{ui[state.evidenceView === 'detail' ? 'fullFigure' : 'localFigure'][language]}</button>
    </>}
    {cue === 'plan' && <>
      <span className="ffp-tag">{data.modelLabels.planning ?? (messages.repairPlanningModel[language])}</span>
      <p>{messages.selectAPlanRowToLocateIts[language]}</p>
      <button className="ffp-gap-button" onClick={() => patch({ drawer: 'gap' })}>{ui.gap[language]}</button>
    </>}
    {cue === 'repair' && <>
      <dl className="ffp-repair-summary"><dt>{messages.targets[language]}</dt><dd>{messages.poolingPathAndRelatedObjects[language]}</dd>
        <dt>{messages.operations[language]}</dt><dd><code>{data.repair.operations.map(o => o.op).join(' · ')}</code></dd>
        <dt>{messages.execution[language]}</dt><dd className="ffp-verification"><CheckCircle size={24} />{data.repair.executionStatus === 'recorded-complete' ? (messages.recordedComplete[language]) : (messages.notRecorded[language])}</dd></dl>
    </>}
    {cue === 'edit' && <div className="ffp-edit-controls">
      <button onClick={() => patch({ editSelected: true })}>{ui.selectLabel[language]}</button>
      <form onSubmit={event => { event.preventDefault(); apply(); }}>
        <label htmlFor="ffp-edit-text">{ui.textLabel[language]}</label>
        <input id="ffp-edit-text" value={state.inputText} onChange={event => patch({ inputText: [...event.target.value].slice(0, 40).join('') })} autoComplete="off" spellCheck={false} />
        <div className="ffp-edit-small-actions"><button type="button" onClick={() => patch({ inputText: data.editTarget.exampleText })}>{ui.example[language]}</button>
          <button type="button" onClick={() => patch({ inputText: data.editTarget.originalText, editedText: data.editTarget.originalText })}>{ui.restore[language]}</button></div>
        <button className="ffp-primary" type="submit">{ui.apply[language]}</button>
      </form>
      <button onClick={download}><DownloadSimple size={24} />{ui.download[language]}</button>
      <span role="status" className="ffp-edit-status">{state.editedText !== data.editTarget.originalText ? ui.modified[language] : (messages.editsApplyToThisDemoCopy[language])}</span>
    </div>}
    {cueIndex > 0 && cue !== 'edit' && <button className="ffp-record-link" onClick={() => patch({ drawer: 'records' })}>{ui.records[language]} ↗</button>}
  </aside>;
}
