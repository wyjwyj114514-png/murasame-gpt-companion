import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function verifyDesktop({ app, window, screen, setHost, setTestCursor, dispatcher, errors }) {
  const output = process.env.WHALE_DESKTOP_VERIFY_DIR;
  fs.mkdirSync(output, { recursive: true });
  const checks = [], ev = code => window.webContents.executeJavaScript(code);
  const wait = async (code, label) => { for (let i = 0; i < 80; i++) { if (await ev(code)) return; await delay(100); } throw new Error(label); };
  try {
    const bounds = screen.getPrimaryDisplay().workArea;
    await setHost({ hostAlive: true, hostPid: 123456, window: '0', visible: true, attached: true, bounds: screen.dipToScreenRect(null, bounds) });
    await wait("window.__whaleRenderTest && document.querySelector('.dshwv-img')?.naturalWidth > 0 && window.__whaleRenderTest.status().balance === 12.3456", 'role and fixture balance load');
    checks.push('accepted character renders in transparent desktop');
    await wait("document.querySelector('.murasame-settings-head')&&document.querySelectorAll('.murasame-settings-pages>.murasame-settings-group').length===5",'new settings UI mounted');
    await delay(200);
    const dragStart=await ev(`(()=>{const image=document.querySelector('.dshwv-img'),r=image.getBoundingClientRect(),canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;for(let y=Math.floor(canvas.height*.35);y<canvas.height*.65;y++)for(let x=Math.floor(canvas.width*.4);x<canvas.width*.6;x++)if(data[(y*canvas.width+x)*4+3]>240)return {x:Math.round(r.left+x/canvas.width*r.width),y:Math.round(r.top+y/canvas.height*r.height),left:r.left,top:r.top};})()`);
    assert.ok(dragStart);window.setIgnoreMouseEvents(false);
    setTestCursor({x:dragStart.x,y:dragStart.y});
    await ev(`window.dispatchEvent(new CustomEvent('whale-hover',{detail:{x:${dragStart.x},y:${dragStart.y}}}))`);
    await wait("document.querySelector('.dshwv-menu-btn').classList.contains('dshwv-menu-btn-visible')",'native hover reveals settings button');
    const menuPoint=await ev("(()=>{const r=document.querySelector('.dshwv-menu-btn').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()");
    setTestCursor({x:Math.round((dragStart.x+menuPoint.x)/2),y:Math.round((dragStart.y+menuPoint.y)/2)});
    await ev(`window.dispatchEvent(new CustomEvent('whale-hover',{detail:{x:${Math.round((dragStart.x+menuPoint.x)/2)},y:${Math.round((dragStart.y+menuPoint.y)/2)}}}))`);await delay(220);
    assert.equal(await ev("document.querySelector('.dshwv-menu-btn').classList.contains('dshwv-menu-btn-visible')"),true);
    window.webContents.sendInputEvent({type:'mouseMove',...menuPoint});await delay(100);
    window.webContents.sendInputEvent({type:'mouseDown',...menuPoint,button:'left',clickCount:1});
    window.webContents.sendInputEvent({type:'mouseUp',...menuPoint,button:'left',clickCount:1});
    await wait("document.querySelector('.dshwv-menu').classList.contains('dshwv-menu-open')",'real settings button click opens menu');
    const tabPoint=await ev("(()=>{const r=document.querySelector('[data-settings-tab=bubble]').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()");
    window.webContents.sendInputEvent({type:'mouseMove',...tabPoint});window.webContents.sendInputEvent({type:'mouseDown',...tabPoint,button:'left',clickCount:1});window.webContents.sendInputEvent({type:'mouseUp',...tabPoint,button:'left',clickCount:1});
    await wait("document.querySelector('[data-settings-tab=bubble]').getAttribute('aria-selected')==='true'",'real click switches settings tab');
    const settingPoint=await ev("(()=>{const input=document.querySelector('[aria-label=\"气泡自动消失秒数\"]');input.scrollIntoView({block:'nearest'});const r=input.getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()");
    window.webContents.sendInputEvent({type:'mouseMove',...settingPoint});
    window.webContents.sendInputEvent({type:'mouseDown',...settingPoint,button:'left',clickCount:1});
    window.webContents.sendInputEvent({type:'mouseUp',...settingPoint,button:'left',clickCount:1});
    await wait("document.activeElement?.getAttribute('aria-label')==='气泡自动消失秒数'",'settings number input receives real click focus');
    checks.push('native hover keeps settings reachable across transparent gap; real clicks open menu and focus timeout input');
    await ev(`(()=>{const auto=document.querySelector('[aria-label="气泡自动消失"]');auto.click();})()`);
    assert.equal(await ev("document.querySelector('[aria-label=\"气泡自动消失秒数\"]').disabled"),true);
    await ev("document.querySelector('[aria-label=\"气泡自动消失\"]').click()");
    assert.equal(await ev("document.querySelector('[aria-label=\"气泡自动消失秒数\"]').disabled"),false);
    await ev("document.querySelector('[aria-label=\"点击语音\"]').click()");
    assert.equal(await ev("document.querySelector('[aria-label=\"丛雨语音音量\"]').disabled"),false);
    await ev("(()=>{const input=document.querySelector('[aria-label=\"丛雨语音音量\"]');input.value='33';input.dispatchEvent(new Event('input'));document.querySelector('[aria-label=\"点击语音\"]').click();})()");
    assert.equal(await ev("document.querySelector('[aria-label=\"丛雨语音音量\"]').disabled"),true);
    assert.deepEqual(await ev("(()=>{const s=JSON.parse(localStorage.getItem('murasame.voice'));return {enabled:s.enabled,volume:s.volume}})()"),{enabled:false,volume:.33});
    for(const [label,path,field]of [['等待回答提示','/dsh-whale/usage-settings.json','settings.events.question.bubbleOn'],['等待授权提示','/dsh-whale/usage-settings.json','settings.events.approval.bubbleOn'],['任务完成提示','/dsh-whale/size.json','turnCostOn']]){
      await ev(`document.querySelector('[aria-label=${JSON.stringify(label)}]').click()`);
      await wait(`(async()=>{const d=await(await fetch(${JSON.stringify(path)})).json();return d.${field}===false})()`,'switch saves '+label);
      await ev(`document.querySelector('[aria-label=${JSON.stringify(label)}]').click()`);
      await wait(`(async()=>{const d=await(await fetch(${JSON.stringify(path)})).json();return d.${field}===true})()`,'switch restores '+label);
    }
    await ev("document.querySelector('[aria-label=\"显示气泡\"]').click()");
    await wait("!window.MurasameHostSettings.get().bubble",'global bubble off');
    await ev("(async()=>{await WhaleAccountView.setMode('subscription');window.__whaleRenderTest.open()})()");
    assert.equal(await ev("!!document.querySelector('.whale-account-card')"),false);
    await ev("(async()=>{document.querySelector('[aria-label=\"显示气泡\"]').click();await WhaleAccountView.setMode('api')})()");
    await wait("window.MurasameHostSettings.get().bubble",'global bubble on');
    await ev("(async()=>{document.querySelector('[aria-label=\"点击查看额度或余额\"]').click();await WhaleAccountView.setMode('subscription');window.__whaleRenderTest.open()})()");
    assert.equal(await ev("!!document.querySelector('.whale-account-card')"),false);
    await ev("(async()=>{document.querySelector('[aria-label=\"点击查看额度或余额\"]').click();await WhaleAccountView.setMode('api')})()");
    assert.equal(await ev('window.__murasameClickBalance'),true);
    checks.push('switches persist independently; voice-off disables volume, timeout-off disables seconds, global bubble-off suppresses quota');
    const menuCrop=await ev("(()=>{const r=document.querySelector('.dshwv-menu').getBoundingClientRect();return {x:Math.max(0,Math.floor(r.left)),y:Math.max(0,Math.floor(r.top)),width:Math.ceil(r.width),height:Math.min(innerHeight-Math.max(0,Math.floor(r.top)),Math.ceil(r.height))}})()");
    await delay(200);fs.writeFileSync(path.join(output,'settings-panel.png'),(await window.webContents.capturePage(menuCrop)).toPNG());
    const settingsRoot=await ev("(()=>{const el=document.querySelector('.dshwv-root'),r=el.getBoundingClientRect();return {x:r.left,y:r.top,w:r.width,h:r.height,flip:el.classList.contains('dshwv-left')}})()");
    const settingsPositions=await ev(`[[8,8],[innerWidth-${settingsRoot.w}-8,8],[8,innerHeight-${settingsRoot.h}-8],[innerWidth-${settingsRoot.w}-8,innerHeight-${settingsRoot.h}-8],[innerWidth/2,8]]`);
    for(const [x,y]of settingsPositions)for(const tab of ['common','library','bubble','notice']){
      await ev(`window.__whaleRenderTest.place(${x},${y},false);document.querySelector('.dshwv-menu-btn').click();document.querySelector('.dshwv-menu-btn').click();document.querySelector('[data-settings-tab=${tab}]').click()`);
      await wait("(()=>{const m=document.querySelector('.dshwv-menu'),r=m.getBoundingClientRect(),p=document.querySelector('.dshwv-img').getBoundingClientRect();return (r.right<=p.left||r.left>=p.right||r.bottom<=p.top||r.top>=p.bottom)&&r.left>=7&&r.top>=7&&r.right<=innerWidth-7&&r.bottom<=innerHeight-7&&m.scrollHeight<=m.clientHeight+1})()",'settings fully fits '+tab+' at '+x+','+y);
      await delay(30);
      assert.equal(await ev("(()=>{const m=document.querySelector('.dshwv-menu'),r=m.getBoundingClientRect();return [...m.querySelectorAll('.murasame-setting-row,.murasame-setting-field,.murasame-settings-tabs,summary')].filter(e=>e.checkVisibility()).every(e=>{const b=e.getBoundingClientRect();return b.left>=r.left&&b.right<=r.right+1&&b.top>=r.top&&b.bottom<=r.bottom+1})})()"),true);
    }
    await ev(`window.__whaleRenderTest.place(8,8,false);document.querySelector('[data-settings-tab=common]').click()`);await delay(250);
    fs.writeFileSync(path.join(output,'settings-top-edge.png'),(await window.webContents.capturePage()).toPNG());
    const settingsWindowBounds=window.getBounds();window.setBounds({width:420,height:500});await delay(200);
    for(const tab of ['common','library','bubble','notice']){
      await ev(`document.querySelector('[data-settings-tab=${tab}]').click()`);
      await wait("(()=>{const m=document.querySelector('.dshwv-menu'),r=m.getBoundingClientRect(),p=document.querySelector('.dshwv-img').getBoundingClientRect();return (r.right<=p.left||r.left>=p.right||r.bottom<=p.top||r.top>=p.bottom)&&r.left>=7&&r.top>=7&&r.right<=innerWidth-7&&r.bottom<=innerHeight-7&&m.scrollHeight<=m.clientHeight+1})()",'settings fits resized window '+tab);
    }
    window.setBounds(settingsWindowBounds);await delay(200);
    await ev(`window.__whaleRenderTest.place(${settingsRoot.x},${settingsRoot.y},${settingsRoot.flip});document.querySelector('.dshwv-menu-btn').click();document.querySelector('.dshwv-menu-btn').click()`);await delay(100);
    checks.push('all four settings tabs including the paged voice library fit at corners and resized windows without covering the character');
    const tabBounds=[];
    for(const tab of ['common','library','bubble','notice']){
      await ev(`document.querySelector('[data-settings-tab=${tab}]').click()`);await delay(120);
      tabBounds.push(await ev("(()=>{const r=document.querySelector('.dshwv-menu').getBoundingClientRect();return [r.x,r.y,r.width,r.height]})()"));
    }
    for(const bounds of tabBounds)bounds.slice(0,3).forEach((value,index)=>assert.ok(Math.abs(value-tabBounds[0][index])<=1,'switching settings tabs preserves header position and width'));
    for(const tab of ['common','library','bubble','notice','common']){
      const point=await ev(`(()=>{const r=document.querySelector('[data-settings-tab=${tab}]').getBoundingClientRect();const samples=window.__menuSwitchSamples=[];let left=22;function sample(){const m=document.querySelector('.dshwv-menu').getBoundingClientRect();samples.push([m.x,m.y]);if(--left>0)requestAnimationFrame(sample)}sample();return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()`);
      setTestCursor(point);window.webContents.sendInputEvent({type:'mouseMove',...point});
      window.webContents.sendInputEvent({type:'mouseDown',...point,button:'left',clickCount:1});
      window.webContents.sendInputEvent({type:'mouseUp',...point,button:'left',clickCount:1});
      await wait('window.__menuSwitchSamples.length===22','capture every frame of settings switch');
      assert.equal(await ev(`document.querySelector('[data-settings-tab=${tab}]').getAttribute('aria-selected')`),'true','real click selects '+tab);
      const samples=await ev('window.__menuSwitchSamples');
      assert.ok(samples.every(([x,y])=>Math.abs(x-samples[0][0])<1&&Math.abs(y-samples[0][1])<1),'no transient menu movement during real tab click '+tab+': '+JSON.stringify(samples));
    }
    await ev("document.querySelector('[data-settings-tab=common]').click()");await delay(120);
    assert.ok(await ev("(()=>{const p=document.querySelector('.murasame-settings-pages'),last=[...p.children].filter(e=>!e.hidden).at(-1);return p.getBoundingClientRect().bottom-last.getBoundingClientRect().bottom<15})()"),'common page has no reserved empty space');
    await ev("document.querySelector('.murasame-advanced').open=true");await delay(200);
    assert.equal(await ev("document.querySelector('.murasame-controls').hidden"),true);
    assert.equal(await ev("document.querySelectorAll('.murasame-advanced-card').length"),5);
    await ev("document.querySelector('[data-advanced-section=inspection]').open=true;document.querySelector('[aria-label=\"检查丛雨本地资源\"]').click()");
    await wait("document.querySelector('[data-advanced-section=inspection] [role=status]').textContent.includes('内置语音目录可读取：503')",'advanced resource inspection reads the installed manifest');
    await ev("window.__advancedSavedFetch=window.fetch;window.fetch=async()=>{throw Error('offline')};document.querySelector('[aria-label=\"检查丛雨本地资源\"]').click()");
    await wait("document.querySelector('[data-advanced-section=inspection] [role=status]').textContent.includes('读取失败')",'advanced inspection reports failure instead of claiming success');
    await ev("window.fetch=window.__advancedSavedFetch;delete window.__advancedSavedFetch;document.querySelector('[data-advanced-section=resources]').open=true;document.querySelector('[aria-label=\"打开资源管理\"]').click()");
    await wait("document.querySelector('.dshwv-resmask')?.checkVisibility()",'advanced resource manager opens through its retained handler');
    await wait("document.querySelector('.dshwv-resmask').textContent.includes('暂无自定义音频')",'resource list finishes loading');
    assert.equal(await ev("/小黄鸭|petpet|money1/.test(document.querySelector('.dshwv-resmask').textContent)"),false);
    await ev("document.querySelector('.dshwv-resmask').click()");
    await wait("!document.querySelector('.dshwv-resmask').checkVisibility()",'resource manager closes normally');
    await ev("document.querySelector('[data-advanced-section=bubbles]').open=true");
    assert.equal(await ev("!!document.querySelector('[aria-label=\"编辑点击气泡\"]')&&!!document.querySelector('[aria-label=\"编辑提示音效\"]')"),true);
    checks.push('advanced settings group five working sections; local inspection reports real success and failure; resource manager opens and closes');
    await ev("(()=>{const m=document.querySelector('.dshwv-menu');m.scrollTop=m.scrollHeight})()");await delay(150);
    assert.ok(await ev("(()=>{const m=document.querySelector('.dshwv-menu'),r=m.getBoundingClientRect(),a=document.querySelector('.murasame-advanced').getBoundingClientRect();return a.bottom<=r.bottom+1&&r.bottom<=innerHeight-7})()"),'advanced settings end can be reached inside viewport');
    fs.writeFileSync(path.join(output,'settings-advanced.png'),(await window.webContents.capturePage()).toPNG());
    await ev("document.querySelector('.murasame-advanced').open=false");await delay(200);
    fs.writeFileSync(path.join(output,'settings-common-compact.png'),(await window.webContents.capturePage()).toPNG());
    const slider=await ev("(()=>{const s=document.querySelector('[aria-label=\"丛雨大小\"]'),r=s.getBoundingClientRect(),m=document.querySelector('.dshwv-menu').getBoundingClientRect();return {left:r.left,width:r.width,y:Math.round(r.y+r.height/2),level:Number(s.value),menu:[m.x,m.y]}})()");
    const pointFor=level=>({x:Math.round(slider.left+8+(slider.width-16)*(level-1)/19),y:slider.y});
    setTestCursor(pointFor(4));
    window.webContents.sendInputEvent({type:'mouseMove',...pointFor(4)});
    window.webContents.sendInputEvent({type:'mouseDown',...pointFor(4),button:'left',clickCount:1});
    const levels=[];
    for(const level of [4,9,15]){
      window.webContents.sendInputEvent({type:'mouseMove',...pointFor(level),modifiers:['leftButtonDown']});await delay(100);
      const sample=await ev("(()=>{const r=document.querySelector('.dshwv-menu').getBoundingClientRect();return {value:Number(document.querySelector('[aria-label=\"丛雨大小\"]').value),x:r.x,y:r.y}})()");
      levels.push(sample.value);assert.ok(Math.abs(sample.x-slider.menu[0])<=1&&Math.abs(sample.y-slider.menu[1])<=1,'size drag keeps its panel stationary');
    }
    window.webContents.sendInputEvent({type:'mouseUp',...pointFor(15),button:'left',clickCount:1});
    assert.ok(levels.every(x=>x>1&&x<20)&&levels[0]<levels[1]&&levels[1]<levels[2],JSON.stringify(levels));
    await ev(`(()=>{const n=document.querySelector('[aria-label="丛雨大小级别"]');n.value=${slider.level};n.dispatchEvent(new Event('input'));n.dispatchEvent(new Event('change'))})()`);await delay(200);
    assert.equal(await ev("[...document.querySelectorAll('.dshwv-menu button')].some(b=>b.textContent==='跟随 Codex')"),false);
    checks.push('tabs preserve header placement with compact content height; advanced view replaces basic controls and its end is reachable; size slider remains stable');
    await ev("document.querySelector('[data-settings-tab=library]').click();document.querySelector('[aria-label=\"语音播放模式\"]').value='sequence';document.querySelector('[aria-label=\"语音播放模式\"]').dispatchEvent(new Event('change'));document.querySelector('[aria-label=\"启用语音 2\"]').click()");
    assert.equal(await ev("window.MurasameVoicePlayer.mode==='sequence'&&window.MurasameVoicePlayer.disabledIds.has('002.mp3')"),true);
    await ev("document.querySelector('[aria-label=\"跳转语音编号\"]').value='453';[...document.querySelectorAll('.murasame-library button')].find(b=>b.textContent==='跳转').click()");
    assert.equal(await ev("!!document.querySelector('[aria-label=\"启用语音 453\"]')"),true);
    await ev("document.querySelector('[aria-label=\"选定语音 453\"]').click();document.querySelector('[aria-label=\"语音播放模式\"]').value='single';document.querySelector('[aria-label=\"语音播放模式\"]').dispatchEvent(new Event('change'))");
    assert.equal(await ev("JSON.parse(localStorage.getItem('murasame.voice')).selectedId==='453.mp3'"),true);
    assert.equal(await ev("document.querySelector('.murasame-library>.voice-state').textContent.includes('选定第 453 段')"),true);
    await ev("document.querySelector('[aria-label=\"选定语音 453\"]').click()");assert.equal(await ev("window.MurasameVoicePlayer.selectedId===null&&document.querySelector('.murasame-library>.voice-state').textContent.includes('未选定')"),true);
    await ev("document.querySelector('[aria-label=\"选定语音 453\"]').click()");
    await ev("document.querySelector('[aria-label=\"收藏语音 453\"]').click();[...document.querySelectorAll('.murasame-library button')].find(b=>b.textContent.startsWith('收藏夹（')).click()");
    assert.equal(await ev("window.MurasameVoicePlayer.scope==='favorites'&&document.querySelectorAll('.voice-tracks .voice-line').length===1&&document.querySelector('[aria-label=\"收藏语音 453\"]').getAttribute('aria-pressed')==='true'"),true);
    await ev("window.MurasameVoicePlayer.configure({volume:0});document.querySelector('[aria-label=\"试听语音 453\"]').click()");
    await wait("window.MurasameVoicePlayer.currentId==='453.mp3'&&!window.MurasameVoicePlayer.audio.paused",'favorite plays through its displayed control');
    assert.equal(await ev("JSON.parse(localStorage.getItem('murasame.voice')).favoriteIds.includes('453.mp3')"),true);
    await ev("document.querySelector('[aria-label=\"收藏语音 453\"]').click()");
    assert.equal(await ev("!window.MurasameVoicePlayer.running&&document.querySelectorAll('.voice-tracks .voice-line').length===0&&document.querySelector('.voice-state').textContent.includes('收藏夹为空')"),true);
    await ev("[...document.querySelectorAll('.murasame-library button')].find(b=>b.textContent==='全部语音').click()");
    checks.push('favorite star saves, favorites folder retains original numbering, direct playback works and removing the playing favorite stops it');
    await delay(200);fs.writeFileSync(path.join(output,'voice-library.png'),(await window.webContents.capturePage()).toPNG());
    await ev("window.MurasameVoicePlayer.setAllEnabled(true);window.MurasameVoicePlayer.configure({mode:'random'});document.querySelector('[data-settings-tab=common]').click()");
    checks.push('voice modes, individual enable switches, jump to 453 and single-track selection save through the rendered controls');
    await ev("window.MurasameVoicePlayer.select('001.mp3');window.MurasameVoicePlayer.configure({enabled:true,volume:0,mode:'sequence'});window.__whaleRenderTest.open()");
    await wait("window.MurasameVoicePlayer.currentId==='001.mp3'&&window.MurasameVoicePlayer.audio.ended",'first character click finishes 001 without auto advancing');
    await ev('window.__whaleRenderTest.open()');await wait("window.MurasameVoicePlayer.currentId==='002.mp3'",'next character click advances to 002');
    await ev("window.MurasameVoicePlayer.stop();window.MurasameVoicePlayer.configure({enabled:false,volume:.33,mode:'random'});window.__whaleRenderTest.close()");
    checks.push('character clicks play 001 then 002; natural audio completion never advances by itself');
    await ev("document.querySelector('.dshwv-menu-btn').click()");await delay(250);
    window.webContents.sendInputEvent({type:'mouseMove',x:dragStart.x,y:dragStart.y});await delay(100);
    window.webContents.sendInputEvent({type:'mouseDown',x:dragStart.x,y:dragStart.y,button:'left',clickCount:1});await delay(80);
    window.webContents.sendInputEvent({type:'mouseMove',x:dragStart.x-320,y:dragStart.y-200,movementX:-320,movementY:-200,modifiers:['leftButtonDown']});await delay(100);
    window.webContents.sendInputEvent({type:'mouseUp',x:dragStart.x-320,y:dragStart.y-200,button:'left',clickCount:1});await delay(250);
    const dragged=await ev("(()=>{const r=document.querySelector('.dshwv-img').getBoundingClientRect();return {left:r.left,top:r.top};})()");
    assert.ok(Math.abs(dragged.left-dragStart.left)>25&&Math.abs(dragged.top-dragStart.top)>15,'real pointer drag changes pet position');
    checks.push('real Chromium pointer drag moves the pet inside the client viewport');
    await ev('window.__whaleRenderTest.open()');
    await wait("document.body.innerText.includes('狗修金，你的余额') && /12\\.3/.test(document.body.innerText)", 'click balance');
    checks.push('manual click renders isolated fixture provider amount and 狗修金 greeting');
    // Layout checks explicitly keep their bubble open; timeout paths are tested below.
    await ev('window.MurasameBubbleTimer.configure(0)');
    const voice = await ev(`(async()=>{const m=await(await fetch('/murasame/voice/manifest.json')).json(); const context=new AudioContext(); for(const name of m.tracks) await context.decodeAudioData(await(await fetch('/murasame/voice/'+name)).arrayBuffer()); await context.close(); return m.tracks.length;})()`);
    assert.equal(voice,JSON.parse(fs.readFileSync(path.resolve('private-assets/voice/manifest.json'),'utf8')).tracks.length); checks.push('all '+voice+' local MP3 files decode');
    const roles = await dispatcher.dispatch('/dsh-whale/roles.json'); assert.equal(roles.status, 200); assert.equal(JSON.parse(roles.body).roles[0].name, '小丛雨');
    // UI fixtures use deterministic quota data; only --live-quota queries an account.
    if(process.env.MURASAME_LIVE_QUOTA_TEST!=='1')await ev(`(()=>{const original=window.fetch.bind(window);window.fetch=async(url,...args)=>{if(url==='/api/insights')return new Response(JSON.stringify({subscription:{available:true,observedAt:Date.now(),windows:[{windowDurationMins:300,usedPercent:25,resetsAt:1900000000},{windowDurationMins:10080,usedPercent:50,resetsAt:1900500000}]}}),{headers:{'content-type':'application/json'}});return original(url,...args);};})()`);
    await ev("window.__whaleRenderTest.close(); WhaleAccountView.setMode('subscription')");
    await ev('window.__whaleRenderTest.open()');
    await wait("document.body.innerText.includes('狗修金，你的剩余额度')", 'subscription card');
    if (process.env.MURASAME_LIVE_QUOTA_TEST === '1') {
      await wait("document.querySelector('.whale-account-card')?.innerText.includes('剩余 ')", 'official live quota');
      checks.push('official account/rateLimits/read result rendered in quota card');
    }
    checks.push('subscription click renders remaining quota card');
    const refreshPoint=await ev("(()=>{const b=[...document.querySelectorAll('.murasame-quota-panel button')].find(b=>b.textContent==='刷新'),r=b.getBoundingClientRect();window.__quotaRefreshes=0;const original=window.fetch.bind(window);window.fetch=(url,...args)=>{if(url==='/api/insights')window.__quotaRefreshes++;return original(url,...args)};return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()");
    assert.equal(await ev(`window.__whaleInputTest.hit(${JSON.stringify(refreshPoint)})`),true,'quota content accepts native input despite transparent outer frame');
    setTestCursor(refreshPoint);
    await wait('window.__whaleInputTest.status().interactive','native input enables quota refresh');
    window.webContents.sendInputEvent({type:'mouseMove',...refreshPoint});
    window.webContents.sendInputEvent({type:'mouseDown',...refreshPoint,button:'left',clickCount:1});
    window.webContents.sendInputEvent({type:'mouseUp',...refreshPoint,button:'left',clickCount:1});
    await wait('window.__quotaRefreshes>0','real click refreshes quota');
    const closePoint=await ev("(()=>{const r=document.querySelector('.whale-account-header button').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()");
    assert.equal(await ev(`window.__whaleInputTest.hit(${JSON.stringify(closePoint)})`),true);
    setTestCursor(closePoint);
    window.webContents.sendInputEvent({type:'mouseMove',...closePoint});
    window.webContents.sendInputEvent({type:'mouseDown',...closePoint,button:'left',clickCount:1});
    window.webContents.sendInputEvent({type:'mouseUp',...closePoint,button:'left',clickCount:1});
    await wait("!document.querySelector('.whale-account-card')",'real click closes quota');
    checks.push('native input recognizes quota panel; real refresh and close clicks work');
    await ev('window.MurasameBubbleTimer.configure(1)');
    await dispatcher.dispatch('/api/show',{method:'POST'});
    await wait("!!document.querySelector('.whale-account-card')",'recovery opens quota through the IPC show path');
    await ev('window.MurasameBubbleTimer.open(()=>{});window.MurasameBubbleTimer.cancel()');
    await wait("!document.querySelector('.whale-account-card')",'recovery quota auto dismisses without a pet click');
    checks.push('recovery/show entry point starts bubble timeout without requiring a character click');
    await ev('window.MurasameBubbleTimer.configure(0);window.__whaleRenderTest.open()');
    await ev(`window.dispatchEvent(new CustomEvent('whale-hover',{detail:{x:${dragStart.x},y:${dragStart.y}}}));document.querySelector('.dshwv-menu-btn').classList.add('dshwv-menu-btn-visible')`);
    const bubbleMenuPoint=await ev("(()=>{const r=document.querySelector('.dshwv-menu-btn').getBoundingClientRect();return {x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)}})()");
    await ev(`(()=>{const c=document.querySelector('.whale-account-card');c.style.left='${bubbleMenuPoint.x-30}px';c.style.top='${bubbleMenuPoint.y-30}px';})()`);
    assert.equal(await ev(`!!document.elementFromPoint(${bubbleMenuPoint.x},${bubbleMenuPoint.y})?.closest('.dshwv-menu-btn')`),true,'quota cannot cover settings button');
    window.webContents.sendInputEvent({type:'mouseDown',...bubbleMenuPoint,button:'left',clickCount:1});window.webContents.sendInputEvent({type:'mouseUp',...bubbleMenuPoint,button:'left',clickCount:1});
    await wait("document.querySelector('.dshwv-menu').classList.contains('dshwv-menu-open')",'settings opens while quota is bubbling');
    await wait("(()=>{const m=document.querySelector('.dshwv-menu').getBoundingClientRect(),b=document.querySelector('.whale-account-card').getBoundingClientRect();return m.right<=b.left||m.left>=b.right||m.bottom<=b.top||m.top>=b.bottom})()",'GPT settings does not cover the visible quota bubble');
    const menuDragPoint=await ev(`(()=>{const r=document.querySelector('.dshwv-img').getBoundingClientRect();return {x:Math.round(r.left+${dragStart.x-dragStart.left}),y:Math.round(r.top+${dragStart.y-dragStart.top}),left:r.left,top:r.top}})()`);
    window.webContents.sendInputEvent({type:'mouseMove',x:menuDragPoint.x,y:menuDragPoint.y});
    window.webContents.sendInputEvent({type:'mouseDown',x:menuDragPoint.x,y:menuDragPoint.y,button:'left',clickCount:1});
    window.webContents.sendInputEvent({type:'mouseMove',x:menuDragPoint.x+60,y:menuDragPoint.y-40,movementX:60,movementY:-40,modifiers:['leftButtonDown']});
    window.webContents.sendInputEvent({type:'mouseUp',x:menuDragPoint.x+60,y:menuDragPoint.y-40,button:'left',clickCount:1});await delay(300);
    assert.equal(await ev("document.querySelector('.dshwv-menu').classList.contains('dshwv-menu-open')"),true);
    assert.ok(await ev(`Math.abs(document.querySelector('.dshwv-img').getBoundingClientRect().left-${menuDragPoint.left})>20`),'pet moves with settings open');
    await wait("(()=>{const m=document.querySelector('.dshwv-menu').getBoundingClientRect(),b=document.querySelector('.whale-account-card').getBoundingClientRect();return m.right<=b.left||m.left>=b.right||m.bottom<=b.top||m.top>=b.bottom})()",'GPT settings still avoids quota after dragging');
    await ev("document.querySelector('.dshwv-menu-btn').click()");
    checks.push('quota bubble does not block real settings clicks; pet remains draggable while settings stays open');
    await ev('window.__whaleRenderTest.open()');
    await wait("document.querySelectorAll('.whale-account-card').length === 1", 'repeat click keeps quota card');
    await wait("!document.querySelector('.whale-account-card').innerText.includes('正在读取')", 'repeat refresh settles');
    checks.push('repeat click refreshes the existing quota card instead of closing it');
    const appearance = await ev(`(()=>{
      const card=document.querySelector('.whale-account-card'),panel=card.querySelector('.murasame-quota-panel');
      const frame=card.querySelector('svg'),original=document.querySelector('.dshwv-pop svg');
      const meter=card.querySelector('progress'),label=meter?.previousElementSibling;
      return {sameFrame:frame?.querySelector('path')?.getAttribute('d')===original?.querySelector('path')?.getAttribute('d'),
        tailCount:frame?.querySelectorAll('ellipse').length,
        fits:panel.scrollHeight<=panel.clientHeight+1,
        green:label&&getComputedStyle(label).color==='rgb(21, 128, 61)',
        labelLeft:label&&label.getBoundingClientRect().right<=meter.getBoundingClientRect().left};
    })()`);
    assert.equal(appearance.sameFrame,true); assert.equal(appearance.tailCount,2); assert.equal(appearance.fits,true);
    if(process.env.MURASAME_LIVE_QUOTA_TEST==='1'){assert.equal(appearance.green,true);assert.equal(appearance.labelLeft,true);}
    checks.push('DSH classic frame and two tails, content fits and remaining amount stays green on the left');
    await ev("document.querySelector('.whale-account-header button').click()");
    assert.equal(await ev("!!document.querySelector('.whale-account-card')"),false);
    await ev('window.__whaleRenderTest.open()');
    await wait("document.querySelector('.murasame-quota-panel')&&!document.querySelector('.whale-account-card').innerText.includes('正在读取')",'reopen settles');
    checks.push('explicit close and reopening the DSH-style quota bubble');
    await ev('window.__whaleRenderTest.place(25,15,true)');
    await wait("(()=>{const c=document.querySelector('.whale-account-card'),p=c?.querySelector('.murasame-quota-panel');const r=c?.getBoundingClientRect(),b=document.querySelector('.dshwv-pop')?.getBoundingClientRect();return r?.width>200&&b&&Math.abs(r.top-b.top)<1&&Math.abs(r.left-b.left)<1&&p&&p.scrollHeight<=p.clientHeight+1;})()",'quota layout finishes its opening transition');
    const anchored=await ev(`(()=>{
      const c=document.querySelector('.whale-account-card'),r=c.getBoundingClientRect(),p=document.querySelector('.dshwv-pop').getBoundingClientRect(),pet=document.querySelector('.dshwv-img').getBoundingClientRect();
      return {widthDifference:Math.abs(r.width-p.width),topDifference:Math.abs(r.top-p.top),leftDifference:Math.abs(r.left-p.left),abovePet:r.top<pet.top,mirrored:c.classList.contains('murasame-quota-mirrored'),rootMirrored:document.querySelector('.dshwv-root').classList.contains('dshwv-left'),panelScroll:c.querySelector('.murasame-quota-panel').scrollHeight,panelHeight:c.querySelector('.murasame-quota-panel').clientHeight,cardWidth:r.width,fits:c.querySelector('.murasame-quota-panel').scrollHeight<=c.querySelector('.murasame-quota-panel').clientHeight+1};
    })()`);
    assert.ok(anchored.widthDifference<1); assert.ok(anchored.topDifference<1); assert.ok(anchored.leftDifference<1);
    assert.equal(anchored.abovePet,true,JSON.stringify(anchored));assert.equal(anchored.mirrored,anchored.rootMirrored,JSON.stringify(anchored));assert.equal(anchored.fits,true,JSON.stringify(anchored));
    checks.push('top-left placement uses DSH bubble size, stays above the pet, and mirrors its tail');
    fs.writeFileSync(path.join(output,'gpt-quota-top-left.png'),(await window.webContents.capturePage({x:20,y:10,width:270,height:270})).toPNG());
    await ev("window.dispatchEvent(new Event('whale-reset-position'))");await delay(250);
    const originalBounds=window.getBounds();
    window.setBounds({width:350,height:260}); await delay(250);
    assert.equal(await ev(`(()=>{const r=document.querySelector('.whale-account-card').getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth&&r.bottom<=innerHeight})()`),true);
    checks.push('quota bubble remains inside a small viewport');
    const fullDisplay=await ev(`(()=>{
      const panel=document.querySelector('.murasame-quota-panel'),r=panel.getBoundingClientRect();
      const elements=[...panel.querySelectorAll('.whale-account-header,section,.murasame-quota-row,progress,button')];
      return {noScrolling:!['auto','scroll'].includes(getComputedStyle(panel).overflowY),
        fits:elements.every(el=>{const b=el.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1&&b.top>=r.top-1&&b.bottom<=r.bottom+1}),
        meters:panel.querySelectorAll('progress').length};
    })()`);
    assert.equal(fullDisplay.noScrolling,true);assert.equal(fullDisplay.fits,true);
    if(process.env.MURASAME_LIVE_QUOTA_TEST==='1')assert.ok(fullDisplay.meters>=2);
    checks.push('all quota rows and controls fit the small bubble without scrollbars');
    window.setBounds(originalBounds); await delay(250);
    assert.equal(errors.length, 0, JSON.stringify(errors));
    fs.writeFileSync(path.join(output, 'gpt-quota-card.png'), (await window.webContents.capturePage()).toPNG());
    const crop=await ev(`(()=>{const r=document.querySelector('.whale-account-card').getBoundingClientRect(),p=document.querySelector('.dshwv-img').getBoundingClientRect();const x=Math.max(0,Math.floor(Math.min(r.left,p.left)-8)),y=Math.max(0,Math.floor(Math.min(r.top,p.top)-8));return {x,y,width:Math.min(innerWidth-x,Math.ceil(Math.max(r.right,p.right)-x+8)),height:Math.min(innerHeight-y,Math.ceil(Math.max(r.bottom,p.bottom)-y+8))}})()`);
    fs.writeFileSync(path.join(output,'gpt-quota-bubble-detail.png'),(await window.webContents.capturePage(crop)).toPNG());
    await ev(`(()=>{const input=document.querySelector('[aria-label="气泡自动消失秒数"]');input.value='1';input.dispatchEvent(new Event('change'));window.__whaleRenderTest.open();})()`);
    await delay(600);await ev('window.__whaleRenderTest.open()');await delay(600);
    assert.equal(await ev("!!document.querySelector('.whale-account-card')"),true);
    await wait("!document.querySelector('.whale-account-card')",'bubble auto dismiss');
    await ev(`(()=>{const input=document.querySelector('[aria-label="气泡自动消失秒数"]');input.value='0';input.dispatchEvent(new Event('change'));window.__whaleRenderTest.open();})()`);
    await delay(1100);assert.equal(await ev("!!document.querySelector('.whale-account-card')"),true);
    checks.push('configurable timeout closes only the bubble, repeat clicks restart, zero keeps it open');
    if(await ev('!!window.__whaleRenderTest.pollWait')){
      await ev(`(()=>{const original=window.fetch;window.__waitFixture=null;window.fetch=(url,options)=>String(url).includes('/wait.json')?Promise.resolve(new Response(JSON.stringify({ok:true,pending:window.__waitFixture,sessionName:'回归测试'}))):original(url,options);window.__whaleRenderTest.waitSettings();document.querySelector('.whale-account-header button').click();window.__whaleRenderTest.close();window.__waitFixture={kind:'question',id:'q1'};window.__whaleRenderTest.pollWait();})()`);
      await wait("window.__whaleRenderTest.waitStatus().waitKind==='question'",'question wait bubble');
      await ev(`(()=>{const input=document.querySelector('[aria-label="气泡自动消失秒数"]');input.value='1';input.dispatchEvent(new Event('change'));})()`);
      await wait("window.__whaleRenderTest.waitStatus().kind!=='wait'",'wait timeout');
      await ev('window.__whaleRenderTest.pollWait()');await delay(200);
      assert.notEqual((await ev('window.__whaleRenderTest.waitStatus()')).kind,'wait');
      checks.push('dismissed waiting bubble stays dismissed for the same unanswered request');
      await ev("window.__waitFixture={kind:'approval',id:'a1'};window.__whaleRenderTest.pollWait()");
      await wait("window.__whaleRenderTest.waitStatus().waitKind==='approval'",'approval replaces question');
      await ev("window.__waitFixture=null;window.__whaleRenderTest.pollWait()");
      await wait("window.__whaleRenderTest.waitStatus().kind!=='wait'",'resolved wait disappears');
      checks.push('question and approval bubbles switch and clear when resolved');
      await ev('window.__whaleRenderTest.editor()');
      await wait("document.body.innerText.includes('框')",'DSH frame editor');
      checks.push('full DSH bubble/frame editor opens in GPT');
      const about=JSON.parse((await dispatcher.dispatch('/dsh-whale/about.json')).body);
      assert.equal(about.plugin.name,'project-murasame-gpt');
      const update=JSON.parse((await dispatcher.dispatch('/dsh-whale/update-check.json')).body);
      assert.equal(update.ok,false);assert.ok(update.error.includes('本地'));
      checks.push('GPT about identifies local build and never offers the DSH package as an update');
      assert.equal(errors.length,0,JSON.stringify(errors));
    }
    // Use the real IndexedDB store and real decoded files, then reload the renderer.
    await new Promise(resolve=>{window.webContents.once('did-finish-load',resolve);window.webContents.reload();});
    await wait('window.MurasameVoicePlayer?.libraryManager.initialized','voice libraries initialize after reload');
    await ev("window.dispatchEvent(new Event('murasame-open-library-manager'));window.MurasameVoicePlayer.setFavorite('001.mp3',true)");
    await ev(`(async()=>{const bytes=await(await fetch('/murasame/voice/001.mp3')).arrayBuffer(),transfer=new DataTransfer();for(const name of ['10.mp3','2.mp3'])transfer.items.add(new File([bytes],name,{type:'audio/mpeg'}));document.querySelector('[aria-label="整套语音库文件"]').files=transfer.files;document.querySelector('[aria-label="语音库名称"]').value='测试角色';[...document.querySelectorAll('.murasame-library-manager button')].find(b=>b.textContent==='保存为新语音库').click()})()`);
    await wait("window.MurasameVoicePlayer.libraryManager.activeId!=='builtin'&&!window.MurasameVoicePlayer.libraryManager.busy",'whole library is decoded and saved before switching');
    const customLibraryId=await ev('window.MurasameVoicePlayer.libraryManager.activeId');
    assert.deepEqual(await ev('window.MurasameVoicePlayer.tracks.map(t=>t.label)'),['2.mp3','10.mp3']);
    assert.equal(await ev('window.MurasameVoicePlayer.favoriteIds.size'),0);
    await ev("window.MurasameVoicePlayer.setFavorite('001.mp3',true);window.MurasameVoicePlayer.configure({volume:0,mode:'single'});document.querySelector('[aria-label=\"选定语音 1\"]').click();document.querySelector('[aria-label=\"试听语音 1\"]').click()");
    await wait("window.MurasameVoicePlayer.audio.src.startsWith('blob:')&&!window.MurasameVoicePlayer.audio.paused",'custom library plays the saved audio blob');
    await ev("document.querySelector('[aria-label=\"语音库名称\"]').value='测试角色改名';[...document.querySelectorAll('.murasame-library-manager button')].find(b=>b.textContent==='重命名').click()");
    await wait("window.MurasameVoicePlayer.libraryManager.name()==='测试角色改名'&&!window.MurasameVoicePlayer.libraryManager.busy",'custom library rename saves');
    await new Promise(resolve=>{window.webContents.once('did-finish-load',resolve);window.webContents.reload();});
    await wait(`window.MurasameVoicePlayer?.libraryManager.initialized&&window.MurasameVoicePlayer.libraryManager.activeId===${JSON.stringify(customLibraryId)}`,'reload restores the custom library from IndexedDB');
    assert.equal(await ev("window.MurasameVoicePlayer.favoriteIds.has('001.mp3')&&window.MurasameVoicePlayer.libraryManager.name()==='测试角色改名'"),true);
    await ev("window.dispatchEvent(new Event('murasame-open-library-manager'));[...document.querySelectorAll('.murasame-library-manager button')].find(b=>b.textContent==='切回内置丛雨库').click()");
    await wait("window.MurasameVoicePlayer.libraryManager.activeId==='builtin'&&!window.MurasameVoicePlayer.libraryManager.busy",'restore built-in library');
    assert.equal(await ev("window.MurasameVoicePlayer.tracks.length===503&&window.MurasameVoicePlayer.favoriteIds.has('001.mp3')"),true);
    await ev(`(()=>{const select=document.querySelector('[aria-label="切换整套语音库"]');select.value=${JSON.stringify(customLibraryId)};select.dispatchEvent(new Event('change'))})()`);
    await wait("window.MurasameVoicePlayer.libraryManager.activeId!=='builtin'&&!window.MurasameVoicePlayer.libraryManager.busy",'select saved custom library');
    await ev("[...document.querySelectorAll('.murasame-library-manager button')].find(b=>b.textContent==='删除此库').click();[...document.querySelectorAll('.murasame-library-manager button')].find(b=>b.textContent==='确认删除此语音库').click()");
    await wait("window.MurasameVoicePlayer.libraryManager.activeId==='builtin'&&window.MurasameVoicePlayer.libraryManager.libraries.length===0&&!window.MurasameVoicePlayer.libraryManager.busy",'confirmed deletion removes only the custom library');
    await ev("document.querySelector('.murasame-library-manager').open=true");await delay(150);
    fs.writeFileSync(path.join(output,'voice-library-manager.png'),(await window.webContents.capturePage()).toPNG());
    checks.push('whole library import uses real audio decoding and IndexedDB; numeric order, playback, rename, renderer reload persistence, independent favorites, restore and confirmed deletion pass');
    assert.equal(errors.length,0,JSON.stringify(errors));
    fs.writeFileSync(path.join(output, 'desktop-follow.json'), JSON.stringify({ ok: true, checks, errors, fixture: true }, null, 2));
    await setHost({ hostAlive: false });
  } catch (error) {
    const visibleText = await ev('document.body.innerText').catch(() => 'unavailable');
    const settingsDebug=await ev('({settings:window.MurasameHostSettings?.get(),click:window.__murasameClickBalance,mode:WhaleAccountView.mode,layout:window.MurasameSettingsLayout?.snapshot(),menuScroll:document.querySelector(".dshwv-menu")?.scrollHeight,menuClient:document.querySelector(".dshwv-menu")?.clientHeight,pet:document.querySelector(".dshwv-img")?.getBoundingClientRect().toJSON(),viewport:[innerWidth,innerHeight]})').catch(()=>null);
    fs.writeFileSync(path.join(output, 'gpt-ui-failure.png'), (await window.webContents.capturePage()).toPNG());
    fs.writeFileSync(path.join(output, 'desktop-follow.json'), JSON.stringify({ ok: false, checks, error: error.stack, errors, visibleText,settingsDebug }, null, 2)); app.exit(1);
  }
}
