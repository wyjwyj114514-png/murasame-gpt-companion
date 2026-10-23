import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { customizeWidget } from './murasame-widget.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'upstream/codex-whale');
const target = path.join(root, 'dist/gpt-murasame-local');
fs.mkdirSync(target, { recursive: true });
for (const name of ['desktop', 'runtime', 'lib', 'assets', 'vendor', 'tests', 'LICENSE', 'PROVENANCE.md', 'package.json']) {
  fs.cpSync(path.join(source, name), path.join(target, name), { recursive: true });
}
function patch(file, marker, replacement) {
  const name = path.join(target, file), text = fs.readFileSync(name, 'utf8');
  if (text.split(marker).length !== 2) throw new Error('GPT upstream hook changed: ' + file);
  fs.writeFileSync(name, text.replace(marker, replacement));
}
const core = fs.readFileSync(path.join(root, 'packages/voice/voice-core.mjs'), 'utf8').replace(/export\s+(?=class|function|const)/g, '')+'\n'+fs.readFileSync(path.join(root,'packages/desktop/bubble-timer.mjs'),'utf8').replace('export class','class');
const player = fs.readFileSync(path.join(root,'packages/voice/libraries.mjs'),'utf8').replaceAll('export class','class')+'\n'+fs.readFileSync(path.join(root, 'packages/voice/browser.mjs'), 'utf8').replace(/^import .*?;\r?\n/gm, '').replace('export class VoicePlayer', 'class VoicePlayer');
const voiceControls=fs.readFileSync(path.join(root,'packages/voice/controls.mjs'),'utf8').replace('export function','function');
const adapter = fs.readFileSync(path.join(root, 'packages/dsh/adapter.js'), 'utf8').replace('点击角色显示余额', '点击角色显示剩余额度');
const widgetFile = path.join(target, 'assets/whale-widget.js');
fs.writeFileSync(widgetFile, customizeWidget(fs.readFileSync(widgetFile, 'utf8')));
fs.appendFileSync(path.join(target, 'assets/whale-widget.js'), '\n;(function(){\n' + core + '\n' + player + '\n' + voiceControls + '\n' + adapter + '\n})();\n');
fs.copyFileSync(path.join(root, 'packages/desktop/codex-quota.mjs'), path.join(target, 'runtime/codex-quota.mjs'));
fs.copyFileSync(path.join(root, 'packages/desktop/gpt-ui-fixture.mjs'), path.join(target, 'tests/murasame-ui-fixture.mjs'));
fs.copyFileSync(path.join(root, 'packages/desktop/native-viewport.cjs'), path.join(target, 'desktop/native-viewport.cjs'));
const quotaBubble = fs.readFileSync(path.join(root, 'packages/desktop/quota-bubble.js'), 'utf8');
const quotaBubbleCss = fs.readFileSync(path.join(root, 'packages/desktop/quota-bubble.css'), 'utf8');
patch('desktop/ui/insights.js',"for (const [command, label] of [['desktop', '进入桌面'], ['follow', '跟随 Codex']]) {","for (const [command, label] of []) {");
patch('desktop/ui/account-view.js',"'小鲸鱼 · 控制面板'","'丛雨 · 控制面板'");
fs.appendFileSync(path.join(target, 'assets/whale-widget.js'), '\n' + quotaBubble);
patch('desktop/ui/input.js', "const surfaces = '.whale-account-card,", "const surfaces = '.murasame-quota-panel,.whale-account-card,");
patch('desktop/ui/account-view.js', '  function close() { generation++;', '  function close() { if (card) window.MurasameQuotaBubble?.cancel(card); generation++;');
patch('desktop/ui/account-view.js', '  function toggleBubble(anchorRoot) {', '  function toggleBubble(anchorRoot) {\n    if (card) window.MurasameQuotaBubble?.arm(card);');
patch('desktop/ui/account-view.js', 'document.body.append(card); followCard(card); refresh(); return true;', 'window.MurasameQuotaBubble?.mount(card); document.body.append(card); window.MurasameQuotaBubble?.arm(card); followCard(card); refresh(); return true;');
patch('desktop/ui/account-view.js', "const closeButton = text(header, 'button', '关闭'); closeButton.onclick = close;", "const closeButton = text(header, 'button', '×'); closeButton.setAttribute('aria-label','关闭'); closeButton.title='关闭'; closeButton.onclick = close;");
patch('desktop/ui/account-view.js', 'document.head.append(style);', 'style.textContent += ' + JSON.stringify(quotaBubbleCss) + '; document.head.append(style);');
patch('desktop/ui/account-view.js', '    if (!card) return;\n    const anchor', '    if (!card) return;\n    if (window.MurasameQuotaBubble?.position(card, root)) return;\n    const anchor');
// A delayed initial mode read must not dismiss an already opened quota bubble.
patch('desktop/ui/account-view.js', 'commit(next); }).catch(() => {});', 'if (next !== mode) commit(next); }).catch(() => {});');
patch('desktop/main.cjs', "const { syncNativeViewport } = require('./native-viewport.cjs');", "const { syncNativeViewport, confinedViewport } = require('./native-viewport.cjs');");
patch('desktop/main.cjs', 'validateWindowShape(rects, window.getContentBounds())', 'validateWindowShape(rects, confinedViewport(lastHost, window, screen))');
patch('desktop/WindowDiagnostics.cs', 'Rect bounds = new Rect(), regionBounds = new Rect();', 'Rect hostBounds = new Rect(); if (host != IntPtr.Zero) GetWindowRect(host, out hostBounds);\n            Rect bounds = new Rect(), regionBounds = new Rect();');
patch('desktop/WindowDiagnostics.cs', 'regionType, regionBounds, bounds', 'regionType, regionBounds, bounds, hostBounds');
const quotaUiRead = "({mode:window.WhaleAccountView?.mode,clickEnabled:window.__murasameClickBalance,cardText:document.querySelector('.whale-account-card')?.innerText?.slice(0,2000)||null,cardVisible:document.querySelector('.whale-account-card')?.checkVisibility()||false,settingsUi:!!document.querySelector('.murasame-settings-tabs'),settings:window.MurasameHostSettings?.get(),bubbleSeconds:window.MurasameBubbleTimer?.seconds,settingsLayout:window.MurasameSettingsLayout?.snapshot()})";
patch('desktop/main.cjs', 'statusInfo: () => ({ followCodex:', 'statusInfo: async () => ({ quotaUi: await window.webContents.executeJavaScript(' + JSON.stringify(quotaUiRead) + ').catch(() => null), followCodex:');
patch('runtime/dispatcher.mjs', 'dataDir, ...statusInfo() });', 'dataDir, ...(await statusInfo()) });');
patch('desktop/main.cjs', 'onShow: show, statusInfo:', "onShow: () => { show(); sendCommand('quota'); }, statusInfo:");
patch('desktop/preload.cjs', "    balance: 'whale-refresh',", "    balance: 'whale-refresh',\n    quota: 'whale-open-quota',");
patch('desktop/ui/account-view.js', "    window.addEventListener('resize', position);", "    window.addEventListener('whale-open-quota', () => toggleBubble(document.querySelector('.dshwv-root')));\n    window.addEventListener('resize', position);");
patch('desktop/main.cjs', ": 'desktop-fixture.mjs';", ": 'murasame-ui-fixture.mjs';");
patch('runtime/dispatcher.mjs', "import fs from 'node:fs';", "import fs from 'node:fs';\nimport { createQuotaReader } from './codex-quota.mjs';");
patch('runtime/dispatcher.mjs', '  const insights = createInsightsService(whale.config);', '  const localInsights = createInsightsService(whale.config);\n  const quota = createQuotaReader();\n  const insights = service && process.env.MURASAME_LIVE_QUOTA_TEST !== "1" ? localInsights : { close: () => localInsights.close(), get: async () => { const [local, subscription] = await Promise.all([localInsights.get(), quota.get()]); return {...local, subscription}; } };');
patch('runtime/dispatcher.mjs', "const displayMode = () => readJson(displayModeFile, {}).mode === 'subscription' ? 'subscription' : 'api';", "const displayMode = () => !service || readJson(displayModeFile, {}).mode === 'subscription' ? 'subscription' : 'api';");
patch('runtime/dispatcher.mjs', '        const input=parsed();', "        const input=parsed();\n        if (!service && input.mode !== 'subscription') return jsonResult(400,{ok:false,error:'GPT 版固定显示订阅剩余额度'});");
patch('desktop/ui/account-view.js', "  function text(parent, tag, value)", "  if (!window.whaleDesktop?.testMode) mode = 'subscription';\n  function text(parent, tag, value)");
patch('desktop/ui/account-view.js', '    mode = next; try {', "    mode = window.whaleDesktop?.testMode ? next : 'subscription'; try {");
patch('desktop/ui/account-view.js', '  async function setMode(next) {', "  async function setMode(next) {\n    if (!window.whaleDesktop?.testMode && next !== 'subscription') return false;");
patch('desktop/ui/account-view.js', "{ const button = text(row, 'button', label);", "{ if (value === 'api' && !window.whaleDesktop?.testMode) continue; const button = text(row, 'button', label);");
patch('desktop/ui/account-view.js', '    if (card) { close(); return true; }', '    if (card) { position(); refresh(); return true; }');
patch('desktop/ui/account-view.js', "text(section, 'strong', quotaLabel(item)); text(section, 'p', windowText(item));", "text(section, 'strong', quotaLabel(item));");
patch('desktop/ui/account-view.js', "          if (used !== null) { const meter = document.createElement('progress'); meter.max = 100; meter.value = Math.min(100, used); meter.setAttribute('aria-label', item.label || '已用额度'); section.append(meter); }", `          const remainingRow = text(section, 'div', '');
          remainingRow.className = 'murasame-quota-row';
          remainingRow.style.cssText = 'display:flex;align-items:center;gap:10px;margin:8px 0';
          const remaining = used === null ? null : Math.max(0, 100 - used);
          const remainingLabel = text(remainingRow, 'span', remaining === null ? '剩余未知' : '剩余 ' + remaining.toFixed(1) + '%' + (item.stale ? '（旧）' : ''));
          remainingLabel.style.cssText = 'color:' + (remaining === null ? '#64748b' : '#15803d') + ';font-weight:700;white-space:nowrap;flex-shrink:0';
          if (remaining !== null) {
            const meter = document.createElement('progress'); meter.max = 100; meter.value = remaining;
            meter.setAttribute('aria-label', (item.label || '订阅') + '剩余额度');
            meter.style.cssText = 'flex:1;min-width:0;width:auto;accent-color:#15803d'; remainingRow.append(meter);
          }`);
