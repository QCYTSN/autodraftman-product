# FigFox V2 · 两分钟讲稿

七个状态，六次前进。动画结束后停留，由讲解者控制节奏。

| 时间 | 状态 | 中文讲稿 | 配合操作 |
| --- | --- | --- | --- |
| 0–10s | opening | 这张科研图最初只是像素。FigFox 的目标，是把它重建成可以定位、检查和继续编辑的 SVG 结构。 | 停留展示原图，然后前进。 |
| 10–32s | assets | 系统先利用局部视觉素材辅助重建。这里展示的是原图裁片的机制示意：每一块素材都能回到自己的来源位置；它们不是本案例的原始 SAM 分割结果。 | 等素材展开，依次选择车辆和图结构，指出来源。 |
| 32–48s | draft | 初稿已经包含不同类型的 SVG 对象。图像仍是图像，路径与文字可以单独选中；但结构可编辑，还不等于图形已经正确。 | 等 Image、Shape、Text 依次显现，停在文字。 |
| 48–76s | evidence | 现在把原图与初稿各自的对应局部放大。原图中的绿色路径向上，再向右指向 pooling；初稿却向下指向特征点。这个差异已经有对应的事实核查记录。 | 指出两侧真实箭头；需要时切换完整图，再恢复局部。 |
| 76–94s | targets | 核查后的问题被映射到具体 SVG 对象。这里一项操作修改绿色路径，另一项调整同事务关联的特征对象，修改范围可以直接看见。 | 点击 set，再点击 replace，展示对象与操作的对应。 |
| 94–110s | repair | 本地执行器把操作计划落实到 SVG。这里是该事务真实的执行前后快照，既能看见箭头方向变化，也能检查关联对象。 | 切换 Before / After，或按住 B 再松开。 |
| 110–120s | editable | 最终结果仍然可以继续编辑。我修改这段文字，再导出实际修改后的 SVG。 | Edit → 输入 Demo Pooling → Enter → SVG。 |

## Equivalent English script

1. **opening · 10s** — This research figure begins as pixels. FigFox reconstructs it into SVG structure that we can locate, inspect and continue editing.
2. **assets · 22s** — Local visual assets support reconstruction. These reference crops illustrate the mechanism, and each maps back to its source region; they are not the original SAM outputs for this case.
3. **draft · 16s** — The draft contains distinct SVG objects: an image remains an image, while paths and text can be selected independently. Editable structure still needs to be checked for correctness.
4. **evidence · 28s** — We zoom into independently located regions at the same scale. The reference path rises and turns right toward pooling; the draft points down toward a feature dot. A recorded fact check confirms this discrepancy.
5. **targets · 18s** — The verified issue maps to actual SVG objects. One operation updates the green path, and the other updates related feature objects in the same transaction.
6. **repair · 16s** — The local executor applies that plan. These are the actual before and after transaction snapshots, showing both the arrow change and the related objects.
7. **editable · 10s** — The final result remains editable. I can change this label and export the SVG with that actual edit.

不要把素材展开动画描述成分割计算耗时；不要把执行完成描述成整图视觉质量全部通过。来源和记录范围可在菜单详情中回答。
