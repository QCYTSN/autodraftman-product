import { demoCases, type DemoCase, type DemoLanguage } from "./cases";

type Localized = Record<DemoLanguage, string>;

// Curated input figures from the existing dataset, included in the showcase;
// their presence does not imply a completed benchmark or a quality score.
export const evaluationSamples: DemoCase[] = [
  ...demoCases,
  {
    id: "wages", name: { zh: "最低工资与就业", en: "Minimum wages and employment" },
    category: { zh: "研究综述图", en: "Research overview" }, width: 1448, height: 1086,
  },
  {
    id: "privacy", name: { zh: "隐私稀疏化模型", en: "Privacy sparsification" },
    category: { zh: "模型架构图", en: "Model architecture" }, width: 3894, height: 1315,
  },
  {
    id: "vgg", name: { zh: "VGG 网络", en: "VGG network" },
    category: { zh: "网络与训练流程", en: "Network and training" }, width: 1536, height: 1024,
  },
];

export const evaluationCriteria: { title: Localized; body: Localized }[] = [
  {
    title: { zh: "视觉一致性", en: "Visual fidelity" },
    body: { zh: "对照原图，检查文字、形状、配色与相对位置。", en: "Compare text, shapes, colors, and relative positions with the original." },
  },
  {
    title: { zh: "结构正确性", en: "Structural correctness" },
    body: { zh: "检查元素是否遗漏，以及连接、方向和包含关系。", en: "Check for missing elements, incorrect connections, directions, and containment." },
  },
  {
    title: { zh: "可编辑性", en: "Editability" },
    body: { zh: "实际修改文字、移动对象，检查编辑与导出是否正常。", en: "Edit text and move objects, then check the edited figure and its export." },
  },
];

export const plannedResults: {
  id: string;
  title: Localized;
  body: Localized;
  figure: Localized;
  caption: Localized;
}[] = [
  {
    id: "demo-benchmarks",
    title: { zh: "重建质量与方法比较", en: "Reconstruction quality across methods" },
    body: {
      zh: "在相同样本与设置下，比较各方法的视觉一致性、结构正确性和可编辑性。",
      en: "Compare visual fidelity, structural correctness, and editability on the same samples under consistent settings.",
    },
    figure: { zh: "主表 · 方法比较", en: "Main table · Method comparison" },
    caption: {
      zh: "统一评分后补充结果，并注明各方法的模型版本与运行设置。",
      en: "Results will be added after consistent scoring, with model versions and run settings recorded for each method.",
    },
  },
  {
    id: "demo-ablations",
    title: { zh: "关键环节的消融实验", en: "Ablation of key stages" },
    body: {
      zh: "分别移除关键环节，观察重建质量与修复结果的变化。",
      en: "Remove individual stages to examine their effect on reconstruction and repair.",
    },
    figure: { zh: "对照图 · 模块消融", en: "Comparison · Stage ablations" },
    caption: {
      zh: "拟比较关系引导、局部对照与回执复查；具体方案及结果待补充。",
      en: "Planned comparisons cover relational guidance, local crop pairs, and receipt-based follow-up. The protocol and results are pending.",
    },
  },
  {
    id: "demo-efficiency",
    title: { zh: "质量、费用与耗时", en: "Quality, cost, and runtime" },
    body: {
      zh: "结合重建质量，比较不同运行方案的费用与完成时间。",
      en: "Compare the quality of different run configurations alongside their cost and completion time.",
    },
    figure: { zh: "散点图 · 质量与资源消耗", en: "Scatter plot · Quality and resource use" },
    caption: {
      zh: "费用计入生成、检查与重试；耗时按统一起止点记录，实验完成后补充。",
      en: "Cost will include generation, review, and retries. Runtime will use consistent start and end points. Results will follow the experiments.",
    },
  },
];
