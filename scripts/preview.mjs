import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.wav': 'audio/wav' };
export function createServer() {
  return http.createServer((req, res) => {
    const host = req.headers.host || '';
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) { res.writeHead(403).end(); return; }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
    let base = path.join(root, 'packages/demo');
    let name = pathname === '/' ? 'index.html' : pathname.slice(1);
    if (pathname.startsWith('/voice/')) { base = path.join(root, 'packages/voice'); name = pathname.slice(7); }
    if (pathname.startsWith('/local/')) { base = path.join(root, 'private-assets'); name = pathname.slice(7); }
    const target = path.resolve(base, name);
    if (target !== base && !target.startsWith(base + path.sep)) { res.writeHead(403).end(); return; }
    try {
      const bytes = fs.readFileSync(target);
      res.writeHead(200, { 'Content-Type': types[path.extname(target)] || 'application/octet-stream', 'Content-Length': bytes.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch { res.writeHead(404).end('Not found'); }
  });
}
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const server = createServer();
  server.listen(Number(process.env.MURASAME_PORT) || 3177, '127.0.0.1', () => console.log(`Murasame preview: http://127.0.0.1:${server.address().port}`));
}
