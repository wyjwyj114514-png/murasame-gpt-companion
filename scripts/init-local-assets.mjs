import fs from 'node:fs';
fs.mkdirSync('private-assets/voice',{recursive:true});
if(!fs.existsSync('private-assets/character.png'))fs.copyFileSync('assets/placeholder.png','private-assets/character.png');
if(!fs.existsSync('private-assets/voice/manifest.json'))fs.writeFileSync('private-assets/voice/manifest.json',JSON.stringify({tracks:[],version:'empty-public-library'},null,2));
console.log('Local placeholder and empty library ready. Import your own media in Settings.');
