import path from 'node:path';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {bridgeRequest} from '../dist/gpt-murasame-local/runtime/bridge.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const options={dataDir:path.join(root,'private-assets/gpt-data'),timeoutMs:3000};
// Explicit recovery must resume a tray quit even when its launcher still owns
// the single-instance lock and starting another launcher would do nothing.
fs.rmSync(path.join(options.dataDir,'pause-until-host-exit.json'),{force:true});
const configFile=path.join(options.dataDir,'follow-config.json');
if(fs.existsSync(configFile)){
  const config=JSON.parse(fs.readFileSync(configFile,'utf8').replace(/^\uFEFF/,''));
  if(config.enabled===false){config.enabled=true;fs.writeFileSync(configFile,JSON.stringify(config,null,2));}
}
let running=false;
try { running=(await bridgeRequest('/api/status',options)).rendererReady; } catch {}
if(running){
  await bridgeRequest('/api/reset-position',{...options,method:'POST'});
  await bridgeRequest('/api/show',{...options,method:'POST'});
}else{
  const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
  const child=spawn(path.join(root,'outputs/Project-Murasame-GPT-local-0.2.0/electron.exe'),[],{cwd:root,env,windowsHide:true,detached:true,stdio:'ignore'});
  await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();
}
// Process creation alone is not success. Wait for the existing supervisor or
// new launcher to restore a renderer, then restore its position and visibility.
let status;
for(let attempt=0;attempt<90;attempt++){
  try{
    status=await bridgeRequest('/api/status',{...options,timeoutMs:700});
    if(status.rendererReady){
      if(!running){
        await bridgeRequest('/api/reset-position',{...options,method:'POST'});
        await bridgeRequest('/api/show',{...options,method:'POST'});
        running=true;
      }
      if(status.visible&&status.diagnostics?.native?.ownerMatches)break;
    }
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,300));
}
if(!status?.rendererReady||!status.visible||!status.diagnostics?.native?.ownerMatches)throw Error('Murasame did not recover inside the GPT window. Open GPT and try again.');
fs.writeFileSync(path.join(options.dataDir,'recovery-result.json'),JSON.stringify({ok:true,at:new Date().toISOString(),visible:true,attached:true},null,2));
