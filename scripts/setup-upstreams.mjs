import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const sources=[['dsh-whale','https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget.git','5247dd6813d6e4430728f39ccc63d43cda046022'],['codex-whale','https://github.com/Yang-huai406/Codex-Whale-Public.git','4a7ec1240de82527f2222b4af5202fa7b2ad731b']];
fs.mkdirSync('upstream',{recursive:true});
for(const [name,url,sha] of sources){
 const dest=path.resolve('upstream',name);
 if(!fs.existsSync(dest)){fs.mkdirSync(dest);execFileSync('git',['init',dest],{stdio:'inherit'});execFileSync('git',['-C',dest,'remote','add','origin',url],{stdio:'inherit'});execFileSync('git',['-C',dest,'fetch','--depth','1','origin',sha],{stdio:'inherit'});execFileSync('git',['-C',dest,'checkout','--detach',sha],{stdio:'inherit'});}
 const head=execFileSync('git',['-C',dest,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
 if(head!==sha||execFileSync('git',['-C',dest,'status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Upstream mismatch or local changes: '+dest);
 console.log('Verified',name,head);
}
