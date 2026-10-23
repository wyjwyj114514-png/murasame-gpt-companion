import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root=process.cwd(),output=path.join(root,'outputs/Project-Murasame-GPT-portable-0.3.1');
const target=path.join(output,'resources/project/dist/gpt-murasame-local');
const backup=path.join(root,'work/backups/portable-'+new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(backup,{recursive:true});fs.cpSync(target,path.join(backup,'gpt-murasame-local'),{recursive:true});
fs.cpSync(path.join(root,'dist/gpt-murasame-local'),target,{recursive:true});
const hashes=[];
function record(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())record(file);else if(file!==path.join(output,'SHA256.json'))hashes.push({file:path.relative(output,file).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});}}
record(output);fs.writeFileSync(path.join(output,'SHA256.json'),JSON.stringify(hashes,null,2));
console.log(JSON.stringify({backup,tracks:JSON.parse(fs.readFileSync(path.join(target,'private-assets/voice/manifest.json'),'utf8')).tracks.length}));
