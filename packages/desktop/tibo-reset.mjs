const URL = 'https://whenreset.dev/zh-cn/codex';
export function parseTiboPage(html, now=Date.now()) {
  const match=html.match(/<div\b[^>]*class="[^"]*\breset-status\b[^"]*"[^>]*data-phase="([^"]+)"[^>]*data-stage="([^"]+)"[^>]*data-precision="([^"]+)"[^>]*>([\s\S]{0,2200}?)<\/div>\s*<\/div>/i);
  if(!match) return {status:'unavailable',reason:'公告格式暂无法识别'};
  const [,phase,stage,precision,body]=match;
  if(stage==='announced' && phase==='upcoming') {
    const stamp=body.match(/<time\b[^>]*datetime="([^"]+)"/i)?.[1];
    const timestamp=stamp && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(stamp) ? Date.parse(stamp) : NaN;
    if(precision!=='exact'||!Number.isFinite(timestamp)) return {status:'unavailable',reason:'公告未提供明确时间'};
    return {status:timestamp>now?'announced':'pending',scheduledAt:timestamp,source:URL};
  }
  return {status:'none',source:URL};
}
export function createTiboReader({fetchImpl=fetch,now=Date.now}={}) {
  let cache=null,pending=null,lastAttempt=0;
  const current=(value,stale=value.stale)=>({...value,stale,status:value.status==='announced'&&value.scheduledAt<=now()?'pending':value.status});
  return {async get(){
    if(cache&&now()-cache.observedAt<300000)return current(cache);
    if(!pending && now()-lastAttempt>=30000){
      lastAttempt=now();
      pending=(async()=>{try{
        const res=await fetchImpl(URL,{signal:AbortSignal.timeout(8000),headers:{accept:'text/html'}});
        if(!res.ok)throw Error('http');const html=await res.text();if(html.length>2000000)throw Error('too large');
        const value=parseTiboPage(html,now());if(value.status==='unavailable')throw Error('format');
        cache={...value,observedAt:now(),stale:false};return cache;
      }catch{return cache?current(cache,true):{status:'unavailable',reason:'暂时无法读取公告'};}finally{pending=null;}})();
    }
    return pending?current(await pending):cache?current(cache,true):{status:'unavailable',reason:'暂时无法读取公告'};
  }};
}
