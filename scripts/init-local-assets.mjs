import fs from 'node:fs';
fs.mkdirSync('private-assets/voice',{recursive:true});
const media='character-pack';
if(!fs.existsSync('private-assets/character.png')||fs.readFileSync('private-assets/character.png').equals(fs.readFileSync('assets/placeholder.png')))fs.copyFileSync(media+'/character.png','private-assets/character.png');
const source=JSON.parse(fs.readFileSync(media+'/voice/manifest.json','utf8'));
for(const name of source.tracks)if(!fs.existsSync('private-assets/voice/'+name))fs.copyFileSync(media+'/voice/'+name,'private-assets/voice/'+name);
const target='private-assets/voice/manifest.json';
if(!fs.existsSync(target)||JSON.parse(fs.readFileSync(target,'utf8')).tracks.length===0)fs.copyFileSync(media+'/voice/manifest.json',target);
console.log('Murasame image and 503 built-in voices ready; existing user settings are preserved.');
