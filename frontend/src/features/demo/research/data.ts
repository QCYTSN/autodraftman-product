import type { DemoLanguage } from '../cases';
export type Method = { id: string; name: string; color: string; variant: string; model: string };
export type Metric = { id: string; name: string; en: string; group: string; groupEn: string; definition: string; definitionEn: string; unit: string; evidence: string; boundary: string; na: string; direction: 'higher' | 'lower' };
export type Counts = { pass?: number; partial?: number; fail?: number; unknown?: number; NA?: number };
export type Score = { score: number | null; counts: Counts; currentScore?: number; judgmentN?: number; sampleN?: number; version?: string };
export type Artifact = { status: string; image?: string; svg?: string; width?: number; height?: number; sourceHash?: string; svgHash?: string; runId?: string; conditionId?: string; evaluationVersion?: string; previewOrigin?: string };
export type SampleIndex = { id: string; category: string; sourceUrl: string };
export type Sample = SampleIndex & { resources: Record<string,{cost:number;seconds:number;tokens:number}>; source: Artifact; artifacts: Record<string, Artifact>; scores: Record<string, Record<string, Score>>; eligible: Record<'comparison'|'ablation',string[]> };
export type Aggregate = { mean: number; ci95: [number, number]; sampleN: number };
export type Summary = { methods: Method[]; metrics: Metric[]; summaries: Record<string, Record<string, Score>>; ablationSummaries: Record<string, Record<string, Score>>; aggregates: Record<'comparison' | 'ablation', Record<'fidelity' | 'editability' | 'overall', Record<string, Aggregate>>>; examples: Record<'comparison'|'ablation',Record<string,string>>; resources: Record<string, { cost: number; minutes: number; tokens: number; n: number; comparable: boolean }>; provenance: { snapshot: string; version: string; detailSnapshot: string; summaryOnlyMetrics: string[]; cohortN: number; judgments: number; coverage: Record<string, number> } };
export type Selection = { sample: string; metric: string; methods?: string[]; condition?: string; view?: 'overview' | 'pair'; scope?: 'comparison' | 'ablation' };
export type ObservationRegion = { bounds: [number, number, number, number]; objectIds?: string[] };
export type Observation = { sample: string; title: { zh: string; en: string }; note: { zh: string; en: string }; methods: string[]; regions: Record<string, ObservationRegion>; evidence: string };
export type Observations = Record<'comparison' | 'ablation', Record<string, Observation>>;
// Keep a newly deployed schema and previews separate from browsers' old cached files.
export const asset = (path: string) => import.meta.env.BASE_URL + 'assets/research/' + path + '?v=20261110-full80';
type Cached = { promise: Promise<unknown>; pending: boolean; signal?: AbortSignal };
const cache = new Map<string, Cached>();
export function load<T>(file: string, signal?: AbortSignal): Promise<T> {
  const existing = cache.get(file);
  if (existing && !(existing.pending && existing.signal?.aborted)) return existing.promise as Promise<T>;
  const entry: Cached = { pending: true, signal, promise: Promise.resolve() };
  entry.promise = fetch(asset(file), { signal }).then(r => {
    if (!r.ok) throw new Error('Data unavailable');
    return r.json();
  }).then(value => { entry.pending = false; return value; }).catch(error => {
    if (cache.get(file) === entry) cache.delete(file);
    throw error;
  });
  cache.set(file, entry);
  return entry.promise as Promise<T>;
}
export const label = (m: Metric, language: DemoLanguage) => language === 'zh' ? m.name : m.en;
export const number = (v: number | null | undefined, digits = 1) => v == null ? '—' : v.toFixed(digits);
export const mainIds = ['A', 'DrawAI', 'AFE', 'Crafter'];
export function category(id: string, zh: boolean) { return ({ C1_low: zh ? 'C1 · 低拥挤度' : 'C1 · Low clutter', C2_medium_low: zh ? 'C2 · 中低拥挤度' : 'C2 · Medium-low clutter', C3_medium_high: zh ? 'C3 · 中高拥挤度' : 'C3 · Medium-high clutter', C4_high: zh ? 'C4 · 高拥挤度' : 'C4 · High clutter' } as Record<string,string>)[id] ?? id; }

// Display identity only: keep the exported experiment values untouched.
export const methodColor = (id: string) => ({ A: '#b84c15', DrawAI: '#007d88', AFE: '#93607c', Crafter: '#3564b1', B: '#976235', C: '#657384' } as Record<string, string>)[id] ?? '#697180';
