import { Select } from '@base-ui/react/select';
import { CaretDown, Check } from '@phosphor-icons/react';
import type { DemoLanguage } from '../cases';
import { label as metricLabel, type Metric } from './data';
import './criterion-select.css';
import { groupLabel } from './display';

type Props = {
  metrics: Metric[];
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  ariaLabel: string;
  language: DemoLanguage;
  overview?: { value: string; label: string };
};

export function CriterionSelect({ metrics, value, onValueChange, label, ariaLabel, language, overview }: Props) {
  const zh = language === 'zh';
  const groups = [...new Set(metrics.map(metric => metric.group))];
  const items = [...(overview ? [overview] : []), ...metrics.map(metric => ({ value: metric.id, label: metricLabel(metric, language) }))];
  const option = (item: { value: string; label: string }) => <Select.Item className="research-criterion-option" key={item.value} value={item.value} label={item.label} data-value={item.value}>
    <Select.ItemText>{item.label}</Select.ItemText>
    <Select.ItemIndicator className="research-criterion-check"><Check size={15} weight="bold" aria-hidden="true" /></Select.ItemIndicator>
  </Select.Item>;

  return <div className="research-criterion-field">
    <span className="research-criterion-label">{label}</span>
    <Select.Root value={value} items={items} modal={false} onValueChange={next => { if (next !== null) onValueChange(next); }}>
      <Select.Trigger className="research-criterion-trigger" aria-label={ariaLabel}>
        <Select.Value className="research-criterion-value" />
        <Select.Icon className="research-criterion-icon"><CaretDown size={16} aria-hidden="true" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner className="research-criterion-positioner" sideOffset={10} align="start" collisionPadding={16} alignItemWithTrigger={false}>
          <Select.Popup className="research-criterion-popup" lang={zh ? 'zh-CN' : 'en'}>
            <Select.List className="research-criterion-list">
              {overview && <Select.Group className="research-criterion-group"><Select.GroupLabel className="research-criterion-group-label">{zh ? '综合表现' : 'Across all criteria'}</Select.GroupLabel>{option(overview)}</Select.Group>}
              {groups.map(group => <Select.Group key={group} className="research-criterion-group">
                <Select.GroupLabel className="research-criterion-group-label">{groupLabel(group, metrics.find(metric => metric.group === group)!.groupEn, zh)}</Select.GroupLabel>
                {metrics.filter(metric => metric.group === group).map(metric => option({ value: metric.id, label: metricLabel(metric, language) }))}
              </Select.Group>)}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  </div>;
}
