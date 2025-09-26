Project Northstar: peer-to-peer live streaming with WebRTC + WebSocket signaling. Zero CDN. Community-first.

<img width="2548" height="1386" alt="Northstar Webpage" src="https://github.com/user-attachments/assets/148c3939-b1a0-48ab-a337-24531777ae3f" />

<img width="1106" height="624" alt="Http Server" src="https://github.com/user-attachments/assets/434be842-5f05-4099-bc9f-460cd3e8e880" />

<img width="1111" height="621" alt="Node JS" src="https://github.com/user-attachments/assets/98a3e5c1-e909-42ae-a3ea-bed57a327ba3" />

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

-Clone this repository or download newest release:

https://github.com/RxFaction/Northstar-Mainframe.git

-Install dependencies:

In Powershellx86: npm install ws

-Start the signaling server + HTTP server via two PowerShell x86 windows:

cd northstar>cd server>node index.js

cd northstar>npx http-server

*IMPORTANT*: Switching between streaming from PCtoPC and PCtoOther device is enabled by commenting in/out lines 147 & 148. 

*You will have to change the local IP to your own local IPV4 address!*

-If attempting PCtoPC, in your browser open two tabs and go to *http://localhost:8080/index.html* on each tab.

-If attempting PCtoOther, on PC via browser go to *http://localhost:8080/index.html*, on other device on broswer go to *http://yourlocalip:8080/index.html*

-Click Start Viewing *FIRST*

-Click Start Streaming to share your screen.

ROADMAP

-Authentication & access control

-Public deployment with HTTPS + secure WebSockets

-Multi-peer scalability, while maintaining P2P (more than 1 viewer per streamer)

-Persistent chat & community features

-UI adjustments on Desktop

-UI overhaul on Mobile
