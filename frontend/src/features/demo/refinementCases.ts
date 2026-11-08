import { demoCases, type DemoCase, type DemoLanguage } from "./cases";

type Localized = Record<DemoLanguage, string>;

export type RefinementCase = {
  id: string;
  figure: DemoCase;
  category: Localized;
  region: Localized;
  bounds: readonly [number, number, number, number];
  draft: Localized;
  repaired: Localized;
  elementId: string;
};

// Regions refer to the same source coordinates in both pipeline outputs.
// These observations describe existing artifacts, not a quality evaluation.
export const refinementCases: RefinementCase[] = [
  {
    id: "formula",
    figure: demoCases[1],
    category: { zh: "公式排版", en: "Math typesetting" },
    region: { zh: "局部 · 加噪模块", en: "Detail · Add Noise module" },
    bounds: [430, 141, 160, 150],
    draft: {
      zh: "根号缺少横线，α 的上划线未保留。",
      en: "The radicals have no overbars, and the bar over α is missing.",
    },
    repaired: {
      zh: "公式重新排版，补出根号横线与 α 的上划线，并调整下标位置。",
      en: "The formula is re-typeset with radical overbars, barred α, and mathematical subscripts.",
    },
    elementId: "plus_node_47",
  },
  {
    id: "connections",
    figure: demoCases[0],
    category: { zh: "连接关系", en: "Connections" },
    region: { zh: "局部 · 实验流程的连接路径", en: "Detail · Experiment branches" },
    bounds: [286, 105, 635, 338],
    draft: {
      zh: "上下两条路径之间缺少竖直连接，下方路径还多了一段短折线。",
      en: "The vertical join between the two routes is missing; the lower route also has a short kink.",
    },
    repaired: {
      zh: "补上两条路径间的竖直连接，并将下方路径调整为水平箭头。",
      en: "A vertical join is added, and the lower route becomes a horizontal arrow.",
    },
    elementId: "arr_exp1_join_vertical",
  },
  {
    id: "layout",
    figure: demoCases[2],
    category: { zh: "文字布局", en: "Text layout" },
    region: { zh: "局部 · 多头自注意力模块", en: "Detail · Multi-head self-attention" },
    bounds: [658, 237, 483, 306],
    draft: {
      zh: "注意力模块的标题超出浅紫色标题条，向左跨过模块边框。",
      en: "The attention title extends beyond its lavender bar and crosses the module’s left border.",
    },
    repaired: {
      zh: "调整标题字号与位置，加宽标题条，使文字落在条内。",
      en: "The title is resized and repositioned, and its bar is widened to contain the text.",
    },
    elementId: "plus_node_103",
  },
];
