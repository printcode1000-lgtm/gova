# Gova Direct P2P Agent Execution Plan

## 1. Objective

Build a secure direct-agent execution path for the local Gova host so an approved cloud agent can:

1. discover the current local host endpoint through the existing Gova Host Discovery + Cloudflare R2 mechanism;
2. prove that it is an approved agent through GitHub only during session bootstrap;
3. establish a short-lived, cryptographically authenticated and encrypted direct session to the local host;
4. read, inspect, edit, execute, test, and coordinate work directly through the existing `@asol/local-agent-core` execution model;
5. exchange command input, stdout, stderr, structured results, file data, and operation state directly rather than through GitHub Actions;
6. preserve all repository-integrity, lock, worktree, stale-lock, secret, logging, memory, timeout, and direct-main safety rules already enforced by the Local Agent system;
7. use P2P/direct connectivity whenever possible, with explicit NAT traversal and a clearly defined fallback policy;
8. remove GitHub Actions from the normal command transport path once the direct session is established.

The target architecture is:

```text
                         GitHub
                           |
                  bootstrap authorization
                           |
                           v
Agent Client <---- R2 Host Discovery ----> Gova Local Host
     |                                      |
     +======= encrypted direct channel =====+
                    QUIC/TLS
                       |
                Direct Agent Server
                       |
              @asol/local-agent-core
                       |
                /home/hesham/gova
```

GitHub remains the trust-bootstrap authority. R2 remains discovery/rendezvous metadata storage. Neither GitHub Actions nor R2 carries normal command execution traffic after the direct session is established.

---

## 2. Binding Architectural Principles

The implementation must preserve these rules throughout all phases.

### 2.1 Host Discovery is discovery only

The existing Host Discovery listener must not be converted into a remote shell or general command endpoint.

Its responsibilities remain limited to:

- publish current discovery metadata;
- expose short-lived connection candidates;
- expose the server identity/public-key material needed to begin a secure handshake;
- never execute arbitrary shell commands.

The current password-protected HTTP listener is not sufficient as an execution security boundary and must not become one.

### 2.2 GitHub is bootstrap authorization, not command transport

GitHub must be used to prove that an agent is approved before a direct session is accepted.

After authorization succeeds:

- normal commands must not require a workflow dispatch;
- normal results must not pass through Actions logs;
- direct command execution must not depend on a GitHub-hosted or self-hosted workflow job;
- the direct session must continue until it expires or is revoked even if no new GitHub Actions workflow is running.

### 2.3 Reuse `@asol/local-agent-core`

Do not build a second execution engine.

The new direct transport must call the same local primitives used by the existing control plane for:

- agent declaration;
- heartbeats;
- locks;
- stale-lock recovery;
- worktree allocation and cleanup;
- serialized direct-main operations;
- operation logging;
- memory admission;
- timeout handling;
- request replay prevention;
- repository mutation safety.

Transport and execution must remain separate layers.

### 2.4 No secret export

Direct host access does not authorize secret exfiltration.

The existing secret boundary must remain binding:

- secrets may be consumed locally when explicitly needed;
- secret values must not be returned to remote agents;
- secret-bearing files must remain redacted or refused unless a narrowly defined local-only operation consumes them;
- stdout/stderr must pass through redaction before remote transmission;
- environment dumps must be prohibited by default;
- sensitive values must never appear in R2 discovery documents.

### 2.5 Short-lived cryptographic identity

Static passwords must not authorize command execution.

Each direct session must use:

- a unique session ID;
- a fresh challenge/nonce;
- ephemeral client key material;
- server identity key material;
- authenticated key exchange;
- short expiry;
- replay protection;
- explicit revocation state.

---

## 3. Current Components to Reuse

Before changing code, the implementing agent must inspect the current versions of:

