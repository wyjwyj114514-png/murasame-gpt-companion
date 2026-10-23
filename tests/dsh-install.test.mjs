import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { install, rollback } from '../scripts/install-dsh.mjs';
test('DSH 安装有备份、可回退，并拒绝覆盖额外修改', t => {
  if (!fs.existsSync('upstream/dsh-whale/lib/index.js') || !fs.existsSync('dist/dsh-murasame-local/lib/index.js')) { t.skip('Needs pinned upstream and local build'); return; }
  fs.mkdirSync('work', { recursive: true });
  const fixture = fs.mkdtempSync(path.resolve('work/install-test-'));
  const target = path.join(fixture, 'plugin');
  for (const file of ['lib/index.js', 'assets/whale-widget.js', 'package.json', 'assets/DSniang1.png', 'assets/DSniang02.png', 'icon.png']) {
    fs.mkdirSync(path.dirname(path.join(target, file)), { recursive: true }); fs.copyFileSync(path.join('upstream/dsh-whale', file), path.join(target, file));
  }
  const receipt = install(target, path.join(fixture, 'backups'));
  assert.equal(receipt.status, 'installed-awaiting-host-restart');
  assert.ok(fs.existsSync(path.join(receipt.backup, 'plugin/lib/index.js')));
  assert.ok(fs.existsSync(path.join(target, 'private-assets/voice/manifest.json')));
  assert.throws(() => install(target, path.join(fixture, 'backups')), /differs from the verified baseline/);
  const widget = path.join(target, 'assets/whale-widget.js');
  fs.appendFileSync(widget, '\n// later user change');
  assert.throws(() => rollback(receipt.receiptPath), /changed since installation/);
  fs.copyFileSync('dist/dsh-murasame-local/assets/whale-widget.js', widget);
  rollback(receipt.receiptPath);
  assert.equal(fs.readFileSync(widget, 'utf8'), fs.readFileSync('upstream/dsh-whale/assets/whale-widget.js', 'utf8'));
});
