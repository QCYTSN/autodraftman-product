import type { Metric, Score } from './data';

export const scoreText = (value: number | null | undefined) => value == null ? '—' : value.toFixed(1);
export const differenceText = (value: number) => value !== 0 && Math.abs(value) < .1 ? '<0.1' : Math.abs(value).toFixed(1);
export function ablationText(metric: Metric, scores: { A: number | null; B: number | null; C: number | null }, zh: boolean) {
  const name = zh ? metric.name : metric.en;
  const { A, B, C } = scores;
  if (A == null || C == null) return zh ? `${name}：暂无完整的 A/C 对照评分。` : `${name}: the A/C comparison is unavailable.`;
  if (A === B && A === C) return zh ? `三种配置在「${name}」上均为 ${scoreText(A)} 分。` : `All three configurations score ${scoreText(A)} on ${name.toLowerCase()}.`;
  if (A === C) return zh ? `检查修复前后，「${name}」均为 ${scoreText(A)} 分。` : `${name} stays at ${scoreText(A)} before and after inspection and repair.`;
  const improved = metric.direction === 'lower' ? A < C : A > C;
  const verb = A > C ? (zh ? '提高' : 'rises') : (zh ? '下降' : 'falls');
  return zh ? `「${name}」从仅初稿的 ${scoreText(C)} 分${verb}至完整 FigFox 的 ${scoreText(A)} 分，${improved ? '改善' : '降低'} ${differenceText(A - C)} 分。`
    : `${name} ${verb} from ${scoreText(C)} for the draft to ${scoreText(A)} for full FigFox, ${improved ? 'an improvement' : 'a decline'} of ${differenceText(A - C)} points.`;
}

export function scoreComparison(value: number, reference: number, method: string, zh: boolean) {
  const difference = value - reference;
  return difference === 0 ? (zh ? '两种方法该项同分' : 'Both methods have the same score')
    : zh ? `FigFox 比 ${method} ${difference > 0 ? '高' : '低'} ${differenceText(difference)} 分`
    : `FigFox scores ${differenceText(difference)} points ${difference > 0 ? 'above' : 'below'} ${method}`;
}

export function costComparison(value: number, reference: number, zh: boolean) {
  if (value === reference) return zh ? '记录的每图费用相同' : 'Same recorded cost per figure';
  if (reference === 0) return zh ? '对照费用为零，比例不适用' : 'Percentage unavailable for a zero-cost reference';
  const change = (value - reference) / reference * 100;
  return zh ? `记录的每图费用${change > 0 ? '高' : '低'} ${differenceText(change)}%`
    : `${differenceText(change)}% ${change > 0 ? 'higher' : 'lower'} recorded cost per figure`;
}

export function judgmentText(score: Score, zh: boolean) {
  const total = Object.values(score.counts).reduce((sum, count) => sum + (count ?? 0), 0);
  if (total === 1) {
    if (score.counts.pass === 1) return zh ? '通过' : 'Pass';
    if (score.counts.fail === 1) return zh ? '未通过' : 'Fail';
    if (score.counts.NA === 1) return zh ? '本项不适用' : 'Not applicable';
    if (score.counts.unknown === 1) return zh ? '待核实' : 'Needs review';
  }
  return `${scoreText(score.score)} / 100${total > 1 ? (zh ? ` · ${total} 次判断` : ` · ${total} judgments`) : ''}`;
}

export function groupLabel(group: string, groupEn: string, zh: boolean) {
  return group === '条件启用项' ? (zh ? '图像与数据图表' : 'Images & data charts') : zh ? group : groupEn;
}
