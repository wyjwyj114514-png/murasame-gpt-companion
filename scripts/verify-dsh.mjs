import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import os from 'node:os';
import {Readable} from 'node:stream';
import { pathToFileURL } from 'node:url';
process.env.DSH_HOME = fs.mkdtempSync(path.join(os.tmpdir(),'murasame-dsh-regression-'));
const events=new Map(),checks=[];
const routes = new Map();
const cleanup = [];
const effects = callback => cleanup.push(callback());
const connection = { requestRejection(req) { return req.headers['x-test-auth'] === 'allowed' ? null : 403; } };
const ctx = {
  connection, get: name => name === 'connection' ? connection : null,
  on: (name,handler) => {events.set(name,handler);return()=>{};}, effect: effects,
  webServer: { register(route) { routes.set(route.path, route); return () => {}; }, tapIndex() { return () => {}; } }
};
const root = { effect: effects, on: () => () => {}, inject: (names, callback) => callback(ctx) };
const { default: plugin } = await import(pathToFileURL(path.resolve('dist/dsh-murasame-local/lib/index.js')).href);
try {
  plugin.apply(root);
  async function request(url, allowed = true, method = 'GET', body) {
    const route = routes.get(url.split('?')[0]); assert.ok(route, `Route missing: ${url}`);
    const result = { status: null, body: null, headers: {} };
    const res = { set statusCode(value) { result.status = value; }, writeHead(status, headers) { result.status = status; result.headers = headers || {}; }, end(body) { result.body = body; } };
    const req=Readable.from(body===undefined?[]:[Buffer.from(typeof body==='string'?body:JSON.stringify(body))]);
    Object.assign(req,{url,method,headers:{host:'127.0.0.1','x-test-auth':allowed?'allowed':'','content-type':'application/json'}});
    await route.handler(req, res);
    return result;
  }
  const manifest = await request('/murasame/voice/manifest.json'); assert.equal(manifest.status, 200);
  const tracks = JSON.parse(manifest.body).tracks; assert.deepEqual(tracks,JSON.parse(fs.readFileSync('private-assets/voice/manifest.json','utf8')).tracks);assert.ok(tracks.length>0);
  for (const id of tracks) { const result = await request('/murasame/voice/' + id); assert.equal(result.status, 200); assert.ok(result.body.length > 100); }
  assert.equal((await request('/murasame/voice/001.mp3', false)).status, 403);
  assert.equal((await request('/murasame/voice/001.mp3', true, 'POST')).status, 405);
  const widget = await request('/dsh-whale/widget.js'); assert.equal(widget.status, 200);
  assert.doesNotMatch(String(widget.body),/小鲸鱼|鲸鱼/);
  const approved=fs.readFileSync('private-assets/character.png');
  for(const route of ['/dsh-whale/image.png','/dsh-whale/rua.gif','/dsh-whale/bubble-img.png?id=bimg_petpet','/dsh-whale/bubble-img.png?id=bimg_money1']){
    const image=await request(route);assert.equal(image.status,200);assert.deepEqual(Buffer.from(image.body),approved);assert.equal(image.headers['Content-Type'],'image/png');
  }
  checks.push('all built-in character routes serve the approved Murasame PNG and UI uses Murasame names');
  assert.match(widget.body, /murasame:pet-click/); assert.match(widget.body, /function whaleClick/);
  assert.ok(routes.has('/dsh-whale/balance.json'));
  for(const route of routes.keys())assert.equal((await request(route,false)).status,403,route);
  checks.push('every one of the '+routes.size+' mounted routes rejects unauthenticated requests');
  const get=async url=>{const r=await request(url);assert.equal(r.status,200,url);return JSON.parse(r.body);};
  const put=async(url,body)=>{const r=await request(url,true,'POST',body);assert.equal(r.status,200,url+': '+r.body);return JSON.parse(r.body);};
  for(const route of ['/size.json','/usage-settings.json','/bubble.json','/bubble-imgs.json','/roles.json','/audio.json','/about.json','/wait.json']){
    await get('/dsh-whale'+route);assert.equal((await request('/dsh-whale'+route,false)).status,403);checks.push(route+' read and authentication');
  }
  await put('/dsh-whale/size.json',{scale:1.2,sound:false,vol:0,scrollGapPx:23});
  await put('/dsh-whale/size.json',{scale:1.1});
  const size=await get('/dsh-whale/size.json');assert.equal(size.sound,false);assert.equal(size.vol,0);assert.equal(size.scrollGapPx,23);checks.push('partial settings preserve mute and placement');
  assert.equal((await request('/dsh-whale/size.json',true,'POST',{})).status,400);
  await put('/dsh-whale/usage-settings.json',{events:{question:{bubbleOn:true,soundOn:false},approval:{bubbleOn:true,soundOn:false}}});
  const usage=await get('/dsh-whale/usage-settings.json');assert.equal(usage.settings.events.question.soundOn,false);checks.push('question/approval settings round trip');
  await put('/dsh-whale/bubble.json',{items:[],lib:[],frames:[{id:'frame_test',name:'测试框',slots:{big:{svgCode:'<svg><script>alert(1)</script><path d="M0 0L1 1"/></svg>',scale:99}}}],defaultFrameId:'frame_test'});
  const frames=(await get('/dsh-whale/bubble.json')).config;assert.equal(frames.defaultFrameId,'frame_test');assert.equal(frames.frames[0].slots.big.scale,4);assert.ok(!frames.frames[0].slots.big.svgCode.includes('<script'));checks.push('frame save, bounds clamp and SVG sanitation');
  await put('/dsh-whale/bubble.json',{items:[],lib:[],frames:[],defaultFrameId:'missing'});assert.equal((await get('/dsh-whale/bubble.json')).config.defaultFrameId,'frame_classic');checks.push('frame delete restores built-in default');
  assert.equal((await request('/dsh-whale/bubble.json',true,'POST','{')).status,400);checks.push('malformed config rejected');
  const emit=events.get('session/event');assert.equal(typeof emit,'function');
  emit({id:'regression'},{type:'tool/call',data:{name:'ask_user_question',id:'question-1'}});
  assert.equal((await get('/dsh-whale/wait.json')).pending?.kind,'question');
  emit({id:'regression'},{type:'turn/end',data:{}});assert.equal((await get('/dsh-whale/wait.json')).pending,null);checks.push('real DSH event callback sets and clears wait state');
  emit({id:'regression'},{type:'approval/asked',data:{id:'approval-1'}});assert.equal((await get('/dsh-whale/wait.json')).pending.kind,'approval');
  emit({id:'regression'},{type:'approval/answered',data:{id:'approval-1'}});assert.equal((await get('/dsh-whale/wait.json')).pending,null);checks.push('DSH approval lifecycle');
  const image='data:image/png;base64,'+fs.readFileSync('private-assets/character.png').toString('base64');
  const roles=await put('/dsh-whale/roles.json',{name:'回归角色',image});const role=roles.roles.find(x=>x.name==='回归角色');assert.ok(role);
  await put('/dsh-whale/role-pin.json',{id:role.id,pinned:true});assert.ok((await get('/dsh-whale/roles.json')).roles.find(x=>x.id===role.id).pinnedAt);
  const roleImage=await request('/dsh-whale/role-image.png?id='+role.id);assert.equal(roleImage.status,200);assert.ok(roleImage.body.length>100);
  await put('/dsh-whale/role-delete.json',{id:role.id});assert.ok(!(await get('/dsh-whale/roles.json')).roles.some(x=>x.id===role.id));checks.push('character import, pin, serve and delete');
  const wav=Buffer.alloc(244);wav.write('RIFF');wav.writeUInt32LE(236,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(200,40);
  const uploaded=await put('/dsh-whale/audio.json',{action:'upload-fragment',name:'回归静音',audio:'data:audio/wav;base64,'+wav.toString('base64')});
  const groupResult=await put('/dsh-whale/audio.json',{action:'save-group',name:'回归音效组',press:uploaded.id,release:''}),group=groupResult.groups.find(x=>x.name==='回归音效组');assert.ok(group);
  await put('/dsh-whale/audio.json',{action:'pin-group',id:group.id,pinned:true});await put('/dsh-whale/audio.json',{action:'delete-group',id:group.id});await put('/dsh-whale/audio.json',{action:'delete-fragment',id:uploaded.id});
  assert.ok(!(await get('/dsh-whale/audio.json')).fragments.some(x=>x.id===uploaded.id));checks.push('audio fragment and group upload, empty-slot mute, pin and delete');
  const imgs=await put('/dsh-whale/bubble-img-upload.json',{action:'upload',name:'回归泡泡图',data:image});const img=imgs.images.find(x=>x.name==='回归泡泡图');assert.ok(img);
  assert.equal((await request('/dsh-whale/bubble-img.png?id='+img.id)).status,200);await put('/dsh-whale/bubble-img-upload.json',{action:'delete',id:img.id});checks.push('bubble image upload, serve and delete');
  assert.equal((await request('/dsh-whale/balance-adjustments.json?modelId=unrelated')).status,403);checks.push('balance adjustment rejects unrelated model');
  const result = { checkedAt: new Date().toISOString(), mountedRouteCount: routes.size, tracks: tracks.length, authRejected: true, writesRejected: true, upstreamBalanceRouteRetained: true,checks, scope: 'isolated Cordis backend regression; real UI coverage recorded separately' };
  fs.writeFileSync('outputs/dsh-verification.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { for (const dispose of cleanup.reverse()) if (typeof dispose === 'function') dispose(); }

