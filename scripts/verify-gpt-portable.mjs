import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),source=path.join(root,'outputs/Project-Murasame-GPT-portable-0.3.1');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'murasame-portable-'));
const moved=path.join(temporary,'异目录 带空格'),dataDir=path.join(temporary,'test-data');
fs.cpSync(source,moved,{recursive:true});
for(const item of JSON.parse(fs.readFileSync(path.join(moved,'SHA256.json'),'utf8')))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(moved,item.file))).digest('hex'),item.sha256,item.file);
const {bridgeRequest}=await import(pathToFileURL(path.join(moved,'resources/project/dist/gpt-murasame-local/runtime/bridge.mjs')));
const env={...process.env,MURASAME_DATA_DIR:dataDir};delete env.ELECTRON_RUN_AS_NODE;
const child=spawn(path.join(moved,'小丛雨.exe'),[],{cwd:temporary,env,windowsHide:true,stdio:'ignore'});
let childError;child.on('error',error=>childError=error);
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let status;
try{
  for(let i=0;i<100;i++){if(childError)throw childError;try{status=await bridgeRequest('/api/status',{dataDir,timeoutMs:500});if(status.rendererReady)break;}catch{}await delay(300);}
  assert.equal(status?.rendererReady,true,'moved portable launcher ready');
  const config=JSON.parse(fs.readFileSync(path.join(dataDir,'follow-config.json'),'utf8'));
  assert.ok(config.pluginRoot.startsWith(moved));assert.ok(config.electronPath.startsWith(moved));
  await bridgeRequest('/api/show',{dataDir,method:'POST'});
  for(let i=0;i<60;i++){status=await bridgeRequest('/api/status',{dataDir});if(/剩余 \d/.test(status.quotaUi?.cardText||''))break;await delay(300);}
  assert.match(status.quotaUi.cardText,/剩余 \d/);assert.equal(status.windowShapeError,null);
  const sound=JSON.parse(fs.readFileSync(path.join(dataDir,'.dshw-size.json'),'utf8'));assert.equal(sound.sound,false);assert.equal(sound.vol,0);
  const result={ok:true,at:new Date().toISOString(),relocatedTo:moved,dataDir,independentRuntime:true,officialQuota:true,quackMuted:true,rendererReady:status.rendererReady,filesVerified:true};
  assert.equal(status.diagnostics?.native?.ownerMatches,true,'native overlay attached to host');
  fs.writeFileSync(path.join(root,'work/portable-gpt-verification-0.3.1.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{
  spawnSync(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-ExecutionPolicy','Bypass','-File',path.join(moved,'resources/project/dist/gpt-murasame-local/desktop/supervisor.ps1'),'-DataDir',dataDir,'-Stop'],{windowsHide:true,stdio:'ignore'});
  for(let i=0;i<50&&child.exitCode===null;i++)await delay(200);
  if(child.exitCode===null)child.kill();
}