// Explicit, bounded native focus regression; inactive in ordinary launches.
const bridgeStart = '    bridge = await startBridge(dispatcher, { dataDir, onHost: setHost, onMode: setMode, onResetPosition: resetPosition });';
patch('desktop/main.cjs', bridgeStart, bridgeStart + `
    if (process.env.MURASAME_VERIFY_FOCUS === '1') {
      let attempts = 0;
      const probe = setInterval(() => {
        if (++attempts > 50) { clearInterval(probe); return; }
        if (!rendererReady || !lastHost?.attached) return;
        clearInterval(probe);
        window.focus();
        setTimeout(() => {
          save(path.join(dataDir, 'focus-verification.json'), {
            at: new Date().toISOString(), focused: window.isFocused(), visible: window.isVisible(),
            pageActive: lastHost?.pageActive, companionActive: lastHost?.companionActive,
            attached: lastHost?.attached, mode: desktopMode
          });
        }, 1000);
      }, 200);
    }
`);
// Exact allowlist; keep custom protocol dispatch and CSP, no extra HTTP listener.
patch('runtime/dispatcher.mjs', '      let file;', `      if (url.pathname.startsWith('/murasame/voice/')) {
        const name = url.pathname.slice('/murasame/voice/'.length);
        if (!/^(?:[0-9]{3}\\.mp3|manifest\\.json)$/.test(name)) return jsonResult(404, {ok:false});
        if (!['GET','HEAD'].includes(method)) return jsonResult(405, {ok:false});
        const asset = path.join(ROOT, 'private-assets', 'voice', name);
        if (!fs.existsSync(asset)) return jsonResult(404, {ok:false});
        return {status:200, headers:{'content-type':name.endsWith('.json')?'application/json':'audio/mpeg'}, body:method==='HEAD'?Buffer.alloc(0):fs.readFileSync(asset)};
      }
      let file;`);
