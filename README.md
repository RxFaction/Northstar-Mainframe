# Project Northstar
Self-hostable P2P live streaming with WebRTC + WebSocket signaling. Zero CDN. Community-first.

<img width="438" height="76" alt="image" src="https://github.com/user-attachments/assets/081acd31-82d4-4536-bf35-17c5b0177f21" />
<img width="2554" height="1209" alt="image" src="https://github.com/user-attachments/assets/905b87fb-f75b-41e3-8690-94ee67566e85" />

## v1.0 Highlights (Major milestone!)
- Improved mobile layout with safe-area padding, proper top action button panel, and keyboard-aware chat (no more footer overlaps).
- Updated viewer count badge + backend role-aware signaling for cleaner streamer/viewer lifecycles.
- Multi-viewer handling with per-viewer peer connection map to ensure clean disconnects + reconnects.
- Transient network interruptions now get a recovery grace period and automatic ICE restart instead of an immediate disconnect.
- ICE candidates are buffered per peer until the corresponding remote session description is ready.
- Offer creation is serialized per viewer, with connection-generation IDs rejecting stale answers and candidates.
- Streamer/viewer transitions use an explicit lifecycle that closes peers and stops every owned media track.
- Unique streamer and viewer IDs assigned to ensure the smoothest playback.

## Features
- High quality live streaming over LAN and WAN.
- Peer-to-peer connections with WebRTC.
- Support for up to 10 concurrent viewers.
- All-in-one HTTPS + WebSocket signaling server.
- Real-time live chat.
- Selectable streaming quality presets (1080p/720p).
- Codec preference toggle (Auto / VP9 / H.264) for better clarity or compatibility.
- Simple, modern UI.

## How It Works
- **Server (`Northstar/server/index.js`)** - Node.js HTTP + WebSocket server on (default) port 3000 serves the page and relays signaling (offers, answers, ICE candidates).
- **Client (`Northstar/index.html`)** - Connects via WebSocket, captures screens with `getDisplayMedia()`, and sets up WebRTC peer connections for stream and chat.
- **Role awareness** - Streamers broadcast role state so viewer counts stay accurate; viewers can request a fresh offer if they reconnect.

## Setup (Windows 11)
1. Clone this repository or download the latest release: https://github.com/RxFaction/Northstar-Mainframe.git
2. Install Node.js 18+ and verify `node -v` works.
3. Install server dependencies:
   ```powershell
   cd .\Northstar\server
   npm.cmd install
   ```

## Setup (macOS)
1. Clone this repository or download the latest release: https://github.com/RxFaction/Northstar-Mainframe.git
2. Install Node.js 18+ and verify `node -v` works.
3. Install server dependencies:
   ```bash
   cd ./Northstar/server
   npm install
   ```

## One-time HTTPS setup
Every Northstar installation should generate its own certificate and private key. Never reuse or commit another host's private key. The generated `Northstar/server/certs/` directory is excluded by `.gitignore`.

Northstar includes a cross-platform setup assistant. From `Northstar/server`, run:

```powershell
npm run setup:https
```

If Windows PowerShell blocks `npm.ps1` because of its execution policy, use `npm.cmd run setup:https` instead. This invokes the same npm command without changing the system policy.

The assistant lists detected IPv4 addresses and asks which address viewers will use. Choose the Northstar host computer's private LAN address (usually `192.168.x.x` or `10.x.x.x`), not a viewer's address. It then finds OpenSSL, generates a unique certificate with the correct Subject Alternative Names, verifies the result, and—when run from a Git clone—confirms that the private key is protected by `.gitignore`.

Git for Windows includes a compatible copy of OpenSSL. On macOS, install OpenSSL first if it is not already available. For non-interactive setup, provide the address directly:

```powershell
npm run setup:https -- --ip 192.168.1.50
```

Replace `192.168.1.50` with the Northstar host's address. The setup assistant will not overwrite existing keys. To intentionally rotate an existing local certificate, add `--force`:

```powershell
npm run setup:https -- --ip 192.168.1.50 --force
```

If the host's LAN address changes, regenerate the certificate or reserve a stable address in the router. Self-signed certificates produce a browser warning until explicitly trusted. For a public deployment, use a domain and a certificate from a trusted certificate authority instead. To use certificates stored elsewhere, set the `SSL_KEY` and `SSL_CERT` environment variables to their paths.

## Startup
From `Northstar/server`, start Northstar with `npm.cmd start` on Windows or `npm start` on macOS. The launcher automatically uses HTTPS when both local certificate files exist and prints the exact URLs to open.

To explicitly require HTTPS, run `npm run start:https`. To intentionally run without it, use `npm run start:http`. On Windows, substitute `npm.cmd` if PowerShell blocks `npm.ps1`. You can select another port with `npm start -- --port 8080`.

Accept the self-signed certificate on first visit when using HTTPS. On another LAN device, open the printed URL containing the Northstar host's LAN address.

### Using Northstar
- Click **Go Live** on the streaming device, then **Join as Viewer** on any receiving device.
- When you click Go Live, allow the browser's prompt for screen and (optionally) microphone capture so viewers receive audio.
- Open the gear icon in the bottom-right of the stream window to tune quality presets. 720p/60fps remains the balanced default; 1080p/60fps is available if your network/GPU can handle it.
- Inside the same menu you can pick a codec preference. VP9 usually gives sharper text, while H.264 can help older or mobile hardware. Restart the stream after changing codec to apply it.
- Viewers can refresh or reconnect mid-stream; the streamer automatically reissues an offer so playback resumes without restarting the broadcast.

## Roadmap
- Authentication & access control.
- Public deployment with HTTPS + enforced Secure WebSockets.
- Persistent chat, usernames, & community features.
- Continued UI refinements: a mobile-first layout overhaul.

## Troubleshooting
- No screen share prompt on a remote device: HTTPS is required for `getDisplayMedia()`. Run `npm run setup:https`, restart with `npm start`, and open the printed `https://` address.
- "OpenSSL was not found": Install OpenSSL or Git for Windows, or set `OPENSSL` to the executable path before running `npm run setup:https`.
- "Failed to read SSL key/cert": Run `npm run setup:https` from `Northstar/server`, or set `SSL_KEY` and `SSL_CERT` to existing certificate paths.
- Can’t connect from another device on LAN: Confirm the server PC and device are on the same network, the IP is correct, and port 3000 is allowed through the firewall.
- Can’t connect from the internet: Port-forward TCP 3000 on your router to the host machine and use your public IP or domain.
- Viewer sees black video or no audio: Make sure the streamer clicked **Go Live** and granted screen + (optional) mic permissions.
