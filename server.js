// SILENT CALIBER — LAN Multiplayer Relay Server
// Run this on ONE device (host) connected to the same Hotspot/Wi‑Fi as other players.
//
// Requirements: Node.js installed (on PC) or Termux (on Android) + the "ws" package.
//
// Setup:
//   1) npm install ws
//   2) node server.js
//   3) It will print the local IP and port (default 8080).
//   4) Other players open the app -> Online (Hotspot) -> Join -> enter that IP:8080
//
// Max players: 20 (configurable below).

const WebSocket = require('ws');
const os = require('os');

const PORT = process.env.PORT || 8080;
const MAX_PLAYERS = 20;

const wss = new WebSocket.Server({ port: PORT });
const clients = new Map(); // id -> ws

console.log('SILENT CALIBER LAN server starting...');
console.log('Max players:', MAX_PLAYERS);

wss.on('connection', (ws) => {
  if (clients.size >= MAX_PLAYERS) {
    ws.close(1000, 'Server full');
    return;
  }
  let playerId = null;

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch (e) { return; }

    if (msg.type === 'state') {
      playerId = msg.id;
      clients.set(playerId, ws);
      broadcast(msg, ws);
    } else if (msg.type === 'shoot') {
      broadcast(msg, ws);
    }
  });

  ws.on('close', () => {
    if (playerId) {
      clients.delete(playerId);
      broadcast({ type: 'leave', id: playerId }, ws);
    }
  });
});

function broadcast(msg, sender) {
  const payload = JSON.stringify(msg);
  for (const [id, client] of clients) {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Print local network IPs to help the host find their address
const nets = os.networkInterfaces();
console.log('\nShare one of these addresses with other players:');
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      console.log(`  ${net.address}:${PORT}`);
    }
  }
}
console.log('\nServer running. Waiting for players...');
