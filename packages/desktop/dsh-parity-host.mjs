import {Readable} from 'node:stream';
import {createDshBackend} from '../dsh/lib/index.js';

// Requests reach this adapter only through the existing authenticated IPC or
// the same-origin whale:// dispatcher. No extra HTTP listener or credentials.
export function createDshParity(dataDir) {
  const plugin=createDshBackend(dataDir);
  const routes=new Map(),disposers=[];
  const effect=fn=>disposers.push(fn());
  const connection={requestRejection:()=>null};
  const ctx={connection,get:name=>name==='connection'?connection:null,on:()=>()=>{},effect,
    webServer:{register(route){routes.set(route.path,route);return()=>routes.delete(route.path);},tapIndex:()=>()=>{}}};
  plugin.apply({effect,on:()=>()=>{},inject:(_names,fn)=>fn(ctx)});
  const accountRoutes=new Set(['/dsh-whale/balance.json','/dsh-whale/last-turn.json','/dsh-whale/usage-records.json','/dsh-whale/api-models.json','/dsh-whale/balance-adjustments.json','/dsh-whale/roles.json','/dsh-whale/role-pin.json','/dsh-whale/role-delete.json','/dsh-whale/role-image.png','/dsh-whale/wait.json']);
  return {
    async dispatch(url,{method='GET',body,headers={}}={}) {
      if(accountRoutes.has(url.pathname)||url.pathname==='/dsh-whale/widget.js')return null;
      const route=routes.get(url.pathname);if(!route)return null;
      if(url.pathname==='/dsh-whale/update-check.json')return {status:200,headers:{'content-type':'application/json'},body:Buffer.from(JSON.stringify({ok:false,current:'0.4.0',error:'本地丛雨构建未配置发布更新源，请通过项目交付包更新。'}))};
      const req=Readable.from(body?[Buffer.isBuffer(body)?body:Buffer.from(body)]:[]);
      req.url=url.pathname+url.search;req.method=method;req.headers={...headers,host:'127.0.0.1'};
      const result={status:200,headers:{},body:Buffer.alloc(0)};
      const res={set statusCode(v){result.status=v;},setHeader(k,v){result.headers[k.toLowerCase()]=v;},writeHead(code,h={}){result.status=code;result.headers=h;},end(value){result.body=Buffer.isBuffer(value)?value:Buffer.from(value||'');}};
      await route.handler(req,res);
      if(url.pathname==='/dsh-whale/size.json'&&method==='GET'&&result.status===200){const value=JSON.parse(result.body);value.version='0.4.0';value.versionLabel='丛雨 GPT 本地版';result.body=Buffer.from(JSON.stringify(value));}
      if(url.pathname==='/dsh-whale/about.json'&&result.status===200){const value=JSON.parse(result.body);value.plugin={name:'project-murasame-gpt',version:'0.4.0',channel:'local',label:'丛雨 GPT 本地版',upstream:value.plugin};value.ledger=null;value.balance=null;result.body=Buffer.from(JSON.stringify(value));}
      return result;
    },
    close(){for(const dispose of disposers.reverse())if(typeof dispose==='function')dispose();}
  };
}
