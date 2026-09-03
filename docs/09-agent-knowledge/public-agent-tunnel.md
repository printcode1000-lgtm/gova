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
gova-agent-public publish
gova-agent-public logs
gova-agent-public r2-logs
```

`start` enables and starts `gova-agent-public.service`, waits for a `trycloudflare.com` URL, and prints it.

`status` shows the service state, current public URL, and whether the existing Gova R2 credentials are complete.

`health` verifies the public path by requesting `/health` through the Cloudflare URL.

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

Its JSON payload contains the active tunnel URL, `/health` URL, update timestamp, and local host name. The object is overwritten in place so consumers have one stable R2 discovery URL even though the Quick Tunnel hostname changes.

## Runtime Files

- `tools/local-agent/gateway-quick-tunnel.sh`: launches `cloudflared` against port `8765`, captures the generated URL, and triggers R2 publication when it changes.
- `tools/local-agent/publish-public-url-r2.py`: standalone Gova R2 discovery publisher using the existing `.env.local` credentials.
- `tools/local-agent/gova-agent-public.sh`: user-facing lifecycle and publication command.
- `tools/local-agent/gova-agent-public.service`: persistent user systemd service.
- `tools/local-agent/install.sh`: installs the scripts, symlink, service, and starts the dedicated tunnel.

## Independence

This mechanism is owned entirely by the Gova repository. It must not invoke, import, or require `/home/hesham/p2p-link`.

GitHub Actions may be used as a one-shot bootstrap or recovery entry point, but normal transport and discovery do not depend on GitHub after installation.
