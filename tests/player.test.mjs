import test from 'node:test';
import assert from 'node:assert/strict';
import { VoicePlayer } from '../packages/voice/browser.mjs';
function fixture(saved) {
  const values = new Map(saved ? [['murasame.voice', JSON.stringify(saved)]] : []);
  const storage = { getItem: k => values.get(k), setItem: (k, v) => values.set(k, v) };
  const audio = { volume: 1, currentTime: 0, paused: 0, plays: 0, pause() { this.paused++; }, async play() { this.plays++; } };
  return { player: new VoicePlayer({ storage, audio }), storage, audio };
}

test('重复选定取消锁定，单曲跟随最近成功播放，顺序从最近播放的下一段继续',async()=>{
  const {player,storage,audio}=fixture();const tracks=['a','b','c'].map(id=>({id,url:'/'+id}));player.setTracks(tracks);player.configure({enabled:true,mode:'single'});
  await player.play('b');player.select('a');assert.equal(player.singleId(),'a');player.select('a');assert.equal(player.selectedId,null);assert.equal((await player.play()).id,'b');
  await player.play('c');assert.equal((await player.play()).id,'c');
  const reopened=new VoicePlayer({storage,audio});reopened.setTracks(tracks);assert.equal(reopened.selectedId,null);assert.equal(reopened.lastPlayedId,'c');assert.equal((await reopened.play()).id,'c');
  reopened.select('a');reopened.select('a');reopened.configure({mode:'sequence'});assert.equal((await reopened.play()).id,'a');
});

test('播放失败不改变最近播放的回退目标',async()=>{
  const {player,audio}=fixture();player.setTracks(['a','b'].map(id=>({id,url:'/'+id})));player.configure({enabled:true});await player.play('a');audio.play=async()=>{throw Error('bad audio');};await assert.rejects(player.play('b'));assert.equal(player.lastPlayedId,'a');
});

test('收藏夹保存、取消收藏和重开恢复；禁用语音不会被收藏重新启用',async()=>{
  const {player,storage,audio}=fixture();const tracks=['a','b','c'].map(id=>({id,url:'/'+id}));player.setTracks(tracks);
  player.setFavorite('a',true);player.setFavorite('b',true);player.setFavorite('missing',true);player.setTrackEnabled('b',false);player.configure({scope:'favorites',mode:'sequence'});
  assert.deepEqual(player.scopedTracks().map(t=>t.id),['a','b']);assert.deepEqual(player.activeTracks().map(t=>t.id),['a']);
  await player.start();assert.equal(audio.src,'/a');audio.onended();assert.equal(audio.plays,1);
  const restored=new VoicePlayer({storage,audio});restored.setTracks(tracks);assert.equal(restored.scope,'favorites');assert.deepEqual([...restored.favoriteIds],['a','b']);
  restored.setFavorite('a',false);assert.equal(restored.running,false);assert.deepEqual(await restored.start(),{reason:'empty'});assert.equal(restored.disabledIds.has('b'),true);
  restored.configure({scope:'all'});assert.deepEqual(restored.activeTracks().map(t=>t.id),['a','c']);
});

test('收藏夹的顺序、随机和单曲只使用收藏，取消正在播放的收藏立即停止',async()=>{
  const {player,audio}=fixture();player.setTracks(['a','b','c','d'].map(id=>({id,url:'/'+id})));player.setFavorite('b',true);player.setFavorite('d',true);player.configure({scope:'favorites',mode:'sequence',enabled:true});
  assert.equal((await player.play()).id,'b');assert.equal((await player.play()).id,'d');assert.equal((await player.play()).id,'b');
  player.configure({mode:'random'});for(let i=0;i<8;i++)assert.ok(['b','d'].includes((await player.play()).id));
  player.configure({mode:'single'});player.select('a');assert.deepEqual(await player.play(),{reason:'empty'});player.select('d');await player.play();assert.equal(audio.src,'/d');
  player.setFavorite('d',false);assert.equal(player.running,false);assert.deepEqual(await player.play(),{reason:'empty'});
});