patch('desktop/main.cjs', "title: 'API 余额小鲸鱼'", "title: '丛雨 · Codex / Work'");
// The companion belongs to the active Codex page, including its owned popups.
patch('desktop/WindowApi.cs', '    static IntPtr lastWindow = IntPtr.Zero;', `    static IntPtr pageOverlay = IntPtr.Zero, pageOwner = IntPtr.Zero;
    static uint pageOverlayPid;
    static bool CompanionForeground(IntPtr foreground, IntPtr owner) {
        if (foreground == IntPtr.Zero || pageOverlay == IntPtr.Zero || pageOwner != owner || !IsFollowing()) return false;
        uint currentPid, foregroundPid;
        GetWindowThreadProcessId(pageOverlay, out currentPid);
        GetWindowThreadProcessId(foreground, out foregroundPid);
        return currentPid == pageOverlayPid && foregroundPid == pageOverlayPid &&
            (foreground == pageOverlay || GetAncestor(foreground, 2) == pageOverlay || GetAncestor(foreground, 3) == pageOverlay);
    }
    static IntPtr lastWindow = IntPtr.Zero;`);
patch('desktop/WindowApi.cs', '        follower.Start();', '        follower.Start();\n        pageOverlay = overlay; pageOwner = owner; pageOverlayPid = overlayPid;');
patch('desktop/WindowApi.cs', 'public static void StopFollowing() { var f = follower;', 'public static void StopFollowing() { pageOverlay = IntPtr.Zero; pageOwner = IntPtr.Zero; pageOverlayPid = 0; var f = follower;');
patch('desktop/WindowApi.cs', '        bool visible = chosen != IntPtr.Zero', '        bool pageActive = chosen != IntPtr.Zero && (fg == chosen || GetAncestor(fg, 3) == chosen);\n        bool companionActive = chosen != IntPtr.Zero && CompanionForeground(fg, chosen);\n        bool visible = chosen != IntPtr.Zero');
patch('desktop/WindowApi.cs', '{ "window", chosen.ToInt64().ToString() }, { "visible", visible }', '{ "window", chosen.ToInt64().ToString() }, { "pageActive", pageActive }, { "companionActive", companionActive }, { "visible", visible }');
patch('desktop/supervisor.ps1', '$whaleState.window,$whaleState.visible,$whaleState.modal', '$whaleState.window,$whaleState.visible,$whaleState.pageActive,$whaleState.companionActive,$whaleState.modal');
fs.copyFileSync(path.join(root,'packages/desktop/host-lifetime.ps1'),path.join(target,'desktop/host-lifetime.ps1'));
const supervisorFile=path.join(target,'desktop/supervisor.ps1');fs.writeFileSync(supervisorFile,fs.readFileSync(supervisorFile,'utf8').replaceAll('\r\n','\n'));
patch('desktop/supervisor.ps1', 'try {\n    while (!$whaleStop.WaitOne(100)) {', ". (Join-Path $PSScriptRoot 'host-lifetime.ps1')\n$whaleLifetime = @{seen=$false;missingSince=$null}\ntry {\n    while (!$whaleStop.WaitOne(100)) {");
patch('desktop/supervisor.ps1', '        $whaleState = [WhaleWindows]::Probe()', '        $whaleState = [WhaleWindows]::Probe()\n        if (Test-MurasameHostExit $whaleLifetime $whaleState $whaleNow) { break }');
patch('desktop/supervisor.ps1', '[void]$whaleChild.WaitForExit(7000)', 'if (!$whaleChild.WaitForExit(7000)) { $whaleChild.Kill(); [void]$whaleChild.WaitForExit(2000) }');
patch('desktop/visibility.cjs', '(state.standalone || (state.host?.hostAlive', '((!state.standalone || state.fixture) && (state.host?.hostAlive');
patch('desktop/main.cjs', "let desktopMode = read(path.join(dataDir, 'follow-config.json')).mode === 'standalone' ? 'standalone' : 'follow-codex';", "let desktopMode = 'follow-codex';");
patch('desktop/main.cjs', "if (!['standalone', 'follow-codex'].includes(mode)) return false;", "if (mode !== 'follow-codex') return false;");
patch('desktop/main.cjs', "    { label: '进入桌面', type: 'radio', checked: desktopMode === 'standalone', click: () => setMode('standalone') },\n", '');
// Keep validated Electron native regions. The upstream additional C# surface
// verifier is opt-in because it quarantines valid windows at custom Windows DPI.
patch('desktop/main.cjs', "usesWindowShape && (!fixture || process.env.WHALE_NATIVE_SURFACE_GUARD === '1')", "usesWindowShape && process.env.WHALE_NATIVE_SURFACE_GUARD === '1'");
patch('desktop/ui/account-view.js', "text(header, 'strong', '会员订阅额度')", "text(header, 'strong', '狗修金，你的剩余额度')");
patch('desktop/ui/account-view.js', "text(content, 'p', '本机近 7 天：' + tokenText(tokens.total)); text(content, 'p', '本机滚动 5 小时：' + tokenText(tokens.last5Hours));", '// Remaining subscription quota is the primary click view.');
patch('desktop/ui/account-view.js', "if (tokens.complete === false) text(content, 'small', '扫描尚不完整，仅显示部分记录。');", '// Detailed local token observations remain in the dashboard.');
patch('desktop/ui/account-view.js', "text(content, 'small', 'token 是本机观测，非官方订阅剩余额度；不包含其他设备，不能用百分比换算剩余 token。');", "text(content, 'small', '更新：' + date(sub.observedAt) + ' · ' + (sub.reason || '官方订阅额度'));\n      text(content, 'small', 'token 是本机观测，不能换算剩余额度。');");
patch('desktop/ui/account-view.js', "text(content, 'small', '更新：' + date(sub.observedAt) + ' · ' + (sub.reason || '官方订阅额度'));\n      text(content, 'small', 'token 是本机观测，不能换算剩余额度。');", "const updated = text(content, 'small', '更新：' + date(sub.observedAt)); updated.title = sub.reason || '官方订阅额度';");
patch('desktop/ui/account-view.js', "const notice = noticeText(latestNotice); if (notice) text(content, 'p', notice); position();", 'position();');
patch('desktop/ui/account-view.js', "text(section, 'small', '重置：' + date(item.resetsAt));", "const reset = text(section, 'small', '重置：' + date(item.resetsAt)); reset.className = 'murasame-quota-reset'; section.title = reset.textContent; section.setAttribute('aria-label', quotaLabel(item) + '，' + reset.textContent);");
patch('desktop/ui/account-view.js', "updated.title = sub.reason || '官方订阅额度';", "updated.className = 'murasame-quota-updated'; card.title = updated.textContent + ' · ' + (sub.reason || '官方订阅额度');");
patch('desktop/supervisor.ps1', 'Get-Content -LiteralPath $File -Raw', 'Get-Content -LiteralPath $File -Raw -Encoding UTF8');
// Windows integer DPI (e.g. 128) loses precision for custom 133% scaling.
// Pass Chromium's actual scale so the native region verifier matches Electron.
patch('desktop/main.cjs', 'surfaceGuard.next(shape, window.getContentBounds(),', 'surfaceGuard.next(shape, { ...window.getContentBounds(), scale: screen.getDisplayMatching(window.getBounds()).scaleFactor },');
patch('desktop/surface-guard.cjs', 'height: viewport.height, rects', 'height: viewport.height, scale: viewport.scale, rects');
patch('desktop/SurfaceGuard.cs', 'float scale=GetDpiForWindow(hwnd)/96f;', 'float scale=s.ContainsKey("scale") ? Convert.ToSingle(s["scale"]) : GetDpiForWindow(hwnd)/96f;');
// DIP bounds enclose fractional origins, so one DIP of rounding may exceed one pixel.
patch('desktop/SurfaceGuard.cs', 'if(Math.Abs(client.right-Number(s,"width")*scale)>1||Math.Abs(client.bottom-Number(s,"height")*scale)>1)', 'if(Math.Abs(client.right-Number(s,"width")*scale)>Math.Ceiling(scale)||Math.Abs(client.bottom-Number(s,"height")*scale)>Math.Ceiling(scale))');
patch('desktop/SurfaceGuard.cs', 'if(epoch<1||seq<1||width<1', 'if(s.ContainsKey("scale") && (Convert.ToDouble(s["scale"])<1 || Convert.ToDouble(s["scale"])>8 || Double.IsNaN(Convert.ToDouble(s["scale"]))))return;\n            if(epoch<1||seq<1||width<1');
for (const name of ['lib/widget-host.mjs']) {
  const file = path.join(target, name); fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replaceAll('老大', '狗修金'));
}
// The approved image becomes the built-in role; import/pin/delete remain upstream.
fs.copyFileSync(path.join(root, 'private-assets/character.png'), path.join(target, 'assets/DSniang1.png'));
fs.cpSync(path.join(root, 'private-assets/voice'), path.join(target, 'private-assets/voice'), { recursive: true });
patch('lib/widget-host.mjs', "name: '小鲸鱼', pinnedAt: 1", "name: '小丛雨', pinnedAt: 1");
const pkgFile = path.join(target, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
pkg.name = 'project-murasame-gpt'; pkg.version = '0.2.0';
pkg.codexBuild = 'murasame-codex-parity-20261020';
fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');
console.log('Built GPT companion: ' + target);
