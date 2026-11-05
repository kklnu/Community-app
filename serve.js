// Local preview: serves public/ at http://localhost:3000 (the live site is GitHub Pages).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.join(__dirname, 'public');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
http.createServer((req, res) => {
  let file = path.normalize(path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': (TYPES[path.extname(file)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}).listen(process.env.PORT || 3000, () => console.log(`Community App preview at http://localhost:${process.env.PORT || 3000}`));
