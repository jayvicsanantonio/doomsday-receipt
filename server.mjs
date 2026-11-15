import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Resolve a request URL path safely inside the project root.
 */
function resolveSafePath(urlPath) {
  const cleanPath = (urlPath || '/').split('?')[0];
  let target = cleanPath === '/' ? 'index.html' : cleanPath.replace(/^\/+/, '');
  const fullPath = path.resolve(__dirname, target);
  if (!fullPath.startsWith(__dirname)) {
    return null;
  }
  return fullPath;
}

/**
 * Create the static HTTP server with SPA fallback to index.html.
 */
export function createServer() {
  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    const fullPath = resolveSafePath(req.url);
    if (!fullPath) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    const serveFile = (filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Internal Server Error');
          return;
        }
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
        });
        if (req.method === 'HEAD') {
          res.end();
        } else {
          res.end(data);
        }
      });
    };

    fs.stat(fullPath, (err, stats) => {
      if (!err && stats.isFile()) {
        serveFile(fullPath);
        return;
      }
      // SPA fallback for routes without an extension
      if (!path.extname(fullPath)) {
        serveFile(path.join(__dirname, 'index.html'));
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
    });
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
  const PORT = Number(process.env.PORT) || 4173;
  const HOST = process.env.HOST || '127.0.0.1';
  const server = createServer();
  server.listen(PORT, HOST, () => {
    console.log(`THE DOOMSDAY RECEIPT running at http://${HOST}:${PORT}`);
  });
}