- `packages/local-agent-core/src/host-discovery.ts`
- `packages/local-agent-core/src/index.ts`
- `packages/local-agent-core/src/host-inventory.ts`
- `packages/local-agent-core/src/watch-model.ts`
- `scripts/local-agent-device-discovery.ts`
- `scripts/local-agent-gateway.ts`
- `scripts/local-agent-main*.ts`
- `scripts/local-agent-workspace*.ts`
- `scripts/local-agent-coordination.ts`
- local-agent request validation modules
- local-agent worktree/lock/memory/logging modules
- `docs/07-mobile-and-release/local-runner-full-host-control.md`
- `docs/07-mobile-and-release/local-agent-runner-pool.md`
- `docs/07-mobile-and-release/local-server-filesystem-boundary.md`
- relevant R2/OTA publishing abstractions already used by Host Discovery.

The implementation must adapt to the actual current module boundaries rather than duplicating stale assumptions from this plan.

---

## 4. Target Component Model

Create the following logical components. Exact filenames may change if existing package conventions require another layout.

### 4.1 Direct-session domain in `@asol/local-agent-core`

Suggested files:

```text
packages/local-agent-core/src/direct/
  protocol.ts
  session.ts
  authorization.ts
  crypto.ts
  replay-cache.ts
  capabilities.ts
  execution.ts
  transport-types.ts
  errors.ts
```

Responsibilities:

- define protocol messages;
- validate all inbound messages;
- create and expire sessions;
- perform authenticated key establishment;
- verify bootstrap authorization;
- enforce capability grants;
- reject replayed nonces/request IDs;
- dispatch accepted operations to existing Local Agent execution primitives;
- produce structured, redacted results.

### 4.2 Local direct-agent daemon

Suggested entry point:

```text
scripts/local-agent-direct-server.ts
```

Install as a machine-local systemd user service, for example:

```text
gova-direct-agent.service
```

The daemon must:

- run independently of GitHub Actions jobs;
- start automatically with the host user session/boot policy already used by the project;
- bind only the direct-agent protocol port;
- own the direct-session lifecycle;
- read only machine-local credentials/identity keys;
- invoke `@asol/local-agent-core` for work;
- write machine-local audit state under `.local/`;
- never place private keys or active session secrets into Git.

### 4.3 Agent-side direct client

Create a protocol client that can be used by an approved external agent/tool.

Suggested package or CLI surface:

```text
scripts/local-agent-direct-client.ts
```

or a package door if the architecture requires reuse:

```text
@asol/local-agent-core/direct-client
```

It must expose operations conceptually equivalent to:

```text
connect
authenticate
status
inspect
read
search
exec
applyPatch
coordinate
heartbeat
cancel
close
```

The client must not contain host credentials. It receives/creates ephemeral session key material and performs the bootstrap flow.

A future ChatGPT/OpenAI connector/tool can wrap this client. The local protocol must not depend on a particular model vendor.

---

## 5. Host Discovery v2

Extend Host Discovery so it can advertise the direct-agent service safely without becoming the service itself.

### 5.1 New discovery schema

Introduce a new schema version rather than silently changing version 1.

The v2 discovery document should contain only data needed to locate and authenticate the direct service, for example:

```json
{
  "schemaVersion": 2,
  "generatedAt": "...",
  "expiresAt": "...",
  "hostId": "stable-non-secret-host-id",
  "directAgent": {
    "protocol": "gova-direct/1",
    "transport": "quic",
    "udpPort": 48732,
    "serverKeyId": "...",
    "serverPublicKey": "...",
    "bootstrapChallenge": "...",
    "candidates": []
  }
}
```

Do not publish:

- private keys;
- passwords;
- GitHub tokens;
- environment values;
- unnecessary username/cwd/process information unless still required by another documented consumer;
- long-lived bearer tokens.

### 5.2 Discovery TTL

Use a short TTL. Ten minutes is acceptable initially, but the direct-session challenge must be single-use or rotate more frequently than the document TTL.

### 5.3 Publish cadence

The host must publish discovery often enough that a 10-minute document does not expire during healthy operation.

Target:

- publish every 2-5 minutes while the direct daemon is healthy;
- immediately republish on network-address change;
- immediately republish on daemon start;
- publish a terminal/unavailable state on graceful shutdown where practical.

