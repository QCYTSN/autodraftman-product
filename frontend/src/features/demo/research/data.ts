import type { DemoLanguage } from '../cases';
export type Method = { id: string; name: string; color: string; variant: string; model: string };
export type Metric = { id: string; name: string; en: string; group: string; groupEn: string; definition: string; definitionEn: string; unit: string; evidence: string; boundary: string; na: string; direction: 'higher' | 'lower' };
export type Counts = { pass?: number; fail?: number; unknown?: number; NA?: number };
export type Score = { score: number | null; counts: Counts; currentScore?: number; judgmentN?: number; sampleN?: number; version?: string };
export type Artifact = { status: string; image?: string; svg?: string; width?: number; height?: number; sourceHash?: string; svgHash?: string; runId?: string; conditionId?: string; evaluationVersion?: string };
export type Sample = { resources: Record<string,{cost:number;seconds:number;tokens:number}>; id: string; category: string; sourceUrl: string; source: Artifact; artifacts: Record<string, Artifact>; scores: Record<string, Record<string, Score>> };
export type Summary = { methods: Method[]; metrics: Metric[]; summaries: Record<string, Record<string, Score>>; resources: Record<string, { cost: number; minutes: number; tokens: number; n: number; comparable: boolean }>; provenance: { snapshot: string; version: string; cohortN: number; judgments: number; coverage: Record<string, number> } };
export type Selection = { sample: string; metric: string; methods?: string[]; condition?: string };
export const asset = (path: string) => import.meta.env.BASE_URL + 'assets/research/' + path;
const cache = new Map<string, Promise<unknown>>();
export function load<T>(file: string): Promise<T> {
  if (!cache.has(file)) cache.set(file, fetch(asset(file)).then(r => { if (!r.ok) throw new Error('Data unavailable'); return r.json(); }).catch(e => { cache.delete(file); throw e; }));
  return cache.get(file) as Promise<T>;
}
export const label = (m: Metric, language: DemoLanguage) => language === 'zh' ? m.name : m.en;
export const number = (v: number | null | undefined, digits = 1) => v == null ? '—' : v.toFixed(digits);
export const mainIds = ['A', 'DrawAI', 'AFE', 'Crafter'];
export function category(id: string, zh: boolean) { return ({ C1_low: zh ? 'C1 · 低拥挤度' : 'C1 · Low clutter', C2_medium_low: zh ? 'C2 · 中低拥挤度' : 'C2 · Medium-low clutter', C3_medium_high: zh ? 'C3 · 中高拥挤度' : 'C3 · Medium-high clutter', C4_high: zh ? 'C4 · 高拥挤度' : 'C4 · High clutter' } as Record<string,string>)[id] ?? id; }
