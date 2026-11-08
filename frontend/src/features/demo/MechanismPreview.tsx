import { useState } from "react";
import { demoAsset, type DemoLanguage } from "./cases";
import type { MechanismEvidence } from "./MechanismSection";
import { mechanismAsset, relationBounds, representationBounds, type ContentLayer, type MechanismKind } from "./mechanisms";

const words = {
  zh: {
    source: "原图局部", draft: "初稿局部", before: "修复前", after: "执行后",
    reading: "阅读材料", restudy: "重学图标", recall: "回忆图标",
    cropsCaption: "目标框的位置来自初稿；两侧保留相同的周围区域。",
    showFrame: "显示目标框", samCaption: "选择裁片，查看它在原图中的位置。",
    order: "上下顺序", containment: "共同容器", alignment: "横向对齐",
    relationCaption: "初稿 SVG · 关系说明标注", relationIllustration: "关系说明示意",
    text: "文字", vector: "形状与路径", image: "图像", formula: "公式",
    textCaption: "独立文字，保留内容与位置。", vectorCaption: "几何形状与连接路径分别构建。",
    imageCaption: "图像以裁片嵌入，保留内部细节。", formulaCaption: "现有案例中的矢量公式组合；更改表达式需要重新排版。",
    formulaIllustration: "公式经排版后，以矢量组合进入 SVG。",
    overflow: "文字超出容器右边界", fitted: "文字变换后，重新检查边界",
    repairCaption: "虚线标记容器边界，彩色框标记文字范围。",
    failure: "这张实验图片暂时无法载入。",
  },
  en: {
    source: "Source region", draft: "Draft region", before: "Before repair", after: "After execution",
    reading: "Reading material", restudy: "Restudy icon", recall: "Recall icon",
    cropsCaption: "The target frame is located from the draft; both views retain the same surrounding region.",
    showFrame: "Show target frame", samCaption: "Select a crop to locate it in the source.",
    order: "Vertical order", containment: "Shared frame", alignment: "Aligned edges",
    relationCaption: "Draft SVG · Relationship annotations", relationIllustration: "Relationship illustration",
    text: "Text", vector: "Shapes & paths", image: "Images", formula: "Formulas",
    textCaption: "Separate text retains its content and position.", vectorCaption: "Geometry and connections are constructed separately.",
    imageCaption: "Images are embedded as crops to preserve internal detail.", formulaCaption: "A vector formula group from an existing case; changes to the expression require typesetting again.",
    formulaIllustration: "Typesetting produces a vector group within the SVG.",
    overflow: "Caption extends past the right edge", fitted: "Recheck bounds after the transformation",
    repairCaption: "The dashed line marks the container edge; colored outlines mark the caption bounds.",
    failure: "This experiment image could not be loaded.",
  },
};

const samRegions = [
  { file: "sam-reading.png", label: "reading", bounds: [325, 108, 73, 90] },
  { file: "sam-restudy.png", label: "restudy", bounds: [599, 167, 53, 65] },
  { file: "sam-recall.png", label: "recall", bounds: [598, 302, 60, 64] },
] as const;

// Public, hand-authored teaching diagrams; never substitutes for a claimed
// experiment result. All production views are labeled "Method illustration".
function IllustrationScene({ focus = "none", shifted = false, relation, cue }: {
  focus?: ContentLayer | "none"; shifted?: boolean;
  relation?: "order" | "containment" | "alignment"; cue?: number;
}) {
  return <svg viewBox="0 0 640 320" className="demo-mechanism-scene" aria-hidden="true">
    <rect x="320" y="36" width="270" height="250" rx="14" fill="none" stroke="#a7a0c0" strokeDasharray="5 5" />
    <rect x="338" y="54" width="234" height="98" rx="8" fill="#f3edda" />
    <rect x="338" y="170" width="234" height="98" rx="8" fill="#dfefeb" />
    {[66, 182].map((y, i) => <g key={y}>
      <rect x="90" y={y} width="90" height="72" rx="4" fill="#f6f7fa" stroke="#aab1c0" />
      <path d={`M103 ${y + 17}h45M103 ${y + 28}h61M103 ${y + 39}h55M103 ${y + 50}h39`} stroke="#aeb7c9" strokeWidth="3" />
      <path d={`M193 ${y + 36}h128m-9-6 9 6-9 6`} fill="none" stroke="#7886a2" strokeWidth="2" />
      <text x="372" y={y + 31} fill="#46506a" fontSize="20">{i ? "Condition B" : "Condition A"}</text>
    </g>)}
    <text x={shifted ? "440" : "378"} y="243" fill="#59657d" fontSize="16">{shifted ? "Caption outside its frame" : "Caption inside the frame"}</text>
    {focus === "text" && <rect x="367" y="75" width="151" height="29" rx="3" fill="none" stroke="#6243ce" strokeWidth="2" />}
    {focus === "vector" && <rect x="337" y="53" width="236" height="100" rx="8" fill="none" stroke="#6243ce" strokeWidth="2" />}
    {focus === "image" && <rect x="87" y="63" width="96" height="78" rx="5" fill="none" stroke="#6243ce" strokeWidth="2" />}
    <g fill="none" stroke="#6243ce" strokeWidth="2">
      {relation === "containment" && <rect x="317" y="33" width="276" height="256" rx="15" />}
      {relation === "alignment" && <path d="M338 44V278M572 44V278" strokeDasharray="5 5" />}
      {relation === "order" && <path d="M582 103h25v116h-25m19-6 6 6 6-6" />}
      {cue !== undefined && <rect x={cue === 0 ? 86 : 334} y={cue === 0 ? 62 : cue === 1 ? 50 : 166} width={cue === 0 ? 98 : 242} height={cue === 0 ? 80 : 106} rx="5" />}
    </g>
  </svg>;
}