test('收藏随合并与拆分迁移，新库重开不重复迁移',()=>{
  const {player,storage,audio}=fixture({libraryVersion:'v1',favoriteIds:['old-a','old-b']});
  const tracks=['merged','split-1','split-2'].map(id=>({id,url:'/'+id})),metadata={libraryVersion:'v2',migrationSources:{v1:{merged:['old-a','other'],'split-1':['old-b'],'split-2':['old-b']}}};
  player.setTracks(tracks,metadata);assert.deepEqual([...player.favoriteIds],['merged','split-1','split-2']);player.setFavorite('split-1',false);
  const restored=new VoicePlayer({storage,audio});restored.setTracks(tracks,metadata);assert.deepEqual([...restored.favoriteIds],['merged','split-2']);
});

test('合并重编号按来源迁移禁用、单曲和顺序位置，且只迁移一次',()=>{
  const {player,storage}=fixture({enabled:true,mode:'single',selectedId:'008.mp3',nextId:'005.mp3',disabledIds:['005.mp3','007.mp3']});
  const tracks=[{id:'004.mp3',url:'/4',previousIds:['004.mp3','005.mp3']},{id:'006.mp3',url:'/6',previousIds:['007.mp3','008.mp3']}];
  const metadata={libraryVersion:'v2',previousLibraryVersion:'v1'};
  player.setTracks(tracks,metadata);
  assert.equal(player.selectedId,'006.mp3');assert.equal(player.nextId,'004.mp3');assert.deepEqual([...player.disabledIds],['004.mp3','006.mp3']);
  player.setTrackEnabled('004.mp3',true);player.select('004.mp3');
  const restored=new VoicePlayer({storage,audio:{pause(){}}});restored.setTracks(tracks,metadata);
  assert.equal(restored.selectedId,'004.mp3');assert.deepEqual([...restored.disabledIds],['006.mp3']);
});
test('跨过旧版本仍按来源迁移，拆分语音的两段都继承禁用状态',()=>{
  const {player}=fixture({enabled:true,selectedId:'old',nextId:'old',disabledIds:['old']});
  player.setTracks([{id:'001',url:'/1'},{id:'002',url:'/2'}],{libraryVersion:'v3',previousLibraryVersion:'v2',legacyLibraryVersion:'v1',migrationSources:{v1:{'001':['old'],'002':['old']},v2:{'001':['other'],'002':['other']}}});
  assert.equal(player.selectedId,'001');assert.equal(player.nextId,'001');assert.deepEqual([...player.disabledIds],['001','002']);
});
test('默认关闭，不触发播放；开启与音量保存后可恢复', async () => {
  const { player, storage, audio } = fixture(); player.setTracks([{ id: 'a', url: '/a.mp3' }]);
  assert.deepEqual(await player.play(), { reason: 'disabled' }); assert.equal(audio.plays, 0);
  player.configure({ enabled: true, volume: 0.4 }); await player.play(); assert.equal(audio.src, '/a.mp3');
  const restored = new VoicePlayer({ storage, audio }); assert.equal(restored.enabled, true); assert.equal(audio.volume, 0.4);
  player.configure({ enabled: false }); assert.ok(audio.paused > 0);
});
test('64曲每轮不重复，跨轮不连播相同文件', async () => {
  const { player, audio } = fixture(); player.configure({ enabled: true });
  player.setTracks(Array.from({ length: 64 }, (_, i) => ({ id: `${i}`, url: `/voice/${i}.mp3` })));
  const ids = []; for (let i = 0; i < 128; i++) ids.push((await player.play()).id);
  assert.equal(new Set(ids.slice(0, 64)).size, 64); assert.equal(new Set(ids.slice(64)).size, 64);
  for (let i = 1; i < ids.length; i++) assert.notEqual(ids[i], ids[i - 1]); assert.equal(audio.plays, 128);
});
test('损坏设置与空库可恢复，音量有界，播放失败可见', async () => {
  const { player, audio } = fixture({ volume: 2 }); player.configure({ enabled: true });
  assert.equal(audio.volume, 1); assert.deepEqual(await player.play(), { reason: 'empty' });
  player.setTracks([{ id: 'x', url: '/bad.mp3' }]); audio.play = async () => { throw new Error('decode failed'); };
  await assert.rejects(player.play(), /decode failed/);
});
test('快速连点打断旧播放时，旧请求不覆盖新播放状态', async () => {
  const { player, audio } = fixture(); player.configure({ enabled: true });
  player.setTracks([{ id: 'a', url: '/a.mp3' }, { id: 'b', url: '/b.mp3' }]);
  let rejectFirst; audio.play = () => new Promise((resolve, reject) => { rejectFirst = reject; });
  const first = player.play(); audio.play = async () => {};
  const second = await player.play(); rejectFirst(new Error('AbortError'));
  assert.ok(second.id); assert.deepEqual(await first, { reason: 'superseded' });
});
test('null 设置回退默认关闭', () => {
  const storage = { getItem: () => 'null', setItem() {} };
  const player = new VoicePlayer({ storage, audio: { volume: 1 } }); assert.equal(player.enabled, false);
});

