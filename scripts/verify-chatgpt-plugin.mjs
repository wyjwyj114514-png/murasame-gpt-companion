import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {Client} from '../packages/chatgpt-plugin/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js';
import {StdioClientTransport} from '../packages/chatgpt-plugin/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js';
const output=path.resolve('work/plugin-verification');fs.mkdirSync(output,{recursive:true});
const client=new Client({name:'murasame-verifier',version:'1.0.0'});
try{
  await client.connect(new StdioClientTransport({command:process.execPath,args:[path.resolve('dist/chatgpt-murasame-plugin/server.mjs')],stderr:'pipe'}));
  const tools=await client.listTools();assert.equal(tools.tools.length,7);
  assert.deepEqual(tools.tools.find(t=>t.name==='get_activity')._meta.ui.visibility,['app']);
  const open=tools.tools.find(t=>t.name==='open_murasame_panel');assert.equal(open._meta['openai/ui'].entrypoints[0].type,'thread');
  assert.equal(tools.tools.find(t=>t.name==='open_murasame')._meta?.ui,undefined);
  assert.deepEqual(tools.tools.find(t=>t.name==='next_voice')._meta.ui.visibility,['app']);
  await client.callTool({name:'open_murasame_panel',arguments:{}});
  const resource=await client.readResource({uri:'ui://murasame/companion.html'});assert.match(resource.contents[0].text,/data:image\/png;base64,/);
  fs.writeFileSync(path.join(output,'panel.html'),resource.contents[0].text);
  const quota=(await client.callTool({name:'get_quota',arguments:{}})).structuredContent;assert.equal(quota.available,true);assert.ok(quota.windows.length>0);
  const a=(await client.callTool({name:'next_voice',arguments:{}})).structuredContent,b=(await client.callTool({name:'next_voice',arguments:{}})).structuredContent;
  assert.notEqual(a.id,b.id);assert.ok(Buffer.from(a.data,'base64').length>100);assert.equal(b.remaining,a.remaining-1);
  const expectedTracks=JSON.parse(fs.readFileSync('private-assets/voice/manifest.json','utf8')).tracks;
  const library=(await client.callTool({name:'get_voice_library',arguments:{}})).structuredContent;assert.deepEqual(library.tracks,expectedTracks);
  const chosen=(await client.callTool({name:'get_voice',arguments:{id:expectedTracks.at(-1)}})).structuredContent;assert.equal(chosen.id,expectedTracks.at(-1));assert.ok(chosen.data.length>100);
  assert.equal((await client.callTool({name:'get_voice',arguments:{id:'999.mp3'}})).isError,true);
  let floating;
  if(process.argv.includes('--floating')){const result=await client.callTool({name:'open_murasame',arguments:{}});assert.ok(!result.isError);floating=result.structuredContent;assert.equal(floating.presentation,'floating');assert.equal(floating.ready,true);}
  fs.writeFileSync(path.join(output,'mcp.json'),JSON.stringify({ok:true,tools:tools.tools.map(t=>t.name),entrypoint:'thread',quotaWindows:quota.windows.length,distinctVoices:true,floating},null,2));
  console.log('MCP protocol, thread UI resource, official quota, and non-repeating voice checks passed.');
}finally{await client.close();}
