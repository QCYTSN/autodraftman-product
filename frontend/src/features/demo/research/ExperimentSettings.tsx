import { useResearch } from './ResearchContext';
import { asset, mainIds, number } from './data';

export function ExperimentSettings() {
  const { data, language } = useResearch();
  if (!data) return null;
  const zh = language === 'zh';
  return <details className="research-settings research-experiment-settings" id="research-settings">
    <summary>{zh ? '实验设置与数据说明' : 'Experiment settings & data notes'}</summary>
    <div className="research-settings-grid">
      <div><h3>{zh ? '输入与评分' : 'Inputs & evaluation'}</h3>
        <p>{zh ? '80 张冻结原图，四档视觉拥挤度各 20 张。11 月 4 日 Codex 复核覆盖六种方法 / 配置、17 项标准，共 8,160 项判断。' : '80 frozen inputs, with 20 per visual-clutter stratum. The November 4 Codex review covers six methods / configurations and 17 criteria, totaling 8,160 judgments.'}</p>
        <p>{zh ? '每项指标先取组内所有方法都有通过 / 失败判断的共同有效图，再计算通过比例 × 100。四方法对比与三配置消融分别取交集，因此同一 FigFox 指标在两组中的分数可能不同。未知与 NA 不计入该项分母。' : 'Each criterion uses figures with a pass / fail judgment for every method in its group, then scores 100 × pass / eligible images. Four-method and three-configuration comparisons form separate intersections, so FigFox scores can differ between them. Unknown and NA are excluded from that criterion’s denominator.'}</p>
        <p>{zh ? 'D09 沿用历史汇总，单独标注；其余 16 项采用当前 Codex 复核。D09 不计入排名与消融图。排名依据未四舍五入的分数，相同分数并列。展开样本记录可查看逐图判断、证据与原件哈希。' : 'D09 retains separately labeled historical aggregates; the other 16 criteria use the current Codex review. D09 is excluded from ranks and ablation charts. Ranks use unrounded scores, with ties sharing a rank. Expanded sample records contain individual judgments, evidence and original-file hashes.'}</p>
      </div>
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
        <p>{zh ? '数据快照：2026-11-04 · Codex harness 复核。480 份 SVG 原件均通过原始哈希校验。AutoFigure 提供 79 张预览；0030 由原始 SVG 渲染，0062 的原始 SVG 损坏，保留原件下载。' : 'Snapshot: 2026-11-04 · Codex harness review. All 480 original SVGs match their recorded hashes. AutoFigure has 79 previews; 0030 was rendered from the original SVG. The damaged original SVG for 0062 remains available for download.'}</p>
        {data.methods.filter(method => mainIds.includes(method.id)).map(method => <p key={method.id}><b>{method.name}</b> · {method.variant}<br />{method.model}</p>)}
      </div>
    </div>
    <div className="research-table-scroll"><table className="research-table"><caption>{zh ? '各配置与方法的资源记录 · 每项 80 图' : 'Resource records by configuration and method · 80 images each'}</caption><thead><tr><th>{zh ? '配置 / 方法' : 'Configuration / method'}</th><th>USD / {zh ? '图' : 'image'}</th><th>{zh ? '记录分钟 / 图' : 'Recorded min / image'}</th><th>API Token / {zh ? '图' : 'image'}</th></tr></thead><tbody>{data.methods.map(method => <tr key={method.id}><th>{method.name}</th><td>{number(data.resources[method.id].cost, 3)}</td><td>{number(data.resources[method.id].minutes, 2)}</td><td>{Math.round(data.resources[method.id].tokens).toLocaleString()}</td></tr>)}</tbody></table></div>
    <div className="research-downloads">{[['四方法评分.csv', zh ? '四方法评分' : 'Four-method scores'], ['消融评分.csv', zh ? '消融评分' : 'Ablation scores'], ['评分计数.csv', zh ? '判断计数' : 'Judgment counts'], ['provenance.json', zh ? '版本与哈希' : 'Versions & hashes']].map(([file, title]) => <a key={file} href={asset(file)} download>{title} ↓</a>)}</div>
  </details>;
}