Do not rely on an hourly update for a 10-minute TTL.

### 5.4 R2 role

R2 is rendezvous metadata only.

No command payloads, patches, stdout, stderr, secret-bearing material, or long-lived session tokens may be stored in R2.

---

## 6. Server Identity

### 6.1 Generate a persistent host identity key

On first setup, generate a persistent private identity key on the local host.

Store it only in machine-local protected storage, for example under:

```text
/home/hesham/gova/.local/direct-agent/identity/
```

Permissions:

```text
0700 directory
0600 private key
0644 public metadata where safe
```

The private key must never be committed.

### 6.2 Key algorithm

Prefer modern audited primitives supported by stable Node/runtime libraries.

Recommended model:

- Ed25519 for signatures/identity;
- X25519 for ephemeral key agreement;
- HKDF-SHA-256 for session key derivation;
- TLS 1.3/QUIC encryption where the chosen QUIC implementation already safely provides transport encryption.

Do not invent custom encryption framing when a standard secure transport provides it.

### 6.3 Key rotation

Provide:

```text
npm run local-agent:direct:key:status
npm run local-agent:direct:key:rotate
```

Rotation must:

- generate a new key locally;
- update discovery metadata;
- invalidate active sessions if necessary;
- retain no obsolete private key unless an explicit short overlap period is required.

---

## 7. GitHub Bootstrap Authorization

GitHub must prove that the requesting agent is permitted to establish a direct session.

### 7.1 Do not use GitHub Actions for bootstrap execution

The local daemon or a lightweight local authorization watcher should validate GitHub state directly through the existing local GitHub credential boundary.

The normal direct authorization flow must not require `workflow_dispatch`.

### 7.2 Approved bootstrap channel

Reuse the permanent approved branch model:

```text
agent-request/chatgpt
```

or replace it only if the repository's current documented branch policy changes first.

Create a dedicated bootstrap request namespace such as:

```text
.agent-control/direct-auth/<request-id>.json
```

A bootstrap request should contain only non-secret signed/session metadata:

```json
{
  "schemaVersion": 1,
  "requestId": "...",
  "agentId": "chatgpt",
  "hostId": "...",
  "challenge": "...",
  "clientEphemeralPublicKey": "...",
  "requestedCapabilities": ["inspect", "exec", "mutate-main"],
  "createdAt": "...",
  "expiresAt": "..."
}
```

### 7.3 Authorization validation

The local daemon/watcher must verify:

1. the request is read from the exact approved GitHub branch/ref;
2. the request schema is valid;
3. `requestId` is globally single-use;
4. `hostId` matches this host;
5. `challenge` matches the current discovery challenge;
6. the challenge has not already been consumed;
7. `createdAt` is within the allowed freshness window;
8. `expiresAt` is still valid;
9. requested capabilities are a subset of server policy;
10. no request field contains secret-looking material;
11. the requesting GitHub identity/repository context is the expected authorized context;
12. the authorization is recorded locally before any session is accepted.

### 7.4 Session grant

On successful bootstrap validation, create a short-lived local session grant containing:

- `sessionId`;
- authorized `agentId`;
- approved capabilities;
- client ephemeral public key;
- server ephemeral public key;
- not-before time;
- expiry time;
- consumed bootstrap challenge ID;
- revocation state.

The grant itself should stay local. Only the minimum response needed for the client handshake should be transmitted.

### 7.5 Bootstrap replay prevention

Persist consumed request IDs and challenge IDs under machine-local coordination storage so process restart cannot allow replay.

Define explicit retention and cleanup rules, for example retain consumed identifiers for at least 24 hours or longer than every possible request/session expiry.

---

## 8. Direct Transport

### 8.1 Preferred transport: QUIC over UDP

Use QUIC if the Node/runtime ecosystem selected for the project provides a stable implementation compatible with project constraints.

Reasons:

- encrypted by design through TLS 1.3;
- multiplexed streams;
- better behavior across changing network conditions;
- UDP is compatible with NAT hole-punching strategies;
- command/control and streaming output can use separate logical streams.

