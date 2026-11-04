import { mainIds, type Metric, type Summary } from './data';

export function comparableMetrics(data: Summary) {
  return data.metrics.filter(metric => metric.id !== 'D09' && mainIds.every(id => {
    const value = data.summaries[id][metric.id].score;
    return value !== null && Number.isFinite(value);
  }));
}

// Competition rank uses original precision. Equal scores share a rank.
export function criterionRank(data: Summary, metric: Metric, method: string) {
  const value = data.summaries[method][metric.id].score!;
  return 1 + mainIds.filter(id => {
    const other = data.summaries[id][metric.id].score!;
    return metric.direction === 'lower' ? other < value - 1e-9 : other > value + 1e-9;
  }).length;
}

export function rankCounts(data: Summary, method: string) {
  const metrics = comparableMetrics(data);
  const ranks = metrics.map(metric => criterionRank(data, metric, method));
  return {
    first: ranks.filter(rank => rank === 1).length,
    second: ranks.filter(rank => rank === 2).length,
    topTwo: ranks.filter(rank => rank <= 2).length,
    other: ranks.filter(rank => rank > 2).length,
    total: metrics.length,
  };
}

// Descriptive mean: each current criterion contributes exactly 1 / 16.
// Average criterion scores, not pooled image judgments (eligible N varies).
export function meanScore(data: Summary, method: string) {
  const metrics = comparableMetrics(data);
  return metrics.reduce((sum, metric) => sum + data.summaries[method][metric.id].score!, 0) / metrics.length;
}

export function gapToBest(data: Summary, metric: Metric, method: string) {
  const best = bestResult(data, metric).score;
  const score = data.summaries[method][metric.id].score;
  return best === null || score === null ? Infinity : Math.abs(best - score);
}

export function bestResult(data: Summary, metric: Metric) {
  const valid = mainIds.filter(id => { const score = data.summaries[id][metric.id].score; return score !== null && Number.isFinite(score); });
  if (!valid.length) return { score: null, methods: [] as string[] };
  const values = valid.map(id => data.summaries[id][metric.id].score!);
  const score = metric.direction === 'lower' ? Math.min(...values) : Math.max(...values);
  return { score, methods: valid.filter(id => data.summaries[id][metric.id].score === score) };
}
