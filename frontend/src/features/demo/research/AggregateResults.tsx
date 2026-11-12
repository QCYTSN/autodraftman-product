import { useResearch } from './ResearchContext';
import { mainIds, number } from './data';

export function AggregateResults({ scope }: { scope: 'comparison' | 'ablation' }) {
  const { data, language } = useResearch();
  if (!data) return null;
  const zh = language === 'zh';
  const methods = scope === 'comparison' ? mainIds : ['A', 'B', 'C'];
  const labels = { fidelity: zh ? '保真度' : 'Fidelity', editability: zh ? '可编辑性' : 'Editability', overall: zh ? '总体均分' : 'Overall mean' };
  const names: Record<string, string> = { A: 'FigFox', B: zh ? '无 SAM3' : 'Without SAM3', C: zh ? '仅初稿' : 'Draft only' };
  return <details className="research-settings research-aggregate-results" data-scope={scope} data-demo-reveal="fade">
    <summary>{zh ? '保真度、可编辑性与总体均分' : 'Fidelity, editability & overall scores'}<span>{zh ? '论文汇总 · 95% 置信区间' : 'Paper results · 95% confidence intervals'}</span></summary>
    <div className="research-table-scroll"><table className="research-table">
      <thead><tr><th>{zh ? '维度' : 'Measure'}</th>{methods.map(id => <th key={id}>{names[id] ?? data.methods.find(method => method.id === id)!.name}</th>)}</tr></thead>
      <tbody>{(['fidelity', 'editability', 'overall'] as const).map(key => <tr key={key} data-measure={key}><th>{labels[key]}</th>{methods.map(id => {
        const value = data.aggregates[scope][key][id];
        return <td key={id} data-method={id}><b>{number(value.mean, 2)}</b><br /><small>95% CI [{number(value.ci95[0], 2)}, {number(value.ci95[1], 2)}]<br />N={value.sampleN}</small></td>;
      })}</tr>)}</tbody>
    </table></div>
    <p className="research-caption">{zh ? '每图先对适用指标取均分，再对有效图取均值。四方法与消融分别统计。' : 'Valid criteria are averaged within each figure, then across valid figures. Comparison and ablation use separate sample sets.'}</p>
  </details>;
}
