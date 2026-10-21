import { ArrowRight, ArrowUpRight, Check, Copy, GithubLogo } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { FigFoxSelect } from "../../components/ui/FigFoxSelect";
import { ProductFooter, ProductLink, type ProductNavigation } from "./ProductHeader";
import "./feedback.css";

const issuesUrl = "https://github.com/QCYTSN/figfox/issues";
const draftKey = "figfox-public-feedback-draft";
type Category = "product" | "bug" | "other";
type FeedbackDraft = { category: Category; message: string };

function readDraft(): FeedbackDraft {
  try {
    const value = JSON.parse(sessionStorage.getItem(draftKey) || "null");
    if (value && ["product", "bug", "other"].includes(value.category) && typeof value.message === "string") {
      return { category: value.category, message: value.message.slice(0, 4000) };
    }
  } catch { /* Feedback remains usable without browser storage. */ }
  return { category: "product", message: "" };
}

export function PublicFeedbackPage(props: ProductNavigation) {
  const { language, hrefFor, onNavigate } = props;
  const zh = language === "zh";
  const [draft, setDraft] = useState(readDraft);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const categories = zh
    ? { product: "产品建议", bug: "问题报告", other: "其他反馈" }
    : { product: "Product idea", bug: "Issue report", other: "Other feedback" };
  const message = draft.message.trim();
  const title = `[FigFox] ${categories[draft.category]} · ${message.split("\n")[0].slice(0, 65)}`;
  const source = window.location.origin + window.location.pathname;
  const body = `${zh ? "反馈类型" : "Type"}: ${categories[draft.category]}\n\n${message}\n\n${zh ? "来源页面" : "Page"}: ${source}\n${zh ? "界面语言" : "Language"}: ${language}`;
  const issueUrl = new URL(`${issuesUrl}/new`);
  issueUrl.searchParams.set("title", title);
  issueUrl.searchParams.set("body", body);
  // Long messages must be pasted into GitHub instead of exceeding URL limits.
  const manualPaste = issueUrl.href.length > 7000;
  if (manualPaste) issueUrl.searchParams.delete("body");

  useEffect(() => {
    try { sessionStorage.setItem(draftKey, JSON.stringify(draft)); }
    catch { /* The text stays in the form when storage is full or blocked. */ }
    setCopied(false);
    setNotice("");
  }, [draft, language]);

  function validate() {
    if (message.length < 10) {
      setNotice(zh ? "请至少填写 10 个字符，方便我们了解具体情况。" : "Write at least 10 characters so we can understand the details.");
      field.current?.focus();
      return false;
    }
    return true;
  }

  async function copyFeedback() {
    if (!validate()) return;
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setNotice("");
    } catch {
      field.current?.focus();
      field.current?.select();
      setNotice(zh ? "正文已选中，请手动复制，再粘贴到 GitHub。" : "The details are selected. Copy them manually and paste into GitHub.");
    }
  }

  function openFeedback(event: MouseEvent<HTMLAnchorElement>) {
    if (!validate()) event.preventDefault();
  }

  return <main className="product-feedback product-page-enter" id="main-content">
    <section className="product-feedback-heading product-container">
      <ProductLink route="/" hrefFor={hrefFor} onNavigate={onNavigate} className="product-text-link">{zh ? "返回展示页" : "Back to showcase"}<ArrowRight size={15} /></ProductLink>
      <span className="product-eyebrow">{zh ? "反馈" : "Feedback"}</span>
      <h1>{zh ? "告诉我们你的想法" : "Tell us what you think"}</h1>
      <p>{zh ? "建议、问题，或使用时遇到的不便，都可以写在这里。" : "Share an idea, report a problem, or tell us what could work better."}</p>
    </section>
    <section className="product-feedback-layout product-container">
      <div className="product-feedback-form">
        <div className="product-feedback-field">
          <span id="feedback-category-label">{zh ? "反馈类型" : "Feedback type"}</span>
          <FigFoxSelect value={draft.category} ariaLabel={zh ? "反馈类型" : "Feedback type"} options={Object.entries(categories).map(([value, label]) => ({ value: value as Category, label }))} onValueChange={category => setDraft(current => ({ ...current, category }))} />
        </div>
        <label className="product-feedback-field" htmlFor="feedback-message">
          <span>{zh ? "具体内容" : "Details"}</span>
          <textarea id="feedback-message" ref={field} rows={9} maxLength={4000} value={draft.message} placeholder={zh ? "你当时在做什么？实际发生了什么？你希望它怎样工作？" : "What were you doing? What happened? What did you expect?"} onChange={event => setDraft(current => ({ ...current, message: event.target.value }))} aria-describedby="feedback-public-note feedback-counter" />
          <small id="feedback-counter">{draft.message.length} / 4000</small>
        </label>
        <p className="product-feedback-public-note" id="feedback-public-note">{zh ? "反馈通过 GitHub 公开发布，请勿填写邮箱、密钥或私密资料。" : "Feedback is published publicly on GitHub. Leave out email addresses, keys and private material."}</p>
        {manualPaste && <p className="product-feedback-manual" role="status">{zh ? "内容较长，请先复制，再到 GitHub 粘贴并发布。" : "This is a longer message. Copy it first, then paste and publish it on GitHub."}</p>}
        {notice && <p className="product-feedback-notice" role="status">{notice}</p>}
        <div className="product-feedback-actions">
          <a className="product-button product-button-primary" href={issueUrl.href} target="_blank" rel="noopener noreferrer" onClick={openFeedback}><GithubLogo size={18} />{zh ? "前往 GitHub" : "Continue on GitHub"}<ArrowUpRight size={16} /></a>
          <button className="product-button product-button-secondary" type="button" onClick={() => void copyFeedback()}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? zh ? "已复制" : "Copied" : zh ? "复制内容" : "Copy details"}</button>
        </div>
        <p className="product-feedback-next">{zh ? "下一步会打开 GitHub，由你确认发布；此处不会自动提交。" : "GitHub opens next, where you review and publish. This page does not submit automatically."}</p>
      </div>
      <aside className="product-feedback-aside">
        <GithubLogo size={27} />
        <h2>{zh ? "一起把 FigFox 做好" : "Help improve FigFox"}</h2>
        <p>{zh ? "我们在公开仓库跟进反馈。发布后，你可以查看讨论和后续处理。" : "We follow feedback in the public repository. Once published, you can follow the discussion and updates."}</p>
        <ol>
          <li><span>01</span><div><strong>{zh ? "写清楚遇到的情况" : "Describe what happened"}</strong><p>{zh ? "操作步骤、浏览器和预期结果，会帮助我们定位问题。" : "Steps, browser details and the expected result help us understand an issue."}</p></div></li>
          <li><span>02</span><div><strong>{zh ? "确认后再发布" : "Review and publish"}</strong><p>{zh ? "需要一个 GitHub 账号；也可以先复制内容，稍后发布。" : "Publishing requires a GitHub account. You can also copy your message and publish later."}</p></div></li>
          <li><span>03</span><div><strong>{zh ? "查看已有反馈" : "See existing feedback"}</strong><p>{zh ? "也许已经有人遇到同样的问题，可以直接加入讨论。" : "Someone may have reported the same issue. You can join the discussion."}</p></div></li>
        </ol>
        <a href={issuesUrl} target="_blank" rel="noopener noreferrer" className="product-text-link">{zh ? "查看反馈与讨论" : "View feedback and discussions"}<ArrowUpRight size={15} /></a>
      </aside>
    </section>
    <ProductFooter {...props} />
  </main>;
}