test('顺序循环按数字编号播放，跳过禁用语音，重开后接着下一段',async()=>{
  const {player,storage,audio}=fixture();player.configure({enabled:true,mode:'sequence'});
  const tracks=['010.mp3','002.mp3','001.mp3'].map(id=>({id,url:'/'+id}));player.setTracks(tracks);
  assert.equal((await player.play()).id,'001.mp3');
  player.setTrackEnabled('002.mp3',false);assert.equal((await player.play()).id,'010.mp3');assert.equal((await player.play()).id,'001.mp3');
  const restored=new VoicePlayer({storage,audio});restored.setTracks(tracks);assert.equal(restored.mode,'sequence');assert.equal((await restored.play()).id,'010.mp3');
});
test('单曲每次点击重复选中语音；禁用当前曲立即停止，不能再播放该曲',async()=>{
  const {player,audio}=fixture();player.setTracks(['a','b'].map(id=>({id,url:'/'+id})));player.configure({mode:'single'});player.select('b');
  await player.start();assert.equal(audio.src,'/b');audio.onended();await new Promise(setImmediate);assert.equal(audio.plays,1);await player.play();assert.equal(audio.src,'/b');assert.equal(audio.plays,2);
  player.setTrackEnabled('b',false);assert.equal(player.running,false);assert.deepEqual(await player.play(),{reason:'empty'});
  audio.onended();await new Promise(setImmediate);assert.equal(audio.plays,2);
});
test('顺序每次点击只播一段；结束不自动推进，停止和总开关不会触发下一段',async()=>{
  const {player,audio}=fixture();player.setTracks(['a','b'].map(id=>({id,url:'/'+id})));player.configure({mode:'sequence'});
  await player.start();assert.equal(audio.src,'/a');audio.onended();await new Promise(setImmediate);assert.equal(audio.plays,1);await player.play();assert.equal(audio.src,'/b');
  player.stop();audio.onended();await new Promise(setImmediate);assert.equal(audio.plays,2);
  await player.start();player.configure({enabled:false});audio.onended();await new Promise(setImmediate);assert.equal(audio.plays,3);
});
test('随机只在启用集合中洗牌，全部禁用后停止且设置可恢复',async()=>{
  const {player,storage,audio}=fixture();const tracks=['a','b','c'].map(id=>({id,url:'/'+id}));player.setTracks(tracks);player.configure({enabled:true});player.setTrackEnabled('b',false);
  const ids=[];for(let i=0;i<8;i++)ids.push((await player.play()).id);assert.equal(ids.includes('b'),false);assert.deepEqual(new Set(ids),new Set(['a','c']));for(let i=1;i<ids.length;i++)assert.notEqual(ids[i],ids[i-1]);
  player.setAllEnabled(false);assert.deepEqual(await player.start(),{reason:'empty'});assert.equal(player.running,false);
  const restored=new VoicePlayer({storage,audio});restored.setTracks(tracks);assert.equal(restored.activeTracks().length,0);restored.setAllEnabled(true);assert.equal(restored.activeTracks().length,3);
});
test('停止会作废尚未取回的音频，避免延迟请求突然出声',async()=>{
  const {storage,audio}=fixture();let finish;
  const player=new VoicePlayer({storage,audio,resolveUrl:()=>new Promise(resolve=>finish=resolve)});player.setTracks([{id:'a',url:''}]);player.configure({enabled:true});const pending=player.play();player.stop();finish('/late');assert.deepEqual(await pending,{reason:'superseded'});assert.equal(audio.plays,0);
});
