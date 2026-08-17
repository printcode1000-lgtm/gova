import type { PersistentSystemLogEntry } from '../domain/entities';

type Subscriber = (entry: PersistentSystemLogEntry) => void;

const subscribers = new Set<Subscriber>();

export function publishSystemLogEvent(entry: PersistentSystemLogEntry) {
  subscribers.forEach((subscriber) => {
    try {
      subscriber(entry);
    } catch {
      /* subscriber failure must not break ingest */
    }
  });
}

export function subscribeSystemLogEvents(subscriber: Subscriber) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function createSseStream(
  sinceIso: string,
  signal?: AbortSignal,
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let lastSeen = sinceIso;

  return new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      send('ready', { since: lastSeen });

      const unsubscribe = subscribeSystemLogEvents((entry) => {
        if (entry.lastOccurredAt <= lastSeen) return;
        lastSeen = entry.lastOccurredAt;
        send('log', entry);
      });

      const poll = setInterval(async () => {
        if (signal?.aborted) return;
        send('heartbeat', { at: new Date().toISOString() });
      }, 15_000);

      signal?.addEventListener('abort', () => {
        clearInterval(poll);
        unsubscribe();
        controller.close();
      });
    },
  });
}
