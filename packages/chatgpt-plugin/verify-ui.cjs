const {app,BrowserWindow,ipcMain}=require('electron');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
app.whenReady().then(async()=>{
  const root=path.resolve(__dirname,'../..'),output=path.join(root,'work/plugin-verification');
  const sdk=path.join(__dirname,'node_modules/@modelcontextprotocol/sdk/dist/esm/client');
  const {Client}=await import(pathToFileURL(path.join(sdk,'index.js'))),{StdioClientTransport}=await import(pathToFileURL(path.join(sdk,'stdio.js')));
  const client=new Client({name:'murasame-ui-verifier',version:'1.0.0'});let window,activityFixture=null,displayFixture={};
  const deadline=setTimeout(()=>app.exit(1),45000);
  try{
    await client.connect(new StdioClientTransport({command:process.env.MURASAME_TEST_NODE,args:[path.join(root,'dist/chatgpt-murasame-plugin/server.mjs')],env:{...process.env,ELECTRON_RUN_AS_NODE:'0'},stderr:'pipe'}));
    ipcMain.handle('murasame-test-bridge',async(_event,method,params)=>{
      if(method==='ui/initialize')return {protocolVersion:'2026-01-26',hostInfo:{name:'test-host',version:'1.0.0'},hostCapabilities:{serverTools:{}}};
      if(method==='ui/request-display-mode'){assert.equal(params.mode,'pip');if(displayFixture.error)throw Error('PiP denied');return displayFixture;}
      if(method==='tools/call'&&params?.name==='get_activity')return {structuredContent:{ok:true,pending:activityFixture}};
      if(method!=='tools/call'||!['get_quota','next_voice','get_activity','get_voice_library','get_voice'].includes(params?.name))throw Error('Denied');
      return client.callTool({name:params.name,arguments:params.arguments||{}});
    });
    window=new BrowserWindow({width:460,height:740,show:false,webPreferences:{preload:path.join(__dirname,'verify-preload.cjs'),contextIsolation:true,sandbox:false,autoplayPolicy:'no-user-gesture-required'}});
    const errors=[];window.webContents.on('render-process-gone',()=>errors.push('renderer gone'));
    await window.loadFile(path.join(output,'panel.html'));
    const ev=code=>window.webContents.executeJavaScript(code),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
    const wait=async(code)=>{for(let i=0;i<150;i++){if(await ev(code))return;await delay(100);}throw Error('UI verification timeout: '+code);};
    await wait("document.getElementById('status').textContent.includes('点击丛雨')");
    const expectedTracks=JSON.parse(fs.readFileSync(path.join(root,'private-assets/voice/manifest.json'),'utf8')).tracks;
    await wait('window.MurasameVoicePlayer.tracks.length==='+expectedTracks.length);
    await ev("document.getElementById('test-pip').click()");
    await wait("document.getElementById('pip-result').dataset.outcome==='unsupported'");
    await ev("window.postMessage({jsonrpc:'2.0',method:'ui/notifications/host-context-changed',params:{availableDisplayModes:['inline','pip'],displayMode:'inline'}},'*')");
    displayFixture={mode:'fullscreen'};await ev("document.getElementById('test-pip').click()");
    await wait("document.getElementById('pip-result').dataset.outcome==='fallback'");
    displayFixture={mode:'pip'};await ev("document.getElementById('test-pip').click()");
    await wait("document.getElementById('pip-result').dataset.outcome==='pip'");
    displayFixture={error:true};await ev("document.getElementById('test-pip').click()");
    await wait("document.getElementById('pip-result').dataset.outcome==='error'");
    await ev("window.postMessage({jsonrpc:'2.0',method:'ui/notifications/host-context-changed',params:{displayMode:null}},'*')");
    displayFixture={};await ev("document.getElementById('test-pip').click()");
    await wait("document.getElementById('pip-result').dataset.outcome==='unconfirmed'");
    await ev("document.getElementById('pet').click()");
    await wait("document.querySelectorAll('progress').length>=2");
    assert.equal(await ev("document.getElementById('pet').querySelector('img').naturalWidth>0"),true);
    await ev("document.getElementById('voice').checked=true;document.getElementById('voice').dispatchEvent(new Event('change'));document.getElementById('pet').click()");
    await wait("document.getElementById('status').textContent.includes('本轮还有')");
    window.blur();await delay(200);assert.equal(await ev("document.querySelectorAll('progress').length>=2"),true);
    await ev("document.getElementById('bubble-seconds').value='1';document.getElementById('bubble-seconds').dispatchEvent(new Event('change'));document.getElementById('pet').click()");
    await delay(600);await ev("document.getElementById('pet').click()");await delay(600);
    assert.equal(await ev("getComputedStyle(document.getElementById('bubble')).visibility"),'visible');
    await wait("getComputedStyle(document.getElementById('bubble')).visibility==='hidden'");
    assert.equal(await ev("getComputedStyle(document.getElementById('pet')).visibility"),'visible');
    await ev("document.getElementById('bubble-seconds').value='0';document.getElementById('bubble-seconds').dispatchEvent(new Event('change'));document.getElementById('pet').click()");
    await delay(1100);assert.equal(await ev("getComputedStyle(document.getElementById('bubble')).visibility"),'visible');
    activityFixture={id:'test-question',kind:'question'};
    await wait("!document.getElementById('waiting').hidden&&document.getElementById('waiting').textContent.includes('等你回答')");
    activityFixture={id:'test-approval',kind:'approval'};
    await wait("document.getElementById('waiting').textContent.includes('确认授权')");
    activityFixture=null;await wait("!document.getElementById('waiting').checkVisibility()");await delay(250);
    assert.equal(errors.length,0);
    fs.writeFileSync(path.join(output,'panel.png'),(await window.webContents.capturePage()).toPNG());
    fs.writeFileSync(path.join(output,'ui.json'),JSON.stringify({ok:true,character:true,quota:true,voicePlayback:true,focusDoesNotClearPanel:true,configurableBubbleTimeout:true,pipFixtures:['unsupported','fallback','pip','error','unconfirmed'],scope:'isolated Electron MCP Apps host; does not establish real ChatGPT PiP support'},null,2));
  }catch(error){fs.writeFileSync(path.join(output,'ui.json'),JSON.stringify({ok:false,error:String(error)},null,2));process.exitCode=1;}
  finally{clearTimeout(deadline);await client.close();app.exit(process.exitCode||0);}
});
