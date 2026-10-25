const { app, BrowserWindow, shell } = require('electron');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { quotePayload } = require('../api/quote-service.cjs');

const ROOT = path.resolve(__dirname, '..');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

let server;

function safeStaticPath(requestUrl) {
  const parsed = new URL(requestUrl, 'http://127.0.0.1');
  const pathname = parsed.pathname === '/' ? '/index.html' : parsed.pathname;
  const requested = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT, requested);
  return filePath.startsWith(ROOT) ? filePath : null;
}

function sendJson(response, statusCode, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': body.length,
  });
  response.end(body);
}

function createServer() {
  return new Promise((resolve, reject) => {
    const nextServer = http.createServer(async (request, response) => {
      if (request.url === '/api/quotes') {
        sendJson(response, 200, await quotePayload());
        return;
      }

      const filePath = safeStaticPath(request.url || '/');
      if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Not found');
        return;
      }

      const body = fs.readFileSync(filePath);
      response.writeHead(200, {
        'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'Content-Length': body.length,
      });
      response.end(body);
    });

    nextServer.on('error', reject);
    nextServer.listen(0, '127.0.0.1', () => resolve(nextServer));
  });
}

async function createWindow() {
  server = await createServer();
  const { port } = server.address();

  const window = new BrowserWindow({
    width: 1380,
    height: 920,
    minWidth: 980,
    minHeight: 700,
    title: 'NYSE Factor Radar',
    backgroundColor: '#0b0f14',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await window.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (server) server.close();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
