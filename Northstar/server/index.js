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
const clientIds = new Map();
const clientsById = new Map();
let streamerId = null;
let clientCounter = 0;

function broadcastViewerCount() {
  const viewers = [...clientRoles.values()].filter(role => role === 'viewer').length;
  const payload = JSON.stringify({ type: 'viewerCount', count: viewers });

  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

function sendToClient(id, payload) {
  const client = clientsById.get(id);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(payload);
  }
}

function getClientId(ws) {
  return clientIds.get(ws) || null;
}

wss.on('connection', ws => {
  console.log('[Northstar] New client connected');
  clientRoles.set(ws, 'unknown');
  const id = `c${++clientCounter}`;
  clientIds.set(ws, id);
  clientsById.set(id, ws);
  ws.send(JSON.stringify({ type: 'hello', id }));
  broadcastViewerCount();

  ws.on('message', message => {
    const msgString = message.toString();
    let data;
    const senderId = getClientId(ws);

    try {
      data = JSON.parse(msgString);
    } catch {
      console.warn('[Northstar] Dropped malformed JSON message');
      return;
    }

    if (data.type === 'role') {
      const role = data.role || 'unknown';
      const prevRole = clientRoles.get(ws) || 'unknown';
      clientRoles.set(ws, role);
      if (role === 'streamer') {
        streamerId = senderId;
        wss.clients.forEach(client => {
          if (client !== ws && client.readyState === WebSocket.OPEN && clientRoles.get(client) === 'viewer') {
            client.send(JSON.stringify({ type: 'streamer-ready', id: streamerId }));
          }
        });
      } else if (prevRole === 'streamer' && streamerId === senderId) {
        streamerId = null;
        wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ type: 'streamer-left' }));
          }
        });
      }
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

    if (data.type === 'request-offer') {
      if (!streamerId) {
        sendToClient(senderId, JSON.stringify({ type: 'streamer-offline' }));
        return;
      }
      sendToClient(streamerId, JSON.stringify({
        type: 'request-offer',
        viewerId: senderId,
        from: senderId
      }));
      return;
    }

    if (data.type === 'offer') {
      const targetId = data.to || data.viewerId;
      if (!targetId) return;
      sendToClient(targetId, JSON.stringify({
        type: 'offer',
        offer: data.offer,
        from: senderId,
        to: targetId
      }));
      return;
    }

    if (data.type === 'answer') {
      const targetId = data.to || streamerId;
      if (!targetId) return;
      sendToClient(targetId, JSON.stringify({
        type: 'answer',
        answer: data.answer,
        from: senderId,
        to: targetId
      }));
      return;
    }

    if (data.type === 'candidate') {
      const targetId = data.to || null;
      if (!targetId) {
        if (clientRoles.get(ws) === 'viewer' && streamerId) {
          sendToClient(streamerId, JSON.stringify({
            type: 'candidate',
            candidate: data.candidate,
            from: senderId,
            to: streamerId
          }));
        }
        return;
      }
      sendToClient(targetId, JSON.stringify({
        type: 'candidate',
        candidate: data.candidate,
        from: senderId,
        to: targetId
      }));
      return;
    }
  });

  ws.on('close', () => {
    console.log('[Northstar] Client disconnected');
    const id = getClientId(ws);
    clientRoles.delete(ws);
    clientIds.delete(ws);
    if (id) {
      clientsById.delete(id);
    }
    if (streamerId && id && streamerId === id) {
      streamerId = null;
      wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'streamer-left' }));
        }
      });
    } else if (streamerId && id) {
      sendToClient(streamerId, JSON.stringify({ type: 'peer-left', viewerId: id }));
    }
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
