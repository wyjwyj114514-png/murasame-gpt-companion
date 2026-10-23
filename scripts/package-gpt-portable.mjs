import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'outputs/Project-Murasame-GPT-portable-0.3.1');
if(fs.existsSync(output))throw Error('Portable output already exists; preserve it and choose a new version before rebuilding.');
fs.mkdirSync(output,{recursive:true});
fs.cpSync(path.join(root,'node_modules/electron/dist'),output,{recursive:true});
fs.renameSync(path.join(output,'electron.exe'),path.join(output,'小丛雨.exe'));
// A packaged GUI ignores an app-path CLI argument. The followed window needs
// a clean Electron runtime, also preserving the verified native image suffix.
fs.cpSync(path.join(root,'node_modules/electron/dist'),path.join(output,'runtime/electron/dist'),{recursive:true});
const app=path.join(output,'resources/app'),payload=path.join(output,'resources/project');
fs.mkdirSync(app,{recursive:true});fs.mkdirSync(path.join(payload,'scripts'),{recursive:true});
fs.copyFileSync(path.join(root,'packages/desktop/launcher.cjs'),path.join(app,'launcher.cjs'));
fs.writeFileSync(path.join(app,'package.json'),JSON.stringify({name:'murasame-portable-launcher',version:'0.3.1',main:'launcher.cjs'}));
fs.writeFileSync(path.join(app,'launcher-config.json'),JSON.stringify({projectRoot:'../project',userDataSubdir:'ProjectMurasame/gpt',electronPath:'../../runtime/electron/dist/electron.exe'}));
fs.copyFileSync(path.join(root,'scripts/start-gpt.mjs'),path.join(payload,'scripts/start-gpt.mjs'));
fs.cpSync(path.join(root,'dist/gpt-murasame-local'),path.join(payload,'dist/gpt-murasame-local'),{recursive:true});
fs.copyFileSync(path.join(root,'dist/gpt-murasame-local/LICENSE'),path.join(output,'Murasame-source-LICENSE.txt'));
fs.writeFileSync(path.join(output,'使用说明.txt'),'双击“小丛雨.exe”启动，等待当前 ChatGPT / Work 客户端。无需 Node.js，无需保留原项目目录。\r\n请整体移动本目录，不要单独移动 EXE。设置保存在当前用户 LocalAppData/ProjectMurasame/gpt。\r\n点击查看官方 Codex 剩余额度，语音在菜单单独开启；小黄鸭声音默认关闭。\r\n这是跟随窗口版，聊天面板插件仍是独立安装项。含个人角色与语音素材，仅供本机私用，不得公开上传。\r\n');
const manifest=[];
function record(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())record(file);else manifest.push({file:path.relative(output,file).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});}}
record(output);fs.writeFileSync(path.join(output,'SHA256.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({output,files:manifest.length}));
