import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['lib/index.js', 'assets/whale-widget.js', 'package.json', 'assets/DSniang1.png', 'assets/DSniang02.png', 'icon.png'];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
export function install(target, backupRoot = path.join(root, 'work/backups'), previousReceipt = null) {
  target = fs.realpathSync(target);
  const build = path.join(root, 'dist/dsh-murasame-local');
  const previous = previousReceipt ? JSON.parse(fs.readFileSync(previousReceipt, 'utf8')) : null;
  if (previous && (fs.realpathSync(previous.target) !== target || previous.status !== 'installed-awaiting-host-restart')) throw new Error('Previous installation receipt does not match target');
  for (const file of files) {
    const expected = previous?.files.find(item => item.file === file)?.after || hash(path.join(root, 'upstream/dsh-whale', file));
    if (!expected || hash(path.join(target, file)) !== expected) {
      throw new Error(`Existing plugin differs from the verified baseline: ${file}. Review instead of overwriting.`);
    }
  }
  const backup = path.join(backupRoot, 'dsh-' + new Date().toISOString().replace(/[:.]/g, '-') + '-' + crypto.randomBytes(3).toString('hex'));
  fs.mkdirSync(backup, { recursive: true });
  // Back up the complete plugin, but never profile configuration or credentials.
  fs.cpSync(target, path.join(backup, 'plugin'), { recursive: true });
  const receipt = { target, backup, createdAt: new Date().toISOString(), status: 'backed-up', files: files.map(file => ({ file, before: hash(path.join(target, file)), after: hash(path.join(build, file)) })) };
  const receiptPath = path.join(backup, 'receipt.json');
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  try {
    fs.cpSync(path.join(build, 'private-assets/voice'), path.join(target, 'private-assets/voice'), { recursive: true });
    for (const file of files) fs.copyFileSync(path.join(build, file), path.join(target, file));
    for (const item of receipt.files) if (hash(path.join(target, item.file)) !== item.after) throw new Error('Installed hash mismatch: ' + item.file);
    receipt.status = 'installed-awaiting-host-restart';
  } catch (error) {
    for (const file of files) fs.copyFileSync(path.join(backup, 'plugin', file), path.join(target, file));
    receipt.status = 'restored-after-failure';
    receipt.error = error.message;
    throw error;
  } finally { fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2)); }
  return { receiptPath, ...receipt };
}
export function rollback(receiptPath) {
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  for (const item of receipt.files) {
    if (hash(path.join(receipt.target, item.file)) !== item.after) throw new Error('Plugin changed since installation; review before rollback: ' + item.file);
    if (hash(path.join(receipt.backup, 'plugin', item.file)) !== item.before) throw new Error('Backup hash mismatch: ' + item.file);
  }
  for (const item of receipt.files) fs.copyFileSync(path.join(receipt.backup, 'plugin', item.file), path.join(receipt.target, item.file));
  // Keep unused local assets rather than delete user data. Original plugin has no routes to them.
  receipt.status = 'rolled-back-awaiting-host-restart';
  fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));
  return receipt;
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  if (process.argv[2] === '--rollback') console.log(JSON.stringify(rollback(process.argv[3]), null, 2));
  else if (process.argv[2] === '--upgrade') {
    const previous = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
    console.log(JSON.stringify(install(previous.target, undefined, process.argv[3]), null, 2));
  }
  else console.log(JSON.stringify(install(process.argv[2] || path.join(os.homedir(), '.dsh/profiles/desktop/node_modules/dsh-whale-widget')), null, 2));
}
