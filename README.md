Project Northstar — peer-to-peer live streaming with WebRTC + WebSocket signaling. Zero CDN. Community-first.

Right now, it's perfect to use for personal in house content streaming between devices. I'm curious to see other uses the community finds!

FEATURES

-Live Streaming over LAN

-Peer-to-Peer Connections 

-WebSocket Signaling Server

-Real-Time Chat

-Simple UI

-Modern Interface

HOW IT WORKS

-Node.js WebSocket Server (index.js)

-Runs on port 3000.

-Relays signaling data (offers, answers, ICE candidates).

-Broadcasts chat messages to all clients.

-Web Client (index.html)

-Connects to the signaling server via WebSocket.

-Streamers share their screen/audio using getDisplayMedia().

-Viewers connect and receive the remote stream via WebRTC.

-Integrated chat system for interaction between participants.

GETTING STARTED

-Clone this repository:

git clone https://github.com/RxFaction/Northstar-Mainframe.git
cd Northstar-Main


-Install dependencies:

npm install ws


-Start the signaling server + HTTP server via PowerShell x86:

node index.js

npx http-server

Switching between streaming from PCtoPC and PCtoOther device is enabled by commenting in/out lines 147 & 148. You will have to change the local IP to your own local IP.

-If attempting PCtoPC, in your browser open two tabs and go to *http://localhost:8080/index.html* on each tab.

-If attempting PCtoOther, on PC via browser go to *http://localhost:8080/index.html*, on other device on broswer go to *http://yourlocalip/8080/index.html*

-Click Start Viewing *FIRST*

-Click Start Streaming to share your screen.

ROADMAP

-Authentication & access control

-Public deployment with HTTPS + secure WebSockets

-Multi-peer scalability, while maintaining P2P (more than 1 viewer per streamer)

-Persistent chat & community features

-UI adjustments on Desktop

-UI overhaul on Mobile
