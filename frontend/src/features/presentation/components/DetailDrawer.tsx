import { useEffect, useRef } from 'react';
import { X } from '@phosphor-icons/react';
import { cues } from '../state';
import { messages, scenes, stages, ui } from '../copy';
import type { PresentationCase, PresentationState } from '../types';
type Props = { state: PresentationState; data: PresentationCase; offline: boolean; onClose: () => void; onReset: () => void };
export default function DetailDrawer({ state, data, offline, onClose, onReset }: Props) {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    root.current?.querySelector<HTMLButtonElement>('button')?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, [state.drawer]);
  const title = state.drawer === 'notes' ? ui.notes : state.drawer === 'gap' ? ui.gap : state.drawer === 'records' ? ui.records : ui.help;
  const notes = scenes[cues[state.cueIndex]].notes[state.language];
  return <aside ref={root} className="ffp-drawer" role="dialog" aria-modal="true" aria-labelledby="ffp-drawer-title" onKeyDown={event => {
    if (event.key !== 'Tab') return;
    const items = [...root.current!.querySelectorAll<HTMLElement>('button,a[href],input,[tabindex="0"]')];
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }}>
    <header><h2 id="ffp-drawer-title">{title[state.language]}</h2><button aria-label={ui.close[state.language]} onClick={onClose}><X size={24} /></button></header>
    <div className="ffp-drawer-content">
      {state.drawer === 'notes' && <><span className="ffp-eyebrow">{scenes[cues[state.cueIndex]].act[state.language]}</span><p>{notes}</p>
        {state.cueIndex === 1 && data.sam.mode === 'reference-crop-illustration' && <p>{messages.thisViewIllustratesTheAssetAssistanceMechanism[state.language]}</p>}
        <p className="ffp-small">{messages.sevenAdvancesAboutTwoMinutesYouControl[state.language]}</p></>}
      {state.drawer === 'gap' && <>
        <p>{messages.triggerObtainAdditionalGuidanceWhenNativeOperation[state.language]}</p>
        <span className="ffp-tag">{data.gapGuidance.state}</span><p>{data.gapGuidance.state === 'not-triggered' ? (messages.notTriggeredInThisCase[state.language]) : data.gapGuidance.summary[state.language]}</p>
        <p className="ffp-small">{messages.architectureRoleDeepSeekGapGuidanceCaseModel[state.language]}</p></>}
      {state.drawer === 'help' && <>
        <p>{messages.aWalkthroughOfSavedCaseArtifactsUse[state.language]}</p>
        <dl className="ffp-shortcuts">
          {[['→ / PageDown / Space', messages.nextState[state.language]], ['← / PageUp', messages.previousState[state.language]],
            ['Home / End', messages.overviewEdit[state.language]], ['1 / 2 / 3', messages.jumpToAStage[state.language]],
            ['B', messages.beforeAfterRepair[state.language]], ['N', ui.notes[state.language]], ['H / ?', ui.help[state.language]],
            ['F', ui.fullscreen[state.language]], ['Esc', messages.closeDetails[state.language]]].map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
        </dl>
        <p className="ffp-small">{messages.inputsRetainEditingKeysButtonsUseNative[state.language]}</p>
        {stages.map((stage, i) => <p className="ffp-small" key={stage.full}>{i + 1}. {stage.full}</p>)}
        {!offline && <a className="ffp-button" download href={import.meta.env.BASE_URL + 'presentation-downloads/FigFox-Architecture-Demo.html'}>{ui.downloadOffline[state.language]}</a>}
        {!offline && <a className="ffp-button" href={import.meta.env.BASE_URL}>{ui.returnSite[state.language]}</a>}
        <button onClick={onReset}>{ui.reset[state.language]}</button>
      </>}
      {state.drawer === 'records' && <>
        <p className="ffp-small">{messages.theseCountsDescribeTheEntireRunNot[state.language]}</p>
        <dl className="ffp-records">
          <dt>{messages.plannedExecuted[state.language]}</dt><dd>{data.repair.plannedOperations ?? '—'} / {data.repair.executedOperations ?? '—'}</dd>
          <dt>{messages.recordedUnresolvedIssues[state.language]}</dt><dd>{data.repair.unresolvedCount ?? '—'}</dd>
          <dt>{messages.wholeFigureVisualAcceptance[state.language]}</dt><dd>{data.repair.visualQualityPass === null ? (messages.noConclusionRecorded[state.language]) : String(data.repair.visualQualityPass)}</dd>
        </dl>
        <p className="ffp-small">{messages.executionCompletionIsSeparateFromVisualAcceptance[state.language]}</p>
        <code>{data.repair.transactionId}</code>
        {data.repair.operations.map(op => <p key={op.targetId}><code>{op.op} → {op.targetId}</code></p>)}
        <p className="ffp-small">F_B_pool_arrow · confirmed</p>
        <p className="ffp-small">{messages.draftObjectCounts[state.language]}: {JSON.stringify(data.objectCounts)}</p>
        {Object.entries(data.modelLabels).map(([role, model]) => <p className="ffp-small" key={role}>{role}: {model ?? (messages.modelNameNotRecorded[state.language])}</p>)}
        <p className="ffp-small">SAM: {data.sam.mode}</p><p className="ffp-small">{data.repair.kind}</p>
        {data.issues.map(issue => <details key={issue.id}><summary>{issue.id} · {issue.title[state.language]}</summary><p className="ffp-small">{issue.recordedEvidence.source}</p><p className="ffp-small">{issue.recordedEvidence.draft}</p><code>{JSON.stringify({ source: issue.sourceRegion, draft: issue.draftRegion, final: issue.finalRegion })}</code></details>)}
        <details><summary>{messages.provenanceAndTransformations[state.language]}</summary>
          <code>{JSON.stringify(data.provenance, null, 2)}</code>{data.transformations.map(item => <p className="ffp-small" key={item}>{item}</p>)}
        </details>
      </>}
    </div>
  </aside>;
}
