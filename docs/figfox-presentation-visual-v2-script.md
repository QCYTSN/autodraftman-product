# FigFox V2 · 两分钟讲稿（小鸟案例）

当前案例 sample-0032。七个状态，六次前进。每次短动画结束后停留，由讲解者控制节奏。

| 时间 | 状态 | 中文讲稿 | 配合操作 |
| --- | --- | --- | --- |
| 0–10s | opening | 这张图包含照片、图标、网格和文字。FigFox 把这些像素重建成可以检查和继续编辑的 SVG 对象。 | 展示原图，然后前进。 |
| 10–32s | assets | 这三块是真实的 SAM 素材：小鸟、训练标记和冻结标记。它们从初稿内嵌文件中恢复，并与同一次运行的素材哈希核对一致。选中素材，可以看到它在原图中的位置。 | 等素材展开，选择 Train icon 和 Freeze icon。 |
| 32–48s | draft | 初稿包含可以分别选择的图像、图形和文字。图片得到保留，网格与标题可以继续编辑。不过，对象可编辑，并不代表内容已经正确。 | 等 Image、Shape、Text 依次显现。 |
| 48–76s | evidence | 放大左上角的哈希表。原图是分隔清楚的黑白单元格，中间有一列圆点；初稿把它变成了大块蓝色竖条，单元格排列也发生了变化。记录中的局部核查确认了这个差异。 | 指向两侧表格；需要时切换完整图，再恢复局部。 |
| 76–94s | targets | 问题现在对应到具体的 SVG 对象。这里选中的是整组哈希表，计划中的 replace 操作会替换这一个对象。修改范围可以直接看见。 | 点击 replace 或用 Tab、Enter 选择。 |
| 94–110s | repair | 这里是这一个事务的真实执行前后快照。可以看到单元格的分隔、黑白排列和圆点列被恢复；表格之外的内容保持不变。 | 切换 Before / After，或按住 B 再松开。 |
| 110–120s | editable | 最终 SVG 还能继续编辑。我把 Hash Table 改成 Demo Table，再导出带有这次修改的 SVG。 | Edit → Demo Table → Enter → SVG。 |

## Equivalent English script

1. **opening · 10s** — This figure combines photos, icons, grids and labels. FigFox reconstructs those pixels into SVG objects we can inspect and continue editing.
2. **assets · 22s** — These are three actual SAM assets: a bird, a training icon and a freeze icon. Their embedded bytes match the asset hashes from the same recorded run. Selecting each asset locates its source region.
3. **draft · 16s** — We can select an image, a graphic and a text object independently. Photos are preserved, while grids and labels remain editable. Editable objects still need checking for correctness.
4. **evidence · 28s** — Look at the upper-left hash table. The reference has separate black-and-white cells and a lane of dots. The draft substitutes broad blue strips and changes the cell pattern. The recorded local fact check confirms this difference.
5. **targets · 18s** — The issue maps to a concrete SVG group. The recorded replace operation targets this hash table, so we can see the exact scope of the change.
6. **repair · 16s** — These are actual before and after snapshots of that transaction. The cell boundaries, black-and-white pattern and dot lane are restored. Everything outside the table remains unchanged.
7. **editable · 10s** — The final SVG stays editable. I can change Hash Table to Demo Table and export the SVG with that edit.

素材源位置经过人工视觉核验；没有把它宣称为恢复出的 SAM 原始边界或 mask。完整 SAM 目录缺失，所以不报告分割总数。动画不是计算耗时；执行完成也不等于整图视觉评价全部通过。
