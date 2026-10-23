const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
let server;
if (!app.requestSingleInstanceLock()) app.quit();
else app.whenReady().then(async () => {
  const { createServer } = await import(pathToFileURL(path.resolve(__dirname, '../../scripts/preview.mjs')).href);
  server = createServer();
  try {
    // A stable origin keeps localStorage settings across application restarts.
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(3188, '127.0.0.1', resolve); });
  } catch {
    dialog.showErrorBox('丛雨启动失败', '本机端口 3188 已被占用，请关闭其他丛雨实例后重试。'); app.exit(1); return;
  }
  const url = `http://127.0.0.1:${server.address().port}`;
  const window = new BrowserWindow({ width: 390, height: 620, title: '丛雨 · Project Murasame', transparent: true, frame: false, resizable: true, alwaysOnTop: true, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, target) => { if (new URL(target).origin !== url) event.preventDefault(); });
  const menu = Menu.buildFromTemplate([
    { label: '设置 / 收起', click: () => window.webContents.executeJavaScript("document.body.classList.toggle('show-settings')") },
    { label: '保持置顶', type: 'checkbox', checked: true, click: item => window.setAlwaysOnTop(item.checked) },
    { label: '打开项目文件夹', click: () => shell.openPath(path.resolve(__dirname, '../..')) },
    { type: 'separator' }, { label: '退出丛雨', click: () => app.quit() }
  ]);
  window.webContents.on('context-menu', () => menu.popup({ window }));
  await window.loadURL(url);
  await window.webContents.insertCSS(`
    html,body{background:transparent!important}body{padding:8px!important;overflow:hidden}body header,body footer{display:none}body main{max-width:100%}body .stage{margin:0;min-height:300px;background:none!important;position:relative}body #pet img{max-height:240px}body #status{background:#fffffff0;border-radius:12px;padding:8px;max-width:340px;margin:8px 0}body .settings{display:none;padding:16px;gap:14px;background:#fffffff5}body.show-settings .settings{display:grid}body .drag-handle{-webkit-app-region:drag;background:#edf4e6e8;border-radius:10px;padding:7px 10px;text-align:center;font-size:11px;color:#47633d;cursor:move}
  `);
  await window.webContents.executeJavaScript("const handle=document.createElement('div');handle.className='drag-handle';handle.textContent='拖动此处移动 · 右键打开设置 / 退出';document.querySelector('main').prepend(handle)");
  if (process.argv.includes('--verify')) await require('../../tests/desktop-verify.cjs')(window, app);
  app.on('second-instance', () => { window.show(); window.focus(); });
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => server?.close());
