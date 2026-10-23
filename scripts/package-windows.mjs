import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dest = path.join(root, 'outputs/Project-Murasame-Windows-local-0.1.0');
fs.mkdirSync(dest, { recursive: true });
fs.cpSync(path.join(root, 'node_modules/electron/dist'), dest, { recursive: true });
const app = path.join(dest, 'resources/app');
fs.mkdirSync(app, { recursive: true });
for (const dir of ['packages', 'private-assets']) fs.cpSync(path.join(root, dir), path.join(app, dir), { recursive: true });
for (const file of ['scripts/preview.mjs', 'tests/desktop-verify.cjs']) {
  fs.mkdirSync(path.dirname(path.join(app, file)), { recursive: true });
  fs.copyFileSync(path.join(root, file), path.join(app, file));
}
fs.writeFileSync(path.join(app, 'package.json'), JSON.stringify({ name: 'project-murasame', version: '0.1.0', main: 'packages/desktop/main.cjs', type: 'module' }, null, 2));
fs.writeFileSync(path.join(dest, '使用说明.txt'), '个人本地版，含您本机已有的丛雨图片和语音，不能公开上传。\r\n双击 electron.exe 启动；右键设置/退出；先开启点击语音。\r\n请整体保留目录，不要单独移动 EXE。\r\n此初版为独立桌宠，尚未接入 ChatGPT 的窗口跟随或任务状态。\r\n');
console.log(dest);
