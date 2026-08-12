# Northstar Architecture

This document describes the v1.0 Beta implementation. It is the behavioral reference for testing and the planned client refactor.

## Product model

Northstar hosts one global broadcast:

- One WebSocket client is the active streamer.
- Every viewer receives a separate peer-to-peer WebRTC connection from that streamer.
- The Node.js server relays signaling and chat; it never carries audio or video.
- There are no rooms. Adding rooms later would require isolating streamer ownership, viewer counts, chat, and signaling routes by room ID.

Northstar is currently designed for trusted, small self-hosted broadcasts. It has no authentication or signaling authorization yet.

## Components

| Path | Responsibility |
| --- | --- |
| `Northstar/index.html` | UI, media capture, WebRTC peers, signaling client, recovery, and adaptive quality |
| `Northstar/server/index.js` | Allowlisted static serving plus WebSocket identity and signaling relay |
| `Northstar/setup/start.mjs` | Cross-platform HTTP/HTTPS launcher and URL discovery |
| `Northstar/setup/setup-https.mjs` | Safe generation and rotation of host-local self-signed TLS material |

## Connection flow

1. The signaling server assigns each WebSocket a short-lived client ID.
2. A viewer declares its role and requests an offer using a new `connectionId`.
3. The active streamer creates one `RTCPeerConnection` for that viewer and sends an offer with both a `connectionId` and `negotiationId`.
4. The viewer installs the offer, drains matching queued ICE candidates, and returns an answer carrying the same IDs.
5. Once ICE connects, the streamer samples that peer's WebRTC statistics and adapts only that viewer's sender.
6. A disconnect receives a grace period. A persistent failure triggers an ICE restart and, if necessary, replacement of that viewer's connection.

The two generation tokens have different scopes:

- `connectionId` identifies one `RTCPeerConnection` lifetime. A replacement peer must receive a new value.
- `negotiationId` identifies one offer/answer exchange within that connection, including an ICE restart.

Signaling for retired connections or superseded negotiations is ignored.

## Peer and candidate ownership

The streamer stores peer connections in a map keyed by the server-issued viewer ID. A viewer stores only its connection to the active streamer.

Trickle ICE can arrive before a peer exists or before `setRemoteDescription()` completes. Northstar therefore:

1. Buffers candidates by remote peer.
2. Tags each candidate with its connection and negotiation generations.
3. Installs the matching remote description.
4. Drains matching candidates in signaling arrival order.
5. Bounds queues and retired-generation histories to avoid unlimited growth.

Do not bypass the candidate queue with a direct `addIceCandidate()` call.

## Offer serialization

Only one streamer negotiation task may execute per viewer. Duplicate offer requests join the active promise instead of calling `createOffer()` concurrently. Viewer-side offer handling is also promise-chained so `setRemoteDescription()`, `createAnswer()`, and `setLocalDescription()` cannot overlap.

After any asynchronous negotiation step, code must confirm that the peer is still the current map entry before sending signaling.

## Media lifecycle

All Go Live, Join as Viewer, Stop, error, and browser Stop Sharing actions converge on one lifecycle:

```text
idle -> capturing -> publishing -> stopping -> idle
  |                                      ^
  +------------> viewing ---------------+
```

Button presses set a desired mode; a single reconciler performs transitions. This matters because native screen and microphone permission prompts cannot be cancelled programmatically. If the user changes modes while a prompt is open, the returned stream is stopped before the next mode begins.

`stopLifecycleResources()` is the single teardown path. New role transitions must not independently stop tracks or peers.

## Adaptive quality

The selected quality profile is a ceiling, not a guaranteed bitrate. Each connected viewer has independent adaptation state.

Every three seconds the streamer reads:

- `availableOutgoingBitrate` from the selected ICE candidate pair, when available;
- receiver-reported video packet loss; and
- receiver-reported round-trip time.

Pressure causes a multiplicative bitrate reduction. Two healthy samples are required before a gradual increase toward the preset ceiling. Smoother Motion uses `maintain-framerate` and may scale resolution down; Sharper Text uses `maintain-resolution` and allows the browser to reduce frame rate.

All `RTCRtpSender.setParameters()` calls are serialized per sender. The controller uses standardized `maxBitrate`, `maxFramerate`, and `scaleResolutionDownBy` fields.

## Signaling messages

| Type | Direction | Purpose |
| --- | --- | --- |
| `hello` | Server to client | Assign the socket's client ID |
| `role` | Client to server | Declare `streamer`, `viewer`, or inactive state |
| `viewerCount` | Server to all | Publish the current number of viewer-role sockets |
| `streamer-ready` / `streamer-left` | Server to viewers | Announce global streamer availability |
| `request-offer` | Viewer to streamer | Request an initial connection or ICE restart |
| `offer` / `answer` | Between peers | Exchange SDP with generation IDs |
| `candidate` | Between peers | Relay a trickle ICE candidate with generation IDs |
| `peer-left` | Server to streamer | Close one departed viewer's peer |
| `chat` | Client to all others | Broadcast an ephemeral chat message |

The server overwrites `from` with the sender's server-owned client ID. It currently trusts declared roles and requested targets; authentication and authorization remain roadmap work.

## Network and scaling boundaries

Northstar currently configures STUN but not TURN. Direct WAN media can fail on restrictive NAT or firewall combinations even when the signaling port is reachable.

P2P upload and encoding work scale approximately linearly with viewer count. At preset ceilings, ten viewers can request up to roughly 70 Mbps at 720p60 or 120 Mbps at 1080p60 before audio, retransmissions, and transport overhead. Adaptive quality can reduce individual senders but does not change that architecture.

An SFU is the likely next media architecture if broadcasts need to grow beyond a small audience.

## Maintainer invariants

- Keep TLS private keys outside Git and outside the HTTP allowlist.
- Keep one active streamer unless the product intentionally adds room isolation.
- Use one peer connection per viewer; never share candidate state across viewers.
- Serialize offer creation, viewer offer handling, and sender parameter updates.
- Carry both generation IDs on offer, answer, and candidate messages.
- Route all role/media exits through the lifecycle teardown path.
- Treat `disconnected` as recoverable and `failed` as an ICE-restart signal.
- Keep the quality profile as a ceiling and adaptation state per viewer.

## Planned client separation

Before splitting `index.html`, retain regression tests for signaling races, candidate ordering, lifecycle transitions, and adaptation. Natural module boundaries are:

- `ui.js`
- `lifecycle.js`
- `signaling.js`
- `peer-manager.js`
- `ice-candidates.js`
- `quality-controller.js`

The refactor should preserve the invariants above before changing behavior.
