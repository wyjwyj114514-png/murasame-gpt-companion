import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

export function resolveCodexExecutable(env = process.env) {
  if (env.MURASAME_CODEX_CLI) return env.MURASAME_CODEX_CLI;
  // Explorer-launched apps do not inherit Codex's tool-shell PATH additions.
  if (process.platform === 'win32') {
    const directory = path.join(env.LOCALAPPDATA || path.join(os.homedir(), 'AppData/Local'), 'OpenAI/Codex/bin');
    try {
      const candidates = fs.readdirSync(directory, {withFileTypes:true}).filter(entry => entry.isDirectory())
        .map(entry => path.join(directory, entry.name, 'codex.exe')).filter(file => fs.existsSync(file))
        .map(file => ({file, modified:fs.statSync(file).mtimeMs})).sort((a,b)=>b.modified-a.modified);
      if (candidates.length) return candidates[0].file;
    } catch {}
  }
  return 'codex';
}

// Official read-only app-server method. Never creates a thread or consumes a reset.
export function readQuota({ executable = resolveCodexExecutable(), spawnImpl = spawn, timeoutMs = 12000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl(executable, ['app-server', '--stdio'], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
    let settled = false;
    const lines = createInterface({ input: child.stdout });
    const finish = (error, value) => {
      if (settled) return; settled = true; clearTimeout(timer); lines.close();
      child.stdin.end(); child.kill();
      error ? reject(new Error('暂时无法读取 Codex 订阅额度，请确认当前客户端已登录 ChatGPT')) : resolve(value);
    };
    const timer = setTimeout(() => finish(true), timeoutMs);
    child.once('error', () => finish(true)); child.once('exit', () => finish(true));
    child.stdin.on('error', () => finish(true));
    const send = value => child.stdin.write(JSON.stringify(value) + '\n');
    lines.on('line', line => {
      let value; try { value = JSON.parse(line); } catch { return; }
      if (value.id === 1) {
        if (value.error) return finish(true);
        send({ method: 'initialized', params: {} });
        send({ id: 2, method: 'account/rateLimits/read' });
      } else if (value.id === 2) {
        if (value.error) return finish(true);
        const grouped = value.result?.rateLimitsByLimitId;
        const limits = grouped && Object.keys(grouped).length ? grouped : (value.result?.rateLimits ? { codex: value.result.rateLimits } : {});
        const observedAt = Date.now(), windows = [];
        for (const [limitId, limit] of Object.entries(limits)) for (const kind of ['primary', 'secondary']) {
          const w = limit?.[kind];
          if (!w || !Number.isFinite(w.usedPercent) || !Number.isFinite(w.windowDurationMins) || !Number.isFinite(w.resetsAt)) continue;
          windows.push({ limitId, kind, label: limit.limitName || (w.windowDurationMins === 300 ? '5 小时额度' : w.windowDurationMins === 10080 ? '每周额度' : '额度窗口'), usedPercent: Math.max(0, Math.min(100, w.usedPercent)), windowDurationMins: w.windowDurationMins, resetsAt: w.resetsAt, observedAt, stale: false });
        }
        if (!windows.length) return finish(true);
        finish(null, { available: true, windows, observedAt, reason: '来自官方 Codex 订阅额度接口', source: 'account/rateLimits/read' });
      }
    });
    send({ id: 1, method: 'initialize', params: { clientInfo: { name: 'project_murasame', title: 'Murasame quota companion', version: '0.2.0' } } });
  });
}

export function createQuotaReader(options = {}) {
  let cache = null, pending = null;
  return {
    async get() {
      if (cache && Date.now() - cache.observedAt < 30000) return cache;
      if (!pending) pending = readQuota(options).then(value => cache = value).catch(() => cache ? { ...cache, windows: cache.windows.map(w => ({ ...w, stale: true })), reason: '刷新失败，显示上次成功读取的额度' } : { available: false, windows: [], observedAt: null, reason: '尚未读到当前 Codex 账户的订阅额度，请检查 ChatGPT 登录' }).finally(() => pending = null);
      return pending;
    }
  };
}
