import { VoicePlayer } from '/voice/browser.mjs';
const player = new VoicePlayer();
const $ = id => document.getElementById(id);
const status = text => { $('status').textContent = text; };
$('enabled').checked = player.enabled;
$('volume').value = Math.round(player.volume * 100);
$('volume-value').textContent = `${$('volume').value}%`;
$('enabled').onchange = () => { player.configure({ enabled: $('enabled').checked }); status(player.enabled ? '点击丛雨，听下一声「ご主人」' : '语音已关闭'); };
$('volume').oninput = () => { player.configure({ volume: Number($('volume').value) / 100 }); $('volume-value').textContent = `${$('volume').value}%`; };
$('audio-files').onchange = e => {
  try { const count = player.importFiles(e.target.files); $('library').textContent = `${count} 段本地语音 · 一轮内不重复`; status('语音已导入'); } catch (error) { status(error.message); }
};
let imageUrl;
$('image-file').onchange = e => {
  const file = e.target.files[0]; if (!file) return;
  if (imageUrl) URL.revokeObjectURL(imageUrl);
  imageUrl = URL.createObjectURL(file); $('character').src = imageUrl;
  $('character').hidden = false; $('placeholder').hidden = true;
};
$('character').onerror = () => { $('character').hidden = true; $('placeholder').hidden = false; };
let gesture;
$('pet').onpointerdown = e => { if (e.button !== 0) return; gesture = { x: e.clientX, y: e.clientY, moved: false }; $('pet').setPointerCapture(e.pointerId); };
$('pet').onpointermove = e => { if (gesture && Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) > 6) gesture.moved = true; };
$('pet').onpointercancel = () => { gesture = null; };
async function play() {
  try { const result = await player.play(); if (result.reason === 'disabled') status('先开启「点击语音」'); else if (result.reason === 'empty') status('请先导入语音'); else if (result.id) { status(`正在播放 ${result.id} · 本轮剩余 ${result.remaining} 段`); $('pet').classList.remove('speaking'); void $('pet').offsetWidth; $('pet').classList.add('speaking'); } } catch { status('播放失败，请检查音频格式并再次点击'); }
}
$('pet').onpointerup = () => { const shouldPlay = gesture && !gesture.moved; gesture = null; if (shouldPlay) play(); };
$('pet').onclick = e => { if (e.detail === 0) play(); };
try {
  const response = await fetch('/local/voice/manifest.json');
  if (!response.ok) throw new Error('missing');
  const { tracks } = await response.json();
  player.setTracks(tracks.map(id => ({ id, url: `/local/voice/${encodeURIComponent(id)}` })));
  $('library').textContent = `${tracks.length} 段本地语音 · 一轮内不重复`;
  status(player.enabled ? '点击丛雨，听下一声「ご主人」' : '本地语音已就绪，请开启「点击语音」');
} catch { status('请选择本地语音文件开始使用'); }
