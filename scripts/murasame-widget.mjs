// Shared interaction changes for both hosts; preserve the original bubble editor.
export function customizeWidget(text) {
  // The resource browser manages user-added assets, not read-only legacy presets.
  const resourceMarker='function resRenderData(wrap, roles, bubbleImgs, audio) {';
  if(text.includes(resourceMarker)){
    text=text.replace(resourceMarker,resourceMarker+`\n  roles=(roles||[]).filter(function(r){return r.id!=='default'});\n  bubbleImgs=(bubbleImgs||[]).filter(function(im){return !im.builtin});\n  audio=Object.assign({},audio,{groups:((audio&&audio.groups)||[]).filter(function(g){return !g.preset})});\n`);
    const resourceBody=text.indexOf(resourceMarker),reset=text.indexOf("wrap.innerHTML = ''",resourceBody);
    if(reset<0)throw Error('Resource manager hook changed');
    const after=reset+"wrap.innerHTML = ''".length;
    text=text.slice(0,after)+`\n    var libraryEntry=resMkBtn('dshwv-resimp','管理整套语音库',false,function(){resManagerClose();window.dispatchEvent(new Event('murasame-open-library-manager'))});\n    libraryEntry.style.marginBottom='10px';wrap.appendChild(libraryEntry);\n`+text.slice(after);
  }
  const marker = 'function whaleClick() {';
  if (text.split(marker).length !== 2) throw new Error('Upstream click hook changed');
  // The visible level and the range use the same 1..20 domain.
  text=text.replace('scaleInput.min = String(MIN_SCALE)',"scaleInput.min = '1'")
    .replace('scaleInput.max = String(MAX_SCALE)',"scaleInput.max = '20'")
    .replace("scaleInput.step = '0.1'","scaleInput.step = '1'")
    .replace("scaleInput.value = '1.5'","scaleInput.value = '10'")
    .replace('setScale(scaleInput.value)','setScale(MIN_SCALE + (Number(scaleInput.value) - 1) * (MAX_SCALE - MIN_SCALE) / 19)')
    .replaceAll('scaleInput.value = String(next)','scaleInput.value = String(scaleToDisplay(next))')
    .replaceAll('scaleInput.value = String(d.scale)','scaleInput.value = String(scaleToDisplay(d.scale))');
  text=text.replace('if (menuOpen && !rightMouse) {','if (menuOpen && !rightMouse && !isWhaleHit(e)) {');
  text=text.replace(/function sceneOpen\(([^)]*)\) \{/, (all)=>all+`\n  if(window.MurasameBubbleTimer){ttlMs=0;window.MurasameBubbleTimer.open(function(){if(typeof dismissWaitBubble==='function'&&typeof waitShown!=='undefined'&&waitShown)dismissWaitBubble();else hideBubble();});}\n`);
  return text.replaceAll('老大', '狗修金').replace(marker, marker + `
  document.dispatchEvent(new CustomEvent('murasame:pet-click'));
  if (window.__murasameClickBalance !== false && (typeof bubbleOn === 'undefined' || bubbleOn)) {
    if (window.WhaleAccountView?.mode === 'subscription') { window.WhaleAccountView.toggleBubble(root); return; }
    bubbleRoundOn = true; bubbleSeqIdx = 1;
    var murasameModules = JSON.parse(JSON.stringify(bubbleDefaultFirstModules()));
    var murasameGreeting = murasameModules.find(function(m) { return m.type === 'text'; });
    if (murasameGreeting) murasameGreeting.text = '狗修金，你的余额';
    sceneOpen('custom', function() { bubbleRenderModules(murasameModules); }, BUBBLE_MS);
    return;
  }
  if ((typeof bubbleOn !== 'undefined' && !bubbleOn) || window.WhaleAccountView?.mode === 'subscription') return;
`);
}
