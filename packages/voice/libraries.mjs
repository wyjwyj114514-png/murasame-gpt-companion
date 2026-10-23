export class VoiceLibraryStore {
  async open(){
    if(!globalThis.indexedDB)throw Error('当前环境不支持保存语音库');
    return new Promise((resolve,reject)=>{const request=indexedDB.open('murasame-voice-libraries',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('libraries',{keyPath:'id'});
      request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('无法打开语音库存储'));
      request.onblocked=()=>reject(Error('语音库正被旧页面占用，请关闭旧面板后重试'));
    });
  }
  async request(mode,operation){const db=await this.open();try{return await new Promise((resolve,reject)=>{
    const transaction=db.transaction('libraries',mode),request=operation(transaction.objectStore('libraries'));
    transaction.oncomplete=()=>resolve(request.result);transaction.onabort=transaction.onerror=()=>reject(Error('语音库保存失败，请检查可用空间后重试'));
  });}finally{db.close();}}
  async list(){return (await this.request('readonly',store=>store.getAll())).map(({id,name,files})=>({id,name,count:files.length}));}
  get(id){return this.request('readonly',store=>store.get(id));}
  put(library){return this.request('readwrite',store=>store.put(library));}
  delete(id){return this.request('readwrite',store=>store.delete(id));}
}

export class VoiceLibraryManager {
  constructor(player,{store=new VoiceLibraryStore(),validateFiles=null}={}){this.player=player;this.store=store;this.validateFiles=validateFiles;this.activeId='builtin';this.libraries=[];this.initialized=false;this.busy=false;}
  async initialize(tracks,metadata){
    this.builtin={tracks,metadata};this.player.setTracks(tracks,metadata);
    try{this.libraries=await this.store.list();const active=this.player.storage.getItem('murasame.voice.active-library');if(active&&active!=='builtin'){
      let saved={};try{saved=JSON.parse(this.player.storage.getItem(this.key(active))||'{}');}catch{}
      await this.switchTo(active);this.player.configure({enabled:saved.enabled===true,volume:Number.isFinite(saved.volume)?saved.volume:this.player.volume});
    }}
    catch(error){this.error=error.message;}
    this.initialized=true;this.player.notify();
  }
  name(){return this.activeId==='builtin'?'内置 · 小丛雨':this.libraries.find(item=>item.id===this.activeId)?.name||'自定义语音库';}
  key(id){return id==='builtin'?'murasame.voice':'murasame.voice.library.'+id;}
  async switchTo(id){
    if(!this.builtin)throw Error('内置语音目录尚未加载，请稍后重试');
    let tracks,metadata;
    if(id==='builtin')({tracks,metadata}=this.builtin);
    else{const record=await this.store.get(id);if(!record?.files?.length)throw Error('语音库不存在，请重新选择');
      tracks=record.files.map(file=>({id:file.id,label:file.name,url:URL.createObjectURL(file.blob)}));metadata={libraryVersion:'custom:'+id};}
    const player=this.player;player.save();
    let saved={};try{saved=JSON.parse(player.storage.getItem(this.key(id))||'{}')||{};}catch{}
    player.preferenceKey=this.key(id);this.activeId=id;
    player.mode=['random','sequence','single'].includes(saved.mode)?saved.mode:'random';player.scope=saved.scope==='favorites'?'favorites':'all';
    player.favoriteIds=new Set(Array.isArray(saved.favoriteIds)?saved.favoriteIds:[]);player.disabledIds=new Set(Array.isArray(saved.disabledIds)?saved.disabledIds:[]);
    player.selectedId=saved.selectedId||null;player.lastPlayedId=saved.lastPlayedId||null;player.nextId=saved.nextId||null;player.libraryVersion=saved.libraryVersion||null;player.currentId=null;player.lastError='';
    player.setTracks(tracks,metadata);player.storage.setItem('murasame.voice.active-library',id);this.error='';player.notify();
  }
  async importLibrary(files,name){
    name=String(name||'').trim();if(!name||name.length>40)throw Error('请填写 1～40 字的语音库名称');
    const sorted=[...files].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
    if(!sorted.length)throw Error('请先选择整套语音文件');
    if(sorted.some(file=>! /\.(mp3|wav|ogg|m4a)$/i.test(file.name)))throw Error('请选择 MP3、WAV、OGG 或 M4A 音频文件');
    if(sorted.some(file=>!file.size))throw Error('存在空音频文件，请检查后重新选择');
    if(new Set(sorted.map(file=>file.name)).size!==sorted.length)throw Error('存在同名语音文件，请先改为不同名称');
    if(sorted.reduce((sum,file)=>sum+file.size,0)>512*1024*1024)throw Error('单套语音库请控制在 512 MB 以内');
    let context;
    try{
      if(this.validateFiles)await this.validateFiles(sorted);
      else{context=new AudioContext();for(const file of sorted){try{await context.decodeAudioData(await file.arrayBuffer());}catch{throw Error('无法解码 '+file.name+'，原语音库未变更');}}}
    }finally{if(context)await context.close();}
    const id=crypto.randomUUID(),width=Math.max(3,String(sorted.length).length);
    const record={id,name,files:sorted.map((file,index)=>({id:String(index+1).padStart(width,'0')+'.'+file.name.split('.').at(-1).toLowerCase(),name:file.name,blob:file}))};
    await this.store.put(record);this.libraries=await this.store.list();await this.switchTo(id);return sorted.length;
  }
  async rename(id,name){
    if(id==='builtin')throw Error('内置语音库名称不可修改');name=String(name||'').trim();if(!name||name.length>40)throw Error('请填写 1～40 字的语音库名称');
    const record=await this.store.get(id);if(!record)throw Error('语音库不存在');await this.store.put({...record,name});this.libraries=await this.store.list();this.player.notify();
  }
  async remove(id){
    if(id==='builtin')throw Error('内置语音库不可删除');
    if(this.activeId===id)await this.switchTo('builtin');await this.store.delete(id);
    this.player.storage.removeItem?.(this.key(id));this.libraries=await this.store.list();this.player.notify();
  }
}
