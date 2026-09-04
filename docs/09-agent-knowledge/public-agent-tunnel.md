# Gova Local Agent Public Tunnel

## Local-Agent Execution Boundary

This tunnel is infrastructure for explicitly requested gateway-controlled access. It does not make the gateway the default execution path for local agents. Normal local-agent work edits `/home/hesham/gova` directly and must not use the localhost gateway, create agent worktrees, or submit to `integration` unless the user explicitly requests that mode. GitHub bootstrap remains the primary remote entry/recovery path.

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

The verified public discovery URL is:

```text
https://pub-91c79e3f34ed4575b997fd68ac8dd278.r2.dev/gova-agent/public.json
```

Consumers must read this R2 document to discover the active Quick Tunnel URL. They must not persist a `trycloudflare.com` hostname as a permanent endpoint because that hostname can change whenever the tunnel restarts or reconnects.

Its JSON payload contains only the active gateway tunnel URL, `/health` URL, update timestamp, and local host name. It contains no gateway authentication key and no MCP metadata.

## Verified Runtime Checkpoint (2026-09-03)

A real end-to-end verification completed successfully on the local machine. At `2026-09-03T13:36:44.071527Z`, the R2 discovery document contained:

```json
{
  "service": "gova-agent-gateway",
  "url": "https://biblical-ethnic-photographs-acid.trycloudflare.com",
  "health": "https://biblical-ethnic-photographs-acid.trycloudflare.com/health",
  "updatedAt": "2026-09-03T13:36:44.071527+00:00"
}
```

That `trycloudflare.com` value is a historical verification snapshot, not a permanent address. The stable lookup location is the R2 discovery URL above.

The same verification established all of the following:

- `gova-agent-public.service` was active.
- The general Gova R2 configuration was complete using `/home/hesham/gova/.env.local`.
- `publish-public-url-r2.py` successfully wrote the discovery object through the Cloudflare R2 S3 API.
- The public R2 object was readable after publication.
- The tunnel URL in R2 exactly matched the locally recorded active Quick Tunnel URL.
- Public gateway `/health` succeeded through the Quick Tunnel.
- Gateway authentication and R2 credentials were not present in the discovery object.

A newly generated Quick Tunnel hostname may briefly fail DNS resolution immediately after creation. This is expected propagation behavior; `gova-agent-public health` therefore retries transport/DNS failures rather than treating the first resolution failure as a permanent tunnel failure.

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