function PerceptionPreview({ language, local, onError }: { language: DemoLanguage; local: boolean; onError: () => void }) {
  const content = words[language];
  const [selected, setSelected] = useState(0);
  const region = samRegions[selected];
  return <>
    <div className="demo-sam-preview">
      <div className="demo-sam-source">
        {local ? <svg viewBox="244 42 686 409" className="demo-mechanism-scene" role="img" aria-label={content.source + " · " + content[region.label]}>
          <image href={demoAsset("study", "input.png")} x="0" y="0" width="1774" height="887" onError={onError} />
          {samRegions.map((candidate, index) => <rect key={candidate.file} x={candidate.bounds[0] - 4} y={candidate.bounds[1] - 4} width={candidate.bounds[2] + 8} height={candidate.bounds[3] + 8} rx="3" fill="none" stroke={index === selected ? "#6243ce" : "#a7afd1"} strokeWidth={index === selected ? 3 : 1.5} opacity={index === selected ? 1 : 0.65} />)}
        </svg> : <IllustrationScene cue={selected} />}
      </div>
      <div className="demo-sam-crops" role="group" aria-label={content.samCaption}>
        {samRegions.map((candidate, index) => <button type="button" key={candidate.file} aria-pressed={selected === index} onClick={() => setSelected(index)}>
          {local ? <img src={mechanismAsset(candidate.file)} alt="" width={candidate.bounds[2]} height={candidate.bounds[3]} onError={onError} /> :
            <svg viewBox="0 0 60 60" aria-hidden="true"><rect x="13" y="7" width="34" height="46" rx="3" fill="#ecedf6" stroke="#a9a2c7" /><path d="M20 19h20M20 26h20M20 33h16M20 40h13" stroke="#9391b3" strokeWidth="2" /></svg>}
          <span>{content[candidate.label]}</span>
        </button>)}
      </div>
    </div>
    <p className="demo-mechanism-caption">{content.samCaption}</p>
  </>;
}

function RelationsPreview({ language, local, url }: { language: DemoLanguage; local: boolean; url?: string }) {
  const content = words[language];
  const [relation, setRelation] = useState<"order" | "containment" | "alignment">("containment");
  return <>
    <div className="demo-relation-preview">
      {local ? <svg viewBox={relationBounds.join(" ")} className="demo-mechanism-scene" role="img" aria-label={content.relationCaption + " · " + content[relation]}>
        <image href={url} x={relationBounds[0]} y={relationBounds[1]} width={relationBounds[2]} height={relationBounds[3]} />
        <g fill="none" stroke="#6243ce" strokeWidth="2.5">
          {relation === "containment" && <rect x="556" y="114" width="356" height="290" rx="8" />}
          {relation === "alignment" && <><path d="M574 124V390M894 124V390" strokeDasharray="5 5" /><path d="M570 132h8M570 268h8M890 132h8M890 268h8" /></>}
          {relation === "order" && <><path d="M918 189V325m-5-7 5 7 5-7" /><path d="M900 189h18M900 325h18" /></>}
        </g>
      </svg> : <IllustrationScene relation={relation} />}
    </div>
    <div className="demo-preview-options" role="group" aria-label={content.relationIllustration}>
      {(["order", "containment", "alignment"] as const).map(value => <button type="button" key={value} aria-pressed={relation === value} onClick={() => setRelation(value)}>{content[value]}</button>)}
    </div>
    <p className="demo-mechanism-caption">{local ? content.relationCaption : content.relationIllustration}</p>
  </>;
}

function CropPreview({ language, local, onError }: { language: DemoLanguage; local: boolean; onError: () => void }) {
  const content = words[language];
  const [showFrame, setShowFrame] = useState(true);
  return <>
    <div className="demo-crop-pair">
      {(["original", "draft"] as const).map((phase, index) => <figure key={phase}>
        <figcaption>{phase === "original" ? content.source : content.draft}</figcaption>
        {local ? <svg viewBox="0 0 696 541" role="img" aria-label={phase === "original" ? content.source : content.draft}>
          <image href={mechanismAsset(index ? "crop-draft.png" : "crop-original.png")} x="0" y="0" width="696" height="541" onError={onError} />
          {showFrame && <rect x="174" y="118" width="348" height="282" rx="2" fill="none" stroke="#6243ce" strokeWidth="3" />}
        </svg> : <IllustrationScene relation="containment" />}
      </figure>)}
    </div>
    {local && <label className="demo-crop-toggle"><input type="checkbox" checked={showFrame} onChange={event => setShowFrame(event.target.checked)} />{content.showFrame}</label>}
    <p className="demo-mechanism-caption">{content.cropsCaption}</p>
  </>;
}

