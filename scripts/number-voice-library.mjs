import fs from 'node:fs';
import assert from 'node:assert/strict';
const file='private-assets/voice/manifest.json',manifest=JSON.parse(fs.readFileSync(file,'utf8'));
let previous=-1;const rows=['编号,文件名,视频起点秒,视频终点秒'];
manifest.tracks.forEach((id,i)=>{
  assert.equal(id,String(i+1).padStart(3,'0')+'.mp3');
  const clip=manifest.clips.find(c=>c.file===id);assert.ok(clip&&clip.start>=previous);previous=clip.start;
  clip.number=i+1;clip.label='第 '+(i+1)+' 段';rows.push([i+1,id,clip.start,clip.end].join(','));
});
manifest.order='video-timeline';fs.writeFileSync(file,JSON.stringify(manifest,null,2));
fs.writeFileSync('outputs/丛雨_语音编号与视频时间.csv','\uFEFF'+rows.join('\r\n'));
console.log('Verified video order 001-'+manifest.tracks.length+'; numbering CSV saved');
