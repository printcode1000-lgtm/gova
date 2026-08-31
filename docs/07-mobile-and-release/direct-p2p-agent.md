# Gova Direct P2P Agent

## Purpose

The Direct P2P Agent is the preferred remote-control path for approved agents after bootstrap. The architecture is intentionally split into four responsibilities:

```text
GitHub = authorization bootstrap
R2 = host discovery and short-lived rendezvous metadata
Direct transport = encrypted commands and results
@asol/local-agent-core = execution, coordination, safety, and repository integrity
```

GitHub Actions are not part of normal Direct Agent command execution.

## Runtime

The host daemon is `gova-direct-agent.service`, a user systemd service with `Restart=on-failure`. User linger is enabled so the service can run without an interactive desktop login.

The daemon:

1. publishes Host Discovery v2 to R2;
2. opens the TLS 1.3 Direct Agent listener, currently on port `48732`;
3. polls the approved GitHub bootstrap namespace;
4. creates and persists authorized direct sessions;
5. refreshes discovery metadata approximately every three minutes;
6. handles WebRTC/ICE rendezvous for cross-network direct paths;
7. executes accepted operations through `@asol/local-agent-core`.

Discovery records expire after ten minutes, so an unavailable host naturally disappears when publication stops.

Useful host commands:

```bash
npm run local-agent:direct:install
npm run local-agent:direct:doctor
npm run local-agent:direct:status
npm run local-agent:direct:sessions
```

Session and identity controls:

```bash
npm run local-agent:direct:revoke -- <session-id>
npm run local-agent:direct:revoke-all
npm run local-agent:direct:key:status
npm run local-agent:direct:key:rotate
npm run local-agent:direct:kill-switch
```

Rotating the host identity revokes active sessions. The kill switch revokes all direct sessions and stops/disables the Direct Agent service.

## End-to-end connection workflow

The normal connection flow is:

```text
External agent/client
      |
      | 1. Read Host Discovery v2
      v
      R2
      |
      | hostId, port, host public identity,
      | current challenge, candidates, rendezvous metadata
      v
External agent/client
      |
      | 2. Generate ephemeral X25519 key pair
      | 3. Write bootstrap request
      v
GitHub branch: agent-request/chatgpt
.agent-control/direct-auth/<requestId>.json
      |
      | 4. gova-direct-agent.service polls the branch
      | 5. validate hostId, agentId, expiry, challenge,
      |    replay state, and requested capabilities
      v
Direct Agent host
      |
      | 6. create authorized session + server ephemeral key
      | 7. sign public grant with host Ed25519 identity
      v
GitHub branch: agent-request/chatgpt
.agent-control/direct-auth-results/<requestId>.json
      |
      | 8. client verifies signed grant
      v
Candidate selection
      |
      +--> loopback/LAN TCP when directly reachable
      +--> other direct TCP candidates
      +--> WebRTC ICE/STUN DataChannel when NAT traversal is needed
      |
      | 9. TLS 1.3 connection
      | 10. X25519 shared-secret proof
      | 11. Ed25519 host identity verification
      v
Authenticated Direct Agent session
      |
      | status / inspect / exec / patch / coordination
      v
@asol/local-agent-core
      |
      v
/home/hesham/gova
```

Only the bootstrap metadata crosses GitHub. Commands, stdout, stderr, patches, and normal execution results do not.

## Discovery

The client first reads Host Discovery v2 from R2. The document contains only the information required to find and authenticate the Direct Agent, including:

- host ID and hostname;
- Direct Agent port;
- host Ed25519 public identity and key ID;
- the current short-lived single-use bootstrap challenge;
- direct TCP candidates;
- STUN/UDP and WebRTC rendezvous information;
- expiration timestamps.

Host Discovery is not an execution API. The legacy discovery HTTP listener remains discovery-only and never receives or executes shell commands.

## GitHub bootstrap authorization

Bootstrap uses the permanent branch:

```text
agent-request/chatgpt
```

Client requests are written to:

```text
.agent-control/direct-auth/<requestId>.json
```

