import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { readQuota } from '../packages/desktop/codex-quota.mjs';

function fake(result) {
  const requests = [];
  const spawnImpl = (_exe, args) => {
    assert.deepEqual(args, ['app-server', '--stdio']);
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stdin = new PassThrough(); child.kill = () => {};
    child.stdin.on('data', chunk => {
      const packet = JSON.parse(chunk.toString()); requests.push(packet.method);
      if (packet.id) queueMicrotask(() => child.stdout.write(JSON.stringify({ id: packet.id, ...(packet.id === 1 ? {result:{}} : result) }) + '\n'));
    });
    return child;
  };
  return { spawnImpl, requests };
}
test('官方额度读取只发送初始化和只读查询；优先多窗口数据，未知值不冒充零', async () => {
  const fixture = fake({ result: { rateLimits: { primary: {usedPercent:99} }, rateLimitsByLimitId: { codex: { primary: {usedPercent:0,windowDurationMins:300,resetsAt:2000000000}, secondary:{usedPercent:null,windowDurationMins:10080,resetsAt:2000000001} } } } });
  const result = await readQuota(fixture);
  assert.equal(result.windows.length, 1); assert.equal(result.windows[0].usedPercent, 0);
  assert.deepEqual(fixture.requests, ['initialize','initialized','account/rateLimits/read']);
  assert.equal(result.source, 'account/rateLimits/read');
});
test('查询错误不泄露服务端内容，也不返回虚假的余额或百分比', async () => {
  const fixture = fake({error:{message:'secret-token-provider-body'}});
  await assert.rejects(readQuota(fixture), error => !error.message.includes('secret') && /暂时无法/.test(error.message));
});

test('多额度列表为空时仍读取有效的单组额度', async () => {
  const fixture = fake({result:{rateLimitsByLimitId:{},rateLimits:{primary:{usedPercent:25,windowDurationMins:300,resetsAt:2000000000}}}});
  const result = await readQuota(fixture);
  assert.equal(result.windows.length, 1);
  assert.equal(result.windows[0].usedPercent, 25);
});
