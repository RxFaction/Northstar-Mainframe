# Project Northstar

Self-hostable P2P live streaming with WebRTC + WebSocket signaling. Zero CDN. Community-first.

> **Beta status:** Northstar currently provides one global, single-streamer broadcast for trusted self-hosting. Authentication, TURN relay support, and public-service hardening remain roadmap work.

<img width="438" height="76" alt="Northstar logo" src="https://github.com/user-attachments/assets/081acd31-82d4-4536-bf35-17c5b0177f21" />
<img width="2554" height="1209" alt="Northstar application" src="https://github.com/user-attachments/assets/905b87fb-f75b-41e3-8690-94ee67566e85" />

## v1.0 Beta Highlights (Major milestone!)

- Improved mobile layout with safe-area padding, proper top action button panel, and keyboard-aware chat (no more footer overlaps).
- Updated viewer count badge and role-aware signaling for cleaner streamer/viewer lifecycles.
- Multi-viewer handling with a separate peer connection for every viewer.
- Transient network interruptions get a recovery grace period and automatic ICE restart instead of an immediate disconnect.
- ICE candidates are buffered per peer until the matching remote session description is ready.
- Offer creation is serialized per viewer, with connection-generation IDs rejecting stale answers and candidates.
- Streamer/viewer transitions use an explicit lifecycle that closes peers and stops every owned media track.
- Per-viewer quality adapts from WebRTC loss, latency, and available-bitrate statistics within the selected preset.
- Server-issued streamer and viewer IDs keep signaling routes isolated.

## Features

- High-quality live streaming over LAN and compatible WAN paths.
- Peer-to-peer WebRTC media with no CDN or media relay.
- Designed for small broadcasts of up to 10 concurrent viewers; actual capacity depends on host upload bandwidth, encoder performance, and viewer paths.
- All-in-one HTTP(S) and WebSocket signaling server.
- Real-time ephemeral chat.
- Selectable 1080p and 720p streaming presets.
- Codec preference toggle (Auto, VP9, or H.264).
- Per-viewer ICE recovery and adaptive quality.
- Responsive desktop and mobile UI.

## How It Works

- **Server (`Northstar/server/index.js`)** — Serves the browser client on port 3000 by default, assigns client IDs, and relays offers, answers, and ICE candidates.
- **Client (`Northstar/index.html`)** — Captures the stream with `getDisplayMedia()`, creates WebRTC peer connections, and owns recovery and quality adaptation.
- **Single global session** — Northstar intentionally has no rooms. One active streamer publishes directly to every viewer through a separate peer connection.

Media never passes through the Node.js server. See [Architecture](docs/ARCHITECTURE.md) for the signaling protocol, recovery model, lifecycle invariants, and planned module boundaries.

## Setup (Windows 11)

1. Clone [this repository](https://github.com/RxFaction/Northstar-Mainframe.git) or download the latest release.
2. Install Node.js 18+ and verify `node -v` works.
3. Install server dependencies:

   ```powershell
   cd .\Northstar\server
   npm.cmd install
   ```

## Setup (macOS)

1. Clone [this repository](https://github.com/RxFaction/Northstar-Mainframe.git) or download the latest release.
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

The assistant lists detected IPv4 addresses and asks which address viewers will use. Choose the Northstar host computer's private LAN address (usually `192.168.x.x` or `10.x.x.x`), not a viewer's address. It finds OpenSSL, generates a unique certificate with the correct Subject Alternative Names, verifies the result, and—when run from a Git clone—confirms that the private key is protected by `.gitignore`.

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
- Allow the browser's screen and optional microphone capture prompts.
- Open the gear icon in the stream window to choose a quality preset. 720p60 is the balanced default; 1080p60 is available when network and encoder capacity allow it.
- Choose **Smoother Motion** to protect frame rate or **Sharper Text** to protect resolution when bandwidth falls.
- Auto is the safest codec default. VP9 often produces sharper text, while H.264 can improve compatibility with older or mobile hardware. Restart the stream after changing codec.
- Viewers can refresh or reconnect mid-stream; the streamer automatically creates a fresh connection.
- Use Northstar's **Stop** button or the browser's native **Stop sharing** control to release all media tracks and peer connections.

## Network expectations

- Northstar creates one direct video sender per viewer. Upload bandwidth and browser encoding work therefore grow approximately linearly with viewer count.
- At preset ceilings, three viewers may request up to roughly 21 Mbps at 720p60 or 36 Mbps at 1080p60, plus audio and transport overhead. Per-viewer adaptation lowers those ceilings when WebRTC reports congestion.
- Northstar currently uses STUN without TURN. Restrictive NAT or firewall combinations can prevent WAN media even when the web page and signaling socket are reachable.
- For initial WAN testing, use 720p60 and add viewers one at a time while observing streamer CPU/GPU usage and upload bandwidth.

## Configuration

| Setting | Default | Purpose |
| --- | --- | --- |
| `PORT` / `--port` | `3000` | HTTP(S) and WebSocket listening port |
| `USE_HTTPS` | Launcher-controlled | Set to `1` or `true` when running `server/index.js` directly with TLS |
| `SSL_KEY` | `Northstar/server/certs/key.pem` | Optional private-key path override |
| `SSL_CERT` | `Northstar/server/certs/cert.pem` | Optional certificate path override |

`npm start` accepts `--https`, `--http`, and `--port <number>`. Run `npm start -- --help` for launcher details and `npm run setup:https -- --help` for certificate options.

## Security scope

Northstar's static server exposes only `/` and `/index.html`; server source, package files, setup scripts, and TLS material are not web-accessible. Local private keys are ignored by Git.

The current signaling server does not authenticate users or authorize streamer ownership. Treat the Beta as a trusted private deployment until authentication, origin checks, message limits, and abuse controls are implemented. Use a domain and trusted certificate rather than a self-signed certificate for a public deployment.

## Roadmap

- Authentication and access control.
- TURN configuration for restrictive WAN paths.
- Public deployment with trusted HTTPS and enforced Secure WebSockets.
- Automated signaling, lifecycle, and quality-controller regression tests.
- Persistent chat, usernames, and community features.
- Split the browser client into lifecycle, signaling, peer, ICE, quality, and UI modules.

## Troubleshooting

- **No screen-share prompt on a remote device:** HTTPS is required for `getDisplayMedia()`. Run `npm run setup:https`, restart with `npm start`, and open the printed `https://` address.
- **"OpenSSL was not found":** Install OpenSSL or Git for Windows, or set `OPENSSL` to the executable path before running `npm run setup:https`.
- **"Failed to read SSL key/cert":** Run `npm run setup:https` from `Northstar/server`, or set `SSL_KEY` and `SSL_CERT` to existing certificate paths.
- **Can't connect from another device on LAN:** Confirm the server PC and device are on the same network, the IP is correct, and port 3000 is allowed through the firewall.
- **Can't load Northstar from the internet:** Confirm DNS or the public IP reaches the host and that the configured TCP signaling port is forwarded through the router and host firewall.
- **Page and chat work over WAN, but video does not:** The signaling route is working, but direct ICE connectivity likely failed. A TURN server may be required for one of the networks.
- **Viewer sees black video or no audio:** Make sure the streamer clicked **Go Live** and granted screen and optional microphone permissions.
- **One viewer stutters while others remain smooth:** That viewer's route is likely adapting independently. Compare packet loss, RTT, browser, and Wi-Fi conditions on that device.
- **Every viewer stutters at once:** Check streamer CPU/GPU usage, capture performance, and total host upload bandwidth.
