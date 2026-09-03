# Gova Local Agent Public Tunnel

## Purpose

The Gova local-agent runtime owns its public Cloudflare Quick Tunnel directly. It does not depend on the `p2p-link` companion repository.

The public transport targets the persistent local-agent gateway:

```text
Cloudflare Quick Tunnel -> http://127.0.0.1:8765 -> gova-agent-gateway
```

The public URL is transient and is regenerated whenever `cloudflared` reconnects. The current URL is stored locally at:

```text
/home/hesham/.local/state/gova-agent-tunnel/public-url
```

## Command

Installation exposes:

```bash
gova-agent-public start
gova-agent-public restart
gova-agent-public stop
gova-agent-public status
gova-agent-public url
gova-agent-public health
gova-agent-public logs
```

`start` enables and starts `gova-agent-public.service`, waits for a `trycloudflare.com` URL, and prints it.

`status` shows the service state and current public URL.

`health` verifies the public path by requesting `/health` through the Cloudflare URL.

## Runtime Files

- `tools/local-agent/gateway-quick-tunnel.sh`: launches `cloudflared` against port `8765` and captures the generated URL.
- `tools/local-agent/gova-agent-public.sh`: user-facing lifecycle command.
- `tools/local-agent/gova-agent-public.service`: persistent user systemd service.
- `tools/local-agent/install.sh`: installs the scripts, symlink, service, and starts the dedicated tunnel.

## Independence

This mechanism is owned entirely by the Gova repository. It must not invoke, import, or require `/home/hesham/p2p-link`.

A future discovery publisher may publish the current URL to an external rendezvous location, but it must remain part of the Gova local-agent runtime and must not create a runtime dependency on `p2p-link`.
