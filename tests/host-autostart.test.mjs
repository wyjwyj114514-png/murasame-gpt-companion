import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
test('宿主再次打开会启动丛雨；托盘驻留、瞬时进程抖动及用户本次退出不反复启动',()=>{
  const script=`$ErrorActionPreference='Stop';. ./scripts/host-autostart-policy.ps1
    $s=@{launched=$false;missingSince=$null};$t=[DateTime]::UtcNow
    $results=@()
    $results+=(Test-MurasameAutoLaunch $s $false $t)
    $results+=(Test-MurasameAutoLaunch $s $true $t)
    $results+=(Test-MurasameAutoLaunch $s $true $t.AddSeconds(2))
    $results+=(Test-MurasameAutoLaunch $s $false $t.AddSeconds(3))
    $results+=(Test-MurasameAutoLaunch $s $true $t.AddSeconds(4))
    $results+=(Test-MurasameAutoLaunch $s $false $t.AddSeconds(6))
    $results+=(Test-MurasameAutoLaunch $s $false $t.AddSeconds(8))
    $results+=(Test-MurasameAutoLaunch $s $true $t.AddSeconds(10))
    $results+=(Test-MurasameAutoLaunch $s $true $t.AddSeconds(11) 123)
    $results+=(Test-MurasameAutoLaunch $s $true $t.AddSeconds(12) 123)
    $results+=(Test-MurasameAutoLaunch $s $true $t.AddSeconds(13) 456)
    $results | ConvertTo-Json -Compress`;
  const actual=execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-Command',script],{encoding:'utf8',windowsHide:true});
  assert.deepEqual(JSON.parse(actual),[false,true,false,false,false,false,false,true,true,false,true]);
});
