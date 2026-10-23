(() => {
  function mount(){
    const menu=document.querySelector('.dshwv-menu'),controls=menu?.querySelector('.murasame-controls'),host=window.MurasameHostSettings;
    if(!menu||!controls||!host)return;
    const make=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls;if(text)el.textContent=text;return el;};
    const style=make('style');style.textContent=`
      .dshwv-menu{width:310px;min-width:0;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow-y:auto;padding:14px;color:#293658;background:#fcfcff;border:1px solid #dce2f1;border-radius:16px;box-shadow:0 14px 40px #20317022;font:12px/1.4 system-ui}
      .dshwv-menu::-webkit-scrollbar{width:6px!important}.dshwv-menu::-webkit-scrollbar-thumb{background:#b9c4dd;border-radius:6px}.dshwv-menu{overscroll-behavior:contain}
      .murasame-settings-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px}.murasame-settings-head strong{font-size:16px}.murasame-settings-head small{display:block;color:#79849d;margin-top:2px}.murasame-settings-head button{border:0;background:#eef0f8;color:#536ba9;border-radius:8px;width:28px;height:28px;cursor:pointer}
      .murasame-controls{border:0!important;margin:0!important;padding:0!important;color:inherit!important;font:inherit!important}.murasame-controls>strong{display:none}
      .murasame-settings-group{margin:10px 0 0;padding:10px 12px;background:#f0f3fa;border-radius:10px}.murasame-settings-group h3{font-size:11px;color:#74809c;margin:0 0 5px;font-weight:600}
      .murasame-settings-tabs{display:flex;gap:4px;padding:4px;background:#eef1f8;border-radius:10px;margin:10px 0}.murasame-settings-tabs button{flex:1;border:0;background:transparent;border-radius:7px;padding:7px 4px;color:#79849d;cursor:pointer;font:inherit}.murasame-settings-tabs button[aria-selected=true]{background:white;color:#475eb5;box-shadow:0 1px 4px #20317012}.murasame-settings-tabs button:focus-visible{outline:2px solid #98aaff}
      .murasame-setting-row{display:flex!important;align-items:center;justify-content:space-between;gap:12px;min-height:32px;cursor:pointer}.murasame-setting-row input[type=checkbox]{order:2;appearance:none;width:34px;height:20px;flex:0 0 34px;border-radius:20px;background:#b8c0d3;border:0;position:relative;cursor:pointer;transition:background .15s}.murasame-setting-row input[type=checkbox]:before{content:'';position:absolute;width:14px;height:14px;left:3px;top:3px;border-radius:50%;background:white;box-shadow:0 1px 3px #20317022;transition:transform .15s}.murasame-setting-row input[type=checkbox]:checked{background:#576fc4}.murasame-setting-row input[type=checkbox]:checked:before{transform:translateX(14px)}.murasame-setting-row input:focus-visible{outline:2px solid #98aaff;outline-offset:3px}
      .murasame-setting-field{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:30px;color:#596781}.murasame-setting-field input[type=number]{width:62px!important;border:1px solid #d5dcef;border-radius:6px;background:white;padding:4px 6px;color:#293658}.murasame-setting-field input[type=range]{accent-color:#576fc4;min-width:0;flex:1;width:110px}.murasame-setting-field output{min-width:32px;text-align:right}.murasame-setting-field input:disabled{opacity:.4;cursor:default}
      .murasame-controls p{font-size:10px;color:#8791a7;margin:6px 0 0}.murasame-advanced{margin-top:12px;border-top:1px solid #e3e7f1;padding-top:10px}.murasame-advanced>summary{cursor:pointer;color:#536ba9;font-size:12px}.murasame-advanced[open]>summary{margin-bottom:10px}.murasame-advanced .whale-account-menu{display:none}.murasame-advanced .dshwv-ver{display:none}.murasame-settings-error{color:#ae364f;font-size:11px;margin:6px 0}
      @media(max-height:540px){.dshwv-menu{padding:10px}.murasame-settings-group{padding:8px 10px;margin-top:6px}.murasame-setting-row{min-height:27px}.murasame-setting-field{min-height:26px}.murasame-settings-head{margin-bottom:4px}.murasame-settings-tabs{margin:6px 0}.murasame-advanced{margin-top:6px;padding-top:6px}}
    `;document.head.append(style);
    const legacy=[...menu.children].filter(x=>x!==controls);
    const heading=make('header','murasame-settings-head'),brand=make('div');brand.append(make('strong','','丛雨设置'),make('small','','修改立即生效 · 本机保存'));
    const close=make('button','','×');close.type='button';close.setAttribute('aria-label','关闭丛雨设置');close.onclick=()=>document.querySelector('.dshwv-menu-btn')?.click();heading.append(brand,close);menu.prepend(heading);
    const advanced=make('details','murasame-advanced');advanced.append(make('summary','','更多设置与资源'));for(const node of legacy)advanced.append(node);
    const groups={};for(const [key,title]of [['click','点击互动'],['bubble','气泡'],['voice','丛雨语音'],['notice','状态提示']]){const group=make('section','murasame-settings-group');group.append(make('h3','',title));groups[key]=group;}
    groups.library=make('section','murasame-settings-group');groups.library.append(controls.querySelector('.murasame-library'));
    const balance=controls.querySelector('[aria-label="点击查看额度或余额"]').closest('label'),voice=controls.querySelector('[aria-label="点击语音"]').closest('label'),seconds=controls.querySelector('[aria-label="气泡自动消失秒数"]'),volume=controls.querySelector('[aria-label="丛雨语音音量"]'),output=controls.querySelector('output'),note=controls.querySelector('p');
    const rename=(label,title)=>{const input=label.querySelector('input');label.replaceChildren(make('span','',title),input);label.className='murasame-setting-row';input.setAttribute('role','switch');return input;};
    rename(balance,'点击查看剩余额度');rename(voice,'点击播放语音');groups.click.append(balance);groups.voice.append(voice);
    const size=advanced.querySelector('input.dshwv-range'),sizeNumber=advanced.querySelector('input.dshwv-number');
    let resizing=false;
    if(size&&sizeNumber){
      const row=size.closest('.dshwv-menu-row');row.classList.add('murasame-setting-field');
      size.setAttribute('aria-label','丛雨大小');sizeNumber.setAttribute('aria-label','丛雨大小级别');
      groups.click.insertBefore(row,balance);groups.click.querySelector('h3').textContent='外观与点击';
      size.addEventListener('pointerdown',event=>{resizing=true;size.setPointerCapture(event.pointerId);});
      const finish=()=>{resizing=false;requestFit();};
      size.addEventListener('pointerup',finish);size.addEventListener('pointercancel',finish);size.addEventListener('lostpointercapture',finish);
    }
    const followHint=make('p','','丛雨仅在 GPT 窗口内显示，自动随窗口移动。');groups.click.append(followHint);
    const volumeRow=make('label','murasame-setting-field');volumeRow.append(make('span','','音量'),volume,output);groups.voice.append(volumeRow,note);
    const importBox=make('section','murasame-settings-group'),openLibraries=make('button','murasame-advanced-check','管理整套语音库');openLibraries.type='button';openLibraries.onclick=()=>window.dispatchEvent(new Event('murasame-open-library-manager'));
    importBox.append(make('h3','','角色语音库'),make('p','murasame-advanced-hint','整套导入、保存和切换其他角色的语音。每套库的收藏单独保存，随时可切回内置丛雨库。'),openLibraries);advanced.append(importBox);
    // Keep upstream controls and their handlers; only regroup their existing nodes.
    const advancedStyle=make('style');advancedStyle.textContent=`
      .murasame-advanced[open]>summary{position:sticky;top:-1px;z-index:3;background:#fcfcff;padding:8px 0;border-bottom:1px solid #e3e7f1}
      .murasame-advanced-card{margin:8px 0;padding:10px;background:#f0f3fa;border:1px solid #e1e6f2;border-radius:10px;min-width:0}
      .murasame-advanced-card>summary{cursor:pointer;font-weight:600;color:#34466e;list-style-position:inside}
      .murasame-advanced-hint{font:11px/1.5 system-ui;color:#71809a;margin:7px 0;overflow-wrap:anywhere}
      .murasame-advanced-card .dshwv-menu-row{flex-wrap:wrap;gap:6px;margin:8px 0;min-width:0}
      .murasame-advanced-card .dshwv-rolebtn{min-width:0;max-width:100%}
      .murasame-advanced-card button:focus-visible,.murasame-advanced-card summary:focus-visible{outline:2px solid #98aaff;outline-offset:2px}
      .murasame-advanced-card .murasame-settings-group{padding:0;background:transparent;margin:10px 0 0}
      .murasame-advanced-check{border:1px solid #d5dcef;border-radius:7px;background:white;color:#536ba9;padding:6px 9px;cursor:pointer}
    `;document.head.append(advancedStyle);
    const advancedRoot=advanced.querySelector('.dshwv-menuview');
    if(advancedRoot){
      const rows=[...advancedRoot.querySelectorAll('.dshwv-menu-row')];
      const card=(id,title,hint)=>{const el=make('details','murasame-advanced-card');el.dataset.advancedSection=id;el.append(make('summary','',title),make('p','murasame-advanced-hint',hint));return el;};
      const appearance=card('appearance','角色与位置','替换角色图片，或调整边缘吸附。隐藏菜单按钮后，可右键丛雨重新打开设置。');
      const bubbles=card('bubbles','气泡样式','编辑点击时的气泡内容、外框与图片。显示开关和消失时间在常用设置的“气泡”页。');
      const sounds=card('sounds','提示音效','编辑按压、松开和任务提醒的音效。“狗修金”语音和收藏夹在“语音”页设置。');
      const resources=card('resources','资源管理','查看、导入或删除自己添加的角色图、气泡图和提示音素材。内置语音收藏在“语音”页管理。');
      for(const row of rows){
        const text=row.textContent,button=row.querySelector('button');
        if(text.includes('角色')||text.includes('避让滚动条')||text.includes('吸附与翻转')||text.includes('隐藏菜单按钮')){
          appearance.append(row);
          const input=row.querySelector('input[type=checkbox]');if(input)input.setAttribute('aria-label',text.includes('隐藏菜单按钮')?'隐藏丛雨菜单按钮':'避让滚动条');
        }else if(text.includes('气泡全局开关')){
          for(const child of [...row.children])if(child!==button)child.hidden=true;
          if(button){button.textContent='编辑点击气泡';button.setAttribute('aria-label','编辑点击气泡');}bubbles.append(row);
        }else if(text.includes('音效与提示')){
          if(button){button.textContent='编辑提示音效';button.setAttribute('aria-label','编辑提示音效');}sounds.append(row);
        }else if(text.includes('资源管理')){
          if(button){button.textContent='打开资源管理';button.setAttribute('aria-label','打开资源管理');}resources.append(row);
        }
      }
      resources.append(importBox);
      const inspection=card('inspection','本地检查与帮助','检查本地语音目录是否可读取。此处不播放声音，也不修改你的设置。');
      const check=make('button','murasame-advanced-check','检查本地资源'),result=make('p','murasame-advanced-hint','尚未检查');check.type='button';check.setAttribute('aria-label','检查丛雨本地资源');result.setAttribute('role','status');
      check.onclick=async()=>{check.disabled=true;result.textContent='正在检查…';try{
        const response=await fetch('/murasame/voice/manifest.json',{cache:'no-store'});if(!response.ok)throw Error('manifest');const manifest=await response.json();if(!Array.isArray(manifest.tracks)||!manifest.tracks.length)throw Error('manifest');
        const player=window.MurasameVoicePlayer;result.textContent='内置语音目录可读取：'+manifest.tracks.length+' 段。当前目录 '+(player?.tracks.length||0)+' 段，收藏 '+(player?.favoriteIds.size||0)+' 段。语音'+(player?.enabled?'已开启':'已关闭')+'。';
      }catch{result.textContent='本地语音目录读取失败，请重新打开丛雨；收藏记录不会因此清空。';}finally{check.disabled=false;requestFit();}};
      inspection.append(check,result,make('p','murasame-advanced-hint','找不到丛雨时使用“找回小丛雨”快捷方式；重置位置只会移回默认位置，不会清空收藏或设置。'));
      appearance.open=true;advancedRoot.replaceChildren(appearance,bubbles,sounds,resources,inspection);
      for(const node of legacy)if(node!==advancedRoot&&!node.classList.contains('dshwv-usage-area'))node.hidden=true;
      advanced.addEventListener('toggle',event=>{if(event.target!==advanced){requestFit();window.dispatchEvent(new Event('whale-shape-request'));}},true);
    }
    const error=make('p','murasame-settings-error');error.hidden=true;
    const switches=[];
    function switchRow(group,title,key){const label=make('label','murasame-setting-row'),input=make('input');input.type='checkbox';input.setAttribute('role','switch');input.setAttribute('aria-label',title);label.append(make('span','',title),input);group.append(label);switches.push({input,key});input.onchange=async()=>{error.hidden=true;input.disabled=true;try{if(await host.set(key,input.checked)===false)throw Error('Save failed');}catch{error.textContent='保存失败，请重试';error.hidden=false;}finally{input.disabled=false;sync();}};return input;}
    switchRow(groups.bubble,'显示气泡','bubble');
    const autoLabel=make('label','murasame-setting-row'),auto=make('input');auto.type='checkbox';auto.setAttribute('role','switch');auto.setAttribute('aria-label','气泡自动消失');autoLabel.append(make('span','','自动消失'),auto);groups.bubble.append(autoLabel);
    const duration=make('label','murasame-setting-field');duration.append(make('span','','显示时长'),seconds,make('span','','秒'));groups.bubble.append(duration);
    let lastSeconds=8;try{lastSeconds=Math.max(1,Math.min(600,Number(localStorage.getItem('murasame-bubble-last-seconds'))||8));}catch{}
    const oldSecondsChange=seconds.onchange;
    function syncTimer(){auto.checked=window.MurasameBubbleTimer.seconds>0;seconds.disabled=!auto.checked;seconds.value=auto.checked?window.MurasameBubbleTimer.seconds:lastSeconds;}
    auto.onchange=()=>{if(!auto.checked&&window.MurasameBubbleTimer.seconds>0)lastSeconds=window.MurasameBubbleTimer.seconds;window.MurasameBubbleTimer.configure(auto.checked?lastSeconds:0);localStorage.setItem('murasame-bubble-last-seconds',String(lastSeconds));syncTimer();};
    seconds.onchange=()=>{if(Number(seconds.value)<=0){auto.checked=false;}oldSecondsChange();if(window.MurasameBubbleTimer.seconds>0)lastSeconds=window.MurasameBubbleTimer.seconds;localStorage.setItem('murasame-bubble-last-seconds',String(lastSeconds));syncTimer();};
    switchRow(groups.notice,'等待回答提示','question');switchRow(groups.notice,'等待授权提示','approval');switchRow(groups.notice,'任务完成提示','turn');
    const reset=make('button','','重置丛雨位置');reset.type='button';reset.style.cssText='width:100%;margin-top:10px;border:1px solid #d5dcef;background:white;border-radius:8px;color:#536ba9;padding:7px;cursor:pointer';reset.onclick=()=>window.dispatchEvent(new Event('whale-reset-position'));
    const tabs=make('nav','murasame-settings-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','设置分类');
    const definitions=[['common','常用',['click','voice']],['library','语音',['library']],['bubble','气泡',['bubble']],['notice','提醒',['notice']]],tabButtons=[];let fitFrame=0,lastFitKey='';
    for(const [key,group]of Object.entries(groups)){group.id='murasame-settings-'+key;group.setAttribute('role','tabpanel');}
    function selectTab(id){for(const [index,[key,,visible]]of definitions.entries()){const active=key===id;tabButtons[index].setAttribute('aria-selected',String(active));tabButtons[index].tabIndex=active?0:-1;for(const group of visible)groups[group].hidden=!active;}try{localStorage.setItem('murasame-settings-tab',id);}catch{}requestFit();}
    for(const [index,[key,label,visible]]of definitions.entries()){const button=make('button','',label);button.type='button';button.dataset.settingsTab=key;button.setAttribute('role','tab');button.setAttribute('aria-controls',visible.map(x=>groups[x].id).join(' '));button.onclick=()=>selectTab(key);button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?definitions.length-1:(index+(event.key==='ArrowRight'?1:definitions.length-1))%definitions.length;selectTab(definitions[next][0]);tabButtons[next].focus();};tabButtons.push(button);tabs.append(button);}
    window.MurasameOpenVoiceLibraries=()=>{if(!menu.classList.contains('dshwv-menu-open'))document.querySelector('.dshwv-menu-btn')?.click();advanced.open=false;controls.hidden=false;selectTab('library');};
    const pages=make('div','murasame-settings-pages');pages.append(...Object.values(groups));
    controls.replaceChildren(tabs,pages,reset,error);menu.append(advanced);
    let initialTab='common';try{const saved=localStorage.getItem('murasame-settings-tab');if(definitions.some(x=>x[0]===saved))initialTab=saved;}catch{}selectTab(initialTab);
    function sync(){const values=host.get();for(const {input,key}of switches)input.checked=!!values[key];syncTimer();}
    let preferredHeight=0,placement=null;
    function measurePages(){
      if(resizing||advanced.open)return;
      const hidden=Object.values(groups).map(group=>group.hidden);let height=0;
      for(const [,,visible]of definitions){for(const [key,group]of Object.entries(groups))group.hidden=!visible.includes(key);height=Math.max(height,pages.getBoundingClientRect().height);}
      Object.values(groups).forEach((group,index)=>group.hidden=hidden[index]);
      // Reserve room for placement only. Never add blank space to the active page.
      preferredHeight=Math.ceil(menu.scrollHeight+menu.offsetHeight-menu.clientHeight-pages.getBoundingClientRect().height+height);
    }
    function requestFit(){if(!fitFrame)fitFrame=requestAnimationFrame(()=>{fitFrame=0;measurePages();fitMenu();});}
    function fitMenu(){
      if(resizing||!menu.classList.contains('dshwv-menu-open'))return;
      const anchor=document.querySelector('.dshwv-menu-btn').getBoundingClientRect(),pet=document.querySelector('.dshwv-img').getBoundingClientRect(),pad=8,gap=18;
      const petRoot=document.querySelector('.dshwv-root');
      const bubbles=[...document.querySelectorAll('.whale-account-card,.dshwv-pop')].filter(el=>el.checkVisibility()&&Number(getComputedStyle(el).opacity)>.05).map(el=>el.getBoundingClientRect()).filter(r=>r.width>5&&r.height>5);
      // Animation and content sizes must not change an already open menu's anchor.
      const context=[innerWidth,innerHeight,petRoot.offsetLeft,petRoot.offsetTop,petRoot.offsetWidth,petRoot.offsetHeight,...bubbles.flatMap(r=>[r.left,r.top,r.right,r.bottom].map(Math.round))].join(':');
      function applyPlacement(value){
        const styles={left:value.left+'px',top:value.top+'px',right:'auto',bottom:'auto',maxWidth:value.maxWidth+'px',maxHeight:value.maxHeight+'px',transformOrigin:'top left'};
        for(const [name,text]of Object.entries(styles))if(menu.style[name]!==text)menu.style[name]=text;
      }
      if(placement?.context===context){applyPlacement(placement);return;}
      const key=()=>context+'|'+[innerWidth,innerHeight,pet.left,pet.top,pet.right,pet.bottom,menu.offsetWidth,menu.offsetHeight,menu.scrollHeight].map(x=>Math.round(x*10)/10).join(':');
      if(lastFitKey===key())return;
      menu.style.maxWidth=(innerWidth-pad*2)+'px';menu.style.maxHeight=(innerHeight-pad*2)+'px';
      const requestedHeight=Math.min(innerHeight-pad*2,advanced.open?menu.scrollHeight:Math.max(preferredHeight,menu.offsetHeight));
      // Every candidate lies wholly outside the character's rectangle.
      let regions=[
        {x:pad,y:pad,w:innerWidth-pad*2,h:pet.top-gap-pad,side:'above'},
        {x:pad,y:pad,w:pet.left-gap-pad,h:innerHeight-pad*2,side:'left'},
        {x:pet.right+gap,y:pad,w:innerWidth-pad-pet.right-gap,h:innerHeight-pad*2,side:'right'},
        {x:pad,y:pet.bottom+gap,w:innerWidth-pad*2,h:innerHeight-pad-pet.bottom-gap,side:'below'}
      ].filter(r=>r.w>=120&&r.h>=100);
      // Cut each available region around the visible bubbles, keeping controls clickable.
      for(const bubble of bubbles){const block={left:bubble.left-8,top:bubble.top-8,right:bubble.right+8,bottom:bubble.bottom+8};
        regions=regions.flatMap(r=>{
          const right=r.x+r.w,bottom=r.y+r.h;
          if(right<=block.left||r.x>=block.right||bottom<=block.top||r.y>=block.bottom)return[r];
          return [
            {...r,w:Math.min(right,block.left)-r.x},
            {...r,x:Math.max(r.x,block.right),w:right-Math.max(r.x,block.right)},
            {...r,h:Math.min(bottom,block.top)-r.y},
            {...r,y:Math.max(r.y,block.bottom),h:bottom-Math.max(r.y,block.bottom)}
          ].filter(part=>part.w>=120&&part.h>=100);
        });
      }
      let region=regions.find(r=>r.w>=menu.offsetWidth&&r.h>=requestedHeight);
      if(!region)region=regions.sort((a,b)=>Math.min(310,b.w)*b.h-Math.min(310,a.w)*a.h)[0];
      if(!region)return;
      menu.style.maxWidth=Math.floor(region.w)+'px';menu.style.maxHeight=Math.floor(region.h)+'px';
      const width=menu.offsetWidth,height=menu.offsetHeight;
      const wantedX=region.side==='left'?region.x+region.w-width:region.side==='right'?region.x:anchor.right-width;
      const wantedY=region.side==='above'?region.y+region.h-Math.min(requestedHeight,region.h):region.side==='below'?region.y:anchor.top;
      menu.style.left=Math.max(region.x,Math.min(region.x+region.w-width,wantedX))+'px';menu.style.right='auto';
      menu.style.top=Math.max(region.y,Math.min(region.y+region.h-Math.min(requestedHeight,region.h),wantedY))+'px';menu.style.bottom='auto';
      menu.style.transformOrigin=region.side==='above'?'bottom right':'top right';
      placement={context,left:parseFloat(menu.style.left),top:parseFloat(menu.style.top),maxWidth:Math.floor(region.w),maxHeight:Math.floor(region.y+region.h-parseFloat(menu.style.top))};
      applyPlacement(placement);
      lastFitKey=key();
      window.dispatchEvent(new Event('whale-shape-request'));
    }
    window.MurasameSettingsLayout={snapshot:()=>{const r=menu.getBoundingClientRect();return{version:'anchor-lock-v1',open:menu.classList.contains('dshwv-menu-open'),left:r.left,top:r.top,width:r.width,height:r.height,anchor:placement?{left:placement.left,top:placement.top}:null};}};
    sync();new MutationObserver(()=>{if(menu.classList.contains('dshwv-menu-open')){lastFitKey='';sync();requestFit();}else placement=null;}).observe(menu,{attributes:true,attributeFilter:['class']});
    new ResizeObserver(requestFit).observe(menu);advanced.addEventListener('toggle',()=>{
      controls.hidden=advanced.open;
      brand.querySelector('strong').textContent=advanced.open?'更多设置':'丛雨设置';
      advanced.querySelector('summary').textContent=advanced.open?'返回常用设置':'更多设置与资源';
      menu.scrollTop=0;lastFitKey='';requestFit();
    });window.addEventListener('resize',requestFit);
    window.addEventListener('murasame-voice-layout',requestFit);
    window.WhaleRendering?.onFrame(fitMenu);
  }
  if(document.readyState==='loading'||document.readyState==='interactive')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