If stable QUIC support is not acceptable in the project's runtime, use a well-maintained alternative such as WebRTC DataChannel or TLS-over-TCP, but document why.

### 8.2 Do not expose raw shell framing

The transport must accept a closed protocol, not arbitrary bytes interpreted as shell input.

Every request must be a typed message with validation.

Example envelope:

```json
{
  "protocol": "gova-direct/1",
  "sessionId": "...",
  "requestId": "...",
  "sequence": 14,
  "timestamp": "...",
  "nonce": "...",
  "type": "exec",
  "payload": {}
}
```

### 8.3 Required operation types

Implement the smallest complete set needed to replace Actions-based agent interaction:

- `status`
- `inspect.list`
- `inspect.read`
- `inspect.search`
- `git.status`
- `exec`
- `patch.apply`
- `coordination.declare`
- `coordination.heartbeat`
- `coordination.lock`
- `coordination.unlock`
- `coordination.status`
- `operation.cancel`
- `session.close`

Do not expose a generic undocumented RPC that bypasses validation.

### 8.4 Streaming

Execution responses should support events:

```text
accepted
started
stdout
stderr
progress
result
error
cancelled
finished
```

stdout/stderr must be chunked, bounded, redacted, and associated with `requestId`.

### 8.5 Backpressure and limits

Define limits for:

- maximum request body;
- maximum patch size;
- maximum single stdout/stderr chunk;
- maximum buffered output;
- maximum concurrent read operations;
- maximum concurrent mutations;
- command timeout;
- idle session timeout;
- total session lifetime.

Reuse existing Local Agent mutation serialization instead of creating a parallel mutation scheduler.

---

## 9. Session Security

### 9.1 Session lifetime

Initial target:

- bootstrap authorization validity: <= 5 minutes;
- idle timeout: 15 minutes;
- absolute session lifetime: 60 minutes;
- optional explicit renewal through a fresh GitHub bootstrap.

Do not create unlimited sessions.

### 9.2 Per-message replay protection

For every message enforce:

- unique `requestId`;
- monotonic sequence number per session where practical;
- random nonce;
- timestamp freshness;
- authenticated transport binding.

Rejected duplicates must be logged.

### 9.3 Capability model

At minimum define:

```text
inspect
execute
mutate-worktree
mutate-main
coordinate
host-admin
```

A session must receive only explicitly granted capabilities.

`host-admin` must not be implied by `execute` unless current project policy explicitly requires full host control for that trusted agent class. If the final product intentionally preserves full-host authority for ChatGPT, encode that explicitly rather than accidentally inheriting it.

### 9.4 Revocation

Implement:

```text
npm run local-agent:direct:sessions
npm run local-agent:direct:revoke -- <session-id>
npm run local-agent:direct:revoke-all
```

A revoked session must fail immediately on its next packet/request.

---

## 10. NAT Traversal and P2P Connectivity

Direct reachability must be treated as a separate layer from authentication.

### 10.1 Candidate collection

Collect and classify:

- LAN IPv4 candidates;
- IPv6 global candidates;
- public observed address;
- UDP mapped candidate discovered through STUN;
- optional PCP/UPnP mapped candidate if explicitly enabled;
- candidate priority and expiry.

### 10.2 STUN

Implement STUN-based public UDP endpoint discovery.

Requirements:

- use multiple configurable STUN servers;
- bound timeouts;
- never trust STUN as authentication;
- publish only connection candidates, not secrets;
- refresh candidate state when network interfaces change.

### 10.3 UDP hole punching

If both sides have suitable mapped UDP candidates, attempt coordinated UDP hole punching.

R2 can provide rendezvous metadata, but live hole-punch synchronization should use short-lived rendezvous records or an equivalent minimal coordination mechanism.

The implementation must clearly distinguish:

```text
candidate discovery
bootstrap authorization
path establishment
session encryption
command execution
```

These are separate security layers.

### 10.4 IPv6 preference

Prefer direct global IPv6 when available and firewall policy permits it because it avoids many NAT traversal problems.

### 10.5 LAN preference

