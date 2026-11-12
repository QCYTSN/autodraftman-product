import { useResearch } from './ResearchContext';
import { asset, mainIds, number } from './data';

export function ExperimentSettings() {
  const { data, language } = useResearch();
  if (!data) return null;
  const zh = language === 'zh';
  return <details className="research-settings research-experiment-settings" id="research-settings" data-demo-reveal="fade">
    <summary>{zh ? '实验设置与数据说明' : 'Experiment settings & data notes'}</summary>
    <div className="research-settings-grid">
      <div><h3>{zh ? '输入与评分' : 'Inputs & evaluation'}</h3>
        <p>{zh ? '80 张冻结原图，四档视觉拥挤度各 20 张。视觉评分保留 11 月 4 日复核；D13–D15 使用 11 月 10 日论文中的全量网页编辑复评。' : '80 frozen inputs, with 20 per visual-clutter stratum. Visual scores retain the November 4 review; D13–D15 use the full-cohort web-editor review from the November 10 paper.'}</p>
        <p>{zh ? 'D13–D15 的通过、部分通过、失败分别记 1、0.5、0，均值乘 100；AFE 原件 sample-0062 损坏，三项记 NA，故 AFE 各 79 图，其余方法与配置各 80 图。视觉项仍使用各实验的共同有效集合。' : 'D13–D15 assign 1 for pass, 0.5 for partial pass and 0 for fail, then multiply the mean by 100. Damaged AFE original sample-0062 is NA for all three, giving AFE 79 valid images and all other methods/configurations 80. Visual criteria retain each experiment’s jointly valid sets.'}</p>
        <p>{zh ? 'D09 单独展示历史值，不进入总体、排名或消融图。编辑项使用论文公布的两位小数，视觉项保留原始精度，相同分数并列。新版编辑性逐图明细待补充；案例浏览器保留明确标注日期的历史评分及原件。' : 'D09 remains historical and is excluded from overall scores, ranks and ablation charts. Editing scores use the paper’s two decimals; visual scores retain source precision, with ties. Updated editing judgments are pending; the case browser retains dated historical scores and original artifacts.'}</p>
      </div>
      <div><h3>{zh ? '均分与分差' : 'Means & score gaps'}</h3><p>{zh ? '总体均分直接采用论文汇总：每图先对有效视觉项与该方法适用的编辑项等权聚合，再对有效图取均值。四方法与三配置分别使用各自集合。95% 置信区间采用图级 bootstrap（10,000 次，种子 20261104）。均分与区间均来自论文，没有根据分项均分反推逐图评分。' : 'Overall scores are imported from the paper: average valid visual and applicable editing criteria within each image, then average across valid images. Comparison and ablation use separate sets. The 95% intervals use image-level bootstrap (10,000 resamples, seed 20261104). Means and intervals are reported paper values, not reconstructed from criterion averages.'}</p></div>
      <div><h3>{zh ? 'FigFox 配置' : 'FigFox configurations'}</h3>
        <p>{zh ? '完整版本 A：SAM + 初稿生成 + 问题检测 + 原生修复。无 SAM 版本 B：关闭 SAM，保留检测与修复。仅初稿 C：与 A 共用同一份初稿，停在修复之前。每个配置均为 80 张图。' : 'Full version A: SAM, drafting, inspection and native repair. Version B: SAM disabled, with inspection and repair. Draft-only C shares the exact draft used by A. Each configuration contains 80 figures.'}</p>
        <p>{zh ? '本批 G0/G1/G2 均使用 GPT-5.5。公开 runner 的 G1/G2 默认使用 DeepSeek；这里展示的是本批实验配置的结果。架构图中的 DeepSeek 用于补充指导。流程播放器展示该批实验的已有产物。' : 'This cohort used GPT-5.5 for G0/G1/G2. The public runner defaults G1/G2 to DeepSeek; the scores here describe the experimental configuration. DeepSeek provides gap guidance in the architecture. The stage player displays saved artifacts from this cohort.'}</p>
        <p>{zh ? 'A/C 对照完整检查与修复流程，A/B 对照 SAM 条件。未单独消融 G1/G2，也未进行完整 2×2 因子实验。页面前半段的早期机制与修复示例单独展示，下方精选案例取自本批 80 图。执行回执与视觉评分分别记录。' : 'A/C compares the full inspection-and-repair workflow; A/B varies SAM. G1/G2 were not separately ablated, and this is not a full 2×2 design. The earlier mechanism and repair demos are separate; the selected gallery comes from this 80-image cohort. Execution receipts and visual scores are recorded separately.'}</p>
      </div>
      <div id="resource-scope"><h3>{zh ? '费用与时间' : 'Cost & time'}</h3>
        <p>{zh ? '页面展示每张图的平均记录费用与记录时间。费用包含 API 预留，独立评价费用另计；时间不含未记录的 SAM 前处理及跨进程等待。检查与修复部分为完整版本 A 与共享初稿 C 的记录差值。' : 'Values are per-image recorded means. Costs include API reserves and exclude independent evaluation. Times exclude unrecorded SAM preparation and cross-process waits. Inspection-and-repair values are the difference between full version A and shared draft C.'}</p>
        <p>{zh ? '共享初稿分别归因到 A/C，不能将各配置相加作为总账单。四方法图表并列展示各自原运行记录，计时范围不同，不作为统一端到端速度排名；Crafter 的部分图像 API 费用未完整回传，SAM 本地推理不折算 API Token。' : 'The shared draft is attributed to both A and C, so configuration totals are not additive. The four-method chart displays each method’s original records. Timing scopes differ, so these are not uniform end-to-end speed measurements. Some Crafter image-API charges were not returned; local SAM inference is not converted into API tokens.'}</p>
      </div>
      <div><h3>{zh ? '版本与产物' : 'Versions & artifacts'}</h3>
        <p>{zh ? '汇总版本：2026-11-10 · paper_full80_20261110；逐图记录：2026-11-04。480 份 SVG 原件均通过原始哈希校验。AutoFigure 提供 79 张预览；0030 由原始 SVG 渲染，0062 的原始 SVG 损坏，保留原件下载。' : 'Aggregate snapshot: 2026-11-10 · paper_full80_20261110; per-image records: 2026-11-04. All 480 original SVGs match their recorded hashes. AutoFigure has 79 previews; 0030 was rendered from the original SVG. The damaged original SVG for 0062 remains available for download.'}</p>
        {data.methods.filter(method => mainIds.includes(method.id)).map(method => <p key={method.id}><b>{method.name}</b> · {method.variant}<br />{method.model}</p>)}
      </div>
    </div>
    <div className="research-table-scroll"><table className="research-table"><caption>{zh ? '各配置与方法的资源记录 · 每项 80 图' : 'Resource records by configuration and method · 80 images each'}</caption><thead><tr><th>{zh ? '配置 / 方法' : 'Configuration / method'}</th><th>USD / {zh ? '图' : 'image'}</th><th>{zh ? '记录分钟 / 图' : 'Recorded min / image'}</th><th>API Token / {zh ? '图' : 'image'}</th></tr></thead><tbody>{data.methods.map(method => <tr key={method.id}><th>{method.name}</th><td>{number(data.resources[method.id].cost, 3)}</td><td>{number(data.resources[method.id].minutes, 2)}</td><td>{Math.round(data.resources[method.id].tokens).toLocaleString()}</td></tr>)}</tbody></table></div>
    <div className="research-downloads">{[['四方法评分.csv', zh ? '四方法评分' : 'Four-method scores'], ['消融评分.csv', zh ? '消融评分' : 'Ablation scores'], ['论文汇总评分.csv', zh ? '论文均分与置信区间' : 'Paper means & confidence intervals'], ['history/20261104/评分计数.csv', zh ? '历史判断计数 · 11 月 4 日' : 'Historical judgment counts · Nov 4'], ['provenance.json', zh ? '版本与哈希' : 'Versions & hashes']].map(([file, title]) => <a key={file} href={asset(file)} download>{title} ↓</a>)}</div>
  </details>;
}
