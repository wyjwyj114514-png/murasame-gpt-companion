import fs from 'node:fs';
import path from 'node:path';
import {customizeWidget} from './murasame-widget.mjs';
import {brandBuild} from './murasame-branding.mjs';
const root=process.cwd(),base=path.join(root,'dist/gpt-murasame-local'),target=path.join(root,'dist/gpt-murasame-parity');
if(fs.readFileSync(path.join(base,'runtime/session-monitor.mjs'),'utf8').includes("import {InteractionState}"))throw Error('请先运行 node scripts/build-gpt.mjs，再构建功能对齐层；npm run build:gpt 会自动完成两步。');
fs.cpSync(base,target,{recursive:true});
fs.mkdirSync(path.join(target,'dsh'),{recursive:true});
for(const name of ['lib','assets','package.json','LICENSE','PROVENANCE.md'])fs.cpSync(path.join(root,'upstream/dsh-whale',name),path.join(target,'dsh',name),{recursive:true});
const backendFile=path.join(target,'dsh/lib/index.js');let backend=fs.readFileSync(backendFile,'utf8');
const importsEnd=backend.indexOf('// Node 的 fetch');if(importsEnd<0)throw Error('DSH module import boundary changed');
backend=backend.slice(0,importsEnd)+'export function createDshBackend(dataDir) {\n'+backend.slice(importsEnd).replace("const DSH_HOME = process.env.DSH_HOME || path.join(os.homedir(), '.dsh')",'const DSH_HOME = dataDir').replace('export default {','return {')+'\n}\n';
fs.writeFileSync(backendFile,backend.replaceAll('老大','狗修金'));
fs.copyFileSync(path.join(root,'private-assets/character.png'),path.join(target,'dsh/assets/DSniang1.png'));
fs.copyFileSync(path.join(root,'packages/desktop/dsh-parity-host.mjs'),path.join(target,'runtime/dsh-parity-host.mjs'));
fs.copyFileSync(path.join(root,'packages/desktop/interaction-state.mjs'),path.join(target,'runtime/interaction-state.mjs'));
fs.copyFileSync(path.join(root,'packages/desktop/gpt-ui-fixture.mjs'),path.join(target,'tests/murasame-ui-fixture.mjs'));
const patch=(name,from,to)=>{const file=path.join(target,name),text=fs.readFileSync(file,'utf8');if(text.split(from).length!==2)throw Error('Parity hook changed: '+name+' '+from.slice(0,50));fs.writeFileSync(file,text.replace(from,to));};
patch('runtime/session-monitor.mjs',"import fs from 'node:fs';","import fs from 'node:fs';\nimport {InteractionState} from './interaction-state.mjs';");
patch('runtime/paths.mjs',"export const VERSION = '0.4.1';","export const VERSION = '0.4.0';");
patch('runtime/session-monitor.mjs','onUpdate = () => {}, recoverIds = []','onUpdate = () => {}, onWait = () => {}, recoverIds = []');
patch('runtime/session-monitor.mjs','this.onStart = onStart; this.onEnd = onEnd; this.onUpdate = onUpdate;','this.onStart = onStart; this.onEnd = onEnd; this.onUpdate = onUpdate; this.onWait=onWait; this.interaction=new InteractionState(pending=>{if(!this.priming)onWait({sessionId:this.id,pending});});');
patch('runtime/session-monitor.mjs','    this.priming = false;', '    this.priming = false;\n    this.onWait({sessionId:this.id,pending:this.interaction.current||null});');
patch('runtime/session-monitor.mjs',"if (typeof line === 'string' && !relevant.test(line)) return;","if (typeof line === 'string' && !relevant.test(line) && !/request_user_input|function_call_output|send_user_message_question_reply|approval_|request_approval_response|require_escalated/.test(line)) return;");
patch('runtime/session-monitor.mjs','    const p = d.payload || {};','    const p = d.payload || {};\n    this.interaction.accept(d,{sessionId:this.id,isSubagent:this.identity?.isSubagent});');
patch('runtime/session-monitor.mjs','onUpdate = () => {}, discoverMs','onUpdate = () => {}, onWait = () => {}, discoverMs');
patch('runtime/session-monitor.mjs','onUpdate, discoverMs, recoverIds','onUpdate, onWait, discoverMs, recoverIds');
patch('runtime/session-monitor.mjs','onUpdate: this.onUpdate, recoverIds:','onUpdate: this.onUpdate, onWait:this.onWait, recoverIds:');
patch('runtime/session-worker.mjs','  onUpdate: meta => events.push({ type: \'update\', meta }),',"  onUpdate: meta => events.push({ type: 'update', meta }),\n  onWait: meta => events.push({type:'wait',meta}),");
patch('runtime/session-monitor.mjs','    this.pending = new Set();','    this.waiting = new Map();\n    this.pending = new Set();');
patch('runtime/session-monitor.mjs',"        if (item.type === 'start')", "        if(item.type==='wait'){if(item.meta.pending)this.waiting.set(item.meta.sessionId,item.meta.pending);else this.waiting.delete(item.meta.sessionId);continue;}\n        if (item.type === 'start')");
patch('runtime/session-monitor.mjs','  status() { return { ...this.snapshot, activeTurns:',"  waitState(){return {ok:true,pending:[...this.waiting.values()].sort((a,b)=>b.ts-a.ts)[0]||null,sessionName:'当前对话'};}\n  status() { return { ...this.snapshot, activeTurns:");
let text=fs.readFileSync(path.join(root,'upstream/dsh-whale/assets/whale-widget.js'),'utf8');
text=customizeWidget(text).replace('function dshwIsChatRoot(r) {','function dshwIsChatRoot(r) {\n  if (window.whaleDesktop) return true;');
// DSH receives ordinary DOM hover; the transparent desktop also receives native
// cursor heartbeats. Preserve Codex's bridge and the visual path to the menu.
const codexWidget=fs.readFileSync(path.join(root,'upstream/codex-whale/assets/whale-widget.js'),'utf8');
const helpers=codexWidget.slice(codexWidget.indexOf('    var menuHoverTimer = null;'),codexWidget.indexOf("    var widgetCursor = '';"));
const hoverStart=codexWidget.indexOf('    function onDocPointerMoveCursor(e) {');
const hoverEnd=codexWidget.indexOf("    root.addEventListener('lostpointercapture'",hoverStart);
const oldHoverStart=text.indexOf('function onDocPointerMoveCursor(e) {'),oldHoverEnd=text.indexOf('// 启动即应用一次菜单按钮可见性',oldHoverStart);
if(!helpers.includes('inMenuHoverArea')||hoverStart<0||hoverEnd<0||oldHoverStart<0||oldHoverEnd<0)throw Error('Native hover integration boundary changed');
text=text.slice(0,oldHoverStart)+helpers+codexWidget.slice(hoverStart,hoverEnd)+'\n'+text.slice(oldHoverEnd);
const marker='setInterval(function () { pollLastTurn(); pollWaitState() }, 1000)';
if(text.split(marker).length!==2)throw Error('DSH fixture hook changed');
const hostSettingsPatch=`window.MurasameHostSettings={get:()=>({bubble:bubbleOn,turn:turnCostOn,question:usageSet?.events?.question?.bubbleOn!==false,approval:usageSet?.events?.approval?.bubbleOn!==false}),set:async(key,value)=>{
  value=!!value;
  if(key==='question'||key==='approval'){const result=await saveUsageSettings({events:{[key]:{bubbleOn:value}}});if(result===false)throw Error('Save failed');if(!value&&whaleSysItem?.waitKind===key)dismissWaitBubble();if(value)waitDismissedId='';return result;}
  if(key==='bubble'){bubbleOn=value;bubbleToggle.checked=value;if(!value){hideCostBubble();hideBubble();window.WhaleAccountView?.close();}}
  else if(key==='turn'){turnCostOn=value;turnCostToggle.checked=value;turnCostCloseInput.disabled=!value;if(!value)hideCostBubble();}
  else throw Error('Unknown setting');
  return saveConfig();
}};\n${marker}`;
const sourceWidget=fs.readFileSync(path.join(base,'assets/whale-widget.js'),'utf8');
// Preserve the Codex completion/error semantics while retaining DSH wait polling.
const completion=sourceWidget.slice(sourceWidget.indexOf('    function pollLastTurn() {'),sourceWidget.indexOf('    setInterval(pollLastTurn, 1000);'));
const oldStart=text.indexOf('function pollLastTurn() {'),oldEnd=text.indexOf(marker,oldStart);
if(oldStart<0||oldEnd<0||!completion.includes('WhaleTurnNotice'))throw Error('Completion polling hook changed');
text=text.slice(0,oldStart)+"var lastCostId='',lastCostPending=false,costPollingStartedAt=Date.now();\n"+completion+'\n'+text.slice(oldEnd);
text=text.replace(marker,hostSettingsPatch);
text=text.replace(marker,`if(window.whaleDesktop?.testMode)window.__whaleRenderTest={open:whaleClick,close:hideBubble,pollWait:pollWaitState,editor:openBubbleEditorWithCache,about:showAboutSub,waitStatus:()=>({kind:bubbleScene?.kind,waitKind:whaleSysItem?.waitKind,pending:waitPendingId,dismissed:waitDismissedId}),waitSettings:()=>{usageSet.events=usageSet.events||{};usageSet.events.question={bubbleOn:true,soundOn:false};usageSet.events.approval={bubbleOn:true,soundOn:false};},status:()=>({balance:state.balance}),place:(x,y,flip)=>{state.left=x;state.top=y;state.flip=!!flip;express();}};\n${marker}`);
text=text.replace('function refresh(manual) {','function refresh(manual) {\n  if(window.WhaleAccountView?.mode === "subscription"){window.WhaleAccountView.refresh();return;}');
const suffix=sourceWidget.slice(sourceWidget.indexOf('\n;(function(){\n// voice-core.mjs'));
if(!suffix.includes('window.MurasameQuotaBubble'))throw Error('Shared adapter suffix not found');
fs.writeFileSync(path.join(target,'assets/whale-widget.js'),text+suffix+'\n'+fs.readFileSync(path.join(root,'packages/desktop/settings-panel.js'),'utf8'));
const file=path.join(target,'runtime/dispatcher.mjs');let dispatcher=fs.readFileSync(file,'utf8');
dispatcher="import {createDshParity} from './dsh-parity-host.mjs';\n"+dispatcher;
dispatcher=dispatcher.replace('  const routes = new Map(), effects = [];','  const parity=createDshParity(dataDir);\n  const routes = new Map(), effects = [()=>parity.close()];');
const parsedMarker="      const parsed = () => JSON.parse(bytes.toString('utf8') || '{}');";
if(dispatcher.split(parsedMarker).length!==2)throw Error('Dispatcher validation boundary changed');
dispatcher=dispatcher.replace(parsedMarker,`${parsedMarker}
      if(url.pathname==='/dsh-whale/wait.json'&&method==='GET')return jsonResult(200,service?.waitState?.()||watcher?.waitState()||{ok:true,pending:null,sessionName:''});
      if(url.pathname==='/dsh-whale/bubble-img-upload.json'&&!['POST','PUT'].includes(method))return jsonResult(405,{ok:false});
      const parityResult=await parity.dispatch(url,{method,body:bytes,headers});if(parityResult)return parityResult;`);
fs.writeFileSync(file,dispatcher);
const packageFile=path.join(target,'package.json'),pkg=JSON.parse(fs.readFileSync(packageFile,'utf8'));pkg.version='0.4.0';fs.writeFileSync(packageFile,JSON.stringify(pkg,null,2)+'\n');
brandBuild(target,path.join(root,'private-assets/character.png'));
if(process.argv.includes('--promote'))fs.cpSync(target,base,{recursive:true});
console.log(target);

