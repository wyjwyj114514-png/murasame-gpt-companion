import {spawn} from 'node:child_process';
import {once} from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
const start=Date.now(),child=spawn(path.resolve('node_modules/electron/dist/electron.exe'),[path.resolve('packages/dsh/verify-ui.cjs')],{env,windowsHide:true,stdio:'ignore'});
const timer=setTimeout(()=>child.kill(),90000),[code]=await once(child,'exit');clearTimeout(timer);
const file='work/dsh-ui-verification/report.json';if(!fs.existsSync(file)||fs.statSync(file).mtimeMs<start)throw Error('DSH UI report missing or stale');
const report=JSON.parse(fs.readFileSync(file,'utf8'));if(code!==0||!report.ok)throw Error(report.error||'DSH UI failed');console.log(JSON.stringify(report));