The Direct Agent daemon validates the request and publishes the signed grant to:

```text
.agent-control/direct-auth-results/<requestId>.json
```

These bootstrap commits do not require `workflow_dispatch` and do not execute the requested command through GitHub Actions.

The challenge is single-use. After a successful grant, the host rotates the challenge and immediately republishes Host Discovery so the next client never receives a consumed challenge from R2.

The daemon processes a newly granted request without continuing expensive synchronous scans before returning to the event loop. This keeps the direct TLS listener responsive immediately after authorization.

## Authentication and session security

Authentication has separate layers:

1. **GitHub repository authorization** proves that the client can write an approved bootstrap request to the trusted branch.
2. **Fresh discovery challenge** prevents reuse of old bootstrap requests.
3. **X25519 ephemeral keys** establish proof that the connecting client owns the private key corresponding to the public key authorized by GitHub.
4. **Ed25519 host identity** lets the client pin and verify the Gova host independently of the transport path.
5. **TLS 1.3** encrypts the direct TCP protocol.
6. **Replay protection** rejects reused nonces and invalid request ordering.
7. **Capabilities** restrict each session to approved operations such as inspect, execute, mutate, or coordinate.
8. **Local Agent Core** still applies path boundaries, secret protection, locks, worktrees, memory admission, logging, and repository safety.

The Host Discovery password is never reused as the Direct Agent shell or session credential.

Private host keys, client private keys, server ephemeral private keys, and session secrets remain machine-local and must never be published to GitHub or R2.

## Direct client usage

The current external client entry point is:

```bash
npx tsx scripts/local-agent-direct-remote.ts discover
npx tsx scripts/local-agent-direct-remote.ts status
npx tsx scripts/local-agent-direct-remote.ts git-status
npx tsx scripts/local-agent-direct-remote.ts inspect-read package.json
npx tsx scripts/local-agent-direct-remote.ts exec -- "pwd"
```

The client automatically performs discovery, GitHub bootstrap, signed-grant verification, candidate selection, TLS/X25519 authentication, the requested operation, and session close.

When the client is running on the same host it prefers:

```text
loopback:tcp:127.0.0.1:48732
```

For another device on the LAN it prefers reachable direct TCP candidates. If direct TCP is unavailable it can use the WebRTC ICE path.

## NAT traversal transport

Cross-network connectivity uses WebRTC ICE with STUN and an ordered reliable DataChannel. The DataChannel acts as a byte tunnel around the existing TLS 1.3 Direct Agent protocol.

This means ICE only establishes the network path; it does not replace authentication or authorization. The same GitHub bootstrap, session grant, X25519 proof, Ed25519 host verification, replay protection, capability checks, secret boundaries, and Local Agent execution rules remain active.

R2 may hold short-lived WebRTC offer/answer rendezvous metadata, but it must never relay:

- shell commands;
- patches;
- stdout or stderr;
- general execution results;
- private/session key material.

A standalone STUN candidate is recorded as its actual mapped UDP endpoint. It is never represented as the TLS TCP port.

## Verified direct execution

On 2026-09-01 the installed service was verified on the real host with:

```text
service: active
listener: 0.0.0.0:48732
path: loopback:tcp:127.0.0.1:48732
workspace: /home/hesham/gova
```

A real Direct Agent `exec` operation returned:

```text
P2P_MAIN_OK
hesham-HP-EliteDesk-800-G2-TWR
/home/hesham/gova
```

with exit code `0`. The command itself was executed by the Direct Agent channel; GitHub was used only for bootstrap authorization.

This loopback verification proves the deployed Direct Agent protocol and execution path. Cross-network ICE/NAT traversal remains a separate network-topology verification and must not be inferred solely from the loopback result.

## Operational rule

Normal remote control should follow:

```text
discover -> bootstrap -> connect -> authenticate -> operate -> close/revoke
```

Do not route normal commands through GitHub Actions or R2. GitHub Actions remain available only for repository CI/deployment or explicitly retained recovery workflows, not as the Direct Agent command transport.
