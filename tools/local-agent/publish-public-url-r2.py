#!/usr/bin/env python3
import datetime as dt
import hashlib
import hmac
import json
import os
import socket
import sys
import urllib.parse
import urllib.request
from pathlib import Path

CONFIG = Path(os.environ.get('GOVA_AGENT_R2_ENV', '/home/hesham/.config/gova-agent/r2.env'))
URL_FILE = Path(os.environ.get('GOVA_AGENT_TUNNEL_URL_FILE', '/home/hesham/.local/state/gova-agent-tunnel/public-url'))


def load_env(path: Path):
    env = {}
    if not path.is_file():
        return env
    for raw in path.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        k, v = line.split('=', 1)
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def sign(key, msg):
    return hmac.new(key, msg.encode(), hashlib.sha256).digest()


def main():
    cfg = load_env(CONFIG)
    required = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET']
    missing = [k for k in required if not cfg.get(k)]
    if missing:
        print('R2 publishing skipped: missing ' + ','.join(missing), file=sys.stderr)
        return 2
    if not URL_FILE.is_file():
        print('R2 publishing skipped: tunnel URL missing', file=sys.stderr)
        return 3

    public_url = URL_FILE.read_text().strip()
    if not public_url.startswith('https://'):
        print('R2 publishing skipped: invalid tunnel URL', file=sys.stderr)
        return 4

    object_key = cfg.get('R2_OBJECT_KEY', 'gova-agent/public.json').lstrip('/')
    endpoint = cfg.get('R2_ENDPOINT') or f"https://{cfg['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com"
    endpoint = endpoint.rstrip('/')
    bucket = cfg['R2_BUCKET']
    encoded_key = '/'.join(urllib.parse.quote(part, safe='~') for part in object_key.split('/'))
    url = f"{endpoint}/{urllib.parse.quote(bucket, safe='~')}/{encoded_key}"

    now = dt.datetime.now(dt.timezone.utc)
    payload = json.dumps({
        'service': 'gova-agent-gateway',
        'url': public_url,
        'health': public_url.rstrip('/') + '/health',
        'updatedAt': now.isoformat(),
        'host': socket.gethostname(),
    }, separators=(',', ':'), ensure_ascii=False).encode()

    amz_date = now.strftime('%Y%m%dT%H%M%SZ')
    date_stamp = now.strftime('%Y%m%d')
    parsed = urllib.parse.urlsplit(endpoint)
    host = parsed.netloc
    canonical_uri = '/' + urllib.parse.quote(bucket, safe='~') + '/' + encoded_key
    payload_hash = hashlib.sha256(payload).hexdigest()
    canonical_headers = f"host:{host}\nx-amz-content-sha256:{payload_hash}\nx-amz-date:{amz_date}\n"
    signed_headers = 'host;x-amz-content-sha256;x-amz-date'
    canonical_request = '\n'.join(['PUT', canonical_uri, '', canonical_headers, signed_headers, payload_hash])
    algorithm = 'AWS4-HMAC-SHA256'
    credential_scope = f"{date_stamp}/auto/s3/aws4_request"
    string_to_sign = '\n'.join([
        algorithm,
        amz_date,
        credential_scope,
        hashlib.sha256(canonical_request.encode()).hexdigest(),
    ])
    k_date = sign(('AWS4' + cfg['R2_SECRET_ACCESS_KEY']).encode(), date_stamp)
    k_region = hmac.new(k_date, b'auto', hashlib.sha256).digest()
    k_service = hmac.new(k_region, b's3', hashlib.sha256).digest()
    k_signing = hmac.new(k_service, b'aws4_request', hashlib.sha256).digest()
    signature = hmac.new(k_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()
    authorization = (
        f"{algorithm} Credential={cfg['R2_ACCESS_KEY_ID']}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, Signature={signature}"
    )

    req = urllib.request.Request(url, data=payload, method='PUT', headers={
        'Host': host,
        'Content-Type': 'application/json',
        'x-amz-content-sha256': payload_hash,
        'x-amz-date': amz_date,
        'Authorization': authorization,
    })
    with urllib.request.urlopen(req, timeout=15) as resp:
        if resp.status not in (200, 201, 204):
            raise RuntimeError(f'R2 PUT failed: HTTP {resp.status}')

    public_base = cfg.get('R2_PUBLIC_BASE_URL', '').rstrip('/')
    print((public_base + '/' + object_key) if public_base else object_key)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
