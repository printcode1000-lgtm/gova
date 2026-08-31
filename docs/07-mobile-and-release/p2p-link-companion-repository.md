# P2P Link Companion Repository

## Purpose

`gova` uses a separate companion repository for the local peer-discovery and P2P rendezvous system:

- Repository: `printcode1000-lgtm/p2p-link`
- Role: Companion Repository for `gova`
- Integration model: maintained independently; its source code is not merged into the `gova` repository.

The companion repository is the authoritative source for the peer-link implementation that discovers local/server connection addresses and publishes live rendezvous data through Cloudflare R2.

## Repository Boundary

The complete program source for the P2P/R2 mechanism belongs in `printcode1000-lgtm/p2p-link`, not in `gova`.

`gova` may document, invoke, or depend operationally on the companion system, but agents must not copy the implementation into this repository merely to make it available locally.

## GitHub Content

The source code and non-sensitive project files for the P2P link system are stored in the companion GitHub repository.

The following categories must not be committed to GitHub:

1. Secrets and credentials.
   - `.env`
   - `r2.env`
   - Cloudflare R2 access keys, secret keys, tokens, and equivalent credentials
2. Live rendezvous state.
   - LAN addresses
   - WAN/public addresses
   - live server endpoints
   - transient peer/session connection metadata

Secrets remain local and must be excluded through `.gitignore` or equivalent secret-management controls.

## Cloudflare R2 Runtime State

Live connection information is generated dynamically while the system runs and is published as temporary objects in Cloudflare R2.

R2 acts as a rendezvous/meeting point for devices. The live connection state is runtime data, not repository source data, and must never be treated as Git history or committed configuration.

This separation is intentional:

- GitHub stores the implementation.
- Local secret files provide authentication.
- Cloudflare R2 stores transient live connection data.

## Operational Invariants

1. `printcode1000-lgtm/p2p-link` is the authoritative implementation repository for this system.
2. It remains a Companion Repository and must not be merged into `gova` unless the user explicitly changes this architecture.
3. R2 credentials and environment files must never be committed.
4. Live IP addresses and rendezvous objects must never be committed.
5. Live connection data is published dynamically to Cloudflare R2 during operation.
6. When an agent needs to inspect or modify the P2P discovery/R2 mechanism, it must work from the companion repository rather than searching for the implementation inside `gova`.

## Related Project Context

This document records the repository ownership and runtime-data boundary only. Implementation details, commands, R2 object formats, peer-discovery logic, and network behavior are owned by `printcode1000-lgtm/p2p-link` and should be documented there alongside the source.