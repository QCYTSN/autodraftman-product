// One settings boundary for the FigFox and SVG-Edit interfaces.
const key = 'figfox-editor-preferences-v1';
export function readSettings() {
  try { return validate(JSON.parse(localStorage.getItem(key) || '{}')); } catch { return {}; }
}
function validate(value) {
  const result = {};
  if (!value || typeof value !== 'object') return result;
  for (const name of ['showRulers', 'showGrid', 'gridSnapping']) if (typeof value[name] === 'boolean') result[name] = value[name];
  if (Number.isFinite(value.snappingStep) && value.snappingStep > 0) result.snappingStep = value.snappingStep;
  if (['px', 'mm', 'cm', 'in', 'pt', 'pc', 'em', 'ex'].includes(value.baseUnit)) result.baseUnit = value.baseUnit;
  for (const name of ['gridColor', 'bkgd_color']) if (typeof value[name] === 'string' && (CSS.supports('color', value[name]) || name === 'bkgd_color' && value[name] === 'chessboard')) result[name] = value[name];
  if (typeof value.bkgd_url === 'string' && /^(?:https?:\/\/|data:image\/(?:png|jpeg|webp|gif);base64,|$)/i.test(value.bkgd_url)) result.bkgd_url = value.bkgd_url;
  return result;
}
export function installSettings(editor, onChange, send) {
  const canvas = editor.svgCanvas;
  const state = () => ({
    ...Object.fromEntries(['baseUnit', 'showRulers', 'showGrid', 'gridSnapping', 'snappingStep', 'gridColor'].map(name => [name, editor.configObj.curConfig[name]])),
    bkgd_color: editor.configObj.pref('bkgd_color') || '#FFF', bkgd_url: editor.configObj.pref('bkgd_url') || '',
  });
  const persist = () => {
    try { localStorage.setItem(key, JSON.stringify(state())); }
    catch { send('command-error', { message: '无法保存编辑偏好 / Could not save editor preferences' }); }
  };
  const sync = () => {
    canvas.setConfig(editor.configObj.curConfig);
    document.documentElement.toggleAttribute('data-rulers', Boolean(editor.configObj.curConfig.showRulers));
    editor.rulers.display(Boolean(editor.configObj.curConfig.showRulers));
    window.figfoxRefreshGrid?.();
    editor.updateCanvas(); persist(); onChange();
  };
  const apply = value => {
    const settings = validate(value);
    for (const [name, next] of Object.entries(settings)) {
      if (!name.startsWith('bkgd_')) editor.configObj.curConfig[name] = next;
    }
    if ('bkgd_color' in settings || 'bkgd_url' in settings) editor.setBackground(settings.bkgd_color ?? state().bkgd_color, settings.bkgd_url ?? state().bkgd_url);
    sync();
  };
  const originalSave = editor.mainMenu.savePreferences.bind(editor.mainMenu);
  window.addEventListener('figfox-preferences-changed', () => { persist(); onChange(); });
  editor.mainMenu.savePreferences = async event => {
    const dialog = document.getElementById('se-edit-prefs');
    // 7.4.2 omits this field from the dialog's change event.
    event.detail.gridcolor = dialog.shadowRoot.getElementById('grid_color').value;
    const requestedLanguage = event.detail.lang;
    event.detail.lang = editor.configObj.pref('lang');
    await originalSave(event); sync();
    if (requestedLanguage !== editor.configObj.pref('lang')) send('language', { language: requestedLanguage.startsWith('zh') ? 'zh' : 'en' });
  };
  return { state, apply, sync, persist };
}
