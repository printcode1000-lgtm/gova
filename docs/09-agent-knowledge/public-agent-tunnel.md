# Gova Local Agent Public Tunnel

## Purpose

The Gova local-agent runtime owns its public Cloudflare Quick Tunnel directly. It does not depend on the `p2p-link` companion repository.

The public transport now terminates at a loopback MCP bridge before reaching the persistent gateway:

```text
Cloudflare Quick Tunnel
  -> http://127.0.0.1:8767 (Gova MCP bridge)
  -> http://127.0.0.1:8765 (Gova Agent Gateway)
```

The bridge preserves `/health` and `/v1/*` compatibility and adds a Streamable HTTP MCP endpoint at `/mcp`.

The public URL is transient and is regenerated whenever `cloudflared` reconnects. The current URL is stored locally at:

```text
/home/hesham/.local/state/gova-agent-tunnel/public-url
```

## MCP Endpoint

The public MCP endpoint is:

```text
<current-trycloudflare-url>/mcp
```

It accepts JSON-RPC 2.0 over HTTP POST and implements MCP initialization, ping, tool listing, and tool calls. The bridge advertises protocol version `2025-06-18` and also accepts the earlier `2025-03-26` and `2024-11-05` initialization versions.

Authentication is mandatory for `/mcp`. Clients may provide the existing local-agent key through either:

```text
Authorization: Bearer <local-agent-key>
```

or the existing gateway-compatible header:

```text
X-Gova-Agent-Key: <local-agent-key>
```

The key remains only in `/home/hesham/.config/gova-agent/auth`; it is never published to R2 or committed to Git.

The MCP bridge exposes these tools:

- `gova_health`: read-only gateway health.
- `gova_diagnostics`: read-only runtime/repository diagnostics.
- `gova_command_start`: starts a shell command on the authorized local machine.
- `gova_command_status`: reads command state and exit information.
- `gova_command_logs`: reads command stdout/stderr.
- `gova_command_cancel`: terminates a running command.

Command execution still occurs through the existing gateway rather than inside the MCP bridge, so the established command tracking, logs, cancellation, runtime database, and local privilege model remain authoritative.

## Command

Installation exposes:

```bash
gova-agent-public start
gova-agent-public restart
gova-agent-public stop
gova-agent-public status
gova-agent-public url
gova-agent-public health
gova-agent-public publish
gova-agent-public logs
gova-agent-public r2-logs
```

`start` enables and starts `gova-agent-public.service`, waits for a `trycloudflare.com` URL, and prints it.

`status` shows the service state, current public URL, and whether the existing Gova R2 credentials are complete.

`health` verifies the public path by requesting `/health` through the Cloudflare URL. It retries while a newly issued Quick Tunnel hostname is propagating in DNS, so a service restart does not fail merely because the hostname is not immediately resolvable.

`publish` writes the current tunnel discovery document to R2. The tunnel launcher also republishes automatically whenever the generated `trycloudflare.com` URL changes.

## R2 Discovery

The publisher reuses the existing Gova secret source:

```text
/home/hesham/gova/.env.local
```

No second R2 credential file is required. Supported existing names are:

```text
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME  (or R2_BUCKET)
R2_ENDPOINT
R2_PUBLIC_URL   (or R2_PUBLIC_BASE_URL / NEXT_PUBLIC_R2_PUBLIC_URL)
```

The default discovery object is:

```text
gova-agent/public.json
```

Its JSON payload contains the active tunnel URL, `/health` URL, `/mcp` URL, MCP transport/protocol metadata, update timestamp, and local host name. The object is overwritten in place so consumers have one stable R2 discovery URL even though the Quick Tunnel hostname changes.

## Runtime Files

- `tools/local-agent/mcp_bridge.py`: authenticated Streamable HTTP MCP adapter and compatibility proxy to the gateway.
- `tools/local-agent/gateway-quick-tunnel.sh`: owns the loopback MCP bridge, launches `cloudflared` against port `8767`, captures the generated URL, and triggers R2 publication when it changes.
- `tools/local-agent/publish-public-url-r2.py`: standalone Gova R2 discovery publisher using the existing `.env.local` credentials.
- `tools/local-agent/gova-agent-public.sh`: user-facing lifecycle and publication command.
- `tools/local-agent/gova-agent-public.service`: persistent user systemd service that owns both MCP bridge and tunnel lifecycle.
- `tools/local-agent/install.sh`: installs the runtime and starts the dedicated public transport.

## Independence

This mechanism is owned entirely by the Gova repository. It must not invoke, import, or require `/home/hesham/p2p-link`.

GitHub Actions may be used as a one-shot bootstrap or recovery entry point, but normal transport and discovery do not depend on GitHub after installation.
