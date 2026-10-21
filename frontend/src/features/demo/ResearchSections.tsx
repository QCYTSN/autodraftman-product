import { ArrowDown, ArrowRight } from "@phosphor-icons/react";
import { useState } from "react";
import { demoAsset, type DemoLanguage } from "./cases";
import { evaluationCriteria, evaluationSamples, plannedResults } from "./researchContent";
import { ResearchPlaceholder } from "./ResearchPlaceholder";
import "./research.css";

const words = {
  zh: {
    pairedTitle: "逐样本的修复变化",
    pairedBody: "按相同指标，比较每张图的初稿与修复结果。",
    pairedFigure: "配对点图 · 初稿与修复结果",
    pairedCaption: "逐样本评分后补充，改善与退步都会保留。",
    refinementTitle: "初稿与修复结果",
    refinementBody: "对照同一张图在初稿与修复阶段的差异。",
    evaluationTitle: "评测样本与评价方式",
    evaluationBody: "从不同类型的科研图像出发，检查重建的外观、结构与编辑操作。",
    samples: "现有样本选览", samplesPublic: "评测样本概览",
    sampleCaption: "展示选取了现有实验中的六张原图，正式评测的样本与划分待确定。",
    sampleCaptionPublic: "评测样本与划分将在正式实验中确定。",
    samplePlaceholder: "评测样本概览，占位",
    missingSample: "样本原图，占位",
    criteria: "拟采用的评价维度",
    protocol: "正式评测将统一样本、模型版本与运行设置，并记录失败样本。具体评分方法待确定。",
    resultsNav: "后续实验结果", comparison: "方法比较", ablation: "模块消融", efficiency: "质量与成本",
    pending: "实验结果待补充", placeholder: "占位",
  },
  en: {
    pairedTitle: "Repair changes by sample",
    pairedBody: "Compare each figure’s draft and repair output using the same metrics.",
    pairedFigure: "Paired dot plot · Drafts and repair outputs",
    pairedCaption: "Per-sample scores will be added, retaining both improvements and regressions.",
    refinementTitle: "Drafts and repair outputs",
    refinementBody: "Compare the same figure before and after the repair stage.",
    evaluationTitle: "Evaluation samples and criteria",
    evaluationBody: "Examine appearance, structure, and editing operations across different scientific figures.",
    samples: "Selected existing samples", samplesPublic: "Evaluation sample overview",
    sampleCaption: "These six originals come from existing experiments. The formal evaluation samples and splits are yet to be fixed.",
    sampleCaptionPublic: "Evaluation samples and splits will be fixed for the formal experiments.",
    samplePlaceholder: "Placeholder for the evaluation sample overview",
    missingSample: "Placeholder for the source image",
    criteria: "Proposed evaluation criteria",
    protocol: "The formal evaluation will use fixed samples, model versions, and run settings, and will retain failed samples. Scoring methods are yet to be defined.",
    resultsNav: "Upcoming experiment results", comparison: "Method comparison", ablation: "Stage ablations", efficiency: "Quality and cost",
    pending: "Experiment results pending", placeholder: "Placeholder",
  },
};

export function PairedResultsPlaceholder({ language, nested = false }: { language: DemoLanguage; nested?: boolean }) {
  const content = words[language];
  return <figure className={"demo-paired-summary" + (nested ? " demo-paired-summary-nested" : "")} aria-labelledby="demo-paired-title" data-demo-reveal>
    <div className="demo-paired-heading"><h3 id="demo-paired-title">{content.pairedTitle}</h3><p>{content.pairedBody}</p></div>
    <div className="demo-research-figure-label"><span>{content.pairedFigure}</span><span>{content.pending}</span></div>
    <ResearchPlaceholder label={content.pairedFigure + " · " + content.placeholder} />
    <figcaption className="demo-research-caption">{content.pairedCaption}</figcaption>
  </figure>;
}

