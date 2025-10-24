const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

const HTTP_PORT = process.env.PORT || 3000;
const USE_HTTPS = String(process.env.USE_HTTPS || '').toLowerCase() === 'true' || process.env.USE_HTTPS === '1';
const SSL_KEY_PATH = process.env.SSL_KEY || path.join(__dirname, 'certs', 'key.pem');
const SSL_CERT_PATH = process.env.SSL_CERT || path.join(__dirname, 'certs', 'cert.pem');
const ROOT_DIR = path.join(__dirname, '..');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function handleRequest(req, res) {
  const urlPath = req.url === '/' ? '/index.html' : decodeURI(req.url);
  const safePath = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT_DIR, safePath);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

let server;
if (USE_HTTPS) {
  let credentials;
  try {
    credentials = {
      key: fs.readFileSync(SSL_KEY_PATH),
      cert: fs.readFileSync(SSL_CERT_PATH)
    };
  } catch (err) {
    console.error('[Northstar] Failed to read SSL key/cert. Set SSL_KEY/SSL_CERT env vars or disable USE_HTTPS.');
    console.error(err);
    process.exit(1);
  }
  server = https.createServer(credentials, handleRequest);
} else {
  server = http.createServer(handleRequest);
}

const wss = new WebSocket.Server({ server });
const clientRoles = new Map();

function broadcastViewerCount() {
  const viewers = [...clientRoles.values()].filter(role => role === 'viewer').length;
  const payload = JSON.stringify({ type: 'viewerCount', count: viewers });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', ws => {
  console.log('[Northstar] New client connected');
  clientRoles.set(ws, 'unknown');
  broadcastViewerCount();

  ws.on('message', message => {
    const msgString = message.toString();
    let data;

    try {
      data = JSON.parse(msgString);
    } catch {
      console.warn('[Northstar] Dropped malformed JSON message');
      return;
    }

    if (data.type === 'role') {
      clientRoles.set(ws, data.role || 'unknown');
      broadcastViewerCount();
      return;
    }

    if (data.type === 'chat') {
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'chat', message: data.message }));
        }
      });
      return;
    }

    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(msgString);
      }
    });
  });

  ws.on('close', () => {
    console.log('[Northstar] Client disconnected');
    clientRoles.delete(ws);
    broadcastViewerCount();
  });

  ws.on('error', err => {
    console.error('[Northstar] Socket error', err);
  });
});

server.listen(HTTP_PORT, () => {
  const protocol = USE_HTTPS ? 'https' : 'http';
  const wsProtocol = USE_HTTPS ? 'wss' : 'ws';
  console.log(`[Northstar] ${protocol.toUpperCase()} + ${wsProtocol.toUpperCase()} server running on port ${HTTP_PORT}`);
  if (!USE_HTTPS) {
    console.log('[Northstar] Tip: Screen sharing via getDisplayMedia requires HTTPS. Enable USE_HTTPS=1 to serve over TLS.');
  }
});
