const { app, BrowserWindow } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const config = require('./launcher-config.json');
const projectRoot = path.resolve(__dirname, config.projectRoot);
const dataDir = process.env.MURASAME_DATA_DIR || (config.userDataSubdir
  ? path.join(process.env.LOCALAPPDATA || app.getPath('appData'), config.userDataSubdir)
  : path.join(projectRoot, 'private-assets/gpt-data'));
fs.mkdirSync(dataDir, { recursive: true });
app.setName('Murasame Launcher');
app.setPath('userData', path.join(dataDir, 'launcher-profile'));
if (!app.requestSingleInstanceLock()) app.quit();
else app.whenReady().then(async () => {
  const progress = new BrowserWindow({ show: false, width: 340, height: 150, title: '丛雨启动器', resizable: false, autoHideMenuBar: true, webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true } });
  await progress.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent('<body style="background:#f2f8ef;color:#294538;font:16px sans-serif;padding:25px">狗修金，丛雨正在启动……</body>'));
  const log = fs.openSync(path.join(dataDir, 'native-launcher.log'), 'a');
  const electronPath = config.electronPath ? path.resolve(__dirname,config.electronPath) : path.join(projectRoot,'node_modules/electron/dist/electron.exe');
  const worker = spawn(process.execPath, [path.join(projectRoot, 'scripts/start-gpt.mjs')], { cwd: projectRoot, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', MURASAME_DATA_DIR:dataDir, MURASAME_ELECTRON_PATH:electronPath }, windowsHide: true, stdio: ['ignore', log, log] });
  fs.closeSync(log);
  worker.once('error', () => { if (!progress.isDestroyed()) { progress.show(); progress.loadURL('data:text/plain;charset=utf-8,' + encodeURIComponent('丛雨启动失败，请检查启动日志。')); } });
  worker.once('exit', code => { if (code === 0) app.quit(); else if (!progress.isDestroyed()) { progress.show(); progress.loadURL('data:text/plain;charset=utf-8,' + encodeURIComponent('丛雨启动失败，请检查启动日志。')); } });
  const { bridgeRequest } = await import(pathToFileURL(path.join(projectRoot, 'dist/gpt-murasame-local/runtime/bridge.mjs')));
  for (let attempt = 0; attempt < 150; attempt++) {
    try { const state = await bridgeRequest('/api/status', { dataDir, timeoutMs: 500 }); if (state.rendererReady) { progress.hide(); break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 300));
  }
});
// The GUI launcher owns the supervisor lifetime independently of shell sessions.
app.on('window-all-closed', () => {});
