# Project Northstar
Peer-to-peer live streaming with WebRTC + WebSocket signaling. Zero CDN. Community-first.



## 0.6.0-alpha Highlights
- Combined HTTP + WebSocket server with optional HTTPS (no extra static host required).
- Smoother reconnects: viewers can refresh/join mid-stream and automatically recover the feed.
- Gear-driven stream settings (quality presets + codec preference) hidden until you need them.
- Higher bitrate defaults with min-bitrate guards for sharper text and fewer artifacts.
- Mixed screen + microphone audio capture so viewers hear everything without extra setup.

## Features
- High quality live streaming over LAN and WAN.
- Peer-to-peer connections with WebRTC.
- WebSocket signaling server.
- Real-time chat overlay.
- Selectable streaming quality presets (1080p/720p).
- Codec preference toggle (Auto / VP9 / H.264) for better clarity or compatibility.
- Simple, modern UI with quick role switching.

## How It Works
- **Server (`server/index.js`)** - Node.js HTTP + WebSocket server on port 3000 serves the page and relays signaling (offers, answers, ICE candidates).
- **Client (`index.html`)** - Connects via WebSocket, captures screens with `getDisplayMedia()`, and sets up WebRTC peer connections for stream and chat.
- **Role awareness** - Streamers broadcast role state so viewer counts stay accurate; viewers can request a fresh offer if they reconnect.

## Getting Started
1. Clone this repository or download the latest release: https://github.com/RxFaction/Northstar-Mainframe.git
2. Install dependencies (Node.js 18+ recommended):
   ```bash
   npm install
   ```
3. Start the combined HTTP + WebSocket server (from repo root):
   ```bash
   npm start
   ```
   The app will be live at `http://<host>:3000` and signaling reuses that port.

### Enable HTTPS (required for remote screen sharing)
```bash
mkdir -p server/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout server/certs/key.pem \
  -out server/certs/cert.pem \
  -subj "/CN=your-hostname"
USE_HTTPS=1 npm start
```
On Windows PowerShell run:
```powershell
New-Item -ItemType Directory -Path server/certs -Force
```
Then accept the self-signed certificate on first visit and use `https://<host>:3000` on every device.

### Using Northstar
- Click **Join as Viewer** on the receiving device, then **Go Live** on the streaming device.
- When you click Go Live, allow the browser's prompt for screen and (optionally) microphone capture so viewers receive audio.
- Open the gear icon in the bottom-right of the stream window to tune quality presets. 720p/60fps remains the balanced default; 1080p/60fps is available if your network/GPU can handle it.
- Inside the same menu you can pick a codec preference. VP9 usually gives sharper text, while H.264 can help older or mobile hardware. Restart the stream after changing codec to apply it.
- Viewers can refresh or reconnect mid-stream; the streamer automatically reissues an offer so playback resumes without restarting the broadcast.

## Roadmap
- Authentication & access control.
- Public deployment with HTTPS + enforced Secure WebSockets.
- Multi-peer scalability while keeping a P2P core (more than one viewer per streamer).
- Persistent chat & community features.
- UI refinements on desktop and a mobile-first layout overhaul.
