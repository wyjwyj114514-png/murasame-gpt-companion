import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
const root=process.cwd(),source=path.resolve(process.argv[2]||''),manifest=JSON.parse(fs.readFileSync(path.join(source,'manifest.json'),'utf8'));
assert.ok(manifest.tracks.length>0&&manifest.tracks.length<=999);
assert.equal(new Set(manifest.tracks).size,manifest.tracks.length);
for(const name of manifest.tracks){assert.match(name,/^[0-9]{3}\.mp3$/);const clip=manifest.clips.find(c=>c.file===name);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(source,name))).digest('hex'),clip.sha256);}
const backup=path.join(root,'work/backups/voice-'+new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(backup,{recursive:true});fs.cpSync(path.join(root,'private-assets/voice'),path.join(backup,'voice'),{recursive:true});
for(const name of manifest.tracks)fs.copyFileSync(path.join(source,name),path.join(root,'private-assets/voice',name));
// Manifest is written last so a reader never sees partially copied tracks.
fs.copyFileSync(path.join(source,'manifest.json'),path.join(root,'private-assets/voice/manifest.json'));
console.log(JSON.stringify({tracks:manifest.tracks.length,backup}));
