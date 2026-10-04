import type { DemoLanguage } from "./cases";

type Copy = Record<DemoLanguage, string>;
export type MechanismKind = "perception" | "relations" | "crops" | "representation" | "execution";
export type ContentLayer = "text" | "vector" | "image" | "formula";
export const relationBounds = [530, 50, 410, 368] as const;
export const representationBounds = [266, 50, 668, 389] as const;
export type Mechanism = {
  kind: MechanismKind;
  name: Copy;
  module: string;
  title: Copy;
  description: Copy;
  facts: { label: Copy; value: Copy }[];
  stage: Copy;
  elementId: string;
};

// These correspond to the five support modules in the supplied architecture
// figure, rather than generic SVG features. See the source/evidence mapping in
// docs/research/figfox-mechanisms-2026-10-03.md.
export const mechanisms: Mechanism[] = [
  {
    kind: "perception", name: { zh: "视觉线索", en: "Visual cues" }, module: "SAM",
    title: { zh: "保留原图中的图像细节", en: "Preserving source image details" },
    description: {
      zh: "SAM 提供图块、图标与箭头候选。结合整张原图确认对应关系后，可信裁片可以替换初稿中的近似图像。",
      en: "SAM proposes image, icon, and arrow regions. After checking their identity against the full source, reliable crops can replace approximations in the draft.",
    },
    facts: [
      { label: { zh: "提供", en: "Provides" }, value: { zh: "源图裁片与原始位置", en: "Source crops and their original positions" } },
      { label: { zh: "核对", en: "Checks" }, value: { zh: "候选是否对应图中真实对象", en: "Whether each candidate matches a source object" } },
    ],
    stage: { zh: "参与初稿重建", en: "Supports draft reconstruction" }, elementId: "exp1_restudy_panel",
  },
  {
    kind: "relations", name: { zh: "关系引导", en: "Relations" }, module: "Relational guidance",
    title: { zh: "根据元素关系重建布局", en: "Reconstruction from element relationships" },
    description: {
      zh: "以框架和对象作为参照，描述上下顺序、包含与相邻关系。重建时保留这些关系，让文字、图形与连接线共同组成布局。",
      en: "Use frames and objects as references for order, containment, and neighboring elements. These relationships guide the placement of text, shapes, and connections.",
    },
    facts: [
      { label: { zh: "参照", en: "References" }, value: { zh: "锚点对象与邻近元素", en: "Anchor objects and their neighbors" } },
      { label: { zh: "示例", en: "Example" }, value: { zh: "上下两个条件，位于同一框架内", en: "Two vertically stacked conditions in one frame" } },
    ],
    stage: { zh: "引导初稿的相对布局", en: "Guides the draft’s relative layout" }, elementId: "exp1_restudy_panel",
  },
  {
    kind: "crops", name: { zh: "局部对照", en: "Local pairs" }, module: "½ Crop pairs",
    title: { zh: "对照原图与初稿的局部差异", en: "Local comparison of the source and draft" },
    description: {
      zh: "围绕初稿中的基础框，向左右各扩展半个框宽、上下各扩展半个框高，再取原图与初稿的同一区域。邻近元素也进入对照，帮助定位差异。",
      en: "Expand each draft frame by half its width on both sides and half its height above and below, clipped to the canvas. Pair the same region in the source and draft to inspect differences in context.",
    },
    facts: [
      { label: { zh: "配对", en: "Pairs" }, value: { zh: "同一裁切范围、相同显示尺度", en: "Identical crop boundaries and display scale" } },
      { label: { zh: "保留", en: "Retains" }, value: { zh: "目标框与周围的邻接信息", en: "The target frame and neighboring context" } },
    ],
    stage: { zh: "用于错误检测与修复计划", en: "Supports error detection and repair planning" }, elementId: "exp1_test_panel",
  },
  {
    kind: "representation", name: { zh: "混合表达", en: "SVG+" }, module: "SVG+",
    title: { zh: "矢量元素与图像的混合表示", en: "Vector elements and image crops in one SVG" },
    description: {
      zh: "文字、形状与连接线分别构建；公式由排版工具生成矢量组合，复杂图像可以保留为裁片。它们在同一张 SVG 中共同组成科研图。",
      en: "Construct text, shapes, and connections separately. Typeset formulas as vector groups and retain detailed images as crops. These representations coexist in one SVG figure.",
    },
    facts: [
      { label: { zh: "结构", en: "Structure" }, value: { zh: "独立元素与组合对象", en: "Separate elements and grouped objects" } },
      { label: { zh: "保留", en: "Preserves" }, value: { zh: "几何结构、公式排版与图像细节", en: "Geometry, formula typesetting, and image details" } },
    ],
    stage: { zh: "贯穿重建与后续修复", en: "Used throughout reconstruction and repair" }, elementId: "plus_node_43",
  },
  {
    kind: "execution", name: { zh: "测量与修复", en: "Local repair" }, module: "Transform Position · Text",
    title: { zh: "根据元素边界调整位置和尺寸", en: "Position and size from measured bounds" },
    description: {
      zh: "此例初稿的说明文字越出了容器。修复程序测量文字边界，将它适配到目标范围，再检查容纳关系与邻近间距。执行回执保留检查结果，供后续复查。",
      en: "This draft’s caption extends beyond its container. The repair measures its bounds, fits it into the target region, then checks containment and neighboring spacing. A receipt records the outcome for further review.",
    },
    facts: [
      { label: { zh: "对象", en: "Target" }, value: { zh: "越界文字及其容器", en: "The overflowing caption and its container" } },
      { label: { zh: "约束", en: "Constraints" }, value: { zh: "目标范围、容纳关系、邻近间距", en: "Target bounds, containment, and neighboring spacing" } },
    ],
    stage: { zh: "用于执行与复查", en: "Supports execution and review" }, elementId: "plus_node_46",
  },
];

export type RepairReceipt = {
  status: string;
  geometryStatus: string;
  visualAcceptance: string;
  visualPassed: boolean;
  checks: { predicate: string; status: string }[];
};

type EvidenceFile = "baseline.svg" | "crop-original.png" | "crop-draft.png" | "sam-reading.png" | "sam-restudy.png" | "sam-recall.png" | "repair-receipt.json";
export const mechanismAsset = (file: EvidenceFile) =>
  import.meta.env.BASE_URL + "__demo-assets/study/" + file;
