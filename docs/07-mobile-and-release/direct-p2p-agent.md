# Gova Direct P2P Agent

## Purpose

The Direct P2P Agent is the preferred remote-control path for approved agents after bootstrap. It preserves the separation `GitHub = authorization bootstrap`, `R2 = discovery/rendezvous metadata`, `direct transport = commands/results`, and `@asol/local-agent-core = execution and safety`.

## Runtime

The host daemon is `gova-direct-agent.service`, a user systemd service with `Restart=on-failure`. The host keeps linger enabled so the service can start without an interactive desktop login. The unit contains no credentials; its only machine-local environment file is `.local/direct-agent/service.env` with mode `0600`.

The daemon starts the TLS 1.3 direct server, polls the approved GitHub bootstrap namespace, and refreshes Host Discovery in R2 every three minutes. Discovery records expire after ten minutes, so a stopped host naturally becomes stale instead of remaining permanently advertised.

Install and inspect it with:

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

Rotating the host identity revokes active sessions. The kill switch revokes all sessions and disables/stops the user service.

## Security boundary

The discovery HTTP listener remains discovery-only and never executes commands. Its password is not a direct-shell credential. Direct sessions require the approved GitHub bootstrap, a fresh single-use challenge, X25519 proof, the pinned Ed25519 host identity, TLS 1.3, replay protection, capability checks, secret redaction, coordination locks, and the existing Local Agent mutation model.

GitHub Actions are not part of normal direct command/result transport. R2 must never contain shell commands, patches, stdout, stderr, or general execution results.

## NAT traversal transport

Cross-network direct connectivity uses WebRTC ICE with STUN and an ordered reliable DataChannel. The DataChannel is a byte tunnel around the existing TLS 1.3 direct protocol, so transport selection does not duplicate or weaken authentication, capabilities, replay protection, secret redaction, mutation safety, or operation logging. R2/GitHub carry only short-lived signaling/bootstrap metadata; command and result bytes stay on the selected ICE path.

The host's standalone STUN candidate is recorded as the actual mapped **UDP** endpoint. It is never advertised as the TLS TCP port.