When client and host are on the same LAN, prefer the LAN candidate over public/NAT paths.

### 10.6 Failure policy

Define the product policy explicitly.

Recommended rollout:

1. direct LAN/IPv6;
2. UDP hole punching;
3. optional relay fallback only if the user explicitly approves a relay architecture.

Do not silently route command traffic through R2.

If no direct candidate succeeds and relay is disabled, fail closed with a clear `direct-path-unavailable` result.

---

## 11. Execution Integration

### 11.1 Read-only operations

Read/search/list/status operations must use the same redaction and path rules as current Local Agent inspect workflows.

### 11.2 Shell execution

Direct `exec` should ultimately invoke the same controlled shell execution primitive currently used for authorized full-host-control jobs.

Requirements:

- `/bin/bash -lc` only if that remains the documented project execution contract;
- explicit working directory;
- timeout;
- cancellation support;
- stdout/stderr redaction;
- operation log;
- no implicit environment dump;
- no bypass of memory admission when the command is classified as heavy/mutating.

### 11.3 Repository mutation

Mutating operations must preserve the current model:

- fresh `origin/main` check;
- isolated local worktree for non-direct-main work;
- direct-main serialization where appropriate;
- scope locks;
- stale-base refusal;
- signal-safe cleanup;
- stale-lock recovery;
- operation record;
- existing branch policy.

The direct transport must never introduce a third remote branch.

### 11.4 Git push behavior

Direct transport removes GitHub Actions from command execution; it does not remove Git itself from repository publication.

When the task intentionally changes GitHub state, normal `git push main` behavior remains allowed under current repository rules.

---

## 12. Machine-Local Runtime Layout

Suggested layout:

```text
/home/hesham/gova/.local/direct-agent/
  identity/
    server.key
    server.pub
  sessions/
    active/
    consumed-bootstrap/
    revoked/
  rendezvous/
  logs/
    sessions/
    operations/
  state.json
```

All paths must be git-ignored and protected by filesystem permissions.

Do not store runtime session state inside tracked repository files.

---

## 13. Systemd Deployment

Create/install a user service for the direct daemon.

Desired properties:

- `Restart=on-failure`;
- bounded restart delay;
- explicit working directory;
- machine-local environment file;
- resource controls consistent with the runner pool;
- logs through journald plus structured machine-local audit logs;
- no secrets in unit command-line arguments;
- automatic startup according to the existing user-service/linger policy.

Add a timer/service only where necessary for discovery republishing if the daemon itself does not maintain publication continuously.

The daemon should preferably own discovery refresh so service health and published reachability cannot drift apart.

---

## 14. CLI Surface

Add explicit operational commands to `package.json`, naming adapted to current conventions:

```text
local-agent:direct:start
local-agent:direct:doctor
local-agent:direct:status
local-agent:direct:sessions
local-agent:direct:revoke
local-agent:direct:key:status
local-agent:direct:key:rotate
local-agent:direct:test
local-agent:device:discover
```

`doctor` must report without exposing secrets:

- daemon installed/running;
- identity key present;
- discovery publication freshness;
- current candidates;
- direct port bound;
- GitHub bootstrap watcher health;
- active session count;
- STUN reachability;
- NAT classification where reliably detectable;
- last authorization success/failure summary;
- last direct connection success/failure summary.

---

## 15. Audit Logging

Every bootstrap and direct operation must produce a structured local audit record.

Record at least:

```text
timestamp
sessionId
agentId
requestId
operationType
capabilityUsed
workingDirectory/scope where safe
startedAt
finishedAt
exitCode/status
bytesIn
bytesOut
redactionCount
lock IDs
worktree ID
result classification
```

Never record:

- session encryption keys;
- private keys;
- passwords;
- GitHub tokens;
- raw secret values.

Use bounded retention and cleanup.

---

## 16. Protocol Validation and Error Model

Define stable machine-readable errors, including:

