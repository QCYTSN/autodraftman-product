import { ArrowClockwise, ArrowUpRight } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type KeyboardEvent } from "react";
import type { ProductLanguage } from "../../ProductPages";

const suggestions = {
  zh: {
    create: [
      "画一张模型结构图：输入图像经过编码器、特征融合与解码器，输出分割结果。用蓝紫色区分模块，标明数据流向。",
      "画出实验流程：样本采集、预处理、模型训练、结果分析。横向排列四个步骤，每一步保留一个简短标签。",
      "为一篇方法论文绘制总览图，展示输入、三个核心模块和输出，用箭头说明模块之间的关系。",
      "画一张对比示意图，左侧展示原始图像，右侧展示处理后的结构，在两侧标出对应的文字和图形。",
      "绘制一个带反馈的研究流程：观察、提出假设、实验、分析，再从分析结果返回假设。白色背景，标签清晰。",
      "画一张多模态模型示意图，图像和文字分别编码，经过融合后输出预测结果。使用简洁的几何图形。",
    ],
    rebuild: [
      "保留原图中的文字、模块位置和箭头方向，重建为可编辑的 SVG。文字使用独立文本元素。",
      "保持原图的分栏与层级关系，重点检查模块之间的连线、箭头端点和标签位置。",
      "将图中的流程框、图标与文字分别重建，保留原有配色和相对位置，方便之后逐个修改。",
      "保留公式、图注和曲线的相对位置，检查文字是否完整，以及连线是否指向正确的模块。",
    ],
  },
  en: {
    create: [
      "Draw a model architecture: an input image passes through an encoder, feature fusion and a decoder to produce a segmentation map. Use blue and purple modules with clear data-flow arrows.",
      "Draw a four-step experiment workflow: sample collection, preprocessing, model training and analysis. Arrange the steps horizontally with short labels.",
      "Create a method overview with an input, three core modules and an output. Use arrows to explain the relationships between modules.",
      "Draw a side-by-side comparison of an original image and its reconstructed structure. Label the corresponding text and shapes.",
      "Illustrate a research cycle: observation, hypothesis, experiment and analysis, with feedback from analysis to the hypothesis. Use a white background and clear labels.",
      "Draw a multimodal model with separate image and text encoders, a fusion module and a prediction output. Use simple geometric shapes.",
    ],
    rebuild: [
      "Reconstruct this image as editable SVG. Preserve the labels, module positions and arrow directions, with text kept as separate text elements.",
      "Preserve the columns and hierarchy. Check the connections between modules, arrow endpoints and label positions.",
      "Rebuild the flowchart boxes, icons and text as separate elements. Keep the original colors and relative positions so each element can be edited.",
      "Preserve the relative positions of equations, captions and curves. Check that labels are complete and connections point to the correct modules.",
    ],
  },
} as const;

export function ProductPromptField({ active = true, language, taskMode, value, label, help, message, invalid = false, onChange, onKeyDown }: {
  active?: boolean;
  language: ProductLanguage;
  taskMode: "create" | "rebuild";
  value: string;
  label: string;
  help: string;
  message: string;
  invalid?: boolean;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const zh = language === "zh";
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [focused, setFocused] = useState(false);
  const [visible, setVisible] = useState(() => document.visibilityState !== "hidden");
  const samples = suggestions[language][taskMode];
  const suggestion = samples[index % samples.length];
  const empty = value.length === 0;

  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (!active || !empty || focused || !visible || reducedMotion) return;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % samples.length), 7000);
    return () => window.clearInterval(timer);
  }, [active, empty, focused, visible, reducedMotion, samples.length, language, taskMode]);

  const applySuggestion = () => {
    onChange(suggestion);
    document.getElementById("figure-prompt")?.focus();
  };

  return <div className="form-block prompt-block product-prompt-field">
    <label htmlFor="figure-prompt">{label}</label>
    <div className={`product-prompt-input ${empty ? "is-empty" : ""}`}>
      <textarea
        id="figure-prompt"
        maxLength={1200}
        value={value}
        onChange={event => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={suggestion}
        aria-describedby={message ? "prompt-message" : "prompt-help"}
        aria-invalid={invalid ? "true" : undefined}
      />
      {empty && <div className="product-prompt-suggestion" aria-hidden="true">
        <span className="product-prompt-example-label">{zh ? "例如" : "For example"}</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p key={`${language}-${taskMode}-${index}`} initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: reducedMotion ? 1 : 0, y: 0 }} transition={{ duration: reducedMotion ? 0 : 0.24 }}>
            {suggestion}
          </motion.p>
        </AnimatePresence>
      </div>}
    </div>
    <div className="product-prompt-meta">
      <div className="product-prompt-examples">
        {empty && <>
          <button type="button" onClick={() => setIndex(current => (current + 1) % samples.length)}><ArrowClockwise size={14} />{zh ? "换个提示" : "Next example"}</button>
          <button type="button" onClick={applySuggestion}>{zh ? "使用这段描述" : "Use example"}<ArrowUpRight size={13} /></button>
        </>}
      </div>
      <span className="product-prompt-count">{value.length}/1200</span>
    </div>
    {message ? <p className="field-message" id="prompt-message" role="status">{message}</p> : <p className="field-help" id="prompt-help">{help}</p>}
  </div>;
}
