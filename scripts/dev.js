#!/usr/bin/env node
/*
 * Dev server with live reload.
 *   - watches content/, src/, assets/ for changes
 *   - rebuilds dist/ on every change
 *   - pushes a "reload" event over SSE; an injected client script reloads the page
 *
 * Usage:  npm run dev   (then open http://localhost:8000)
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const { build } = require('../build.js');

const PORT = Number(process.env.PORT) || 8000;
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const WATCH_DIRS = ['content', 'src', 'assets'];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png', '.jpg':  'image/jpeg', '.jpeg': 'image/jpeg',
  '.gif':  'image/gif', '.webp': 'image/webp', '.ico':  'image/x-icon',
  '.pdf':  'application/pdf',
  '.txt':  'text/plain; charset=utf-8',
};

// Tiny script injected into every .html response. Reconnects automatically.
const RELOAD_SNIPPET = `
<script>
(function(){
  function connect(){
    var es = new EventSource('/__livereload');
    es.onmessage = function(e){ if (e.data === 'reload') location.reload(); };
    es.onerror   = function(){ es.close(); setTimeout(connect, 1000); };
  }
  connect();
})();
</script>`;

// ---------- live-reload SSE channel ----------
const clients = new Set();
function notifyReload() {
  for (const res of clients) {
    try { res.write('data: reload\n\n'); } catch {}
  }
}

// ---------- build with error handling ----------
function safeBuild(reason) {
  const t = Date.now();
  try {
    build();
    console.log(`✔ rebuilt (${reason}) in ${Date.now() - t}ms`);
    notifyReload();
  } catch (err) {
    console.error(`✘ build failed (${reason}):\n  ${err.message}`);
    // Write an error page so the browser shows something useful
    try {
      fs.mkdirSync(DIST, { recursive: true });
      fs.writeFileSync(path.join(DIST, 'index.html'),
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Build error</title>
        <style>body{font:14px/1.5 ui-monospace,Menlo,monospace;padding:2rem;background:#1a1a1c;color:#ff7b7b}pre{background:#0e1014;padding:1rem;border-radius:8px;white-space:pre-wrap;color:#ececef}</style>
        </head><body><h2>⚠ Build error</h2><pre>${String(err.stack || err.message).replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c]))}</pre>${RELOAD_SNIPPET}</body></html>`);
      notifyReload();
    } catch {}
  }
}

// ---------- file watcher (debounced) ----------
let pending = null;
function scheduleRebuild(reason) {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => { pending = null; safeBuild(reason); }, 100);
}

function watchTree(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return;
  fs.watch(abs, { recursive: true }, (_evt, filename) => {
    if (!filename) return;
    scheduleRebuild(`${dir}/${filename.toString().replace(/\\/g, '/')}`);
  });
  console.log(`  watching ${dir}/`);
}

// ---------- HTTP server ----------
const server = http.createServer((req, res) => {
  try {
    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch { res.writeHead(400); res.end('400'); return; }

    // SSE endpoint
    if (urlPath === '/__livereload') {
      res.writeHead(200, {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
      });
      res.write('retry: 1000\n\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    // Static file
    let filePath = path.join(DIST, urlPath);
    if (urlPath.endsWith('/')) filePath = path.join(filePath, 'index.html');
    if (!filePath.startsWith(DIST)) { res.writeHead(403); res.end('403'); return; }

    let stat;
    try {
      stat = fs.statSync(filePath);
      if (stat.isDirectory()) { filePath = path.join(filePath, 'index.html'); stat = fs.statSync(filePath); }
    } catch {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${urlPath}`);
      return;
    }

    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';

    // For HTML, read & inject the reload snippet before </body>
    if (ext === '.html') {
      let html = fs.readFileSync(filePath, 'utf8');
      html = html.includes('</body>')
        ? html.replace('</body>', RELOAD_SNIPPET + '\n</body>')
        : html + RELOAD_SNIPPET;
      res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-cache' });
      res.end(html);
      return;
    }

    res.writeHead(200, {
      'Content-Type':   mime,
      'Content-Length': stat.size,
      'Cache-Control':  'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('handler error:', err.message);
    if (!res.headersSent) res.writeHead(500);
    res.end('500');
  }
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`port ${PORT} is in use. Try: PORT=8001 npm run dev`);
    process.exit(1);
  }
  console.error(err); process.exit(1);
});

// ---------- start ----------
console.log('▶ initial build…');
safeBuild('startup');
WATCH_DIRS.forEach(watchTree);

server.listen(PORT, () => {
  console.log(`\n▶ dev server: http://localhost:${PORT}`);
  console.log('  edit any file under content/ src/ assets/ — the page auto-reloads.');
  console.log('  Ctrl+C to stop.\n');
});
