import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {registerAppResource,registerAppTool,RESOURCE_MIME_TYPE} from '@modelcontextprotocol/ext-apps/server';
import {createQuotaReader} from './runtime/codex-quota.mjs';
import {VoicePool} from './runtime/voice-core.mjs';
import {createActivityReader} from './runtime/activity-reader.mjs';
import {openFloating} from './runtime/floating.mjs';
import {z} from 'zod';

const root=path.dirname(fileURLToPath(import.meta.url));
const uri='ui://murasame/companion.html';
const quota=createQuotaReader();
const pool=new VoicePool();
const activity=createActivityReader();
const voiceManifest=JSON.parse(fs.readFileSync(path.join(root,'private-assets/voice/manifest.json'),'utf8'));
const tracks=voiceManifest.tracks;
if(!tracks.every(name=>/^[0-9]{3}\.mp3$/.test(name)))throw Error('Invalid voice manifest');
pool.setTracks(tracks);
const html=fs.readFileSync(path.join(root,'panel.html'),'utf8').replace('__CHARACTER__','data:image/png;base64,'+fs.readFileSync(path.join(root,'private-assets/character.png')).toString('base64'));
const server=new McpServer({name:'murasame-companion',version:'0.4.3'});
const annotations={readOnlyHint:true,destructiveHint:false,openWorldHint:false};
registerAppResource(server,'murasame',uri,{},async()=>({contents:[{uri,mimeType:RESOURCE_MIME_TYPE,text:html,_meta:{'openai/widgetDescription':'丛雨与官方订阅额度','openai/ui':{availableDisplayModes:['inline','pip']},'ui':{prefersBorder:false,csp:{connectDomains:[],resourceDomains:[]}}}}]}));
server.registerTool('open_murasame',{
  title:'打开可拖动的丛雨',description:'在当前 Codex / Work 客户端窗口内打开可拖动丛雨，受宿主窗口边界约束。默认入口；用户明确要求侧栏时才使用 open_murasame_panel。',inputSchema:{},annotations:{readOnlyHint:false,destructiveHint:false,openWorldHint:false}
},async()=>{try{const state=await openFloating(JSON.parse(fs.readFileSync(path.join(root,'runtime/floating-config.json'),'utf8')));return {content:[{type:'text',text:state.visible&&state.attached?'丛雨已在客户端窗口内显示，可以拖动。':'丛雨已启动，正在等待客户端窗口。'}],structuredContent:state};}catch{return {isError:true,content:[{type:'text',text:'可拖动丛雨暂时启动失败，请检查本地启动器。'}]};}});
registerAppTool(server,'open_murasame_panel',{
  title:'打开丛雨',description:'在 ChatGPT 聊天旁打开丛雨，点击查看当前 Codex 账户的剩余额度，并可播放本地丛雨语音。',inputSchema:{},annotations,
  _meta:{ui:{resourceUri:uri},'openai/ui':{entrypoints:[{type:'thread'}]},'openai/outputTemplate':uri}
},async()=>({content:[{type:'text',text:'丛雨面板已准备好。'}],structuredContent:{ready:true}}));
registerAppTool(server,'get_quota',{
  title:'读取剩余额度',description:'仅查询已登录 Codex 的官方订阅剩余额度，不创建任务或调用模型。',inputSchema:{},annotations,
  _meta:{ui:{resourceUri:uri,visibility:['app']}}
},async()=>({content:[],structuredContent:await quota.get()}));
registerAppTool(server,'get_activity',{
  title:'读取等待交互状态',description:'仅返回本机提问或授权是否等待回答，不返回问题正文。',inputSchema:{},annotations,
  _meta:{ui:{resourceUri:uri,visibility:['app']}}
},async()=>({content:[],structuredContent:activity.get()}));
registerAppTool(server,'next_voice',{
  title:'播放下一段丛雨语音',description:'读取本机语音库的下一段语音，每轮不重复。不发送消息。',inputSchema:{},annotations,
  _meta:{ui:{resourceUri:uri,visibility:['app']}}
},async()=>{const id=pool.next();return {content:[],structuredContent:{id,remaining:pool.remaining,mime:'audio/mpeg',data:fs.readFileSync(path.join(root,'private-assets/voice',id)).toString('base64')}};});
registerAppTool(server,'get_voice_library',{
  title:'读取丛雨语音目录',description:'按视频顺序返回本地语音编号。',inputSchema:{},annotations,
  _meta:{ui:{resourceUri:uri,visibility:['app']}}
},async()=>({content:[],structuredContent:{tracks,libraryVersion:voiceManifest.libraryVersion,previousLibraryVersion:voiceManifest.previousLibraryVersion,previousTrackIds:voiceManifest.previousTrackIds,migrationSources:voiceManifest.migrationSources,legacyLibraryVersion:voiceManifest.legacyLibraryVersion}}));
registerAppTool(server,'get_voice',{
  title:'读取指定丛雨语音',description:'读取目录内的一段本地语音。',inputSchema:{id:z.string().regex(/^[0-9]{3}\.mp3$/)},annotations,
  _meta:{ui:{resourceUri:uri,visibility:['app']}}
},async({id})=>{if(!tracks.includes(id))return {isError:true,content:[{type:'text',text:'语音不在目录中'}]};return {content:[],structuredContent:{id,mime:'audio/mpeg',data:fs.readFileSync(path.join(root,'private-assets/voice',id)).toString('base64')}};});
await server.connect(new StdioServerTransport());
