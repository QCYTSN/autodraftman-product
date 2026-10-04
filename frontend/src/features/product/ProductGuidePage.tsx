import { ArrowRight, ArrowUpRight, Check, DownloadSimple, FileSvg, ImageSquare, LockKey, TextT, UploadSimple, VectorThree } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { ProductFooter, ProductLink, type ProductNavigation } from "./ProductHeader";
import { openGuideExample } from "./WorkspaceDocuments";

const guideSections = ["open", "edit", "export", "drafts", "generate", "account"] as const;

function GuideFigure({ zh }: { zh: boolean }) {
  return <svg className="product-guide-figure" viewBox="0 0 550 190" role="img" aria-label={zh ? "SVG 对象、连接线与文字的结构示意" : "SVG objects, connectors and text: an illustration"}>
    <defs><marker id="guide-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M1 1L7 4L1 7" fill="none" stroke="#8175a4" strokeWidth="1.4" /></marker></defs>
    <rect x="34" y="62" width="120" height="67" rx="12" fill="#f2eefb" />
    <rect x="214" y="62" width="120" height="67" rx="12" fill="#eef2ff" />
    <rect x="394" y="62" width="120" height="67" rx="12" fill="#f2eefb" />
    <g fontFamily="Google Sans Flex,Noto Sans SC Variable,sans-serif" textAnchor="middle" fontSize="14" fill="#363c50"><text x="94" y="102">{zh ? "输入" : "Input"}</text><text x="274" y="102">{zh ? "处理" : "Process"}</text><text x="454" y="102">{zh ? "结果" : "Output"}</text></g>
    <g stroke="#8175a4" strokeWidth="1.4" markerEnd="url(#guide-arrow)"><path d="M165 96H201" /><path d="M345 96H381" /></g>
    <g fill="white" stroke="#7653ce" strokeWidth="1"><rect x="207" y="55" width="134" height="81" rx="2" fill="none" /><rect x="204" y="52" width="6" height="6" /><rect x="338" y="52" width="6" height="6" /><rect x="204" y="133" width="6" height="6" /><rect x="338" y="133" width="6" height="6" /></g>
    <text x="274" y="163" fontFamily="Google Sans Flex,Noto Sans SC Variable,sans-serif" textAnchor="middle" fill="#776e8c" fontSize="11">{zh ? "每个对象可以单独选择和修改 · 示意" : "Select and edit each object · illustration"}</text>
  </svg>;
}

