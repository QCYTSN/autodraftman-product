import FigureViewport from './FigureViewport';
import type { PresentationCase } from '../types';
export default function EditableSvgPreview({ svg, data, selected, onSelect, label }: { svg: string; data: PresentationCase; selected: boolean; onSelect: () => void; label: string }) {
  return <div className="ffp-edit-preview"><FigureViewport dimensions={data.dimensions} svg={svg} label={label}
    camera={selected ? data.editTarget.focusCamera : undefined} targets={selected ? [data.editTarget.elementId] : []}
    selectedTarget={data.editTarget.elementId} editableTarget={data.editTarget.elementId} onSelectText={onSelect} /></div>;
}