// Production keeps the future result layout without publishing local artifacts.
export function RefinementResultsPreview({ language }: { language: DemoLanguage }) {
  const content = words[language];
  return <section className="demo-refinement demo-section" id="demo-results" aria-labelledby="demo-results-title">
    <div className="demo-section-heading" data-demo-reveal><h2 id="demo-results-title">{content.refinementTitle}</h2><p>{content.refinementBody}</p></div>
    <PairedResultsPlaceholder language={language} />
  </section>;
}

export function ResearchSections({ language, localCasesAvailable }: { language: DemoLanguage; localCasesAvailable: boolean }) {
  const content = words[language];
  const [failedSamples, setFailedSamples] = useState<string[]>([]);

  return <>
    <section className="demo-evaluation demo-section" id="demo-evaluation" aria-labelledby="demo-evaluation-title">
      <div className="demo-section-heading" data-demo-reveal><h2 id="demo-evaluation-title">{content.evaluationTitle}</h2><p>{content.evaluationBody}</p></div>
      <div className="demo-evaluation-overview" data-demo-reveal data-demo-delay="1">
        <p className="demo-research-eyebrow">{localCasesAvailable ? content.samples : content.samplesPublic}</p>
        {localCasesAvailable ? <div className="demo-evaluation-samples">
          {evaluationSamples.map(sample => <figure key={sample.id}>
            <div className="demo-evaluation-thumbnail">
              {failedSamples.includes(sample.id) ? <ResearchPlaceholder label={sample.name[language] + " · " + content.missingSample} compact /> :
                <img src={demoAsset(sample.id, "input.png")} width={sample.width} height={sample.height} loading="lazy" alt={sample.name[language]}
                  onError={() => setFailedSamples(previous => previous.includes(sample.id) ? previous : [...previous, sample.id])} />}
            </div>
            <figcaption><strong>{sample.name[language]}</strong><span>{sample.category[language]}</span></figcaption>
          </figure>)}
        </div> : <ResearchPlaceholder label={content.samplePlaceholder} />}
        <p className="demo-research-caption">{localCasesAvailable ? content.sampleCaption : content.sampleCaptionPublic}</p>
      </div>
      <div className="demo-evaluation-criteria" data-demo-reveal data-demo-delay="2">
        <p className="demo-research-eyebrow">{content.criteria}</p>
        <dl>{evaluationCriteria.map((criterion, index) => <div key={criterion.title.en}>
          <dt><small>0{index + 1}</small>{criterion.title[language]}</dt><dd>{criterion.body[language]}</dd>
        </div>)}</dl>
        <p className="demo-evaluation-protocol">{content.protocol}</p>
      </div>
      <nav className="demo-research-index" aria-label={content.resultsNav} data-demo-reveal>
        <a href="#demo-benchmarks">{content.comparison}<ArrowDown size={13} /></a>
        <a href="#demo-ablations">{content.ablation}<ArrowDown size={13} /></a>
        <a href="#demo-efficiency">{content.efficiency}<ArrowDown size={13} /></a>
      </nav>
    </section>
    {plannedResults.map((result, index) => <section className="demo-research-result demo-section" id={result.id} aria-labelledby={result.id + "-title"} key={result.id}>
      <div className="demo-section-heading" data-demo-reveal><h2 id={result.id + "-title"}>{result.title[language]}</h2><p>{result.body[language]}</p></div>
      <figure className="demo-research-figure" data-demo-reveal data-demo-delay="1">
        <div className="demo-research-figure-label"><span>{result.figure[language]}</span><span>{content.pending}</span></div>
        <ResearchPlaceholder label={result.figure[language] + " · " + content.placeholder} />
        <figcaption className="demo-research-caption">{result.caption[language]}</figcaption>
      </figure>
      {index < plannedResults.length - 1 && <a className="demo-research-next" href={"#" + plannedResults[index + 1].id} data-demo-reveal>
        {plannedResults[index + 1].title[language]}<ArrowRight size={13} />
      </a>}
    </section>)}
  </>;
}
