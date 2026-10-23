import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function openFloating(config){
  const {bridgeRequest}=await import(pathToFileURL(config.bridge));
  const options={dataDir:config.dataDir,timeoutMs:700};
  let status;try{status=await bridgeRequest('/api/status',options);}catch{}
  if(!status?.rendererReady){
    if(!fs.existsSync(config.launcher))throw Error('可拖动丛雨的启动器缺失');
    const child=spawn(config.launcher,[],{windowsHide:true,detached:true,stdio:'ignore'});
    await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();
    for(let i=0;i<30;i++){await delay(300);try{status=await bridgeRequest('/api/status',options);if(status.rendererReady)break;}catch{}}
  }
  if(!status?.rendererReady)throw Error('丛雨暂未启动，请检查本地启动器');
  await bridgeRequest('/api/show',{...options,method:'POST'});
  for(let i=0;i<10;i++){await delay(200);status=await bridgeRequest('/api/status',options);if(status.visible&&status.diagnostics?.native?.ownerMatches)break;}
  return {ready:true,presentation:'floating',visible:!!status.visible,attached:!!status.diagnostics?.native?.ownerMatches};
}
