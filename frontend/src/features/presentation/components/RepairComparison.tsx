import { usePresentationMotion } from '../usePresentationMotion';
import { motion } from 'motion/react';
import FigureViewport from './FigureViewport';
import { expandedRegion, pairedCameras } from '../svg';
import { messages, ui } from '../copy';
import type { Language, PresentationCase, PresentationState } from '../types';
export default function RepairComparison({ data, media, language, view, onView }: {
  data: PresentationCase; media: Record<string, string>; language: Language; view: PresentationState['repairView']; onView: (v: PresentationState['repairView']) => void;
}) {
  const reduced = usePresentationMotion();
  const modes = ['pair', 'before', 'after'] as const;
  const titles = [ui[data.repair.kind === 'transaction-snapshot' ? 'beforeTransaction' : 'before'][language], ui[data.repair.kind === 'transaction-snapshot' ? 'transaction' : 'complete'][language]];
  const pair = view === 'pair';
  const camera = pair ? pairedCameras(data.repair.region, data.repair.region)[0] : expandedRegion(data.repair.region);
  return <>
    <div className="ffp-view-switch" aria-label={messages.repairViews[language]}>{modes.map((mode, i) => <button key={mode}
      aria-pressed={view === mode} onClick={() => onView(mode)}>{ui[(['pair', 'beforeOnly', 'afterOnly'] as const)[i]][language]}</button>)}</div>
    <div className={'ffp-repair-pair ' + (pair ? '' : 'is-single')}>
      {(pair ? [0, 1] : [view === 'before' ? 0 : 1]).map(i => <figure key={i}><figcaption>{titles[i]}</figcaption>
        <div className="ffp-repair-image">
          {i === 1 && <div className="ffp-repair-underlay"><FigureViewport dimensions={data.dimensions} svg={media[data.repair.beforeSvg]} label={titles[0]} camera={camera} /></div>}
          <motion.div className="ffp-repair-overlay" initial={{ opacity: reduced || i === 0 ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : .28 }}>
            <FigureViewport dimensions={data.dimensions} svg={media[i === 0 ? data.repair.beforeSvg : data.repair.afterSvg]} label={titles[i]} camera={camera} targets={['green_pooling_path_left', 'feature_dots_top']} selectedTarget="green_pooling_path_left" emphasizeTargets={i === 1} />
          </motion.div>
        </div>
      </figure>)}
    </div>
    <p className="ffp-repair-caption">{data.repair.kind === 'transaction-snapshot'
      ? (messages.thisTransaction2OperationsUnrelatedContentUnchanged[language])
      : (messages.theFullRepairIncludesThisIssueAnd[language])}</p>
  </>;
}
