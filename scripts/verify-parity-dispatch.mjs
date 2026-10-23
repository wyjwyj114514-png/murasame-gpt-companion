import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createDispatcher} from '../dist/gpt-murasame-local/runtime/dispatcher.mjs';
const dispatcher=createDispatcher({dataDir:fs.mkdtempSync(path.join(os.tmpdir(),'murasame-dispatch-')),monitor:false,autoRefresh:false});
try{
  for(const route of ['https://untrusted.example/dsh-whale/size.json','//untrusted/dsh-whale/size.json','/dsh-whale/size.json\\bad'])assert.equal((await dispatcher.dispatch(route)).status,400);
  assert.equal((await dispatcher.dispatch('/dsh-whale/size.json',{method:'PATCH'})).status,405);
  assert.equal((await dispatcher.dispatch('/dsh-whale/size.json',{method:'POST',body:Buffer.alloc(32*1024*1024+1)})).status,413);
  assert.equal((await dispatcher.dispatch('/dsh-whale/bubble-img-upload.json')).status,405);
  assert.equal((await dispatcher.dispatch('/dsh-whale/size.json',{method:'POST',body:{scale:1,sound:false,vol:0}})).status,200);
  const size=JSON.parse((await dispatcher.dispatch('/dsh-whale/size.json')).body);assert.equal(size.sound,false);assert.equal(size.version,'0.4.0');
  fs.writeFileSync('work/parity-dispatch.json',JSON.stringify({ok:true,pathValidation:true,methodValidation:true,maxBody:true,objectBody:true,isolatedSettings:true},null,2));console.log('Parity dispatcher preserves local-path, method and body limits.');
}finally{await dispatcher.close();}
