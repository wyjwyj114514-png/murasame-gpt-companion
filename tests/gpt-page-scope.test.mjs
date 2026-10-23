import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
test('附着且未最小化时保持显示；焦点切换不隐藏，独立模式和脱离宿主均不可显示', t => {
  if (!fs.existsSync(new URL('../dist/gpt-murasame-local/desktop/visibility.cjs', import.meta.url))) { t.skip('Needs local GPT build'); return; }
  const { createVisibilityController } = require('../dist/gpt-murasame-local/desktop/visibility.cjs');
  let visible = false;
  const state = { ready: true, quitting: false, manuallyHidden: false, standalone: false, fixture: false,
    host: { hostAlive: true, hostPid: 1, window: '1', visible: true, attached: true, modal: false, pageActive: true } };
  const window = { isDestroyed: () => false, isVisible: () => visible, hide: () => visible = false, showInactive: () => visible = true };
  const pending = [];
  const controller = createVisibilityController({
    getState: () => state,
    getWindow: () => window,
    schedule: fn => { pending.push(fn); return pending.length; }, cancel() {}
  });
  controller.update(); assert.equal(visible, true);
  // Clicking the companion focuses its own HWND, rather than the Codex HWND.
  state.host.pageActive = false; state.host.companionActive = true;
  controller.update(); assert.equal(visible, true);
  state.host.companionActive = false;
  state.host.pageActive = false; controller.update(); assert.equal(visible, true);
  state.standalone = true; controller.update(); assert.equal(visible, false);
  delete state.host.pageActive; controller.update(); assert.equal(visible, false);
  state.standalone=false;state.host.attached=false;controller.update();assert.equal(visible,false);
  state.host.attached=true;
  state.standalone = false; state.host.pageActive = true; state.host.visible = false; controller.update(); assert.equal(visible, false);
  state.host.visible = true; controller.update(); while (pending.length) pending.shift()(); assert.equal(visible, true);
  controller.dispose();
});
