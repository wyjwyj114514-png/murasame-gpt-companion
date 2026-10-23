// Appended to the upstream widget bundle by build-dsh.mjs.
if (!window.__murasameVoice) {
  window.__murasameVoice = true;
  const player = new VoicePlayer();
  window.MurasameVoicePlayer=player;
  const bubbleTimer=window.MurasameBubbleTimer=new BubbleTimer({storage:localStorage});
  window.__murasameClickBalance = localStorage.getItem('murasame-click-balance') !== 'false';
  const panel = document.createElement('section');
  panel.className='murasame-controls';
  panel.style.cssText = 'border-top:1px solid #b8cbb0;margin-top:10px;padding:10px 0;font:12px sans-serif;color:#294538';
  const title = document.createElement('strong'); title.textContent = '丛雨 · 语音播放'; panel.append(title);
  const balanceLabel = document.createElement('label'); balanceLabel.style.display = 'block';
  const balanceToggle = document.createElement('input'); balanceToggle.type = 'checkbox'; balanceToggle.checked = window.__murasameClickBalance;
  balanceToggle.setAttribute('aria-label','点击查看额度或余额');
  balanceLabel.append(balanceToggle, ' 点击角色显示余额'); panel.append(balanceLabel);
  balanceToggle.onchange = () => { window.__murasameClickBalance = balanceToggle.checked; localStorage.setItem('murasame-click-balance', String(balanceToggle.checked)); };
  const timeoutLabel=document.createElement('label');timeoutLabel.style.display='block';
  const timeoutInput=document.createElement('input');timeoutInput.type='number';timeoutInput.min='0';timeoutInput.max='600';timeoutInput.step='1';timeoutInput.value=bubbleTimer.seconds;timeoutInput.style.width='60px';timeoutInput.setAttribute('aria-label','气泡自动消失秒数');
  timeoutLabel.append('气泡自动消失 ',timeoutInput,' 秒（0 为不关闭）');panel.append(timeoutLabel);
  timeoutInput.onchange=()=>{timeoutInput.value=bubbleTimer.configure(timeoutInput.value);};
  const toggleLabel = document.createElement('label'); toggleLabel.style.display = 'block';
  const toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.checked = player.enabled;
  toggle.setAttribute('aria-label','点击语音');
  toggleLabel.append(toggle, ' 点击角色播放语音'); panel.append(toggleLabel);
  const volume = document.createElement('input'); volume.type = 'range'; volume.min = '0'; volume.max = '100'; volume.value = player.volume * 100; volume.setAttribute('aria-label', '丛雨语音音量');
  panel.append(volume);
  const library=mountVoiceControls(player,panel);
  const volumeValue=document.createElement('output');volumeValue.textContent=Math.round(player.volume*100)+'%';panel.append(volumeValue);
  const note = document.createElement('p'); note.textContent = '每次点击播放一段；在语音目录切换模式。'; panel.append(note);
  function voiceUi(){volume.disabled=!toggle.checked;volumeValue.textContent=volume.value+'%';}
  player.subscribe(()=>{toggle.checked=player.enabled;volume.value=player.volume*100;voiceUi();});
  toggle.onchange = () => {player.configure({ enabled: toggle.checked });voiceUi();};
  volume.oninput = () => {player.configure({ volume: Number(volume.value) / 100 });voiceUi();};voiceUi();
  document.addEventListener('murasame:pet-click', () => {
    bubbleTimer.open(()=>document.querySelector('.whale-account-header button')?.click());
    player.play().then(result => { if (result.id) note.textContent = `${result.id} · ${player.mode==='random'?'本轮剩余 '+result.remaining+' 段':'每次点击播放一段'}`;else if(result.reason==='empty')note.textContent='没有可播放的语音，请启用语音或选择一段单曲'; }).catch(() => { note.textContent = '播放失败，请检查音频并再次点击'; });
  });
  document.addEventListener('click',event=>{if(event.target.closest?.('.whale-account-card'))bubbleTimer.open(()=>document.querySelector('.whale-account-header button')?.click());});
  fetch('/murasame/voice/manifest.json').then(r => { if (!r.ok) throw new Error('no local library'); return r.json(); }).then(manifest => {
    const {tracks}=manifest;
    return player.libraryManager.initialize(tracks.map(id => ({ id, url: '/murasame/voice/' + encodeURIComponent(id),previousIds:manifest.previousTrackIds?.[id] })),manifest);
  }).catch(() => {});
  function mount() { const menu = document.querySelector('.dshwv-menu'); if (!menu) return false; menu.append(panel); return true; }
  if (!mount()) { const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); }); observer.observe(document.body, { childList: true, subtree: true }); }
}
