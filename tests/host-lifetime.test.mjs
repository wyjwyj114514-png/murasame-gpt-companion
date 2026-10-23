import test from 'node:test';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
test('宿主驻留托盘时继续运行，重开窗口恢复，只有宿主进程结束后退出',()=>{
  const output=execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','tests/host-lifetime.ps1'],{encoding:'utf8',windowsHide:true});
  assert.match(output,/Host lifetime checks passed/);
});
