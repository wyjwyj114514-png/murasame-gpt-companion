import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pluginRoot = path.join(root, 'dist/gpt-murasame-local');
const dataDir = process.env.MURASAME_DATA_DIR || path.join(root, 'private-assets/gpt-data');
const electronPath = process.env.MURASAME_ELECTRON_PATH || path.join(root, 'node_modules/electron/dist/electron.exe');
if (!fs.existsSync(path.join(pluginRoot, 'desktop/main.cjs'))) throw new Error('请先执行 npm run build:gpt');
if (!fs.existsSync(electronPath)) throw new Error('本地 Electron 运行环境缺失');
fs.mkdirSync(dataDir, { recursive: true });
const soundFile=path.join(dataDir,'.dshw-size.json');
if(!fs.existsSync(soundFile))fs.writeFileSync(soundFile,JSON.stringify({sound:false,vol:0}));
const pauseFile = path.join(dataDir, 'pause-until-host-exit.json');
if (fs.existsSync(pauseFile)) fs.unlinkSync(pauseFile);
fs.writeFileSync(path.join(dataDir, 'display-mode.json'), JSON.stringify({ mode: 'subscription' }));
const file = path.join(dataDir, 'follow-config.json');
const existing = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) : {};
fs.writeFileSync(file, JSON.stringify({ ...existing, enabled: true, mode: 'follow-codex', pluginRoot, electronPath }, null, 2));
// A project-owned supervisor, no scheduled task or changes to the host app.
const diagnostic = fs.openSync(path.join(dataDir, 'launcher.log'), 'a');
const child = spawn(path.join(process.env.SystemRoot || 'C:/Windows', 'System32/WindowsPowerShell/v1.0/powershell.exe'), ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(pluginRoot, 'desktop/supervisor.ps1'), '-DataDir', dataDir], { windowsHide: true, stdio: ['ignore', diagnostic, diagnostic] });
fs.closeSync(diagnostic);
await new Promise((resolve, reject) => { child.once('spawn', resolve); child.once('error', reject); });
child.once('exit', code => fs.appendFileSync(path.join(dataDir, 'launcher.log'), `Supervisor ${child.pid} exited: ${code}\n`));
fs.appendFileSync(path.join(dataDir, 'launcher.log'), `Started supervisor ${child.pid}\n`);
const { bridgeRequest } = await import(new URL('../dist/gpt-murasame-local/runtime/bridge.mjs', import.meta.url));
let status;
for (let attempt = 0; attempt < 150; attempt++) {
  try { status = await bridgeRequest('/api/status', { dataDir, timeoutMs: 500 }); if (status?.rendererReady) break; } catch {}
  await new Promise(resolve => setTimeout(resolve, 300));
}
if (!status?.rendererReady && child.exitCode !== null) throw new Error('桌宠监测进程已退出，请检查 supervisor-error.json / desktop-error.json');
console.log(status?.rendererReady ? '丛雨桌宠已就绪，跟随 Codex / Work。' : '正在后台等待 Codex / Work 窗口。');
// Retain the launcher until its owned supervisor ends (important for Windows jobs).
if (child.exitCode === null) await new Promise(resolve => child.once('exit', resolve));
if (child.exitCode) process.exitCode = child.exitCode;
