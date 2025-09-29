Project Northstar: peer-to-peer live streaming with WebRTC + WebSocket signaling. Zero CDN. Community-first.

<img width="2549" height="1378" alt="Webpage" src="https://github.com/user-attachments/assets/8d87217e-4517-4597-bd4c-72d9b2c9d60f" />

<img width="1113" height="629" alt="httpserver" src="https://github.com/user-attachments/assets/4fbfb901-0c91-4add-ad2b-7df67813330b" />

<img width="1111" height="620" alt="nodejsserver" src="https://github.com/user-attachments/assets/9e825215-7383-4b54-b6d9-9fdc613609e0" />

Right now, it's perfect to use for personal in house content streaming between devices. I'm curious to see other uses the community finds!

FEATURES

-High Quality Live Streaming over LAN

-Peer-to-Peer Connections 

-WebSocket Signaling Server

-Real-Time Chat

-Simple UI

-Modern Interface

HOW IT WORKS

-Node.js WebSocket Server (index.js).

-Runs on port 3000.

-Relays signaling data (offers, answers, ICE candidates).

-Web Client (index.html).

-Connects to the signaling server via WebSocket.

-Streamers share their screen/audio using getDisplayMedia().

-Viewers connect and receive the remote stream via WebRTC.

-Integrated chat system that broadcasts messages to all clients. 

GETTING STARTED

-Clone this repository or download the newest release:

https://github.com/RxFaction/Northstar-Mainframe.git

-Install dependencies:

In Powershellx86: npm install ws

-Start the signaling server + HTTP server via two seperate PowerShell x86 windows:

cd Northstar-Mainframe-0.5.2-alpha > cd Northstar-Mainframe-0.5.2-alpha > cd Northstar > cd server > node index.js

cd Northstar-Mainframe-0.5.2-alpha > cd Northstar-Mainframe-0.5.2-alpha > cd Northstar > npx http-server

To start streaming, on PC via browser go to *http://localhost:8080/index.html*, on other device via broswer go to *http://yourlocalipv4address:8080/index.html*

-Click Start Viewing *FIRST*

-Click Start Streaming to share your screen.

ROADMAP

-Authentication & access control

-Public deployment with HTTPS + Force Websocket Secure (currently WS only over LAN)

-Multi-peer scalability, while maintaining P2P (more than 1 viewer per streamer)

-Persistent chat & community features

-UI adjustments on Desktop

-UI overhaul on Mobile
