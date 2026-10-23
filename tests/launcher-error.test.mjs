import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';

test('后台启动进程创建失败时显示错误窗口，而不是继续隐藏', async () => {
  const worker = new EventEmitter(), loads = [];
  let visible = false;
  const progress = {loadURL:async url=>loads.push(url),show:()=>visible=true,isDestroyed:()=>false};
  const electron = {
    app:{setName(){},setPath(){},requestSingleInstanceLock:()=>true,whenReady:()=>({then:fn=>fn()}),on(){}},
    BrowserWindow:function(){return progress;}
  };
  const modules = {
    electron,'node:fs':{mkdirSync(){},openSync:()=>1,closeSync(){}},'node:path':path,
    'node:child_process':{spawn:()=>worker},'node:url':{pathToFileURL:()=>''},
    './launcher-config.json':{projectRoot:'C:/fixture'}
  };
  // Run the native launch/error handlers without starting the separate IPC poll.
  const source = fs.readFileSync(new URL('../packages/desktop/launcher.cjs',import.meta.url),'utf8');
  const marker = '  const { bridgeRequest } = await import';
  assert.equal(source.split(marker).length, 2);
  vm.runInNewContext(source.slice(0,source.indexOf(marker))+'});', {__dirname:'C:/fixture/app',require:name=>modules[name],process:{execPath:'fixture.exe',env:{}}});
  await new Promise(resolve=>setImmediate(resolve));
  worker.emit('error',new Error('fixture spawn denied'));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(visible,true);
  assert.match(decodeURIComponent(loads.at(-1)),/丛雨启动失败/);
});
