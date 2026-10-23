import {Worker} from 'node:worker_threads';
import path from 'node:path';
import os from 'node:os';
// Parsing runs outside the MCP event loop and never returns question contents.
export function createActivityReader({root=path.join(process.env.CODEX_HOME||path.join(os.homedir(),'.codex'),'sessions')}={}){
  const waiting=new Map();let error='',ready=false;
  const worker=new Worker(new URL('./session-worker.mjs',import.meta.url),{workerData:{root,intervalMs:1500,discoverMs:3000}});
  worker.on('message',message=>{ready=true;error=message.status?.error||'';for(const item of message.events||[])if(item.type==='wait'){if(item.meta.pending)waiting.set(item.meta.sessionId,item.meta.pending);else waiting.delete(item.meta.sessionId);}});
  worker.on('error',()=>{error='等待状态暂时无法读取';});worker.unref();
  return {get(){return {ok:ready&&!error,pending:[...waiting.values()].sort((a,b)=>b.ts-a.ts)[0]||null,error};},close:()=>worker.terminate()};
}
