import { usePresentationMotion } from '../usePresentationMotion';
import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { cleanSvg, instanceSvg, targetBox } from '../svg';
import type { Box, Region, PresentationCase } from '../types';
import { motionTokens } from '../state';

type Props = {
  dimensions: PresentationCase['dimensions'];
  image?: string; svg?: string; label: string; camera?: Box; targets?: string[]; selectedTarget?: string;
  regions?: { id: string; region: Region; label?: string; labelPosition?: [number, number]; maskSvg?: string; leaderSide?: 'top' | 'right' }[];
  selectedRegion?: string | null; onRegion?: (id: string) => void; regionColor?: string;
  endpoint?: [number, number]; endpointLabel?: string; editableTarget?: string; onSelectText?: () => void;
  duration?: number; className?: string; focusOnMount?: boolean; animateRegions?: boolean; emphasizeTargets?: boolean; continuityId?: string;
};
export default function FigureViewport({ dimensions, image, svg, label, camera = [0, 0, dimensions.width, dimensions.height], targets = [], selectedTarget,
  regions = [], selectedRegion, onRegion, regionColor, endpoint, endpointLabel, editableTarget, onSelectText, duration = .52, className = '', focusOnMount = false, animateRegions = false, emphasizeTargets = false, continuityId }: Props) {
  const prefix = 'ffp-' + useId().replace(/:/g, '');
  const instance = useMemo(() => svg ? instanceSvg(svg, prefix) : null, [svg, prefix]);
  const maskKey = JSON.stringify(regions.map(r => [r.id, r.maskSvg]));
  const masks = useMemo(() => Object.fromEntries(regions.filter(r => r.maskSvg).map(r => {
    const safe = instanceSvg(cleanSvg(r.maskSvg!), prefix + '-mask-' + r.id);
    return [r.id, safe.html];
  })), [maskKey, prefix]);
  const documentRoot = useRef<SVGGElement>(null);
  const [boxes, setBoxes] = useState<{ id: string; box: Box }[]>([]);
  const reduced = usePresentationMotion();
  const targetKey = targets.join('|');
  useLayoutEffect(() => {
    const root = documentRoot.current;
    if (!root || !instance) { setBoxes([]); return; }
    setBoxes(targets.flatMap(id => {
      const node = root.querySelector('[id="' + instance.ids.get(id) + '"]') as SVGGraphicsElement | null;
      return node ? [{ id, box: targetBox(node, root) }] : [];
    }));
    if (editableTarget) {
      const node = root.querySelector('[id="' + instance.ids.get(editableTarget) + '"]');
      node?.setAttribute('tabindex', '0');
      node?.setAttribute('role', 'button');
      node?.setAttribute('aria-label', label);
      node?.setAttribute('class', (node.getAttribute('class') ?? '') + ' ffp-editable-text');
    }
  }, [instance, targetKey, editableTarget, label]); // Targets are stable semantic IDs.
  const selectText = (target: EventTarget | null) => {
    if (target instanceof Element && target.closest('[data-original-id="' + editableTarget + '"]')) onSelectText?.();
  };
  return <motion.div className={'ffp-figure ' + className} layoutId={continuityId} transition={{ layout: { duration: reduced ? 0 : .48, ease: motionTokens.ease } }}>
    <motion.svg className="ffp-document-viewport" viewBox={camera.join(' ')} initial={focusOnMount && !reduced ? { viewBox: dimensions.viewBox.join(' ') } : false}
      animate={{ viewBox: camera.join(' ') }} transition={{ duration: reduced ? 0 : duration, ease: motionTokens.ease }}
      role="group" aria-label={label} data-camera={camera.join(' ')}
      onClick={event => selectText(event.target)} onKeyDown={event => {
        if (['Enter', ' '].includes(event.key) && (event.target as Element).getAttribute('data-original-id') === editableTarget) {
          event.preventDefault(); event.stopPropagation(); selectText(event.target);
        }
      }}>
      {image && <image href={image} x="0" y="0" width={dimensions.width} height={dimensions.height} />}
      {instance && <g id={prefix + '-document'} ref={documentRoot} dangerouslySetInnerHTML={{ __html: instance.html }} />}
      <g className="ffp-observation-layer">
        {regions.map(({ id, region: { box: [l, t, r, b] }, label: badge, labelPosition, maskSvg, leaderSide }, index) => {
          const active = id === selectedRegion;
          const [x, y] = labelPosition ?? [r + 10, t - 12];
          return <motion.g key={id} className={'ffp-region ' + (active ? 'is-active' : '')} style={{ color: regionColor }} data-region={id}
            initial={animateRegions && !reduced ? { opacity: 0 } : false} animate={{ opacity: active ? 1 : regionColor ? .45 : .65 }}
            transition={{ duration: reduced ? 0 : animateRegions ? .18 : .24, delay: animateRegions && !reduced ? index * .06 : 0 }}>
            <rect x={l} y={t} width={r - l} height={b - t} fill={active ? 'currentColor' : 'none'} fillOpacity=".05" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5} vectorEffect="non-scaling-stroke" />
            {maskSvg && <g id={prefix + '-mask-' + id + '-document'} dangerouslySetInnerHTML={{ __html: masks[id] }} />}
            {badge && <g role="button" tabIndex={0} aria-label={badge} aria-pressed={active} onClick={() => onRegion?.(id)}
              onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); onRegion?.(id); } }}>
              <rect x={x - 6} y={y - 4} width="64" height="44" fill="transparent" />
              <path d={leaderSide === 'right'
                ? 'M' + r + ' ' + ((t + b) / 2) + ' H' + (r + 24) + ' V' + (y + 18) + ' H' + (x + 52)
                : 'M' + (l + (r - l) / 2) + ' ' + t + ' L' + (x + 24) + ' ' + (y + 36)} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              <rect x={x} y={y} width="52" height="36" rx="6" fill={active ? '#A75A10' : '#FFF3E4'} stroke="currentColor" vectorEffect="non-scaling-stroke" />
              <text x={x + 26} y={y + 25} textAnchor="middle" fill={active ? 'white' : '#A75A10'} fontSize="22" fontFamily="Arial">{badge}</text>
            </g>}
          </motion.g>;
        })}
        {boxes.map(({ id, box: [x, y, w, h] }) => <motion.rect key={id} data-target={id} className="ffp-object-highlight"
          initial={false} animate={emphasizeTargets && !reduced ? { opacity: [1, .35, 1] } : { opacity: 1 }} transition={{ duration: reduced ? 0 : .65 }}
          x={x - 3} y={y - 3} width={w + 6} height={h + 6} rx="2" stroke="#6D46D9"
          strokeWidth={id === selectedTarget ? 2.5 : 1.5} strokeDasharray={id === selectedTarget ? undefined : '4 3'}
          fill="#6D46D9" fillOpacity={id === selectedTarget ? '.06' : '.02'} vectorEffect="non-scaling-stroke" />)}
        {endpoint && <g className="ffp-endpoint" style={{ pointerEvents: 'none' }}>
          <path d={'M' + (endpoint[0] + 12) + ' ' + (endpoint[1] - 14) + ' L' + endpoint[0] + ' ' + endpoint[1]} stroke="#A75A10" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <circle cx={endpoint[0]} cy={endpoint[1]} r="2.8" fill="none" stroke="#A75A10" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <text x={endpoint[0] + 13} y={endpoint[1] - 15} fontSize="8" fill="#A75A10" fontFamily="Arial">{endpointLabel}</text>
        </g>}
      </g>
    </motion.svg>
  </motion.div>;
}
