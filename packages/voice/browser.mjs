import { VoicePool } from './voice-core.mjs';
import { VoiceLibraryManager } from './libraries.mjs';

export class VoicePlayer {
  constructor({ storage = localStorage, audio = new Audio(), resolveUrl = null, libraryOptions = {} } = {}) {
    this.storage=storage;this.audio=audio;this.resolveUrl=resolveUrl;
    this.pool=new VoicePool();this.urls=new Map();this.tracks=[];this.sequence=0;this.running=false;this.currentId=null;this.listeners=new Set();
    let saved={};try{saved=JSON.parse(storage.getItem('murasame.voice')||'{}')||{};}catch{}
    this.enabled=saved.enabled===true;this.volume=Number.isFinite(saved.volume)?Math.max(0,Math.min(1,saved.volume)):.7;
    this.mode=['random','sequence','single'].includes(saved.mode)?saved.mode:'random';
    this.disabledIds=new Set(Array.isArray(saved.disabledIds)?saved.disabledIds.filter(x=>typeof x==='string'):[]);
    this.favoriteIds=new Set(Array.isArray(saved.favoriteIds)?saved.favoriteIds.filter(x=>typeof x==='string'):[]);
    this.scope=saved.scope==='favorites'?'favorites':'all';
    this.selectedId=saved.selectedId||null;this.nextId=saved.nextId||null;this.audio.volume=this.volume;
    this.lastPlayedId=saved.lastPlayedId||null;
    this.libraryVersion=saved.libraryVersion||null;
    this.preferenceKey='murasame.voice';this.libraryManager=new VoiceLibraryManager(this,libraryOptions);
    this.audio.onended=()=>{this.running=false;this.notify();};
    this.audio.onerror=()=>{this.lastError='语音播放失败，请重试';this.stop();};
  }
  subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
  notify(){for(const fn of this.listeners)fn();}
  save(){this.storage.setItem(this.preferenceKey,JSON.stringify({enabled:this.enabled,volume:this.volume,mode:this.mode,disabledIds:[...this.disabledIds],favoriteIds:[...this.favoriteIds],scope:this.scope,selectedId:this.selectedId,lastPlayedId:this.lastPlayedId,nextId:this.nextId,libraryVersion:this.libraryVersion}));}
  scopedTracks(){return this.tracks.filter(t=>this.scope!=='favorites'||this.favoriteIds.has(t.id));}
  activeTracks(){return this.scopedTracks().filter(t=>!this.disabledIds.has(t.id));}
  setFavorite(id,favorite){
    if(!this.urls.has(id))return;
    favorite?this.favoriteIds.add(id):this.favoriteIds.delete(id);this.rebuild();
    if(this.scope==='favorites'&&!this.favoriteIds.has(this.currentId))this.stop();
    this.save();this.notify();
  }
  rebuild(){this.pool.setTracks(this.activeTracks().map(t=>t.id));}
  configure({enabled=this.enabled,volume=this.volume,mode=this.mode,selectedId=this.selectedId,disabledIds=[...this.disabledIds],scope=this.scope}={}){
    if(!['random','sequence','single'].includes(mode))throw Error('未知播放模式');
    if(!['all','favorites'].includes(scope))throw Error('未知语音范围');
    const changed=mode!==this.mode||scope!==this.scope||JSON.stringify([...this.disabledIds])!==JSON.stringify(disabledIds);
    this.scope=scope;
    this.enabled=Boolean(enabled);this.volume=Math.max(0,Math.min(1,Number(volume)||0));this.audio.volume=this.volume;this.mode=mode;
    this.disabledIds=new Set(disabledIds);this.selectedId=selectedId;
    if(changed)this.rebuild();
    if(!this.enabled||this.disabledIds.has(this.currentId)||this.scope==='favorites'&&!this.favoriteIds.has(this.currentId)||!this.activeTracks().length)this.stop();
    this.save();this.notify();
  }
  setTrackEnabled(id,enabled){const ids=new Set(this.disabledIds);enabled?ids.delete(id):ids.add(id);this.configure({disabledIds:[...ids]});}
  setAllEnabled(enabled){this.configure({disabledIds:enabled?[]:this.tracks.map(t=>t.id)});}
  select(id){if(!this.urls.has(id))return;if(this.selectedId===id){this.selectedId=null;const at=this.tracks.findIndex(t=>t.id===this.lastPlayedId);this.nextId=this.tracks[(at+1)%this.tracks.length]?.id||null;}else{this.selectedId=id;this.nextId=id;}this.save();this.notify();}
  singleId(){return this.selectedId||this.lastPlayedId||this.activeTracks()[0]?.id||null;}
  stop(){this.running=false;this.sequence++;this.audio.pause();this.notify();}
  async start(){this.configure({enabled:true});this.running=true;return this.play();}
  setTracks(tracks,{libraryVersion=null,previousLibraryVersion=null,migrationSources=null,legacyLibraryVersion=null}={}){
    this.stop();for(const url of this.urls.values())if(url?.startsWith('blob:'))URL.revokeObjectURL(url);
    this.tracks=[...new Map(tracks.map(t=>[t.id,t])).values()].sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
    this.urls=new Map(this.tracks.map(t=>[t.id,t.url]));
    const migration=migrationSources?.[this.libraryVersion||legacyLibraryVersion]||
      (previousLibraryVersion&&(!this.libraryVersion||this.libraryVersion===previousLibraryVersion)?Object.fromEntries(this.tracks.map(t=>[t.id,t.previousIds])):null);
    if(libraryVersion&&libraryVersion!==this.libraryVersion&&migration){
      const oldDisabled=this.disabledIds;
      const oldFavorites=this.favoriteIds;
      const map=id=>this.tracks.find(t=>migration[t.id]?.includes(id))?.id||null;
      this.disabledIds=new Set(this.tracks.filter(t=>migration[t.id]?.some(id=>oldDisabled.has(id))).map(t=>t.id));
      this.favoriteIds=new Set(this.tracks.filter(t=>migration[t.id]?.some(id=>oldFavorites.has(id))).map(t=>t.id));
      this.selectedId=map(this.selectedId);this.nextId=map(this.nextId);
      this.lastPlayedId=map(this.lastPlayedId);
    }
    this.libraryVersion=libraryVersion;
    this.favoriteIds=new Set([...this.favoriteIds].filter(id=>this.urls.has(id)));
    if(!this.urls.has(this.selectedId))this.selectedId=null;
    if(!this.urls.has(this.lastPlayedId))this.lastPlayedId=null;
    if(!this.urls.has(this.nextId))this.nextId=this.tracks[0]?.id||null;
    this.rebuild();if(libraryVersion)this.save();this.notify();
  }
  pick(){
    const active=this.activeTracks();if(!active.length)return null;
    if(this.mode==='random')return this.pool.next();
    if(this.mode==='single'){const id=this.singleId();return active.some(t=>t.id===id)?id:null;}
    let index=Math.max(0,this.tracks.findIndex(t=>t.id===this.nextId));
    for(let n=0;n<this.tracks.length;n++){const at=(index+n)%this.tracks.length,t=this.tracks[at];if(!this.disabledIds.has(t.id)&&(this.scope!=='favorites'||this.favoriteIds.has(t.id))){this.nextId=this.tracks[(at+1)%this.tracks.length].id;return t.id;}}
    return null;
  }
  async play(id=null){
    if(!this.enabled)return {reason:'disabled'};
    id=id||this.pick();
    if(!id||!this.urls.has(id)||this.disabledIds.has(id)){this.stop();return {reason:'empty'};}
    const sequence=++this.sequence;this.audio.pause();this.currentId=id;this.running=true;this.lastError='';this.save();this.notify();
    try{
      const url=this.resolveUrl&&this.libraryManager.activeId==='builtin'?await this.resolveUrl(id):this.urls.get(id);
      if(sequence!==this.sequence)return {reason:'superseded'};
      this.audio.src=url;this.audio.currentTime=0;await this.audio.play();
    }catch(error){if(sequence!==this.sequence)return {reason:'superseded'};this.lastError='语音播放失败，请重试';this.running=false;this.notify();throw error;}
    if(sequence!==this.sequence)return {reason:'superseded'};
    this.lastPlayedId=id;this.save();
    this.notify();return {id,remaining:this.pool.remaining};
  }
}
