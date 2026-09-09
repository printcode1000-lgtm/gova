type DevToolsPage = {
  readonly type?: string;
  readonly url?: string;
  readonly webSocketDebuggerUrl?: string;
};

type CdpReply = {
  readonly id?: number;
  readonly result?: {
    readonly result?: {
      readonly value?: unknown;
    };
  };
};

const DEVTOOLS_TIMEOUT_MS = 5_000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out`)), DEVTOOLS_TIMEOUT_MS);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}
async function findCloudflarePage(port: number): Promise<DevToolsPage> {
  const response = await withTimeout(fetch(`http://127.0.0.1:${port}/json`), `DevTools ${port}`);
  if (!response.ok) throw new Error(`DevTools ${port} returned HTTP ${response.status}`);
  const pages = (await response.json()) as DevToolsPage[];
  const page = pages.find(
    (entry) => entry.type === "page" && entry.url?.startsWith("https://dash.cloudflare.com/"),
  );
  if (!page?.webSocketDebuggerUrl) {
    throw new Error(`No authenticated Cloudflare page is available on DevTools port ${port}`);
  }
  return page;
}

export async function postCloudflareGraphqlViaBrowser<T>(
  port: number,
  query: string,
  variables: Readonly<Record<string, unknown>>,
): Promise<T> {
  const page = await findCloudflarePage(port);
  const socket = new WebSocket(page.webSocketDebuggerUrl!);
  let nextId = 0;
  const pending = new Map<number, (reply: CdpReply) => void>();
  socket.onmessage = (event) => {
    const reply = JSON.parse(String(event.data)) as CdpReply;
    if (reply.id && pending.has(reply.id)) {
      pending.get(reply.id)!(reply);
      pending.delete(reply.id);
    }
  };

  await withTimeout(
    new Promise<void>((resolve, reject) => {
      socket.onopen = () => resolve();
      socket.onerror = () => reject(new Error(`DevTools WebSocket ${port} failed to open`));
    }),
    `DevTools WebSocket ${port}`,
  );

  const send = (method: string, params: Record<string, unknown>) =>
    withTimeout(
      new Promise<CdpReply>((resolve) => {
        const id = ++nextId;
        pending.set(id, resolve);
        socket.send(JSON.stringify({ id, method, params }));
      }),
      `${method} on DevTools ${port}`,
    );
  try {
    const expression = `(async () => {
      const response = await fetch('/api/v4/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ query: ${JSON.stringify(query)}, variables: ${JSON.stringify(variables)} }),
      });
      return { status: response.status, text: await response.text() };
    })()`;
    const reply = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    const value = reply.result?.result?.value as { status?: number; text?: string } | undefined;
    if (!value?.text) throw new Error(`Cloudflare browser GraphQL returned no body on port ${port}`);
    if (value.status !== 200) throw new Error(`Cloudflare browser GraphQL returned HTTP ${value.status}`);
    return JSON.parse(value.text) as T;
  } finally {
    socket.close();
  }
}
