import { ArrowRight, Check, Minus } from "@phosphor-icons/react";
import { useState } from "react";
import { ProductFooter, ProductLink, type ProductNavigation } from "./ProductHeader";

const plans = [
  { name: "Sketch", image: "sketch", monthly: 9, yearly: 7, credits: 30, zh: "用于偶尔的制图与修改", en: "For occasional figure work" },
  { name: "Folio", image: "folio", monthly: 19, yearly: 15, credits: 120, zh: "用于持续的论文与项目制图", en: "For ongoing papers and projects" },
  { name: "Atlas", image: "atlas", monthly: 39, yearly: 31, credits: 360, zh: "用于更频繁的图像处理", en: "For a higher volume of figure work" },
] as const;

export function ProductPricingPage(props: ProductNavigation) {
  const { language, hrefFor, onNavigate } = props;
  const zh = language === "zh";
  const [billing, setBilling] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const compare = [
    [zh ? "每月生成额度" : "Monthly generation credits", "30", "120", "360"],
    [zh ? "图像生成与 SVG 重建" : "Image generation and SVG reconstruction", true, true, true],
    [zh ? "SVG 编辑与导出" : "SVG editing and export", true, true, true],
    [zh ? "高分辨率结果" : "High-resolution output", false, true, true],
    [zh ? "优先处理" : "Priority processing", false, false, true],
    [zh ? "草稿保留" : "Draft retention", zh ? "30 天" : "30 days", zh ? "长期保留" : "Extended", zh ? "长期保留" : "Extended"],
  ];
  const faqs = zh ? [
    ["现在可以订阅吗？", "还不能。这是拟定方案，价格、额度和权益会在正式开放前确认。当前可以直接使用浏览器里的 SVG 编辑器。"],
    ["SVG 编辑需要购买套餐吗？", "当前版本的本地 SVG 编辑器可以直接打开，不需要登录或购买套餐。文件只在当前浏览器中处理。"],
    ["生成额度怎样计算？", "拟定规则是每次完成生成消耗一份额度；失败且没有结果时不扣额度。正式规则会与服务一同公布。"],
    ["月付和年付有什么区别？", "年付按全年一次支付，页面显示折算后的每月价格。切换付款周期可以查看拟定总价，当前不会产生订单。"],
  ] : [
    ["Can I subscribe now?", "Not yet. Prices, credits and plan benefits are proposals and will be confirmed before launch. The browser SVG editor is available now."],
    ["Do I need a plan to edit SVGs?", "The current local SVG editor needs neither a subscription nor an account. Files are processed in your browser."],
    ["How will generation credits work?", "The proposed rule is one credit per completed generation, with no charge for a failed run without output. Final rules will accompany the service launch."],
    ["How does annual billing work?", "Annual billing is paid for a full year. The displayed monthly price is the annual total divided by twelve. Switching cycles creates no order."],
  ];

  return <main className="product-pricing product-page-enter">
    <section className="product-page-heading product-container">
      <span className="product-eyebrow">{zh ? "定价" : "Pricing"}</span>
      <h1>{zh ? "选择适合你的方案" : "Choose a plan for your work"}</h1>
      <p>{zh ? "从偶尔做一张图，到持续的研究项目。" : "From an occasional figure to an ongoing research project."}</p>
      <div className="product-billing" role="group" aria-label={zh ? "付款周期" : "Billing cycle"}>
        <button type="button" aria-pressed={billing === "monthly"} onClick={() => setBilling("monthly")}>{zh ? "月付" : "Monthly"}</button>
        <button type="button" aria-pressed={billing === "yearly"} onClick={() => setBilling("yearly")}>{zh ? "年付" : "Yearly"}<span>{zh ? "省约 20%" : "~20% less"}</span></button>
      </div>
      <p className="product-pricing-note"><i aria-hidden="true" />{zh ? "方案预览 · 订阅暂未开放" : "Proposed plans · subscriptions are not open yet"}</p>
    </section>

    <section className="product-free-editor product-container"><div><span>{zh ? "当前可用" : "Available now"}</span><h2>{zh ? "本地 SVG 编辑，免费使用" : "Local SVG editing is free"}</h2><p>{zh ? "打开、修改、保存和导出自己的 SVG，无需登录或订阅。" : "Open, edit, save and export your own SVGs without an account or subscription."}</p></div><ProductLink route="/editor" hrefFor={hrefFor} onNavigate={onNavigate} className="product-button product-button-secondary">{zh ? "开始编辑" : "Start editing"}<ArrowRight size={17} /></ProductLink></section>
    <section className="product-plans product-container" aria-label={zh ? "拟定套餐" : "Proposed plans"}>
      {plans.map((plan, index) => <article className={`product-plan ${index === 1 ? "product-plan-featured" : ""}`} key={plan.name}>
        <div className="product-plan-top"><img src={`${import.meta.env.BASE_URL}assets/pricing-${plan.image}-v2.png`} width="80" height="80" alt="" />{index === 1 && <span>{zh ? "日常研究" : "Everyday research"}</span>}</div>
        <h2>{plan.name}</h2>
        <p className="product-plan-description">{zh ? plan.zh : plan.en}</p>
        <div className="product-plan-price"><span>$</span><strong>{plan[billing]}</strong><span>{zh ? "/ 月" : "/ month"}</span></div>
        <p className="product-plan-billing">{billing === "yearly" ? zh ? `全年 $${plan.yearly * 12}，一次支付` : `$${plan.yearly * 12} billed annually` : zh ? "按月支付" : "Billed monthly"}</p>
        <button className={`product-button ${index === 1 ? "product-button-primary" : "product-button-secondary"}`} type="button" onClick={() => setSelectedPlan(selectedPlan === plan.name ? null : plan.name)} aria-expanded={selectedPlan === plan.name} aria-controls={`plan-note-${plan.name}`}>{zh ? "查看方案" : "View plan"}<ArrowRight size={17} /></button>
        {selectedPlan === plan.name && <div className="product-plan-message" id={`plan-note-${plan.name}`} role="status"><strong>{zh ? plan.zh : plan.en}</strong><p>{zh ? `拟定每月 ${plan.credits} 份额度，${index === 0 ? "适合零散的制图需求" : index === 1 ? "包含高分辨率结果与较长草稿保留" : "包含高分辨率结果与优先处理"}。` : `${plan.credits} proposed monthly credits. ${index === 0 ? "For occasional figure work." : index === 1 ? "With higher-resolution output and extended draft retention." : "With higher-resolution output and priority processing."}`}</p><p>{zh ? `${plan.name} 暂未开放订阅，当前不会收费。本地 SVG 编辑可直接免费使用。` : `${plan.name} is not open for subscription yet. No payment will be taken. Local SVG editing is free.`}</p></div>}
        <ul>
          <li><Check size={17} /><span>{zh ? `每月 ${plan.credits} 次生成` : `${plan.credits} generations / month`}</span></li>
          <li><Check size={17} /><span>{zh ? "图像生成与 SVG 重建" : "Image generation and SVG reconstruction"}</span></li>
          <li><Check size={17} /><span>{zh ? "SVG 编辑与导出" : "SVG editing and export"}</span></li>
          <li><Check size={17} /><span>{index === 0 ? zh ? "草稿保留 30 天" : "Drafts kept for 30 days" : zh ? "更高分辨率与长期草稿" : "Higher resolution and extended drafts"}</span></li>
        </ul>
      </article>)}
    </section>

    <section className="product-compare product-container">
      <div className="product-section-heading"><h2>{zh ? "方案包含什么" : "What is included"}</h2><p>{zh ? "以下为拟定权益，正式开放前会更新。" : "These proposed benefits will be updated before launch."}</p></div>
      <div className="product-table-scroll" role="region" aria-label={zh ? "套餐权益比较" : "Plan comparison"} tabIndex={0}>
        <table><thead><tr><th scope="col">{zh ? "权益" : "Benefit"}</th>{plans.map(plan => <th scope="col" key={plan.name}>{plan.name}</th>)}</tr></thead><tbody>
          {compare.map(([label, ...values]) => <tr key={String(label)}><th scope="row">{label}</th>{values.map((value, i) => <td key={i}>{typeof value === "boolean" ? value ? <Check size={18} aria-label={zh ? "包含" : "Included"} /> : <Minus size={16} aria-label={zh ? "不包含" : "Not included"} /> : value}</td>)}</tr>)}
        </tbody></table>
      </div>
    </section>

    <section className="product-faq product-container"><div className="product-section-heading"><h2>{zh ? "常见问题" : "Common questions"}</h2></div><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></section>
    <section className="product-pricing-cta product-container"><div><h2>{zh ? "已有 SVG？直接开始编辑。" : "Have an SVG? Open it and edit."}</h2><p>{zh ? "调整文字、图形和布局，在浏览器里导出。" : "Adjust text, shapes and layout, then export in your browser."}</p></div><ProductLink route="/editor" hrefFor={hrefFor} onNavigate={onNavigate} className="product-button product-button-primary">{zh ? "打开 SVG 编辑器" : "Open SVG editor"}<ArrowRight size={18} /></ProductLink></section>
    <ProductFooter {...props} />
  </main>;
}
