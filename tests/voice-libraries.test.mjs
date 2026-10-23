import test from 'node:test';
import assert from 'node:assert/strict';
import {VoicePlayer} from '../packages/voice/browser.mjs';

function fixture(){
  const values=new Map(),records=new Map();
  const storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
  const store={async list(){return [...records.values()].map(({id,name,files})=>({id,name,count:files.length}));},async get(id){return records.get(id);},async put(record){records.set(record.id,record);},async delete(id){records.delete(id);}};
  const audio={pause(){},async play(){},volume:1};
  const create=()=>new VoicePlayer({storage,audio,libraryOptions:{store,validateFiles:async()=>{}}});
  return {player:create(),create,storage,store,records,audio};
}
const builtin={tracks:[{id:'001.mp3',url:'/builtin1'},{id:'002.mp3',url:'/builtin2'}],metadata:{libraryVersion:'builtin-v1'}};
function file(name){return new File(['audio'],name,{type:'audio/mpeg'});}

test('整库导入数字排序、收藏隔离、切回内置后恢复原收藏，重建播放器恢复自定义库',async()=>{
  const {player,create,audio}=fixture();await player.libraryManager.initialize(builtin.tracks,builtin.metadata);player.setFavorite('002.mp3',true);player.setTrackEnabled('001.mp3',false);player.configure({enabled:true});
  await player.libraryManager.importLibrary([file('10.mp3'),file('2.mp3')],'其他角色');const id=player.libraryManager.activeId;
  assert.deepEqual(player.tracks.map(track=>track.label),['2.mp3','10.mp3']);assert.equal(player.favoriteIds.size,0);assert.equal(player.disabledIds.size,0);
  player.setFavorite('001.mp3',true);player.select('002.mp3');player.configure({mode:'single',scope:'favorites',volume:.2});
  await player.libraryManager.switchTo('builtin');assert.deepEqual([...player.favoriteIds],['002.mp3']);assert.equal(player.disabledIds.has('001.mp3'),true);
  await player.libraryManager.switchTo(id);assert.deepEqual([...player.favoriteIds],['001.mp3']);assert.equal(player.mode,'single');assert.equal(player.scope,'favorites');
  player.configure({enabled:true,volume:.2});const reopened=create();await reopened.libraryManager.initialize(builtin.tracks,builtin.metadata);
  assert.equal(reopened.libraryManager.activeId,id);assert.equal(reopened.enabled,true);assert.equal(reopened.volume,.2);assert.deepEqual([...reopened.favoriteIds],['001.mp3']);reopened.select('001.mp3');await reopened.play();assert.ok(audio.src.startsWith('blob:'));
});

test('自定义库重命名和删除，内置不能删除；同号语音不会继承另一套收藏',async()=>{
  const {player}=fixture(),manager=player.libraryManager;await manager.initialize(builtin.tracks,builtin.metadata);
  await manager.importLibrary([file('a.mp3')],'A');const a=manager.activeId;player.setFavorite('001.mp3',true);
  await manager.importLibrary([file('b.mp3')],'B');assert.equal(player.favoriteIds.size,0);await manager.rename(manager.activeId,'角色 B');assert.equal(manager.name(),'角色 B');
  await manager.remove(manager.activeId);assert.equal(manager.activeId,'builtin');await manager.switchTo(a);assert.equal(player.favoriteIds.has('001.mp3'),true);
  await assert.rejects(manager.remove('builtin'),/不可删除/);
});

test('解码或保存失败不替换当前库、不中断当前播放、不丢收藏',async()=>{
  const {player,store}=fixture(),manager=player.libraryManager;await manager.initialize(builtin.tracks,builtin.metadata);player.setFavorite('001.mp3',true);await player.start();
  manager.validateFiles=async()=>{throw Error('无法解码');};await assert.rejects(manager.importLibrary([file('bad.mp3')],'坏库'),/无法解码/);
  assert.equal(manager.activeId,'builtin');assert.equal(player.running,true);assert.equal(player.favoriteIds.has('001.mp3'),true);
  manager.validateFiles=async()=>{};store.put=async()=>{throw Error('磁盘已满');};await assert.rejects(manager.importLibrary([file('a.mp3')],'新库'),/磁盘已满/);assert.equal(manager.activeId,'builtin');assert.equal(player.running,true);
  await assert.rejects(manager.importLibrary([file('a.txt')],'无效'),/请选择/);await assert.rejects(manager.importLibrary([file('a.mp3'),file('a.mp3')],'重复'),/同名/);
});

test('插件播放自定义库使用保存的音频，不会按相同编号请求内置语音',async()=>{
  const {player}=fixture();let calls=0;player.resolveUrl=async()=>{calls++;return '/remote';};await player.libraryManager.initialize(builtin.tracks,builtin.metadata);
  await player.libraryManager.importLibrary([file('a.mp3')],'A');await player.start();assert.equal(calls,0);await player.libraryManager.switchTo('builtin');await player.start();assert.equal(calls,1);
});
