import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
test('正式 GPT 页面忽略旧 API 模式，且拒绝再次切到 API 余额', async t => {
  const file = new URL('../dist/gpt-murasame-local/desktop/ui/account-view.js', import.meta.url);
  if (!fs.existsSync(file)) { t.skip('Needs local GPT build'); return; }
  const context = { window: { whaleDesktop: {testMode:false} }, document: {readyState:'loading',addEventListener(){}}, localStorage: {getItem:()=> 'api'}, module:{exports:{}} };
  vm.createContext(context); vm.runInContext(fs.readFileSync(file,'utf8'), context);
  assert.equal(context.window.WhaleAccountView.mode, 'subscription');
  assert.equal(await context.window.WhaleAccountView.setMode('api'), false);
  assert.equal(context.window.WhaleAccountView.mode, 'subscription');
});

test('延迟返回的相同展示模式不会再次提交模式或收起气泡', async t => {
  if (!fs.existsSync(new URL('../dist/gpt-murasame-local/desktop/ui/account-view.js', import.meta.url))) { t.skip('Needs local GPT build'); return; }
  const events = []; let initialize, resolveMode;
  const context = {
    window:{whaleDesktop:{testMode:false},addEventListener(){},dispatchEvent:e=>events.push(e)},
    document:{readyState:'loading',addEventListener:(_name,fn)=>initialize=fn,head:{append(){}},createElement:()=>({textContent:''}),querySelector:()=>null,querySelectorAll:()=>[],documentElement:{dataset:{}}},
    localStorage:{getItem:()=> 'subscription',setItem(){}},
    CustomEvent:class {constructor(type){this.type=type;}},
    fetch:()=>new Promise(resolve=>resolveMode=resolve)
  };
  vm.runInNewContext(fs.readFileSync(new URL('../dist/gpt-murasame-local/desktop/ui/account-view.js',import.meta.url),'utf8'),context);
  initialize();
  resolveMode({ok:true,json:async()=>({mode:'subscription'})});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(events.length,0,'初始化响应不应触发会关闭气泡的 commit');
});