```text
unsupported-protocol
invalid-message
unauthorized
bootstrap-required
bootstrap-expired
challenge-mismatch
challenge-consumed
session-expired
session-revoked
capability-denied
replay-detected
stale-request
path-denied
secret-export-denied
lock-conflict
memory-admission-denied
stale-main
command-timeout
command-cancelled
direct-path-unavailable
transport-error
internal-error
```

Remote clients must never need to parse human prose to make control-flow decisions.

---

## 17. Test Plan

### 17.1 Unit tests

Add tests for:

- discovery v2 schema;
- challenge generation and expiry;
- request schema validation;
- GitHub bootstrap validation;
- request ID replay rejection;
- challenge replay rejection;
- capability subset enforcement;
- session expiry;
- revocation;
- sequence/nonce replay detection;
- crypto key derivation boundaries;
- redaction;
- protocol error mapping;
- candidate prioritization;
- NAT candidate expiry.

### 17.2 Integration tests

Test local client and daemon on loopback:

1. discovery generated;
2. bootstrap request accepted through a mocked GitHub authority boundary;
3. encrypted session established;
4. status succeeds;
5. read/search succeeds;
6. command streams stdout/stderr;
7. cancellation works;
8. duplicate request rejected;
9. session expiry closes access;
10. mutation uses expected lock/worktree path;
11. secret output is redacted/refused.

### 17.3 Network tests

Run staged network tests:

- same host loopback;
- same LAN;
- two devices on same router;
- host behind home NAT, client on mobile network;
- client behind home NAT, host on another network;
- IPv6 direct where available;
- UDP hole punching successful case;
- symmetric/CGNAT failure case;
- network change during session;
- daemon restart;
- R2 document expiry.

### 17.4 Security tests

Explicitly test:

- wrong GitHub branch;
- old bootstrap document;
- reused request ID;
- reused challenge;
- forged client key;
- modified handshake payload;
- wrong server identity;
- replayed encrypted message;
- oversized payload;
- malformed patch;
- secret file read attempt;
- environment dump attempt;
- session use after revocation;
- capability escalation attempt;
- direct request before bootstrap;
- port scanner/non-protocol traffic.

### 17.5 Regression tests

Existing Local Agent tests must continue to pass.

The new transport must not weaken:

- GitHub CI policy;
- fixed branch rules;
- lock behavior;
- stale-lock recovery;
- worktree cleanup;
- direct-main serialization;
- secret boundaries;
- current Host Discovery dry-run/publish-only contracts unless explicitly versioned.

---

## 18. Implementation Phases

### Phase 0 — Baseline and invariants

1. Read current documentation and Local Agent implementation.
2. Run existing Local Agent, architecture, typecheck, and relevant tests.
3. Record current Host Discovery output and local daemon/systemd state without secrets.
4. Confirm current R2 publication path and credentials are usable locally.
5. Confirm current branch policy and gateway behavior.
6. Create a short implementation checkpoint before code changes.

Exit criteria:

- current baseline is green;
- all existing safety invariants are identified in code, not assumed from documentation alone.

### Phase 1 — Pure protocol/session domain

1. Add protocol types and validators.
2. Add session lifecycle.
3. Add replay cache.
4. Add capabilities.
5. Add crypto wrappers around standard primitives.
6. Add structured errors.
7. Unit test all of the above without networking.

Exit criteria:

- no daemon yet;
- protocol/session tests fully green;
- no private material enters Git.

### Phase 2 — Host Discovery v2

1. Add v2 schema.
2. Add server public identity metadata.
3. Add bootstrap challenge.
4. Add direct transport candidates.
5. Preserve v1 compatibility only if a real current consumer requires it; otherwise migrate cleanly without a compatibility layer.
6. Add freshness tests.
7. Adjust publication cadence.

Exit criteria:

- R2 contains only safe discovery metadata;
- discovery expiry and refresh are coherent;
- no execution endpoint has been added to the old Host Discovery HTTP listener.

### Phase 3 — GitHub bootstrap authorization

1. Define direct-auth request schema.
2. Implement local watcher/poller using the existing host GitHub credential boundary.
3. Restrict it to the approved branch/ref.
4. Validate challenge, host, freshness, capabilities, and replay state.
5. Create local session grants.
6. Persist consumed IDs.
7. Test restarts and replay attempts.

