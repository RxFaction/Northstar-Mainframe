const WebSocket = require('ws');
const wss = new WebSocket.Server({port: 3000});
const clientRoles = new Map();

//Viewer count function
function broadcastViewerCount() {
  const viewers = [...clientRoles.values()].filter(role => role === 'viewer').length;
  const payload = JSON.stringify({ type: 'viewercount', count: viewers });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

wss.on('connection', (ws) => {
  console.log('🔌 New client connected');
  clientRoles.set(ws, 'unknown');
  broadcastViewerCount();

  ws.on('message', (message) => {
  const msgString = message.toString(); // Ensure it's a string
  const data = JSON.parse(msgString);
  if (data.type === 'role') {
    clientRoles.set(ws, 'unknown');
    broadcastViewerCount();
    return;
  }

   if (data.type === 'chat') {
  // Broadcast to everyone EXCEPT the sender
  wss.clients.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'chat', message: data.message }));
    }
  });
  return; // Done handling chat

    } else {
      // Signaling messages: send to all except sender
      wss.clients.forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    }
  });

  ws.on('close', () => {
    console.log('❌ Client disconnected');
    clientRoles.delete(ws);
    broadcastViewerCount();
  });
});

