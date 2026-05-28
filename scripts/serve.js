#!/usr/bin/env node
/* Tiny dev server for dist/. Safe against missing files and bad requests. */

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 8000;
const ROOT = path.resolve(__dirname, '..', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.pdf':  'application/pdf',
  '.txt':  'text/plain; charset=utf-8',
};

if (!fs.existsSync(ROOT)) {
  console.error(`dist/ not found at ${ROOT}. Run \`npm run build\` first.`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  try {
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400); res.end('400 Bad Request'); return;
    }

    // Map URL → file path, default index.html for directories
    let filePath = path.join(ROOT, urlPath);
    if (urlPath.endsWith('/')) filePath = path.join(filePath, 'index.html');

    // Block path traversal
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403); res.end('403 Forbidden'); return;
    }

    let stat;
    try {
      stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
        stat = fs.statSync(filePath);
      }
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${urlPath}`);
      return;
    }

    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type':  mime,
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('handler error:', err.message);
    if (!res.headersSent) res.writeHead(500);
    res.end('500 Internal Server Error');
  }
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`port ${PORT} is in use. Set PORT=xxxx and retry.`);
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

server.listen(PORT, () => {
  console.log(`▶ serving dist/ at http://localhost:${PORT}`);
  console.log('  Ctrl+C to stop');
});
