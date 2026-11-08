import { usePresentationMotion } from '../usePresentationMotion';
import { motion } from 'motion/react';
import FigureViewport from './FigureViewport';
import type { Language, PresentationCase } from '../types';
import { ui } from '../copy';
export default function AssetInspector({ data, media, selected, language, onSelect }: {
  data: PresentationCase; media: Record<string, string>; selected: string | null; language: Language; onSelect: (id: string) => void;
}) {
  const reduced = usePresentationMotion();
  const index = Math.max(0, data.sam.assets.findIndex(a => a.id === selected));
  const asset = data.sam.assets[index];
  const [l, t, r, b] = asset.sourceRegion.box;
  // Same contain transform as the 760×420 reference viewport.
  const scale = Math.min(760 / data.dimensions.width, 420 / data.dimensions.height), ox = (760 - data.dimensions.width * scale) / 2, oy = (420 - data.dimensions.height * scale) / 2;
  return <>
    <span className="ffp-source-label ffp-asset-mode">{ui[data.sam.mode === 'recorded' ? 'sam' : 'illustrative'][language]}</span>
    <div className="ffp-asset-source">
      <FigureViewport dimensions={data.dimensions} image={media[data.images.reference]} label={ui.reference[language]} continuityId="ffp-reference" regions={data.sam.assets.map(a => ({ id: a.id, region: a.sourceRegion, maskSvg: a.maskSvg }))}
        selectedRegion={selected} regionColor="#A74439" />
    </div>
    <svg className="ffp-asset-leader" width="1120" height="600" aria-hidden="true">
      <motion.path key={selected} initial={{ opacity: reduced ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ duration: reduced ? 0 : .24 }}
        d={'M' + (32 + ox + r * scale) + ' ' + (116 + oy + (t + b) / 2 * scale) + ' L808 ' + (116 + oy + (t + b) / 2 * scale) + ' L808 ' + (178 + index * 140) + ' L824 ' + (178 + index * 140)}
        fill="none" stroke="#A74439" strokeWidth="1.5" />
    </svg>
    <div className="ffp-assets">{data.sam.assets.map((a, i) => <motion.button key={a.id} className={selected === a.id ? 'is-active' : ''} aria-pressed={selected === a.id}
      initial={{ opacity: reduced ? 1 : 0, y: reduced ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduced ? 0 : .24, delay: reduced ? 0 : i * .07 }}
      onClick={() => onSelect(a.id)} data-asset={a.id}>
      <img src={media[a.image]} alt={a.name[language]} /><span><small>0{i + 1}</small><strong>{a.name[language]}</strong></span>
    </motion.button>)}</div>
  </>;
}
