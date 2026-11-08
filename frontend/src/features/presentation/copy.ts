import type { Copy, SceneId } from './types';
export const titles: Record<SceneId, Copy> = {
  opening: { en: 'From pixels.\nTo structure.', zh: '从像素\n到结构' }, assets: { en: 'Reconstruct.', zh: '重建' }, draft: { en: 'Reconstruct.', zh: '重建' },
  evidence: { en: 'Inspect.', zh: '检查' }, targets: { en: 'Repair.', zh: '修复' }, repair: { en: 'Repair.', zh: '修复' }, editable: { en: 'Now editable.', zh: '继续编辑' },
};
export const copy = {
  reference: { en: 'Reference', zh: '原图' }, svgDraft: { en: 'SVG draft', zh: 'SVG 初稿' }, draft: { en: 'Draft', zh: '初稿' },
  sam: { en: 'SAM assets', zh: 'SAM 素材' }, crops: { en: 'Crop illustration', zh: '素材示意' }, direction: { en: 'Direction', zh: '方向' },
  target: { en: 'Target', zh: '目标' }, operations: { en: 'Operations', zh: '操作' }, before: { en: 'Before', zh: '修改前' }, after: { en: 'After', zh: '修复后' },
  repaired: { en: 'Repaired', zh: '已修复' }, edit: { en: 'Edit', zh: '编辑' }, image: { en: 'Image', zh: '图像' }, shape: { en: 'Shape', zh: '图形' }, text: { en: 'Text', zh: '文字' },
  mode: { en: 'Recorded example', zh: '案例演示' }, menu: { en: 'Menu', zh: '菜单' }, close: { en: 'Close', zh: '关闭' },
  next: { en: 'Next scene', zh: '下一幕' }, previous: { en: 'Previous scene', zh: '上一幕' },
  fullFigure: { en: 'Toggle full figure', zh: '切换完整图' }, language: { en: '中文', zh: 'English' },
  fullscreen: { en: 'Fullscreen', zh: '全屏' }, details: { en: 'Technical details', zh: '技术详情' }, case: { en: 'Case materials', zh: '案例资料' },
  offline: { en: 'Download offline version', zh: '下载离线版' }, packaged: { en: 'Packaged for offline use', zh: '已离线打包' },
  reset: { en: 'Reset walkthrough', zh: '重置演示' }, restore: { en: 'Restore case', zh: '恢复案例' },
  loading: { en: 'Preparing the stage', zh: '正在准备舞台' }, begin: { en: 'Begin', zh: '开始' }, retry: { en: 'Retry', zh: '重试' },
  failed: { en: 'Unable to prepare resources', zh: '素材准备失败' }, input: { en: 'Edit SVG text', zh: '编辑 SVG 文字' },
  apply: { en: 'Confirm text', zh: '确认文字' }, cancel: { en: 'Cancel input', zh: '撤销输入' },
  fullscreenFailed: { en: 'Use the browser fullscreen control.', zh: '请使用浏览器的全屏控制。' },
} satisfies Record<string, Copy>;
export const stages = [{ en: 'I Reconstruct', zh: 'I 重建' }, { en: 'II Inspect', zh: 'II 检查' }, { en: 'III Repair', zh: 'III 修复' }];