export function ProductGuidePage(props: ProductNavigation) {
  const { language, hrefFor, onNavigate } = props;
  const zh = language === "zh";
  const [active, setActive] = useState("open");
  const [exampleBusy, setExampleBusy] = useState(false);
  const [exampleError, setExampleError] = useState(false);
  async function startExample() {
    setExampleBusy(true); setExampleError(false);
    try { await openGuideExample(() => onNavigate("/editor")); }
    catch { setExampleError(true); }
    finally { setExampleBusy(false); }
  }
  const titles = zh ? ["打开一个 SVG", "编辑图中的元素", "检查并导出", "保存 SVG 与草稿", "准备生成或重建", "账户与数据"] : ["Open an SVG", "Edit the elements", "Check and export", "Save SVGs and drafts", "Prepare generation", "Accounts and data"];
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const sections = guideSections.map(id => document.getElementById(`guide-${id}`)).filter(section => section !== null);
      const current = [...sections].reverse().find(section => section.getBoundingClientRect().top < 180) || sections[0];
      if (current) setActive(current.id.replace("guide-", ""));
    };
    const scroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", scroll);
    update();
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", scroll); window.removeEventListener("resize", scroll); };
  }, []);

  return <main className="product-guide product-page-enter">
    <section className="product-guide-heading product-container">
      <div><span className="product-eyebrow">{zh ? "使用指南" : "Guide"}</span><h1>{zh ? "从一张 SVG 开始" : "Start with an SVG"}</h1><p>{zh ? "打开文档，调整文字、图形和布局，再导出。" : "Open a document, adjust its text, shapes and layout, then export."}</p></div>
      <ProductLink route="/editor" hrefFor={hrefFor} onNavigate={onNavigate} className="product-button product-button-primary">{zh ? "打开编辑器" : "Open editor"}<ArrowUpRight size={18} /></ProductLink>
    </section>
    <div className="product-guide-layout product-container">
      <aside className="product-guide-toc"><p>{zh ? "本页内容" : "On this page"}</p><nav aria-label={zh ? "指南目录" : "Guide contents"}>{guideSections.map((id, index) => <a href={`#guide-${id}`} key={id} aria-current={active === id ? "location" : undefined} data-allow-wrap="true"><span>{String(index + 1).padStart(2, "0")}</span>{titles[index]}</a>)}</nav><div className="product-guide-toc-note"><i /><span>{zh ? "SVG 编辑现已可用" : "SVG editing is available"}</span></div></aside>
      <div className="product-guide-document">
        <section className="product-guide-section" id="guide-open">
          <span className="product-guide-number">01</span><h2>{titles[0]}</h2><p>{zh ? "在工作台点击「打开 SVG 编辑器」，选择设备上的 .svg 文件，或新建一张空白画布。" : "Choose “Open SVG editor” in the workspace, then open a .svg file from your device or create a blank canvas."}</p>
          <div className="product-guide-open-options"><div><UploadSimple size={22} /><strong>{zh ? "打开已有文档" : "Open a document"}</strong><p>{zh ? "支持拖放或文件选择，最大 5 MB。" : "Drop a file or use the file picker. Up to 5 MB."}</p></div><div><FileSvg size={22} /><strong>{zh ? "新建空白画布" : "Create a blank canvas"}</strong><p>{zh ? "从空白文档开始添加图形、文字与连接线。" : "Start from scratch with shapes, text and connectors."}</p></div></div>
          <p className="product-guide-note"><LockKey size={17} />{zh ? "本地 SVG 只在浏览器中处理，无需登录。" : "Local SVGs are processed in your browser. No account is needed."}</p>
          <div className="product-guide-example"><img src={`${import.meta.env.BASE_URL}assets/demo/cases/study/result.png`} width="1774" height="887" loading="lazy" alt={zh ? "用于练习编辑的学习与记忆流程图" : "Learning and memory figure for practicing SVG edits"} /><div><h3>{zh ? "先用一张示例熟悉操作" : "Learn with an example"}</h3><p>{zh ? "选中文字并修改，再移动一个图形。导出后重新打开，检查改动是否保留。" : "Select and edit a label, then move a shape. Export and reopen the SVG to check your changes."}</p><button type="button" className="product-button product-button-secondary" disabled={exampleBusy} onClick={() => void startExample()}>{exampleBusy ? zh ? "正在打开…" : "Opening…" : zh ? "用示例开始编辑" : "Edit the example"}<ArrowRight size={16} /></button></div></div>
          {exampleError && <p className="product-documents-error" role="alert">{zh ? "示例暂时无法打开。可以在编辑器中直接导入自己的文件。" : "The example could not be opened. You can import your own file in the editor."}</p>}
        </section>
        <section className="product-guide-section" id="guide-edit"><span className="product-guide-number">02</span><h2>{titles[1]}</h2><p>{zh ? "选择画布中的对象，在属性面板调整位置、尺寸、颜色和文字。图层面板可以帮助找到组合内的元素。" : "Select an object and use the inspector to adjust its position, dimensions, colors and text. The layer panel helps locate elements within groups."}</p>
          <GuideFigure zh={zh} />
          <dl className="product-guide-capabilities">
            <div><dt><TextT size={18} />{zh ? "文字" : "Text"}</dt><dd>{zh ? "更改内容、字体、字号与对齐。" : "Change content, font, size and alignment."}</dd></div>
            <div><dt><VectorThree size={18} />{zh ? "图形与路径" : "Shapes and paths"}</dt><dd>{zh ? "拖动、缩放和旋转，调整填充与描边；路径可进入节点编辑。" : "Move, resize and rotate. Adjust fill and stroke, or edit path nodes."}</dd></div>
            <div><dt><ImageSquare size={18} />{zh ? "嵌入图像" : "Embedded images"}</dt><dd>{zh ? "调整位置和尺寸，或替换图片；它本身仍是位图。" : "Move, resize or replace an image. It remains a raster image."}</dd></div>
          </dl>
          <p>{zh ? "如果文字或公式已经转为矢量路径，就按图形编辑。更换表达式时需要重新排版。" : "Text or formulas converted to paths are edited as shapes. Changing an expression requires typesetting it again."}</p>
          <div className="product-guide-shortcuts"><strong>{zh ? "常用操作" : "Useful controls"}</strong><span><kbd>V</kbd>{zh ? "选择" : "Select"}</span><span><kbd>T</kbd>{zh ? "文字" : "Text"}</span><span><kbd>R</kbd>{zh ? "矩形" : "Rectangle"}</span><span><kbd>⌘ / Ctrl</kbd><kbd>Z</kbd>{zh ? "撤销" : "Undo"}</span></div>
        </section>
        <section className="product-guide-section" id="guide-export"><span className="product-guide-number">03</span><h2>{titles[2]}</h2><p>{zh ? "使用「适合画布」查看整张图，检查文字、连线、遮挡和边界。确认后点击右上角「导出 SVG」。" : "Use “Fit canvas” to inspect the full figure. Check text, connectors, overlaps and boundaries, then choose “Export SVG” in the top right."}</p>
          <div className="product-guide-export"><DownloadSimple size={24} /><div><strong>{zh ? "导出当前编辑结果" : "Export your current edits"}</strong><span>{zh ? "保存为 SVG，后续仍可继续编辑。" : "Save as SVG and continue editing later."}</span></div><span className="product-file-tag">.svg</span></div>
          <p className="product-guide-note">{zh ? "文档使用的字体需要在接收方设备上可用；缺少字体时可能显示替代字形。" : "Fonts used in the document should be available on the receiving device. Missing fonts may be substituted."}</p>
        </section>
        <section className="product-guide-section" id="guide-drafts"><span className="product-guide-number">04</span><h2>{titles[3]}</h2><p>{zh ? "工作台中的「我的 SVG」保存已经导入或创建的文档，可以搜索、重命名、下载和删除。点击缩略图回到编辑器，继续修改对应文档。新建画布会另外保存，已有文档仍会保留。" : "“My SVGs” keeps imported and created documents. Search, rename, download or delete them in the workspace. Open a thumbnail to continue editing that document. New canvases are saved separately."}</p><p>{zh ? "描述与输出设置作为另一类草稿保存在历史记录中。本地保存不跨设备同步；清除网站数据会删除本地记录，重要结果请另外导出。参考图片的本地预览在刷新后需要重新选择。" : "Descriptions and output settings are kept separately in draft history. Local records do not sync across devices, and clearing site data removes them. Export important work separately. Reference previews need to be selected again after a refresh."}</p></section>
        <section className="product-guide-section" id="guide-generate"><span className="product-guide-number">05</span><div className="product-guide-section-title"><h2>{titles[4]}</h2><span className="product-pending">{zh ? "服务待接入" : "Service pending"}</span></div><p>{zh ? "工作台保留两种输入方式。现在可以准备内容和预览图片，生成与重建服务接入后再提交处理。" : "The workspace has two input modes. You can prepare content and preview an image now; processing will be enabled once the generation and reconstruction services are connected."}</p><dl className="product-guide-capabilities"><div><dt>{zh ? "新建图像" : "Create an image"}</dt><dd>{zh ? "描述图中的对象、关系与重点，需要时附加参考图。" : "Describe the objects, relationships and emphasis, with an optional reference image."}</dd></div><div><dt>{zh ? "重建已有图片" : "Reconstruct an image"}</dt><dd>{zh ? "选择原图，补充需要保留的文字、布局或细节。" : "Select the source and add notes on text, layout or details to preserve."}</dd></div></dl><ProductLink route="/workspace" hrefFor={hrefFor} onNavigate={onNavigate} className="product-text-link">{zh ? "到工作台准备内容" : "Prepare content in the workspace"}<ArrowRight size={16} /></ProductLink></section>
        <section className="product-guide-section" id="guide-account"><span className="product-guide-number">06</span><h2>{titles[5]}</h2><p>{zh ? "当前公开版本不提供在线账户、云端文件保存或付费订阅。本地编辑无需登录，也不会消耗生成额度。" : "The public version does not yet offer online accounts, cloud storage or paid subscriptions. Local editing requires no login and uses no generation credits."}</p><p>{zh ? "未来登录方式开放后，可以在同一账户下管理草稿与文件。实际数据处理和保留规则会在服务开放前更新。" : "When sign-in becomes available, an account will manage your drafts and files. Data handling and retention rules will be updated before service launch."}</p></section>
        <div className="product-guide-end"><Check size={20} /><span>{zh ? "打开自己的 SVG，实际试一遍。" : "Open your own SVG and try it."}</span><ProductLink route="/editor" hrefFor={hrefFor} onNavigate={onNavigate} className="product-text-link">{zh ? "开始编辑" : "Start editing"}<ArrowRight size={16} /></ProductLink></div>
        <div className="product-guide-help"><h2>{zh ? "遇到问题时" : "When something goes wrong"}</h2>{(zh ? [["文件打不开？", "检查文件是否为 SVG，大小是否超过 5 MB。复杂文件可先在原软件中精简，再导入。导入失败会保留当前文档。"], ["文字显示不同？", "先检查原图使用的字体是否在当前设备可用。已经转为路径的文字需要按图形编辑。"], ["找不到文档？", "本地文档只在保存时使用的浏览器和网站地址下可见。无痕窗口、另一台设备或清除网站数据后不能读取原记录。"], ["保存失败怎么办？", "先导出 SVG 到设备，避免丢失改动。检查浏览器存储空间和网站权限，再重新打开文件。"]] : [["The file will not open", "Check that it is an SVG and is within the 5 MB import limit. Simplify complex files in their source application. Failed imports preserve the current document."], ["Text looks different", "Check whether the document’s fonts are available on this device. Text already converted to paths is edited as a shape."], ["A document is missing", "Local documents belong to the browser and site address where you saved them. Other devices, private windows and cleared site data cannot access the original records."], ["Saving fails", "Export an SVG to your device first. Then check browser storage and site permissions before reopening the file."]]).map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div>
      </div>
    </div>
    <ProductFooter {...props} />
  </main>;
}