Exit criteria:

- an approved GitHub request can authorize a local session without `workflow_dispatch`;
- an unapproved/stale/replayed request cannot.

### Phase 4 — Loopback direct transport

1. Implement daemon transport listener.
2. Implement client.
3. Complete authenticated session handshake.
4. Add `status`, inspect, and safe `exec` over loopback.
5. Add streaming and cancellation.
6. Add redaction and audit logging.
7. Integrate session capabilities.

Exit criteria:

- GitHub Actions is not involved in command execution during the test;
- all traffic after bootstrap is direct client-to-daemon;
- replay and revocation tests pass.

### Phase 5 — Local Agent execution integration

1. Route direct operations into existing Local Agent primitives.
2. Integrate coordination.
3. Integrate locks.
4. Integrate worktrees.
5. Integrate direct-main serialization.
6. Integrate memory admission.
7. Integrate stale-base detection.
8. Integrate operation logging and cleanup.

Exit criteria:

- direct transport can complete a real repository mutation with the same safety behavior as the current Local Runner path;
- no duplicate mutation engine exists.

### Phase 6 — Systemd daemon and continuous discovery

1. Add installation/configuration scripts.
2. Install machine-local service.
3. Enable restart behavior.
4. Make daemon publish/refresh discovery.
5. Implement `doctor`, `status`, and session revocation CLIs.
6. Verify reboot persistence.

Exit criteria:

- service recovers after process failure and reboot;
- discovery remains fresh while the service is healthy;
- stale discovery disappears/expires when it is not.

### Phase 7 — Direct LAN/IPv6 networking

1. Advertise LAN and IPv6 candidates.
2. Add candidate scoring.
3. Test desktop/laptop and same-router connectivity.
4. Confirm firewall requirements.
5. Measure latency and transfer behavior.

Exit criteria:

- direct authenticated command execution works without GitHub Actions on same LAN;
- IPv6 works where available.

### Phase 8 — STUN and UDP hole punching

1. Add STUN client logic.
2. Publish mapped UDP candidates.
3. Add rendezvous synchronization.
4. Attempt simultaneous QUIC/UDP path establishment.
5. Add retries and bounded timeouts.
6. Detect and classify failure.
7. Test across genuinely different networks.

Exit criteria:

- at least one real NAT-separated topology succeeds directly;
- failed topologies fail closed and clearly;
- R2 never becomes the command relay.

### Phase 9 — Remove Actions from the normal remote-control path

Do this only after the direct path is proven.

1. Keep existing Actions workflows temporarily as fallback/recovery during validation.
2. Change documentation so direct agent transport is the preferred execution path.
3. Ensure normal remote inspection/exec/mutation no longer dispatches workflows.
4. Preserve GitHub Actions only for repository workflows that are independently required by project policy, not as the direct command bus.
5. Decide whether old agent execution workflows should remain as emergency fallback or be removed.
6. If removed, update CI policy/tests accordingly.

Exit criteria:

- a normal approved agent session completes end-to-end with zero agent-command GitHub Actions runs.

### Phase 10 — External agent/tool integration

1. Expose the direct client through a stable tool interface independent of model vendor.
2. Recommended logical API:

```text
gova.discover
gova.bootstrap
gova.connect
gova.status
gova.inspect
gova.exec
gova.patch
gova.coordinate
gova.cancel
gova.close
```

3. Wrap this interface in the available ChatGPT/OpenAI connector/tool environment when such raw network/tool integration is available.
4. Do not weaken the server protocol to compensate for limitations of a specific client environment.

Exit criteria:

- an external approved agent can use the direct protocol without manually operating the CLI.

---

## 19. Rollout Strategy

Use progressive enablement.

### Stage A

Direct daemon disabled by default. Unit/integration tests only.

### Stage B

Enable on loopback only.

### Stage C

Enable LAN access only.

### Stage D

Enable approved external-network direct candidates.

### Stage E

Enable STUN/hole punching.

