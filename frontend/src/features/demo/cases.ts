export type DemoLanguage = "zh" | "en";
export type DemoCase = {
  id: string;
  name: Record<DemoLanguage, string>;
  category: Record<DemoLanguage, string>;
  width: number;
  height: number;
};

export const allDemoCases: DemoCase[] = [
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
  { id: 'sample-0072', name: {zh:'蛋白质结构生成',en:'Protein structure generation'}, category: {zh:'图像细节与可编辑结构',en:'Image detail and editable structure'}, width:1776, height:309 },
  { id: 'sample-0079', name: {zh:'多模态融合架构',en:'Multimodal fusion'}, category: {zh:'分区、模块与连接关系',en:'Containers, modules and connections'}, width:1422, height:822 },
  { id: 'sample-0001', name: {zh:'类别统一的目标跟踪',en:'Category-unified tracking'}, category: {zh:'目标跟踪架构图',en:'Tracking architecture'}, width:968, height:510 },
];

export const demoCases = [allDemoCases[0], allDemoCases.find(item => item.id === "sample-0072")!, allDemoCases.find(item => item.id === "sample-0079")!];

export function demoAsset(id: string, file: "input.png" | "result.png" | "result.svg" | "baseline.svg") {
  if(id.startsWith('sample-')) { const name = {'input.png':'source.webp','result.png':'A.webp','result.svg':'A.svg','baseline.svg':'C.svg'}[file]; return import.meta.env.BASE_URL+'assets/research/samples/'+id+'/'+name; }
  return import.meta.env.BASE_URL + "assets/demo/cases/" + id + "/" + file;
}

export const demoBrandAsset = (file: string) =>
  import.meta.env.BASE_URL + "assets/demo/" + file;

export const demoThumbnail = (id: string) => id.startsWith('sample-') ? demoAsset(id, 'result.png') : import.meta.env.BASE_URL + 'assets/demo/cases/' + id + '/thumbnail.webp';
