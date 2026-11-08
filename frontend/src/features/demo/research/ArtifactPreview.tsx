import { useState } from 'react';
import { asset, type Artifact, type ObservationRegion } from './data';

export function ArtifactPreview({ artifact, name, region, crop, zh }: { artifact: Artifact; name: string; region?: ObservationRegion; crop?: boolean; zh: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!artifact.image || failed) return <div className="research-unavailable">{artifact.status === 'damaged' ? (zh ? '原始 SVG 损坏' : 'Original SVG is damaged') : (zh ? '此产物暂无预览' : 'Preview unavailable')}</div>;
  const width = artifact.width || 1000, height = artifact.height || 700;
  const box = region?.bounds.map((value, index) => value * (index % 2 ? height : width));
  return <svg className="research-preview" viewBox={(crop && box ? box : [0, 0, width, height]).join(' ')} role="img" aria-label={name} data-cropped={crop && box ? true : undefined}>
    <image href={asset(artifact.image)} width={width} height={height} onError={() => setFailed(true)} />
    {box && !crop && <rect className="research-observation-box" x={box[0]} y={box[1]} width={box[2]} height={box[3]} vectorEffect="non-scaling-stroke" />}
  </svg>;
}
