export function mountVoiceControls(player,host){
  const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
  const box=make('div');box.className='murasame-library';
  const style=make('style');style.textContent=`.murasame-library{font:11px/1.35 system-ui;text-align:left;min-width:0}.murasame-library select,.murasame-library input[type=number]{min-width:0;max-width:100%;border:1px solid #ccd3e5;border-radius:5px;background:white;color:#293658;padding:3px;font:inherit}.murasame-library button{border:1px solid #ccd3e5;border-radius:5px;background:white;color:#293658;cursor:pointer;padding:3px 6px;font:inherit}.murasame-library button:disabled{opacity:.4;cursor:default}.murasame-library button[aria-pressed=true]{background:#e1e8ff;border-color:#667dcc}.murasame-library label.voice-line>span{white-space:nowrap;flex-shrink:0}.murasame-library select{flex:1;width:0}.murasame-library label{display:flex;align-items:center;gap:4px;min-width:0}.murasame-library .voice-line{display:flex;align-items:center;justify-content:space-between;gap:4px;margin:5px 0;min-width:0}.murasame-library .voice-tracks .voice-line{padding:3px 0;border-bottom:1px solid #e4e8f1}.murasame-library .voice-tracks input{margin:0}.murasame-library .voice-state{font-size:10px;color:#647298;margin:5px 0;overflow-wrap:anywhere}.murasame-library .voice-go{width:54px}.murasame-library .voice-pages{white-space:nowrap;font-size:10px}`;
  box.append(style);
  const manager=player.libraryManager,libraryBox=make('details');libraryBox.className='murasame-library-manager';
  const librarySummary=make('summary','语音库管理'),librarySelect=make('select');librarySelect.setAttribute('aria-label','切换整套语音库');librarySelect.style.width='100%';
  const libraryName=make('input');libraryName.type='text';libraryName.maxLength=40;libraryName.placeholder='新语音库名称';libraryName.setAttribute('aria-label','语音库名称');libraryName.style.cssText='box-sizing:border-box;width:100%;margin:6px 0;padding:5px;border:1px solid #ccd3e5;border-radius:5px';
  const libraryFiles=make('input');libraryFiles.type='file';libraryFiles.multiple=true;libraryFiles.accept='.mp3,.wav,.ogg,.m4a';libraryFiles.setAttribute('aria-label','整套语音库文件');libraryFiles.style.cssText='width:100%;font:inherit;margin:5px 0';
  const libraryStatus=make('div');libraryStatus.className='voice-state';libraryStatus.setAttribute('role','status');
  const hint=make('p','选择整套音频，按文件名数字排序保存。支持 MP3/WAV/OGG/M4A，总计最多 512 MB。重开后可继续使用，各套收藏独立。');hint.className='voice-state';
  const libraryActions=make('div');libraryActions.className='voice-line';
  async function libraryRun(fn){if(manager.busy)return;manager.busy=true;syncLibraries();libraryStatus.textContent='正在处理，请稍候…';try{libraryStatus.textContent=await fn()||'已保存';}catch(error){libraryStatus.textContent=error.message||'操作失败，原语音库已保留';}finally{manager.busy=false;syncLibraries();}}
  const libraryButton=(label,fn)=>{const button=make('button',label);button.type='button';button.onclick=()=>libraryRun(fn);return button;};
  const importLibrary=libraryButton('保存为新语音库',async()=>{const count=await manager.importLibrary(libraryFiles.files,libraryName.value);libraryFiles.value='';return '已保存并切换：'+count+' 段语音';});
  const renameLibrary=libraryButton('重命名',async()=>{await manager.rename(manager.activeId,libraryName.value);return '语音库已重命名';});
  const deleteLibrary=make('button','删除此库');deleteLibrary.type='button';
  const confirmation=make('div');confirmation.hidden=true;confirmation.append(make('p','只删除当前自定义语音库及其收藏。内置语音库和其他库保留。'));
  const confirmDelete=libraryButton('确认删除此语音库',async()=>{await manager.remove(manager.activeId);confirmation.hidden=true;return '已删除，已切回内置语音库';});
  const cancelDelete=make('button','取消');cancelDelete.type='button';cancelDelete.onclick=()=>confirmation.hidden=true;confirmation.append(confirmDelete,cancelDelete);deleteLibrary.onclick=()=>confirmation.hidden=false;
  libraryActions.append(importLibrary,renameLibrary,deleteLibrary);
  const restoreLibrary=libraryButton('切回内置丛雨库',async()=>{await manager.switchTo('builtin');return '已切回内置语音库，原收藏已恢复';});
  librarySelect.onchange=()=>{const id=librarySelect.value;return libraryRun(async()=>{await manager.switchTo(id);return '已切换到 '+manager.name();});};
  libraryBox.append(librarySummary,hint,librarySelect,libraryName,libraryFiles,libraryActions,confirmation,restoreLibrary,libraryStatus);
  let libraryKey='';
  function syncLibraries(){
    const key=JSON.stringify([manager.activeId,manager.libraries]);
    if(key!==libraryKey){libraryKey=key;librarySelect.replaceChildren();for(const item of [{id:'builtin',name:'内置 · 小丛雨'},...manager.libraries]){const option=make('option',item.name);option.value=item.id;librarySelect.append(option);}librarySelect.value=manager.activeId;libraryName.value=manager.activeId==='builtin'?'':manager.name();confirmation.hidden=true;}
    librarySummary.textContent='语音库：'+manager.name();
    librarySelect.value=manager.activeId;
    for(const el of [librarySelect,libraryName,libraryFiles,importLibrary,renameLibrary,deleteLibrary,restoreLibrary,confirmDelete])el.disabled=manager.busy||!manager.initialized;
    renameLibrary.disabled=deleteLibrary.disabled=manager.busy||!manager.initialized||manager.activeId==='builtin';restoreLibrary.disabled=manager.busy||!manager.initialized||manager.activeId==='builtin';
    if(manager.error&&!libraryStatus.textContent)libraryStatus.textContent=manager.error;
    window.dispatchEvent(new Event('murasame-voice-layout'));
  }
  player.subscribe(syncLibraries);libraryBox.addEventListener('toggle',()=>window.dispatchEvent(new Event('murasame-voice-layout')));syncLibraries();
  window.addEventListener('murasame-open-library-manager',()=>{window.MurasameOpenVoiceLibraries?.();libraryBox.open=true;libraryBox.scrollIntoView({block:'nearest'});});
  const mode=make('select');mode.setAttribute('aria-label','语音播放模式');
  for(const [id,label]of [['random','随机播放'],['sequence','按顺序循环'],['single','单语音循环']]){const option=make('option',label);option.value=id;mode.append(option);}
  mode.onchange=()=>player.configure({mode:mode.value});
  const actions=make('div');actions.className='voice-line';
  const action=(title,fn)=>{const b=make('button',title);b.type='button';b.onclick=async()=>{try{await fn();}catch{player.lastError='播放失败，请重试';render();}};return b;};
  const start=action('播放一段',()=>player.start()),stop=action('停止',()=>player.stop());actions.append(start,stop);
  const folders=make('div');folders.className='voice-line';folders.setAttribute('aria-label','语音目录');
  let page=0;
  const all=action('全部语音',()=>{page=0;player.configure({scope:'all'});});
  const favorites=action('收藏夹',()=>{page=0;player.configure({scope:'favorites'});});
  folders.append(all,favorites,mode);
  const favoriteCurrent=action('收藏当前',()=>{const id=player.currentId||player.selectedId;player.setFavorite(id,!player.favoriteIds.has(id));});
  favoriteCurrent.setAttribute('aria-label','收藏最近播放的语音');actions.append(favoriteCurrent);
  mode.title='每次点击播放一段，不会自动连播';
  const state=make('div');state.className='voice-state';state.setAttribute('role','status');
  const navigation=make('div');navigation.className='voice-line';const jump=make('input');jump.type='number';jump.min='1';jump.className='voice-go';jump.setAttribute('aria-label','跳转语音编号');
  const pageSize=()=>innerHeight<600?1:4;
  navigation.append(make('span','按视频编号'),jump,action('跳转',()=>{const n=Math.max(1,Math.min(player.tracks.length,Math.floor(Number(jump.value)||1))),id=player.tracks[n-1]?.id,index=player.scopedTracks().findIndex(t=>t.id===id);if(index<0){state.textContent='这段语音不在收藏夹中';return;}page=Math.floor(index/pageSize());render();}));
  const list=make('div');list.className='voice-tracks';list.setAttribute('aria-label','语音启用列表');
  const pages=make('div');pages.className='voice-line';const pageText=make('span');pageText.className='voice-pages';
  const previous=action('上一页',()=>{page--;render();}),following=action('下一页',()=>{page++;render();});pages.append(previous,pageText,following);
  const bulk=make('div');bulk.className='voice-line';bulk.append(action('全部启用',()=>player.setAllEnabled(true)),action('全部禁用',()=>player.setAllEnabled(false)));
  box.append(folders,actions,state,navigation,list,pages,bulk,libraryBox);host.append(box);
  let lastListKey='';
  function render(){
    const size=pageSize(),tracks=player.scopedTracks(),count=tracks.length,total=Math.max(1,Math.ceil(count/size));page=Math.max(0,Math.min(total-1,page));
    all.setAttribute('aria-pressed',String(player.scope==='all'));favorites.setAttribute('aria-pressed',String(player.scope==='favorites'));favorites.textContent='收藏夹（'+player.favoriteIds.size+'）';
    const favoriteId=player.currentId||player.selectedId;favoriteCurrent.disabled=!player.urls.has(favoriteId);favoriteCurrent.textContent=player.favoriteIds.has(favoriteId)?'取消收藏当前':'收藏当前';favoriteCurrent.setAttribute('aria-pressed',String(player.favoriteIds.has(favoriteId)));
    mode.value=player.mode;jump.max=String(player.tracks.length);start.disabled=!player.activeTracks().length||player.mode==='single'&&!player.activeTracks().some(t=>t.id===player.singleId());stop.disabled=!player.running;
    const current=player.currentId?player.tracks.findIndex(t=>t.id===player.currentId)+1:0,selected=player.tracks.findIndex(t=>t.id===player.selectedId)+1;
    const last=player.tracks.findIndex(t=>t.id===player.lastPlayedId)+1,selection=selected?'选定第 '+selected+' 段':'未选定'+(last?' · 跟随最近播放第 '+last+' 段':'');
    state.textContent=player.lastError||(player.scope==='favorites'&&!count?'收藏夹为空，点击语音旁的 ☆ 收藏。':(current?(player.running?'播放中':'最近播放')+'第 '+current+' 段 · ':'')+selection+' · 已启用 '+player.activeTracks().length+'/'+count+(player.scope==='favorites'?' · 仅播放收藏':''));
    previous.disabled=page===0;following.disabled=page>=total-1;pageText.textContent=(page+1)+' / '+total+' 页';
    const key=[page,size,player.scope,tracks.map(t=>t.id).join(','),player.selectedId,[...player.disabledIds].join(','),[...player.favoriteIds].join(',')].join('|');if(key===lastListKey)return;lastListKey=key;list.replaceChildren();
    for(let i=page*size;i<Math.min(count,(page+1)*size);i++){
      const track=tracks[i],number=player.tracks.findIndex(t=>t.id===track.id)+1,row=make('div');row.className='voice-line';row.title=track.label||track.id;const label=make('label'),enabled=make('input');enabled.type='checkbox';enabled.checked=!player.disabledIds.has(track.id);enabled.setAttribute('aria-label','启用语音 '+number);enabled.onchange=()=>player.setTrackEnabled(track.id,enabled.checked);label.append(enabled,make('span','第 '+number+' 段'));
      const select=action('选定',()=>player.select(track.id));select.setAttribute('aria-label','选定语音 '+number);select.setAttribute('aria-pressed',String(player.selectedId===track.id));
      const preview=action(player.scope==='favorites'?'播放':'试听',()=>{player.stop();player.configure({enabled:true});return player.play(track.id);});preview.setAttribute('aria-label','试听语音 '+number);preview.disabled=!enabled.checked;
      const favorite=action(player.favoriteIds.has(track.id)?'★':'☆',()=>player.setFavorite(track.id,!player.favoriteIds.has(track.id)));favorite.setAttribute('aria-label','收藏语音 '+number);favorite.setAttribute('aria-pressed',String(player.favoriteIds.has(track.id)));favorite.title=player.favoriteIds.has(track.id)?'取消收藏':'收藏这段语音';
      row.append(label,select,preview,favorite);list.append(row);
    }
    window.dispatchEvent(new Event('murasame-voice-layout'));
  }
  player.subscribe(render);window.addEventListener('resize',render);render();return box;
}
