# FigFox V2 · 两分钟讲稿（小鸟案例）

当前案例 sample-0032。七个状态，六次前进。每次短动画结束后停留，由讲解者控制节奏。

| 时间 | 状态 | 中文讲稿 | 配合操作 |
| --- | --- | --- | --- |
| 0–10s | opening | 这张图包含照片、图标、网格和文字。接下来我们看三个环节如何交接：重建、检查，再把修复计划落实到 SVG。 | 展示原图，然后前进。 |
| 10–32s | assets | 这三块是真实的 SAM 素材：小鸟、训练标记和冻结标记。它们从初稿内嵌文件中恢复，并与同一次运行的素材哈希核对一致。选中素材，可以看到它在原图中的位置。 | 等素材展开，选择 Train icon 和 Freeze icon。 |
| 32–48s | draft | 原图和局部素材分别交给生成模型，由模型形成 SVG 初稿。SAM 提供视觉素材，生成模型负责组织结构；随后可以分别选中图像、网格和文字。 | 指出两个输入进入 Draft model，再看 Image、Shape、Text。 |
| 48–76s | evidence | 检查先形成全图的问题记录。这里有九条原始检测记录，我们聚焦 A2，再展开原图与初稿的对应证据：黑白单元格和圆点列被初稿改成了蓝色竖条。后续复核确认了这一处差异。 | 先看 Issue map 自动聚焦，再指向两侧表格。I 可停留查看分布；R 可重播。 |
| 76–94s | targets | 复核成立后，规划环节把问题映射到具体 SVG 对象。这里的 Plan 只有一项 replace，修改范围就是这组哈希表。 | 指出 Confirmed A2 → Plan → replace。 |
| 94–110s | repair | 同一项操作交给本地执行器，先修改 SVG 对象，再渲染显示。这里使用该事务的真实前后快照：网格被恢复，表格之外的内容保持不变。 | 看 Local execution → Render，然后按住 B 再松开。 |
| 110–120s | editable | 结果仍可编辑，也保留未解决项记录。这次记录为零。我把 Hash Table 改成 Demo Table，再导出实际 SVG。 | Edit → Demo Table → Enter → SVG。 |

## Equivalent English script

1. **opening · 10s** — This figure combines photos, icons, grids and labels. FigFox reconstructs those pixels into SVG objects we can inspect and continue editing.
2. **assets · 22s** — These are three actual SAM assets: a bird, a training icon and a freeze icon. Their embedded bytes match the asset hashes from the same recorded run. Selecting each asset locates its source region.
3. **draft · 16s** — The original figure and local assets enter the draft model separately. SAM supplies visual assets; the model organizes SVG structure. Images, graphics and labels then become independently selectable objects.
4. **evidence · 28s** — Inspection produces an issue map. We show nine original detector records, select A2, and open the paired evidence. Separate black-and-white cells and dots became broad blue strips. The later review confirms this discrepancy.
5. **targets · 18s** — After review, planning maps the confirmed issue to a concrete SVG group. This plan contains one replace operation for the hash table, with a visible scope.
6. **repair · 16s** — The same operation passes to local execution. The SVG object changes first, then it is rendered. These recorded transaction snapshots restore the grid while preserving everything outside the target.
7. **editable · 10s** — The editable result also retains outstanding items; this record has zero. I can change Hash Table to Demo Table and export the edited SVG.

素材源位置经过人工视觉核验；没有把它宣称为恢复出的 SAM 原始边界或 mask。完整 SAM 目录缺失，所以不报告分割总数。动画不是计算耗时；执行完成也不等于整图视觉评价全部通过。

## 按需补充，不增加主讲步骤

- **Gap guidance**：协议或执行器能力存在缺口时才走这条辅助支路。本案例为“未记录”，不能把它说成已调用或明确未触发。点虚线支路旁的标签可查看。
- **Unresolved 0**：这次执行记录的保留清单为空；整图视觉验收仍是“未记录”。点标记可分开查看执行状态与视觉验收。
- **问题分布**：九条编号是 G1 原始检测记录，不等于九条最终都被复核确认。A2 已确认；原始坐标与文本没有被静默纠正。
- **时间线**：每段在 1.1 秒内完成并停住，动画展示记录间的交接，不表示模型计算耗时。R 重播当前交接；I 在 evidence 中开关问题分布。
