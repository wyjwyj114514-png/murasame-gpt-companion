import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveCodexExecutable } from '../packages/desktop/codex-quota.mjs';
test('无 Codex PATH 的 Windows 图形环境也能定位已安装查询组件；明确覆盖保持优先', t => {
  if (process.platform !== 'win32') { t.skip('Windows installation layout'); return; }
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'murasame-cli-test-'));
  const executable = path.join(directory, 'OpenAI/Codex/bin/version/codex.exe');
  fs.mkdirSync(path.dirname(executable), {recursive:true}); fs.writeFileSync(executable, 'fixture only, never executed');
  assert.equal(resolveCodexExecutable({LOCALAPPDATA:directory,PATH:''}), executable);
  assert.equal(resolveCodexExecutable({LOCALAPPDATA:directory,MURASAME_CODEX_CLI:'explicit-codex.exe'}), 'explicit-codex.exe');
});
