import { usePresentationMotion } from '../usePresentationMotion';
import { motion } from 'motion/react';
import AssetInspector from '../components/AssetInspector';
import FigureViewport from '../components/FigureViewport';
import { messages, ui } from '../copy';
import type { SceneProps } from './shared';
export default function DraftScene(props: SceneProps) {
  const { data, media, state, patch } = props;
  const reduced = usePresentationMotion();
  if (state.cueIndex === 1) return <AssetInspector data={data} media={media} language={state.language} selected={state.selectedAssetId} onSelect={id => patch({ selectedAssetId: id })} />;
  return <>
    <div className="ffp-draft-pair">
      <figure><figcaption>{ui.reference[state.language]}</figcaption><FigureViewport dimensions={data.dimensions} image={media[data.images.reference]} label={ui.reference[state.language]} continuityId="ffp-reference" /></figure>
      <motion.figure initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : .28, delay: reduced ? 0 : .24 }}>
        <figcaption>{ui.draft[state.language]}</figcaption><FigureViewport dimensions={data.dimensions} svg={media[data.svg.draft]} label={ui.draft[state.language]} /></motion.figure>
    </div>
    <div className="ffp-object-types">{[messages.textObjects[state.language], messages.graphicObjects[state.language], messages.connections[state.language]].map(label => <span key={label}>{label}</span>)}</div>
    <span className="ffp-asset-participation">{messages.visualAssetsSupportReconstruction[state.language]}</span>
  </>;
}
