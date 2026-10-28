const {app,BrowserWindow}=require('electron');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const out=process.env.MURASAME_QUOTA_VERIFY_DIR||path.join(root,'work/quota-layout-verification');fs.mkdirSync(out,{recursive:true});
app.setPath('userData',path.join(out,'fixture-profile'));
app.disableHardwareAcceleration();
app.whenReady().then(async()=>{
 const w=new BrowserWindow({show:false,width:800,height:700,webPreferences:{contextIsolation:true,sandbox:true}});
 try{
  const widget=fs.readFileSync(path.join(root,'upstream/dsh-whale/assets/whale-widget.js'),'utf8');
  const bigPath=widget.match(/var FRAME_CLASSIC_BIG_D = '([^']+)'/)[1];
  const frame='<svg viewBox="0 0 1026 700"><path d="'+bigPath+'" fill="white" stroke="#203170" stroke-width="18"/><ellipse cx="352" cy="561" rx="37.5" ry="26" fill="white" stroke="#203170" stroke-width="18"/><ellipse cx="442" cy="646" rx="24.5" ry="18" fill="white" stroke="#203170" stroke-width="18"/></svg>';
  await w.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><style>body{margin:0;background:#eef2f8}.dshwv-pop{position:absolute;left:30px;top:30px;width:400px;aspect-ratio:1026/700}.dshwv-pop svg{width:100%;height:100%;visibility:hidden}</style><div class="dshwv-root"><div class="dshwv-pop">'+frame+'</div></div>'));
  await w.webContents.executeJavaScript(`window.whaleDesktop={testMode:false};window.MurasameBubbleTimer={seconds:0};window.fetch=async url=>({ok:true,json:async()=>url==='/api/tibo-reset'?{status:'announced',scheduledAt:1900000000000}:url==='/api/display-mode'?{mode:'subscription'}:{subscription:{available:true,observedAt:Date.now(),windows:[{windowDurationMins:300,usedPercent:25,resetsAt:1900000000},{windowDurationMins:10080,usedPercent:50,resetsAt:1900500000}]}}});void 0;`);
  for(const file of ['packages/desktop/quota-bubble.js','dist/gpt-murasame-local/desktop/ui/account-view.js'])await w.webContents.executeJavaScript(fs.readFileSync(path.join(root,file),'utf8'));
  await w.webContents.executeJavaScript('WhaleAccountView.toggleBubble(document.querySelector(".dshwv-root"))');
  const checks=[];
  for(const mirrored of [false,true])for(const width of [250,350,500]){
   await w.webContents.executeJavaScript(`document.querySelector('.dshwv-root').classList.toggle('dshwv-left',${mirrored});document.querySelector('.dshwv-pop').style.width='${width}px'`);
   await new Promise(r=>setTimeout(r,100));
   const state=await w.webContents.executeJavaScript(`(()=>{const card=document.querySelector('.whale-account-card'),c=card.getBoundingClientRect(),resets=[...card.querySelectorAll('.murasame-quota-reset')];return {width, count:resets.length,resets:resets.map(e=>{const r=e.getBoundingClientRect(),row=e.previousElementSibling.getBoundingClientRect();return {text:e.textContent,display:getComputedStyle(e).display,width:r.width,height:r.height,belowRow:r.top>=row.bottom-1,insideCard:r.left>=c.left&&r.right<=c.right+1&&r.bottom<=c.bottom,oneLine:e.scrollWidth<=e.clientWidth+1}})}})()`.replace('width, count:',`width:${width}, count:`));
   assert.equal(state.count,2); assert.equal(await w.webContents.executeJavaScript("document.querySelector('.murasame-tibo')?.textContent.includes('预告')"),true,'Tibo announcement should appear');
   const sizes=await w.webContents.executeJavaScript(`(()=>{const t=document.querySelector('.murasame-tibo'), h=document.querySelector('.whale-account-header strong'), withTibo=getComputedStyle(h).fontSize, parent=t.parentNode, next=t.nextSibling; t.remove(); const withoutTibo=getComputedStyle(h).fontSize; parent.insertBefore(t,next); return {withTibo,withoutTibo}})()`); assert.equal(sizes.withTibo,sizes.withoutTibo,JSON.stringify(sizes));
   for(const reset of state.resets){assert.notEqual(reset.display,'none','reset time must be visible');assert(reset.height>0&&reset.belowRow&&reset.insideCard&&reset.oneLine,JSON.stringify(reset));}
   checks.push(state);
   const fit=await w.webContents.executeJavaScript(`(()=>{const card=document.querySelector('.whale-account-card'),svg=card.querySelector('svg'),path=svg.querySelector('path'),inverse=svg.getScreenCTM().inverse(),bad=[];for(const el of card.querySelectorAll('.murasame-quota-panel strong,.murasame-quota-panel span,.murasame-quota-panel small:not(.murasame-quota-updated),.murasame-quota-panel button,.murasame-quota-panel progress')){if(!el.getClientRects().length)continue;let rects;if(el.matches('button,progress'))rects=[el.getBoundingClientRect()];else {const range=document.createRange();range.selectNodeContents(el);rects=[...range.getClientRects()]}for(const r of rects)for(const [x,y] of [[r.left,r.top],[r.right,r.top],[r.left,r.bottom],[r.right,r.bottom]]){const p=new DOMPoint(x,y).matrixTransform(inverse);if(!path.isPointInFill(p))bad.push({text:el.textContent||el.tagName,x:p.x,y:p.y})}}return {ok:!bad.length,bad}})()`);
   fs.writeFileSync(path.join(out,'last-fit.json'),JSON.stringify({width,fit},null,2));
   assert(fit.ok,'content outside actual white bubble: '+JSON.stringify({width,...fit}));
   if(width===350)fs.writeFileSync(path.join(out,mirrored?'quota-component-mirrored.png':'quota-component.png'),(await w.webContents.capturePage()).toPNG());
  }
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({ok:true,fixture:'actual production account-view and bubble CSS in isolated Electron renderer; synthetic quota data',checks},null,2));
  console.log(JSON.stringify({ok:true,checks}));app.exit(0);
 }catch(e){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:e.message,stack:e.stack},null,2));console.error(e);app.exit(1);}
});