### Stage F

Make direct transport the default remote-agent path.

At every stage maintain a one-command kill switch that:

- stops the daemon;
- revokes all sessions;
- removes direct candidates from fresh discovery output or allows them to expire;
- leaves the existing repository usable locally.

---

## 20. Rollback Plan

Rollback must never require restoring secrets from Git.

Provide an operational rollback path:

```text
1. revoke all active direct sessions;
2. disable/stop `gova-direct-agent.service`;
3. stop publishing direct-agent discovery metadata;
4. leave Host Discovery safe/discovery-only;
5. return to the existing Local Runner/GitHub control path if it is still retained;
6. remove machine-local direct runtime state only after confirming no active worktree/lock needs recovery.
```

Repository code rollback must not delete machine-local forensic/audit data until the failure is understood.

---

## 21. Documentation Updates Required During Implementation

Whenever behavior changes, update the relevant English documentation under `docs/`.

At minimum expect updates/new documents covering:

- direct-agent architecture;
- Host Discovery v2;
- GitHub bootstrap authorization;
- direct-session security model;
- NAT traversal;
- systemd deployment;
- operational commands;
- troubleshooting;
- secret boundary;
- Local Runner/Direct Agent relationship;
- workflow policy if Actions-based control becomes fallback-only or is removed.

Do not leave implementation knowledge only in this `note/` plan.

---

## 22. Final Acceptance Criteria

The goal is complete only when all of the following are demonstrated on the real local host.

### Authentication

- An agent that cannot satisfy the approved GitHub bootstrap cannot create a direct session.
- A valid bootstrap is single-use and expires.
- Replayed bootstrap documents are rejected.
- Server identity is cryptographically authenticated.

### Direct transport

- A valid agent establishes an encrypted direct session.
- Command traffic does not pass through GitHub Actions.
- Command traffic does not pass through R2.
- stdout/stderr/results return over the direct channel.
- sessions expire and can be revoked.

### Execution

- read/search/list works;
- shell execution works;
- cancellation works;
- a real repository edit can be applied;
- existing locks/worktrees/main safety are preserved;
- operation logs are written;
- secret export protections remain active.

### Connectivity

- same-LAN direct path works;
- at least one cross-network direct/NAT-traversal path works;
- unsupported NAT topologies fail clearly without weakening authentication;
- no accidental public unauthenticated shell exists.

### Runtime

- direct daemon survives restart/reboot according to policy;
- discovery stays fresh while healthy;
- stale discovery expires;
- `doctor` accurately reports state without secrets.

### Regression safety

- existing project tests pass;
- Local Agent safety tests pass;
- architecture checks pass;
- documentation is updated;
- branch policy is preserved;
- no `p2p-link` companion repository dependency is reintroduced.

---

## 23. Definition of Done

This plan is considered fully implemented only when an approved remote agent can perform the following sequence on the production local development host:

```text
1. Read current Host Discovery metadata from R2.
2. Obtain the host direct-agent candidates and current bootstrap challenge.
3. Prove authorization through the approved GitHub bootstrap path.
4. Establish an encrypted direct session without dispatching GitHub Actions.
5. Inspect `/home/hesham/gova` through Local Agent rules.
6. Acquire a coordination lock.
7. Execute a command and stream its output directly.
8. Modify repository content through the existing safe worktree/direct-main model.
9. Run the requested verification locally.
10. Commit/push only when the task explicitly requires Git publication.
11. Release locks and clean the worktree.
12. Close or revoke the session.
13. Confirm that R2 contains only discovery/rendezvous metadata and GitHub contains no command transport payloads/results.
```

The final system must therefore implement this separation exactly:

```text
GitHub = agent authorization bootstrap
R2     = host discovery/rendezvous metadata
P2P    = encrypted command/result transport
Local Agent Core = execution, coordination, safety, and repository integrity
```

Any implementation that uses the existing Host Discovery password as the remote-shell credential, sends normal commands through R2, bypasses `@asol/local-agent-core`, or still requires GitHub Actions for each command does not satisfy the objective.