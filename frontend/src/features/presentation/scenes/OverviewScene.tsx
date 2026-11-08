import { usePresentationMotion } from '../usePresentationMotion';
import { ArrowRight } from '@phosphor-icons/react';
import { motion } from 'motion/react';
import { messages, ui } from '../copy';
import type { SceneProps } from './shared';
export default function OverviewScene({ data, media, state }: SceneProps) {
  const reduced = usePresentationMotion();
  return <>
    <div className="ffp-overview-images">{[data.images.reference, data.images.draftPreview, data.images.finalPreview].map((file, i) =>
      <motion.figure key={file} initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : .22, delay: reduced ? 0 : i * .06 }}>
        <img src={media[file]} alt={ui[(['reference', 'draft', 'final'] as const)[i]][state.language]} />
        <figcaption>{ui[(['reference', 'draft', 'final'] as const)[i]][state.language]}</figcaption>
        {i < 2 && <ArrowRight className="ffp-overview-arrow" size={24} />}
      </motion.figure>)}</div>
    <p className="ffp-overview-summary">{messages.reconstructStructureInspectDifferencesThenRepairLocally[state.language]}</p>
  </>;
}
