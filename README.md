Project Northstar — P2P Streaming Platform

Project Northstar is a prototype peer-to-peer live streaming platform built with WebRTC, WebSockets, and Node.js. It enables users to share live video/audio streams directly with viewers, while also providing a lightweight chat system.

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


-Start the signaling server + HTTP:

node index.js
npx http-server


-Open index.html in your browser (x2) via *http://localhost:8080/index.html*

-Click Start Viewing first 

-Click Start Streaming to share your screen.

ROADMAP

-Authentication & access control
-Public deployment with HTTPS + secure WebSockets
-Multi-peer scalability (more than 1 viewer per streamer)
-Persistent chat & community features
