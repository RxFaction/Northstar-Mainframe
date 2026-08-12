# Project Northstar
Self-hostable P2P live streaming with WebRTC + WebSocket signaling. Zero CDN. Community-first.

<img width="438" height="76" alt="image" src="https://github.com/user-attachments/assets/081acd31-82d4-4536-bf35-17c5b0177f21" />
<img width="2554" height="1209" alt="image" src="https://github.com/user-attachments/assets/905b87fb-f75b-41e3-8690-94ee67566e85" />

## 0.7.0-alpha Highlights
- Improved mobile layout with safe-area padding, proper top action button panel, and keyboard-aware chat (no more footer overlaps).
- Updated viewer count badge + backend role-aware signaling for cleaner streamer/viewer lifecycles.
- Multi-viewer handling with per-viewer peer connection map to ensure clean disconnects + reconnects.
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
   npm install
   ```

## Setup (macOS)
1. Clone this repository or download the latest release: https://github.com/RxFaction/Northstar-Mainframe.git
2. Install Node.js 18+ and verify `node -v` works.
3. Install server dependencies:
   ```bash
   cd ./Northstar/server
   npm install
   ```

## Create a local HTTPS certificate
Every Northstar installation should generate its own certificate and private key. Never reuse or commit another host's private key. The default `Northstar/server/certs/` directory is excluded by `.gitignore`.

The certificate must include the address entered in the browser. For LAN access, use the Northstar host computer's private IPv4 address (usually `192.168.x.x` or `10.x.x.x`), not a viewer's address or the public internet address. If the host's LAN address changes, regenerate the certificate or reserve a stable address in the router.

### Windows 11 certificate
From the repository root, replace `192.168.1.50` with the Northstar host computer's LAN IPv4 address:

```powershell
Set-Location .\Northstar\server
New-Item -ItemType Directory -Path .\certs -Force | Out-Null

$lanIp = "192.168.1.50"
$hostName = [System.Net.Dns]::GetHostName()
$san = "subjectAltName=DNS:localhost,DNS:$hostName,IP:127.0.0.1,IP:$lanIp"

# Use OpenSSL from PATH, or the copy bundled with Git for Windows.
$opensslCommand = Get-Command openssl -ErrorAction SilentlyContinue
$openssl = if ($opensslCommand) {
  $opensslCommand.Source
} else {
  "$env:ProgramFiles\Git\usr\bin\openssl.exe"
}

if (-not (Test-Path -LiteralPath $openssl)) {
  throw "OpenSSL was not found. Install OpenSSL or Git for Windows, then try again."
}

& $openssl req -x509 -nodes -newkey rsa:3072 -sha256 -days 365 `
  -keyout .\certs\key.pem `
  -out .\certs\cert.pem `
  -subj "/CN=$hostName" `
  -addext $san

& $openssl x509 -in .\certs\cert.pem -noout -subject -dates -ext subjectAltName
```

To find the likely LAN address before setting `$lanIp`, run:

```powershell
Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike "127.*" } |
  Select-Object InterfaceAlias, IPAddress
```

Choose the address for the active Wi-Fi or Ethernet adapter, avoiding VPN and virtual adapters.

### macOS certificate
From the repository root, replace `192.168.1.50` with the Northstar host Mac's LAN IPv4 address. These commands require an OpenSSL version that supports `-addext`:

```bash
cd ./Northstar/server
mkdir -p ./certs

lan_ip="192.168.1.50"
host_name="$(hostname)"
san="subjectAltName=DNS:localhost,DNS:${host_name},IP:127.0.0.1,IP:${lan_ip}"

openssl req -x509 -nodes -newkey rsa:3072 -sha256 -days 365 \
  -keyout ./certs/key.pem \
  -out ./certs/cert.pem \
  -subj "/CN=${host_name}" \
  -addext "${san}"

openssl x509 -in ./certs/cert.pem -noout -subject -dates -ext subjectAltName
```

Self-signed certificates produce a browser warning until explicitly trusted. For a public deployment, use a domain and a certificate from a trusted certificate authority instead. To use certificates stored elsewhere, set the `SSL_KEY` and `SSL_CERT` environment variables to their paths.

## Startup (Windows 11)
1. From the repo root (for example `C:\Users\Josh\Northstar`), start the server:
   ```powershell
   $env:USE_HTTPS = "1"
   node .\Northstar\server\index.js
   ```
   Omit `USE_HTTPS` if you only need `http://localhost:3000`.
2. Access the webpage:
   On the same PC: `https://localhost:3000`  
   On another LAN device: `https://<YourLocalIPv4>:3000`  
   From the internet (port-forwarded): `https://<YourPublicIP>:3000`
3. Accept the self-signed certificate on first visit when using HTTPS.

## Startup (macOS)
1. From the repo root, start the server:
   ```bash
   export USE_HTTPS=1
   node ./Northstar/server/index.js
   ```
   Omit `USE_HTTPS` if you only need `http://localhost:3000`.
2. Access the webpage:
   On the same Mac: `https://localhost:3000`  
   On another LAN device: `https://<YourLocalIPv4>:3000`  
   From the internet (port-forwarded): `https://<YourPublicIP>:3000`
3. Accept the self-signed certificate on first visit when using HTTPS.

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
- No screen share prompt on a remote device: HTTPS is required for `getDisplayMedia()`. Enable `USE_HTTPS=1` and use `https://<host>:3000`.
- "Failed to read SSL key/cert": Ensure `Northstar/server/certs/key.pem` and `Northstar/server/certs/cert.pem` exist, or set `SSL_KEY` and `SSL_CERT`.
- Can’t connect from another device on LAN: Confirm the server PC and device are on the same network, the IP is correct, and port 3000 is allowed through the firewall.
- Can’t connect from the internet: Port-forward TCP 3000 on your router to the host machine and use your public IP or domain.
- Viewer sees black video or no audio: Make sure the streamer clicked **Go Live** and granted screen + (optional) mic permissions.
