import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createServer } from '../scripts/preview.mjs';
test('预览只提供限定资源，拒绝伪造Host和写入', async t => {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  assert.equal((await fetch(base)).status, 200);
  assert.equal((await fetch(base + '/voice/browser.mjs')).status, 200);
  assert.equal((await fetch(base + '/package.json')).status, 404);
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  const status = await new Promise(resolve => { http.get(base, { headers: { Host: 'evil.example' } }, response => { response.resume(); resolve(response.statusCode); }); });
  assert.equal(status, 403);
  const traversal = await new Promise(resolve => { http.get(base + '/local/..%5cpackage.json', response => { response.resume(); resolve(response.statusCode); }); });
  assert.equal(traversal, 403);
});
