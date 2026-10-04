export type DemoLanguage = "zh" | "en";
export type DemoCase = {
  id: string;
  name: Record<DemoLanguage, string>;
  category: Record<DemoLanguage, string>;
  width: number;
  height: number;
};

export const demoCases: DemoCase[] = [
  {
    id: "study",
    name: { zh: "学习与记忆实验", en: "Learning and memory" },
    category: { zh: "实验流程图", en: "Experiment diagram" },
    width: 1774, height: 887,
  },
  {
    id: "diffusion",
    name: { zh: "潜空间扩散模型", en: "Latent diffusion" },
    category: { zh: "模型架构图", en: "Model architecture" },
    width: 1536, height: 1024,
  },
  {
    id: "vit",
    name: { zh: "Vision Transformer", en: "Vision Transformer" },
    category: { zh: "模型架构图", en: "Model architecture" },
    width: 1536, height: 1024,
  },
];

export function demoAsset(id: string, file: "input.png" | "result.png" | "result.svg" | "baseline.svg") {
  return import.meta.env.BASE_URL + "assets/demo/cases/" + id + "/" + file;
}

export const demoBrandAsset = (file: string) =>
  import.meta.env.BASE_URL + "assets/demo/" + file;