function RepresentationPreview({ language, local, evidence, layer, onLayerChange }: {
  language: DemoLanguage; local: boolean; evidence: MechanismEvidence; layer: ContentLayer; onLayerChange: (layer: ContentLayer) => void;
}) {
  const content = words[language];
  return <>
    <div className={"demo-representation-preview" + (layer === "formula" ? " demo-formula-preview" : "")}>
      {layer === "formula" ? local ? <img src={evidence.formula} alt={content.formulaCaption} width="149" height="49" /> :
        <svg viewBox="0 0 360 150" role="img" aria-label={content.formulaIllustration}><g fill="#3e4963" fontFamily="serif" fontSize="31"><text x="67" y="86">z</text><text x="82" y="94" fontSize="17">t</text><text x="105" y="86">=</text><path d="m137 69 8 17 12-33h65" fill="none" stroke="#3e4963" strokeWidth="1.5" /><text x="173" y="86">α</text><text x="192" y="94" fontSize="17">t</text><text x="232" y="86">z</text><text x="249" y="94" fontSize="17">0</text></g></svg> :
        local ? <svg viewBox={representationBounds.join(" ")} className="demo-mechanism-scene" role="img" aria-label={content[layer] + " · SVG+"}>
          <image href={evidence.final} x={representationBounds[0]} y={representationBounds[1]} width={representationBounds[2]} height={representationBounds[3]} />
          <g fill="none" stroke="#6243ce" strokeWidth="2.5">
            {layer === "text" && <rect x="661" y="135" width="202" height="36" rx="3" />}
            {layer === "vector" && <><rect x="571" y="129" width="326" height="120" rx="6" /><path d="M429 147h105q28 0 28 30v21" strokeWidth="4" opacity=".6" /></>}
            {layer === "image" && <rect x="591" y="158" width="69" height="80" rx="4" />}
          </g>
        </svg> : <IllustrationScene focus={layer} />}
    </div>
    <div className="demo-preview-options" role="group" aria-label="SVG+">
      {(["text", "vector", "image", "formula"] as const).map(value => <button type="button" key={value} aria-pressed={layer === value} onClick={() => onLayerChange(value)}>{content[value]}</button>)}
    </div>
    <p className="demo-mechanism-caption">{layer === "formula" ? local ? content.formulaCaption : content.formulaIllustration : content[(layer + "Caption") as "textCaption" | "vectorCaption" | "imageCaption"]}</p>
  </>;
}

function ExecutionPreview({ language, local, evidence }: { language: DemoLanguage; local: boolean; evidence: MechanismEvidence }) {
  const content = words[language];
  return <>
    <div className="demo-repair-pair">
      {[false, true].map(after => <figure key={String(after)}>
        <figcaption><span>{after ? content.after : content.before}</span><small>{after ? content.fitted : content.overflow}</small></figcaption>
        {local ? <svg viewBox="554 252 368 142" role="img" aria-label={after ? content.after : content.before}>
          <image href={after ? evidence.final : evidence.draft} x="554" y="252" width="368" height="142" />
          <path d="M894 280V373" fill="none" stroke={after ? "#7768b2" : "#b46d80"} strokeWidth="1.5" strokeDasharray="4 3" />
          <rect x="665" y="320" width={after ? 222 : 237} height="31" rx="2" fill="none" stroke={after ? "#6243ce" : "#b66d80"} strokeWidth="1.5" />
        </svg> : <IllustrationScene shifted={!after} />}
      </figure>)}
    </div>
    <p className="demo-mechanism-caption">{content.repairCaption}</p>
  </>;
}

export function MechanismPreview({ kind, language, local, evidence, layer, onLayerChange }: {
  kind: MechanismKind; language: DemoLanguage; local: boolean; evidence: MechanismEvidence;
  layer: ContentLayer; onLayerChange: (layer: ContentLayer) => void;
}) {
  const [failed, setFailed] = useState(false);
  return <div className="demo-mechanism-preview" data-mechanism={kind}>
    {kind === "perception" && <PerceptionPreview language={language} local={local} onError={() => setFailed(true)} />}
    {kind === "relations" && <RelationsPreview language={language} local={local} url={evidence.draft} />}
    {kind === "crops" && <CropPreview language={language} local={local} onError={() => setFailed(true)} />}
    {kind === "representation" && <RepresentationPreview language={language} local={local} evidence={evidence} layer={layer} onLayerChange={onLayerChange} />}
    {kind === "execution" && <ExecutionPreview language={language} local={local} evidence={evidence} />}
    {failed && <p className="demo-mechanism-load-error" role="status">{words[language].failure}</p>}
  </div>;
}
