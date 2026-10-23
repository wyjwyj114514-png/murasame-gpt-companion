import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { customizeWidget } from './murasame-widget.mjs';
import { brandBuild } from './murasame-branding.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const upstream = path.join(root, 'upstream/dsh-whale');
const dest = path.join(root, process.argv.includes('--local-assets') ? 'dist/dsh-murasame-local' : 'dist/dsh-murasame-public');
fs.mkdirSync(dest, { recursive: true });
for (const name of ['lib', 'assets', 'LICENSE', 'PROVENANCE.md', 'README.md', 'icon.png', 'cordis.patch.yml', 'package.json']) {
  fs.cpSync(path.join(upstream, name), path.join(dest, name), { recursive: true });
}
const widget = path.join(dest, 'assets/whale-widget.js');
let original = fs.readFileSync(widget, 'utf8');
const menuStart=original.indexOf('function positionMenu() {'),menuEnd=original.indexOf('// —— 自定义角色：列表',menuStart);
if(menuStart<0||menuEnd<0)throw Error('DSH menu layout hook changed');
original=original.slice(0,menuStart)+fs.readFileSync(path.join(root,'packages/dsh/menu-layout.js'),'utf8')+'\n'+original.slice(menuEnd);
original=original.replace('    if (!menuBtnHide) return','    // Right-click toggles the menu even while its button is visible.');
const marker = 'function whaleClick() {';
if (original.split(marker).length !== 2) throw new Error('Upstream click hook changed; review before building');
let core = fs.readFileSync(path.join(root, 'packages/voice/voice-core.mjs'), 'utf8').replace(/export\s+(?=class|function|const)/g, '');
let browser = fs.readFileSync(path.join(root,'packages/voice/libraries.mjs'),'utf8').replaceAll('export class','class')+'\n'+fs.readFileSync(path.join(root, 'packages/voice/browser.mjs'), 'utf8').replace(/^import .*?;\r?\n/gm, '').replace('export class VoicePlayer', 'class VoicePlayer');
const voiceControls=fs.readFileSync(path.join(root,'packages/voice/controls.mjs'),'utf8').replace('export function','function');
const adapter = fs.readFileSync(path.join(root, 'packages/dsh/adapter.js'), 'utf8');
core += '\n'+fs.readFileSync(path.join(root,'packages/desktop/bubble-timer.mjs'),'utf8').replace('export class','class');
fs.writeFileSync(widget, customizeWidget(original) + '\n;(function(){\n' + core + '\n' + browser + '\n' + voiceControls + '\n' + adapter + '\n})();\n');
const indexPath = path.join(dest, 'lib/index.js');
let index = fs.readFileSync(indexPath, 'utf8');
const routeMarker = "path: '/dsh-whale/widget.js',";
const position = index.lastIndexOf("    disposers.push(registerRoute({", index.indexOf(routeMarker));
if (position < 0) throw new Error('Upstream route hook changed; review before building');
const routes = `
    // Murasame local-only voice library. Same authentication gate as upstream.
    const murasameDir = path.join(PACKAGE_ROOT, 'private-assets', 'voice');
    if (fs.existsSync(murasameDir)) {
      for (const name of fs.readdirSync(murasameDir).filter(n => /^(?:[0-9]{3}\\.mp3|manifest\\.json)$/.test(n))) {
        disposers.push(registerRoute({ kind: 'exact', path: '/murasame/voice/' + name,
          handler: (req, res) => {
            if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
            try { const bytes = fs.readFileSync(path.join(murasameDir, name));
              res.writeHead(200, { 'Content-Type': name.endsWith('.json') ? 'application/json' : 'audio/mpeg', 'Cache-Control': 'no-store', 'Content-Length': bytes.length });
              res.end(req.method === 'HEAD' ? undefined : bytes);
            } catch { res.writeHead(404); res.end(); }
          }
        }));
      }
    }
`;
index = (index.slice(0, position) + routes + index.slice(position)).replaceAll('老大', '狗修金');
fs.writeFileSync(indexPath, index);
if (process.argv.includes('--local-assets')) {
  fs.cpSync(path.join(root, 'private-assets/voice'), path.join(dest, 'private-assets/voice'), { recursive: true });
}
const pkgPath = path.join(dest, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = '0.4.2-murasame.1';
pkg.description += ' · Project Murasame 本地语音扩展';
if (process.argv.includes('--local-assets')) pkg.files.push('private-assets');
// Preserve the plugin id, upstream attribution, and existing configuration keys.
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
brandBuild(dest,process.argv.includes('--local-assets')?path.join(root,'private-assets/character.png'):null);
console.log(`Built ${dest} (${process.argv.includes('--local-assets') ? 'private local assets included' : 'public code only'})`);
