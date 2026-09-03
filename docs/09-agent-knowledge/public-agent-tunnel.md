# Gova Local Agent Public Tunnel

## Purpose

The Gova local-agent runtime owns its public Cloudflare Quick Tunnel directly. It does not depend on the `p2p-link` companion repository.

The public transport targets the persistent local-agent gateway directly:

```text
Cloudflare Quick Tunnel
  -> http://127.0.0.1:8765 (Gova Agent Gateway)
```

There is no MCP layer in this path.

The public URL is transient and is regenerated whenever `cloudflared` reconnects. The current URL is stored locally at:

```text
/home/hesham/.local/state/gova-agent-tunnel/public-url
```

## Gateway Authentication

`/health` remains public for health checks. Gateway control routes under `/v1/*` require the existing local-agent key through:

```text
X-Gova-Agent-Key: <local-agent-key>
```

The key remains only in:

```text
/home/hesham/.config/gova-agent/auth
```

It is never published to R2 or committed to Git.

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

`health` verifies the public path by requesting `/health` through the Cloudflare URL. It retries while a newly issued Quick Tunnel hostname is propagating in DNS.

`publish` writes the current tunnel discovery document to R2. The tunnel launcher republishes automatically whenever the generated `trycloudflare.com` URL changes.

## R2 Discovery

The publisher reuses the existing Gova secret source:

```text
/home/hesham/gova/.env.local
```

Supported existing names are:

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

Its JSON payload contains only the active gateway tunnel URL, `/health` URL, update timestamp, and local host name. It contains no gateway authentication key and no MCP metadata.

## Runtime Files

- `tools/local-agent/gateway.py`: persistent authenticated local-agent control gateway on port `8765`.
- `tools/local-agent/gateway-quick-tunnel.sh`: launches `cloudflared` directly against port `8765`, captures the generated URL, and triggers R2 publication when it changes.
- `tools/local-agent/publish-public-url-r2.py`: standalone Gova R2 discovery publisher using the existing `.env.local` credentials.
- `tools/local-agent/gova-agent-public.sh`: user-facing lifecycle and publication command.
- `tools/local-agent/gova-agent-public.service`: persistent user systemd tunnel service.
- `tools/local-agent/install.sh`: installs the runtime, removes any retired MCP bridge copy, and starts the gateway and public transport.

## GitHub Fallback

Normal operation does not depend on GitHub Actions. The intended steady state is:

```text
Cloudflare -> persistent gova-agent-gateway -> local machine
```

GitHub retains exactly one Local Runner fallback workflow, `.github/workflows/local-agent-bootstrap.yml`. It is manual (`workflow_dispatch`) and is used only as a one-shot bootstrap or recovery path:

```text
GitHub manual bootstrap
  -> Self-hosted Runner
  -> install/restart gova-agent-gateway
  -> Gateway remains running after the GitHub job ends
```

After bootstrap, normal gateway commands do not dispatch GitHub Actions jobs.

## Independence

This mechanism is owned entirely by the Gova repository. It must not invoke, import, or require `/home/hesham/p2p-link`.
