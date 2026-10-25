import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { customizeWidget } from '../scripts/murasame-widget.mjs';

test('关闭气泡或订阅点击开关后仍发出语音事件，且不回退到旧金额气泡',()=>{
  let events=0;const context={window:{__murasameClickBalance:false,WhaleAccountView:{mode:'subscription'}},document:{dispatchEvent(){events++;}},CustomEvent:class{},oldClicks:0,bubbleOn:true};
  vm.createContext(context);vm.runInContext(customizeWidget('function whaleClick() {oldClicks++;}'),context);context.whaleClick();assert.equal(context.oldClicks,0);assert.equal(events,1);
  context.window.WhaleAccountView.mode='api';context.bubbleOn=false;context.whaleClick();assert.equal(context.oldClicks,0);assert.equal(events,2);
});

test('点击同时触发语音和余额；狗修金称呼不污染原模板；可恢复原气泡队列', () => {
  const original = [{ type: 'text', text: '老大', size: 8 }, { type: 'balance', size: 20, tpl: '{balance_ds}' }];
  const events = [], scenes = [];
  const context = { window: {}, document: { dispatchEvent: e => events.push(e.type) }, CustomEvent: class { constructor(type) { this.type = type; } },
    root: {}, BUBBLE_MS: 5000, bubbleRoundOn: false, bubbleSeqIdx: 0, bubbleDefaultFirstModules: () => original,
    sceneOpen: (_kind, render) => render(), bubbleRenderModules: modules => scenes.push(modules), oldClicks: 0 };
  vm.createContext(context);
  vm.runInContext(customizeWidget('function whaleClick() { oldClicks++; }'), context);
  context.whaleClick();
  assert.deepEqual(events, ['murasame:pet-click']);
  assert.equal(scenes[0][0].text, '狗修金，你的余额');
  assert.equal(scenes[0][0].size, 4);
  assert.equal(scenes[0][1].size, 20);
  assert.equal(original[0].size, 8);
  assert.equal(scenes[0][1].tpl, '{balance_ds}');
  assert.equal(original[0].text, '老大');
  assert.equal(context.bubbleSeqIdx, 1);
  assert.equal(context.oldClicks, 0);
  context.window.__murasameClickBalance = false; context.whaleClick();
  assert.equal(context.oldClicks, 1); assert.equal(scenes.length, 1);
});

test('订阅模式点击进入额度气泡，不冒充金额余额', () => {
  let toggles = 0;
  const context = { window: { WhaleAccountView: { mode: 'subscription', toggleBubble: () => toggles++ } }, document: { dispatchEvent() {} }, CustomEvent: class {}, root: {} };
  vm.createContext(context); vm.runInContext(customizeWidget('function whaleClick() {}'), context); context.whaleClick();
  assert.equal(toggles, 1);
});
