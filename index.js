const WebSocket = require('ws');
const wss = new WebSocket.Server({port: 3000});

wss.on('connection', (ws) => {
  console.log('🔌 New client connected');

  ws.on('message', (message) => {
  const msgString = message.toString(); // Ensure it's a string
  const data = JSON.parse(msgString);

   if (data.type === 'chat') {
  // Broadcast to everyone EXCEPT the sender
  wss.clients.forEach(client => {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'chat', message: data.message }));
    }
  });
  return; // done handling chat

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
  });
});