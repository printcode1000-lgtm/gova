import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { extname, join, resolve, normalize } from 'node:path';
import { CAPACITOR_API_BASE_URL } from '../platform/capacitor.defaults';

const rootDir = resolve('out');
const port = Number(process.env.PORT ?? 5500);
const host = process.env.HOST ?? '127.0.0.1';
const apiBaseUrl = (
  process.env.GOVA_STATIC_PREVIEW_API_BASE_URL ??
  process.env.NEXT_PUBLIC_GOVA_API_BASE_URL ??
  CAPACITOR_API_BASE_URL
).replace(/\/$/, '');

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function resolvePath(urlPath: string): string | null {
  const decoded = decodeURIComponent(urlPath.split('?')[0] ?? '/');
  const safePath = normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const relativePath = safePath === '/' ? '' : safePath.replace(/^\/+/, '');
  const directFile = join(rootDir, relativePath);

  if (existsSync(directFile) && statSafe(directFile)?.isFile()) {
    return directFile;
  }

  if (existsSync(`${directFile}.html`) && statSafe(`${directFile}.html`)?.isFile()) {
    return `${directFile}.html`;
  }

  const indexFile = join(rootDir, relativePath, 'index.html');
  if (existsSync(indexFile) && statSafe(indexFile)?.isFile()) {
    return indexFile;
  }

  if (relativePath === '') {
    return join(rootDir, 'index.html');
  }

  return null;
}

function statSafe(filePath: string) {
  try {
    return statSync(filePath);
  } catch {
    return null;
  }
}

function proxyApiRequest(
  req: Parameters<Parameters<typeof createServer>[0]>[0],
  res: Parameters<Parameters<typeof createServer>[0]>[1],
): void {
  const targetUrl = new URL(req.url ?? '/api', `${apiBaseUrl}/`);
  const requestUpstream = targetUrl.protocol === 'https:' ? httpsRequest : httpRequest;
  const headers = { ...req.headers, host: targetUrl.host };

  // The browser talks to this preview server on the same origin. Do not pass
  // its Origin header to the remote API, otherwise the remote CORS policy may
  // reject a perfectly valid local preview request.
  delete headers.origin;

  const upstream = requestUpstream(
    targetUrl,
    {
      method: req.method,
      headers,
    },
    (upstreamResponse) => {
      res.statusCode = upstreamResponse.statusCode ?? 502;

      for (const [name, value] of Object.entries(upstreamResponse.headers)) {
        if (value !== undefined) {
          res.setHeader(name, value);
        }
      }

      upstreamResponse.pipe(res);
    },
  );

  upstream.on('error', (error) => {
    if (res.headersSent) {
      res.destroy(error);
      return;
    }

    res.statusCode = 502;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ message: 'Static preview API proxy failed' }));
  });

  req.pipe(upstream);
}

createServer((req, res) => {
  const requestUrl = req.url ?? '/';

  if (requestUrl === '/api' || requestUrl.startsWith('/api/')) {
    proxyApiRequest(req, res);
    return;
  }

  const filePath = resolvePath(requestUrl);

  if (!filePath) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Not Found');
    return;
  }

  const ext = extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader('Content-Type', mimeTypes[ext] ?? 'application/octet-stream');
  res.end(readFileSync(filePath));
}).listen(port, host, () => {
  console.log(`Serving ${rootDir} at http://${host}:${port}`);
  console.log(`Proxying /api/* to ${apiBaseUrl}`);
});
